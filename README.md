# OSINT Timeline Reconstruction Tool

A self-contained web application for reconstructing digital timelines from data exports (Google Takeout, Facebook, images, audio, browser history, etc.)

## Quick Start

### Option 1: Development Mode (Recommended for first-time setup)

```bash
# Install Node.js from https://nodejs.org if you don't have it

# Run the start script
bash start.sh

# Open http://localhost:3000 in your browser
```

### Option 2: Production Mode (Better performance)

```bash
# Build the app
bash build.sh

# Start the server
npm run start

# Open http://localhost:3000 in your browser
```

### Option 3: Docker (Easiest if you have Docker)

```bash
docker build -t osint-timeline .
docker run -p 3000:3000 -v ./cases:/app/cases -v ./db:/app/db osint-timeline
```

## Features

- **Multi-source data import**: Google Takeout, Facebook, Twitter, images (EXIF), audio, browser history, JSON, CSV, text
- **Visual timeline**: Branch view (mind-map style) and spine view (alternating cards)
- **AI-powered analysis**: Pattern detection, anomaly flagging, gap analysis, location patterns, behavioral insights
- **Audio transcription**: Upload audio files and get AI-powered transcriptions
- **Case management**: Multiple investigation cases with full export/import
- **Delete anything**: Remove accidentally added events or files with one click
- **AI providers**: Works with ZAI (built-in), OpenAI, Google Gemini, or any custom endpoint
- **Transferable**: Export cases as ZIP files, import on another device

## Connecting an AI

1. Go to the **AI** tab
2. Click **Settings**
3. Choose your provider:
   - **ZAI Built-in**: No API key needed, works immediately
   - **OpenAI**: Enter your API key, choose GPT-4o or GPT-4o Mini
   - **Google Gemini**: Enter your API key, choose Gemini 2.0 Flash or 1.5 Pro
   - **Custom Endpoint**: Connect to any OpenAI-compatible API (local LLMs, Kai 9000, etc.)

## How to Get Your Data

### Google Takeout
1. Go to takeout.google.com
2. Select: My Activity, Location History, Chrome, Photos, YouTube
3. Export as ZIP, upload to this app

### Facebook
1. Settings → Your Information → Download Your Information
2. Format: JSON, Date range: All time
3. Upload the ZIP to this app

### Twitter/X
1. Settings → Your account → Download an archive
2. Upload the ZIP to this app

## Transferring the App

To move this app to another machine:
1. Copy the entire project folder
2. Run `bash start.sh` on the new machine
3. Or export/import individual cases as ZIP files

## Directory Structure

- `cases/` — Uploaded files and extracted data (persisted)
- `db/` — SQLite database (persisted)
- `src/` — Application source code

## Tech Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Prisma ORM with SQLite
- z-ai-web-dev-sdk for AI features
- Docker-ready with standalone output
