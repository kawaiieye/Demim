import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SYSTEM_PROMPT = `You are a vocal, proactive OSINT timeline analyst. Your job is to be the eyes and brain of an investigator, calling out EVERYTHING you notice — patterns, anomalies, behavioral trends, location patterns, unusual gaps, correlations across data sources, and anything else that stands out.

RULES:
1. BE VOCAL — Don't just list facts. Explain what they MEAN. Say "I notice that..." and "This is interesting because..." and "This stands out because..."
2. PROACTIVELY FLAG — If you see something that looks like a pattern break, a suspicious gap, an unusual location, a sudden change in behavior — SAY IT. Don't wait to be asked.
3. CONNECT THE DOTS — If events from different sources correlate (e.g., a location check-in matches a browser search), point that out explicitly.
4. BE SPECIFIC — Reference exact timestamps, locations, and event IDs. Don't be vague.
5. OFFER HYPOTHESES — When you notice something unusual, offer possible explanations. "This gap could mean X, Y, or Z..."
6. PRIORITIZE — Lead with the most important findings. High-severity anomalies first, then patterns, then observations.
7. TALK LIKE A PARTNER — You're working WITH the investigator. Use "we" and "I noticed" language. Be conversational but precise.

Your tone should be like a smart, observant colleague who's genuinely engaged in the analysis and excited to share what they've found.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId, prompt, apiKey, aiProvider, customEndpoint, customModel } = body as {
      caseId: string
      prompt: string
      apiKey?: string
      aiProvider: 'zai' | 'openai' | 'gemini' | 'custom'
      customEndpoint?: string
      customModel?: string
    }

    if (!caseId || !prompt) {
      return NextResponse.json({ error: 'caseId and prompt are required' }, { status: 400 })
    }

    // Load timeline events for context
    const events = await db.timelineEvent.findMany({
      where: { caseId },
      orderBy: { timestamp: 'asc' },
      take: 500,
    })

    const timelineContext = events.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      source: e.source,
      title: e.title,
      description: e.description,
      location: e.location,
    }))

    const fullPrompt = `${prompt}\n\nTimeline Data (${events.length} events):\n${JSON.stringify(timelineContext, null, 2)}`

    let response = ''

    if (aiProvider === 'zai') {
      // Use z-ai-web-dev-sdk — must create instance first
      const ZAIClass = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAIClass.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: fullPrompt },
        ],
      })
      response = completion.choices?.[0]?.message?.content || 'No response from AI'
    } else if (aiProvider === 'openai') {
      if (!apiKey) {
        return NextResponse.json({ error: 'API key is required for OpenAI' }, { status: 400 })
      }
      const model = customModel || 'gpt-4o-mini'
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt },
          ],
          max_tokens: 4096,
        }),
      })
      const data = await res.json()
      response = data.choices?.[0]?.message?.content || 'No response from OpenAI'
    } else if (aiProvider === 'gemini') {
      if (!apiKey) {
        return NextResponse.json({ error: 'API key is required for Gemini' }, { status: 400 })
      }
      const model = customModel || 'gemini-2.0-flash'
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${fullPrompt}` }] }],
            generationConfig: { maxOutputTokens: 4096 },
          }),
        }
      )
      const data = await res.json()
      response = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini'
    } else if (aiProvider === 'custom') {
      if (!customEndpoint) {
        return NextResponse.json({ error: 'Custom endpoint URL is required' }, { status: 400 })
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(customEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: customModel || 'default',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt },
          ],
          max_tokens: 4096,
        }),
      })
      const data = await res.json()
      response = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)
    } else {
      return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 })
    }

    // Extract simple patterns from the response
    const patterns: string[] = []
    const lines = response.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/) || trimmed.match(/^#{1,3}\s/)) {
        patterns.push(trimmed.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '').replace(/^#{1,3}\s/, ''))
      }
    }

    return NextResponse.json({ response, patterns: patterns.slice(0, 10) })
  } catch (error) {
    console.error('AI analysis failed:', error)
    return NextResponse.json({ error: 'AI analysis failed: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}
