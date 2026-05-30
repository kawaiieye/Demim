import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  parseGoogleTakeout,
  parseFacebookTakeout,
  parseTwitterArchive,
  parseGenericArchive,
  parseImageExif,
  parseBrowserHistory,
  parseJsonData,
  parseCsvData,
  parseTextFile,
} from '@/lib/parsers'
import path from 'path'
import fs from 'fs/promises'

/**
 * Ensure the ZIP is extracted to the correct directory.
 * Re-extracts from the original uploaded file if the directory is empty/missing.
 */
async function ensureExtracted(caseId: string, file: { filePath: string; originalName: string }): Promise<{ extractDir: string; fileCount: number }> {
  const extractDir = path.join(
    process.cwd(), 'cases', caseId, 'extracted',
    path.basename(file.originalName, path.extname(file.originalName))
  )

  // Check if extraction directory exists and has files
  let fileCount = 0
  try {
    const entries = await walkDir(extractDir)
    fileCount = entries.length
  } catch {
    // Directory doesn't exist
  }

  if (fileCount > 0) {
    console.log(`[process] Extracted dir already has ${fileCount} files at ${extractDir}`)
    return { extractDir, fileCount }
  }

  // Re-extract from the original ZIP file
  console.log(`[process] Extraction directory empty/missing, re-extracting from ${file.filePath}`)
  try {
    const buffer = await fs.readFile(file.filePath)
    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(buffer)
    await fs.mkdir(extractDir, { recursive: true })

    // Extract entries one by one to handle long filenames (ENAMETOOLONG)
    const entries = zip.getEntries()
    for (const entry of entries) {
      const entryName = entry.entryName
      const pathParts = entryName.split(/[/\\]/)
      const safeParts = pathParts.map(part => {
        if (part.length > 200) {
          const ext = path.extname(part)
          return part.slice(0, 190) + ext
        }
        return part
      })
      const safeName = safeParts.join('/')
      try {
        const destPath = path.join(extractDir, safeName)
        await fs.mkdir(path.dirname(destPath), { recursive: true })
        if (!entry.isDirectory) {
          await fs.writeFile(destPath, entry.getData())
        }
      } catch (entryError) {
        console.warn(`[process] Skipping entry "${entryName.slice(0, 80)}...": ${entryError instanceof Error ? entryError.message : entryError}`)
      }
    }

    const entries_list = await walkDir(extractDir)
    fileCount = entries_list.length
    console.log(`[process] Re-extracted ${fileCount} files to ${extractDir}`)
  } catch (err) {
    console.error(`[process] Re-extraction failed:`, err)
    // Try alternative extraction — also with safe filenames
    try {
      const buffer = await fs.readFile(file.filePath)
      const AdmZip = (await import('adm-zip')).default
      const zip = new AdmZip(buffer)
      const parentDir = path.join(process.cwd(), 'cases', caseId, 'extracted')
      await fs.mkdir(parentDir, { recursive: true })
      const entries = zip.getEntries()
      for (const entry of entries) {
        const entryName = entry.entryName
        const pathParts = entryName.split(/[/\\]/)
        const safeParts = pathParts.map(part => part.length > 200 ? part.slice(0, 190) + path.extname(part) : part)
        const safeName = safeParts.join('/')
        try {
          const destPath = path.join(parentDir, safeName)
          await fs.mkdir(path.dirname(destPath), { recursive: true })
          if (!entry.isDirectory) await fs.writeFile(destPath, entry.getData())
        } catch {}
      }
      const entries_list = await walkDir(extractDir)
      fileCount = entries_list.length
      console.log(`[process] Alt extraction: ${fileCount} files at ${extractDir}`)
    } catch (err2) {
      console.error(`[process] Alt extraction also failed:`, err2)
    }
  }

  return { extractDir, fileCount }
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...await walkDir(fullPath))
      } else {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return results
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId, fileId } = body

    if (!caseId || !fileId) {
      return NextResponse.json({ error: 'caseId and fileId are required' }, { status: 400 })
    }

    // Get file record
    const file = await db.file.findUnique({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Mark as processing
    await db.file.update({ where: { id: fileId }, data: { status: 'processing' } })

    let eventsExtracted = 0
    let debugInfo: Record<string, unknown> = {}

    try {
      const fileType = file.detectedType
      debugInfo.fileType = fileType
      debugInfo.originalName = file.originalName
      debugInfo.filePath = file.filePath

      const isZipType = ['google-takeout', 'facebook-takeout', 'twitter-archive', 'generic-archive'].includes(fileType)

      if (isZipType) {
        // Ensure the ZIP is extracted before parsing
        const { extractDir, fileCount } = await ensureExtracted(caseId, file)
        debugInfo.extractDir = extractDir
        debugInfo.extractedFileCount = fileCount

        if (fileCount === 0) {
          console.error(`[process] No files found in extraction directory after retry!`)
          // Last resort: try to parse the ZIP file itself as a generic archive
          // This handles cases where the ZIP has no nested structure
          debugInfo.error = 'Extraction directory is empty after re-extraction attempt'
        }
      }

      switch (fileType) {
        case 'google-takeout': {
          const { extractDir, fileCount } = await ensureExtracted(caseId, file)
          debugInfo.extractedFileCount = fileCount
          // Try Google-specific parser first
          eventsExtracted = await parseGoogleTakeout(caseId, fileId, extractDir)
          debugInfo.googleEvents = eventsExtracted
          // If Google parser found nothing, fall back to generic
          if (eventsExtracted === 0) {
            console.log('[process] Google Takeout parser found 0 events, trying generic archive parser...')
            eventsExtracted = await parseGenericArchive(caseId, fileId, extractDir)
            debugInfo.genericEvents = eventsExtracted
          }
          break
        }

        case 'facebook-takeout': {
          const { extractDir, fileCount } = await ensureExtracted(caseId, file)
          debugInfo.extractedFileCount = fileCount
          eventsExtracted = await parseFacebookTakeout(caseId, fileId, extractDir)
          debugInfo.facebookEvents = eventsExtracted
          if (eventsExtracted === 0) {
            console.log('[process] Facebook parser found 0 events, trying generic archive parser...')
            eventsExtracted = await parseGenericArchive(caseId, fileId, extractDir)
            debugInfo.genericEvents = eventsExtracted
          }
          break
        }

        case 'twitter-archive': {
          const { extractDir, fileCount } = await ensureExtracted(caseId, file)
          debugInfo.extractedFileCount = fileCount
          eventsExtracted = await parseTwitterArchive(caseId, fileId, extractDir)
          debugInfo.twitterEvents = eventsExtracted
          if (eventsExtracted === 0) {
            console.log('[process] Twitter parser found 0 events, trying generic archive parser...')
            eventsExtracted = await parseGenericArchive(caseId, fileId, extractDir)
            debugInfo.genericEvents = eventsExtracted
          }
          break
        }

        case 'generic-archive': {
          const { extractDir, fileCount } = await ensureExtracted(caseId, file)
          debugInfo.extractedFileCount = fileCount
          eventsExtracted = await parseGenericArchive(caseId, fileId, extractDir)
          debugInfo.genericEvents = eventsExtracted

          // If generic also found 0, try all specific parsers as last resort
          if (eventsExtracted === 0 && fileCount > 0) {
            console.log('[process] Generic parser found 0 events, trying all specific parsers...')
            const g = await parseGoogleTakeout(caseId, fileId, extractDir)
            if (g > 0) { eventsExtracted = g; debugInfo.fallbackGoogleEvents = g }
            if (eventsExtracted === 0) {
              const f = await parseFacebookTakeout(caseId, fileId, extractDir)
              if (f > 0) { eventsExtracted = f; debugInfo.fallbackFacebookEvents = f }
            }
            if (eventsExtracted === 0) {
              const t = await parseTwitterArchive(caseId, fileId, extractDir)
              if (t > 0) { eventsExtracted = t; debugInfo.fallbackTwitterEvents = t }
            }
          }
          break
        }

        case 'image': {
          eventsExtracted = await parseImageExif(caseId, fileId, file.filePath)
          break
        }

        case 'browser-history': {
          eventsExtracted = await parseBrowserHistory(caseId, fileId, file.filePath)
          break
        }

        case 'json': {
          eventsExtracted = await parseJsonData(caseId, fileId, file.filePath)
          break
        }

        case 'csv': {
          eventsExtracted = await parseCsvData(caseId, fileId, file.filePath)
          break
        }

        case 'text': {
          eventsExtracted = await parseTextFile(caseId, fileId, file.filePath)
          break
        }

        case 'audio': {
          // Audio requires separate transcription step
          await db.file.update({
            where: { id: fileId },
            data: { status: 'pending', detectedType: 'audio' }
          })
          return NextResponse.json({
            message: 'Audio file ready for transcription',
            needsTranscription: true,
            fileId,
          })
        }

        case 'pdf': {
          eventsExtracted = await parseTextFile(caseId, fileId, file.filePath)
          break
        }

        case 'html': {
          eventsExtracted = await parseTextFile(caseId, fileId, file.filePath)
          break
        }

        default: {
          // Try as text
          eventsExtracted = await parseTextFile(caseId, fileId, file.filePath)
        }
      }

      // Mark as done
      await db.file.update({
        where: { id: fileId },
        data: { status: 'done' }
      })

      console.log(`[process] Completed: ${eventsExtracted} events from ${file.originalName} (${fileType})`)

      return NextResponse.json({
        success: true,
        eventsExtracted,
        fileType,
        debug: debugInfo,
      })
    } catch (processError) {
      console.error('[process] Processing error:', processError)
      await db.file.update({
        where: { id: fileId },
        data: {
          status: 'error',
          error: processError instanceof Error ? processError.message : 'Processing failed',
        }
      })
      return NextResponse.json({
        error: 'Processing failed',
        details: String(processError),
        debug: debugInfo,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[process] Request failed:', error)
    return NextResponse.json({ error: 'Process request failed' }, { status: 500 })
  }
}
