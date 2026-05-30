import { NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), 'download', 'osint-timeline-app.zip')

    // If the ZIP doesn't exist yet, create it on the fly
    if (!fs.existsSync(zipPath)) {
      const zip = new AdmZip()

      // Add source code
      const srcDir = path.join(process.cwd(), 'src')
      if (fs.existsSync(srcDir)) addDirToZip(zip, srcDir, 'src')

      // Add prisma
      const prismaDir = path.join(process.cwd(), 'prisma')
      if (fs.existsSync(prismaDir)) addDirToZip(zip, prismaDir, 'prisma')

      // Add public
      const publicDir = path.join(process.cwd(), 'public')
      if (fs.existsSync(publicDir)) addDirToZip(zip, publicDir, 'public')

      // Add config files
      const configFiles = [
        'package.json', 'next.config.ts', 'tailwind.config.ts',
        'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs',
        'components.json', 'Dockerfile', 'docker-compose.yml',
      ]
      for (const file of configFiles) {
        const filePath = path.join(process.cwd(), file)
        if (fs.existsSync(filePath)) {
          zip.addFile(file, fs.readFileSync(filePath))
        }
      }

      // Add start script
      const startScript = `#!/bin/bash
set -e
echo "============================================"
echo "  OSINT Timeline Reconstruction Tool"
echo "============================================"
echo ""
if ! command -v node &> /dev/null; then
    echo "Install Node.js from https://nodejs.org first"
    exit 1
fi
echo "Node.js: $(node --version)"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
npx prisma generate
npx prisma db push
mkdir -p cases db
echo ""
echo "Starting app at http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
npm run dev
`
      zip.addFile('start.sh', Buffer.from(startScript))

      // Add README
      const readme = `# OSINT Timeline Reconstruction Tool

## Quick Start
1. Install Node.js from https://nodejs.org
2. Open terminal in this folder
3. Run: bash start.sh
4. Open http://localhost:3000 in your browser

## How to Send Data Back
1. In the app, go to Cases tab
2. Click the download icon on your case
3. This creates a ZIP file with all your timeline data
4. Send that ZIP file to your AI assistant
5. They can import it on their end to continue analysis

## Connecting AI
- Go to the AI tab, click Settings
- Choose ZAI (no key needed), OpenAI, Gemini, or Custom
- For custom AIs: enter the endpoint URL and model name

## Supported Files
- Google Takeout ZIP, Facebook ZIP, Twitter Archive ZIP
- Images (EXIF GPS data), Audio (AI transcription)
- Chrome History SQLite, JSON, CSV, Text, PDF
`
      zip.addFile('README.md', Buffer.from(readme))

      // Create directories for runtime
      zip.addFile('cases/.gitkeep', Buffer.from(''))
      zip.addFile('db/.gitkeep', Buffer.from(''))

      // Write it out
      fs.mkdirSync(path.dirname(zipPath), { recursive: true })
      zip.writeZip(zipPath)
    }

    const fileBuffer = fs.readFileSync(zipPath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="osint-timeline-app.zip"',
      },
    })
  } catch (error) {
    console.error('Download app failed:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}

function addDirToZip(zip: InstanceType<typeof AdmZip>, dirPath: string, zipPath: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const entryZipPath = `${zipPath}/${entry.name}`
    // Skip node_modules and .next
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    if (entry.isDirectory()) {
      addDirToZip(zip, fullPath, entryZipPath)
    } else {
      zip.addFile(entryZipPath, fs.readFileSync(fullPath))
    }
  }
}
