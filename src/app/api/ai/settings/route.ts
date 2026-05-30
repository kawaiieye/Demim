import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'ai-settings.json')

interface AISettings {
  provider: string
  endpoint: string
  model: string
  hasApiKey: boolean
}

// In-memory API key storage (never persisted to disk)
let sessionApiKey: string | null = null

async function readSettings(): Promise<AISettings> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { provider: 'zai', endpoint: '', model: '', hasApiKey: false }
  }
}

async function writeSettings(settings: AISettings): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

export async function GET() {
  try {
    const settings = await readSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to read AI settings:', error)
    return NextResponse.json({ provider: 'zai', endpoint: '', model: '', hasApiKey: false })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, endpoint, model, apiKey } = body as {
      provider: string
      endpoint?: string
      model?: string
      apiKey?: string
    }

    // Store API key in memory only
    if (apiKey) {
      sessionApiKey = apiKey
    } else if (apiKey === '') {
      sessionApiKey = null
    }

    const settings: AISettings = {
      provider: provider || 'zai',
      endpoint: endpoint || '',
      model: model || '',
      hasApiKey: !!sessionApiKey,
    }

    await writeSettings(settings)

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Failed to save AI settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

// Export function to retrieve the session API key (used by other API routes)
export function getSessionApiKey(): string | null {
  return sessionApiKey
}
