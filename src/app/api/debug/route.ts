import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

/**
 * Debug endpoint to inspect uploaded files and extraction directories.
 * Helps diagnose why parsing returns 0 events.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const caseId = url.searchParams.get('caseId')
  const fileId = url.searchParams.get('fileId')

  if (!caseId) {
    return NextResponse.json({ error: 'caseId parameter required' })
  }

  const result: Record<string, unknown> = { caseId }

  try {
    // Get all files for this case
    const files = await db.file.findMany({ where: { caseId } })
    result.fileCount = files.length
    result.files = files.map(f => ({
      id: f.id,
      originalName: f.originalName,
      detectedType: f.detectedType,
      status: f.status,
      filePath: f.filePath,
      fileSize: f.fileSize,
      error: f.error,
    }))

    // Check extraction directory
    const extractedDir = path.join(process.cwd(), 'cases', caseId, 'extracted')
    try {
      const allFiles = await walkDir(extractedDir)
      result.extractedDir = extractedDir
      result.extractedFileCount = allFiles.length
      result.extractedFiles = allFiles.slice(0, 100).map(f => {
        const rel = path.relative(extractedDir, f)
        const ext = path.extname(f).toLowerCase()
        const size = fs.stat(f).then(s => s.size).catch(() => 0)
        return { path: rel, ext, size }
      })

      // Wait for sizes
      const filesWithSizes = await Promise.all(
        (result.extractedFiles as Array<{ path: string; ext: string; size: Promise<number> }>).map(async f => ({
          path: f.path,
          ext: f.ext,
          size: await f.size,
        }))
      )
      result.extractedFiles = filesWithSizes

      // Summary of file types
      const extCounts: Record<string, number> = {}
      for (const f of allFiles) {
        const ext = path.extname(f).toLowerCase() || 'no-ext'
        extCounts[ext] = (extCounts[ext] || 0) + 1
      }
      result.fileTypeBreakdown = extCounts

      // If a specific file is requested, check its extraction dir
      if (fileId) {
        const file = files.find(f => f.id === fileId)
        if (file) {
          const specificDir = path.join(
            extractedDir,
            path.basename(file.originalName, path.extname(file.originalName))
          )
          try {
            const specificFiles = await walkDir(specificDir)
            result.specificExtractDir = specificDir
            result.specificFileCount = specificFiles.length
            result.specificFiles = specificFiles.slice(0, 50).map(f => path.relative(specificDir, f))
          } catch {
            result.specificExtractDir = specificDir
            result.specificFileError = 'Directory does not exist or is empty'
          }

          // Try reading first few files as text to check content
          if (specificFiles.length > 0) {
            const samples = []
            for (const fp of specificFiles.slice(0, 5)) {
              try {
                const stat = await fs.stat(fp)
                if (stat.size < 50000) { // Only read small files
                  const content = await fs.readFile(fp, 'utf-8')
                  samples.push({
                    file: path.relative(specificDir, fp),
                    size: stat.size,
                    preview: content.slice(0, 200),
                  })
                } else {
                  samples.push({
                    file: path.relative(specificDir, fp),
                    size: stat.size,
                    preview: '[file too large to preview]',
                  })
                }
              } catch {
                samples.push({
                  file: path.relative(specificDir, fp),
                  error: 'Could not read file (binary?)',
                })
              }
            }
            result.contentSamples = samples
          }
        }
      }
    } catch {
      result.extractedDirError = 'Extracted directory does not exist'
    }

    // Check case events
    const eventCount = await db.timelineEvent.count({ where: { caseId } })
    result.totalEvents = eventCount

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
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
