import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const caseId = searchParams.get('caseId')
    const file = searchParams.get('file')

    if (!caseId || !file) {
      return NextResponse.json({ error: 'caseId and file are required' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'cases', caseId, file)

    // Security: ensure the path doesn't escape the cases directory
    const casesDir = path.join(process.cwd(), 'cases')
    if (!filePath.startsWith(casesDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${file}"`,
      },
    })
  } catch (error) {
    console.error('Download failed:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
