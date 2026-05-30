import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const OBSERVE_PROMPT = `You are a quick-observation OSINT analyst. You just received new timeline events that were just processed. Quickly point out anything immediately notable — don't do a full analysis, just surface the most obvious observations in 2-4 short bullet points. Be conversational and direct.

Examples:
- "I notice 3 visits to the same location in one day — that's unusual"
- "There's a 6-hour gap between these events which might be worth investigating"
- "These searches at 3 AM stand out — late night activity"

Keep it brief, punchy, and actionable. Use "I notice..." language.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId, eventIds, apiKey, aiProvider, customEndpoint, customModel } = body as {
      caseId: string
      eventIds: string[]
      apiKey?: string
      aiProvider?: 'zai' | 'openai' | 'gemini' | 'custom'
      customEndpoint?: string
      customModel?: string
    }

    if (!caseId || !eventIds?.length) {
      return NextResponse.json({ observation: '' })
    }

    // Load the specific new events
    const newEvents = await db.timelineEvent.findMany({
      where: { id: { in: eventIds }, caseId },
      orderBy: { timestamp: 'asc' },
    })

    // Also grab recent context (last 20 events before the new ones)
    const allEvents = await db.timelineEvent.findMany({
      where: { caseId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    })

    const contextStr = allEvents.map(e =>
      `[${e.timestamp.toISOString()}] [${e.source}] ${e.title}${e.location ? ` @ ${e.location}` : ''}`
    ).join('\n')

    const newStr = newEvents.map(e =>
      `[${e.timestamp.toISOString()}] [${e.source}] ${e.title}${e.location ? ` @ ${e.location}` : ''}`
    ).join('\n')

    const prompt = `New events just processed:\n${newStr}\n\nRecent context:\n${contextStr}\n\nWhat do you notice right away?`

    let observation = ''

    const provider = aiProvider || 'zai'

    if (provider === 'zai') {
      const ZAIClass = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAIClass.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: OBSERVE_PROMPT },
          { role: 'user', content: prompt },
        ],
      })
      observation = completion.choices?.[0]?.message?.content || ''
    } else if (provider === 'openai') {
      if (!apiKey) return NextResponse.json({ observation: '' })
      const model = customModel || 'gpt-4o-mini'
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: OBSERVE_PROMPT }, { role: 'user', content: prompt }], max_tokens: 512 }),
      })
      const data = await res.json()
      observation = data.choices?.[0]?.message?.content || ''
    } else if (provider === 'gemini') {
      if (!apiKey) return NextResponse.json({ observation: '' })
      const model = customModel || 'gemini-2.0-flash'
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${OBSERVE_PROMPT}\n\n${prompt}` }] }], generationConfig: { maxOutputTokens: 512 } }),
      })
      const data = await res.json()
      observation = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (provider === 'custom' && customEndpoint) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(customEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: customModel || 'default', messages: [{ role: 'system', content: OBSERVE_PROMPT }, { role: 'user', content: prompt }], max_tokens: 512 }),
      })
      const data = await res.json()
      observation = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    return NextResponse.json({ observation })
  } catch (error) {
    console.error('Quick observation failed:', error)
    return NextResponse.json({ observation: '' })
  }
}
