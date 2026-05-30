import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs/promises'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId } = body

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    const caseData = await db.case.findUnique({
      where: { id: caseId },
      include: {
        files: true,
        events: { orderBy: { timestamp: 'asc' } },
      }
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const zip = new AdmZip()

    // Add timeline as JSON
    const timelineJson = JSON.stringify(caseData.events, null, 2)
    zip.addFile('timeline.json', Buffer.from(timelineJson))

    // Add timeline as Markdown
    let markdown = `# Timeline: ${caseData.name}\n\n`
    markdown += `Generated: ${new Date().toISOString()}\n\n`
    markdown += `Total events: ${caseData.events.length}\n\n---\n\n`

    for (const event of caseData.events) {
      markdown += `## ${event.title}\n`
      markdown += `- **Date**: ${event.timestamp.toISOString()}\n`
      markdown += `- **Source**: ${event.source}\n`
      if (event.location) markdown += `- **Location**: ${event.location}\n`
      if (event.description) markdown += `- **Details**: ${event.description}\n`
      markdown += '\n---\n\n'
    }
    zip.addFile('timeline.md', Buffer.from(markdown))

    // Add case metadata
    const metadata = {
      name: caseData.name,
      description: caseData.description,
      createdAt: caseData.createdAt,
      exportedAt: new Date().toISOString(),
      fileCount: caseData.files.length,
      eventCount: caseData.events.length,
    }
    zip.addFile('case-metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)))

    // Add uploaded files
    const caseDir = path.join(process.cwd(), 'cases', caseId)
    try {
      const uploadDir = path.join(caseDir, 'uploads')
      const uploadFiles = await fs.readdir(uploadDir)
      for (const fileName of uploadFiles) {
        const filePath = path.join(uploadDir, fileName)
        const content = await fs.readFile(filePath)
        zip.addFile(`uploads/${fileName}`, content)
      }
    } catch {
      // No uploads directory or empty
    }

    // Add extracted files
    try {
      const extractedDir = path.join(caseDir, 'extracted')
      await addDirToZip(zip, extractedDir, 'extracted')
    } catch {
      // No extracted directory
    }

    // Save ZIP temporarily
    const zipPath = path.join(caseDir, `export-${caseId}-${Date.now()}.zip`)
    zip.writeZip(zipPath)

    return NextResponse.json({
      success: true,
      downloadPath: `/api/export-download?caseId=${caseId}&file=${path.basename(zipPath)}`,
      filename: `osint-${caseData.name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.zip`,
    })
  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

async function addDirToZip(zip: InstanceType<typeof AdmZip>, dirPath: string, zipPath: string) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const entryZipPath = `${zipPath}/${entry.name}`
    if (entry.isDirectory()) {
      await addDirToZip(zip, fullPath, entryZipPath)
    } else {
      const content = await fs.readFile(fullPath)
      zip.addFile(entryZipPath, content)
    }
  }
}
