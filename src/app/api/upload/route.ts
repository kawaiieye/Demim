import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'
import { detectZipType } from '@/lib/parsers'

function detectFileType(filename: string, mimeType: string): string {
  const lower = filename.toLowerCase()
  const ext = path.extname(lower).replace('.', '')

  // Images
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) {
    return 'image'
  }

  // Audio
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'aac', 'opus', 'wma'].includes(ext)) {
    return 'audio'
  }

  // Browser history (SQLite)
  if (ext === 'sqlite' || ext === 'db') {
    return 'browser-history'
  }

  // JSON
  if (ext === 'json') return 'json'

  // CSV
  if (ext === 'csv' || ext === 'tsv') return 'csv'

  // PDF
  if (ext === 'pdf') return 'pdf'

  // HTML
  if (ext === 'html' || ext === 'htm') return 'html'

  // Text
  if (['txt', 'log', 'md', 'markdown'].includes(ext)) return 'text'

  // ZIP archives — will be detected smartly in the POST handler
  if (ext === 'zip' || mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') {
    return 'zip-pending' // Mark as pending smart detection
  }

  return 'unknown'
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!caseId) {
      return NextResponse.json({ error: 'No case selected' }, { status: 400 })
    }

    // Verify case exists
    const caseData = await db.case.findUnique({ where: { id: caseId } })
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Initial file type detection
    let detectedType = detectFileType(file.name, file.type || '')

    // Create case directories
    const caseDir = path.join(process.cwd(), 'cases', caseId)
    const uploadsDir = path.join(caseDir, 'uploads')
    const extractedDir = path.join(caseDir, 'extracted')
    await fs.mkdir(uploadsDir, { recursive: true })
    await fs.mkdir(extractedDir, { recursive: true })

    // Generate unique filename
    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(uploadsDir, uniqueName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await fs.writeFile(filePath, buffer)

    // Smart ZIP detection — look inside the ZIP to determine the real type
    if (detectedType === 'zip-pending') {
      detectedType = await detectZipType(buffer, file.name)
    }

    // If it's a ZIP-based type, extract it
    if (['google-takeout', 'facebook-takeout', 'twitter-archive', 'generic-archive'].includes(detectedType)) {
      try {
        const AdmZip = (await import('adm-zip')).default
        const zip = new AdmZip(buffer)
        const extractSubDir = path.join(
          extractedDir,
          path.basename(file.name, path.extname(file.name))
        )
        await fs.mkdir(extractSubDir, { recursive: true })

        // Extract entries one by one to handle long filenames
        // adm-zip sometimes creates split files with extremely long names (from CSS content)
        // that exceed filesystem limits (ENAMETOOLONG)
        const entries = zip.getEntries()
        let extractedCount = 0
        for (const entry of entries) {
          const entryName = entry.entryName
          // Skip entries with path components that are too long (> 200 chars)
          const pathParts = entryName.split(/[/\\]/)
          const safeParts = pathParts.map(part => {
            if (part.length > 200) {
              // Truncate very long filenames, keeping extension if possible
              const ext = path.extname(part)
              const base = part.slice(0, 190)
              return base + ext
            }
            return part
          })
          const safeName = safeParts.join('/')

          try {
            const destPath = path.join(extractSubDir, safeName)
            // Ensure parent directory exists
            await fs.mkdir(path.dirname(destPath), { recursive: true })
            if (!entry.isDirectory) {
              const data = entry.getData()
              await fs.writeFile(destPath, data)
              extractedCount++
            }
          } catch (entryError) {
            // Skip entries we can't extract (too long names, etc.)
            console.warn(`[upload] Skipping entry "${entryName.slice(0, 80)}...": ${entryError instanceof Error ? entryError.message : entryError}`)
          }
        }

        // Verify extraction worked
        const extractedFiles = await walkDir(extractSubDir)
        console.log(`[upload] Extracted ZIP to ${extractSubDir} — type: ${detectedType} — ${extractedFiles.length} files (${extractedCount} entries extracted)`)

        if (extractedFiles.length === 0) {
          console.error(`[upload] WARNING: ZIP extraction produced 0 files! Trying alternative extraction...`)
          // Try extracting to the parent directory
          zip.extractAllTo(extractedDir, true)
          const retryFiles = await walkDir(extractSubDir)
          console.log(`[upload] Alt extraction: ${retryFiles.length} files at ${extractSubDir}`)
        }
      } catch (zipError) {
        console.error('[upload] ZIP extraction failed:', zipError)
        // Non-fatal - the file is still saved, process route will try to re-extract
      }
    }

    // Create file record in database
    const fileRecord = await db.file.create({
      data: {
        caseId,
        filename: uniqueName,
        originalName: file.name,
        filePath,
        fileSize: buffer.length,
        mimeType: file.type || 'application/octet-stream',
        detectedType,
        status: 'pending',
      }
    })

    return NextResponse.json({
      id: fileRecord.id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      detectedType: fileRecord.detectedType,
      fileSize: fileRecord.fileSize,
      status: fileRecord.status,
    })
  } catch (error) {
    console.error('[upload] Upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
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
