import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs/promises'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()

    // Look for case-metadata.json
    let metadata: { name?: string; description?: string } = {}
    const metaEntry = zipEntries.find(e => e.entryName === 'case-metadata.json')
    if (metaEntry) {
      try {
        metadata = JSON.parse(metaEntry.getData().toString('utf-8'))
      } catch { /* skip invalid metadata */ }
    }

    // Create a new case
    const newCase = await db.case.create({
      data: {
        name: metadata.name || `Imported Case ${Date.now()}`,
        description: metadata.description || `Imported from ${file.name}`,
      }
    })

    // Create case directory
    const caseDir = path.join(process.cwd(), 'cases', newCase.id)
    await fs.mkdir(path.join(caseDir, 'uploads'), { recursive: true })
    await fs.mkdir(path.join(caseDir, 'extracted'), { recursive: true })

    // Extract uploads
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
        const fileName = path.basename(entry.entryName)
        const content = entry.getData()
        await fs.writeFile(path.join(caseDir, 'uploads', fileName), content)

        // Create file record
        await db.file.create({
          data: {
            caseId: newCase.id,
            filename: fileName,
            originalName: fileName,
            filePath: path.join(caseDir, 'uploads', fileName),
            fileSize: content.length,
            mimeType: 'application/octet-stream',
            detectedType: 'unknown',
            status: 'done',
          }
        })
      }
    }

    // Extract extracted files
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith('extracted/') && !entry.isDirectory) {
        const entryPath = path.join(caseDir, entry.entryName)
        const dir = path.dirname(entryPath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(entryPath, entry.getData())
      }
    }

    // Import timeline events from timeline.json
    const timelineEntry = zipEntries.find(e => e.entryName === 'timeline.json')
    if (timelineEntry) {
      try {
        const events = JSON.parse(timelineEntry.getData().toString('utf-8'))
        if (Array.isArray(events)) {
          for (const event of events) {
            await db.timelineEvent.create({
              data: {
                caseId: newCase.id,
                timestamp: new Date(event.timestamp),
                source: event.source,
                title: event.title,
                description: event.description || '',
                location: event.location,
                latitude: event.latitude,
                longitude: event.longitude,
                rawData: event.rawData,
                tags: event.tags,
              }
            })
          }
        }
      } catch { /* skip invalid timeline */ }
    }

    return NextResponse.json({
      success: true,
      case: newCase,
      importedEvents: timelineEntry ? 'from timeline.json' : 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Import failed:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
