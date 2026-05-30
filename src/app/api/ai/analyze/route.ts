import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ANALYSIS_SYSTEM_PROMPT = `You are a vocal, proactive OSINT timeline analyst doing a deep-dive analysis. Be the investigator's smartest colleague — call out EVERYTHING you notice with enthusiasm and precision.

Your analysis MUST cover these categories:

1. PATTERNS: Recurring behaviors, regular schedules, habitual locations, predictable routines
2. ANOMALIES: Events that break patterns, unusual times, unexpected locations, sudden changes
3. CLUSTERS: Groups of events happening close together in time — what triggered the burst?
4. GAPS: Missing time periods that seem unusual — what might have been happening during these silences?
5. LOCATION_PATTERNS: Frequent locations, travel patterns, geographic anomalies, unexpected movements
6. BEHAVIORAL_INSIGHTS: What the data reveals about the person's habits, interests, lifestyle, and changes over time
7. CONNECTIONS: Events from different sources that might be related — cross-reference everything

CRITICAL RULES:
- BE VOCAL: Say "I noticed that..." and "This stands out because..." — explain WHY things matter
- BE SPECIFIC: Reference exact timestamps, locations, and event IDs
- BE PROACTIVE: Flag anything suspicious or interesting even if it seems minor
- OFFER HYPOTHESES: When you find something unusual, suggest possible explanations
- CONNECT THE DOTS: If a location visit correlates with a search or message, point that out
- PRIORITIZE: Lead with the most important findings

Format your response as JSON:
{
  "patterns": [{ "type": "pattern|anomaly|cluster|gap|location|behavioral|connection", "title": "...", "description": "...", "severity": "low|medium|high", "eventIds": ["id1", "id2"], "timestamp": "ISO date or null" }]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId, apiKey, aiProvider, customEndpoint, customModel } = body as {
      caseId: string
      apiKey?: string
      aiProvider?: 'zai' | 'openai' | 'gemini' | 'custom'
      customEndpoint?: string
      customModel?: string
    }

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    // Load ALL timeline events for the case
    const events = await db.timelineEvent.findMany({
      where: { caseId },
      orderBy: { timestamp: 'asc' },
    })

    if (events.length === 0) {
      return NextResponse.json({
        summary: 'No timeline events found for this case.',
        findings: [],
      })
    }

    const timelineData = events.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      source: e.source,
      title: e.title,
      description: e.description,
      location: e.location,
      latitude: e.latitude,
      longitude: e.longitude,
    }))

    const prompt = `Analyze the following ${events.length} timeline events from an OSINT investigation and provide a comprehensive pattern analysis:\n\n${JSON.stringify(timelineData, null, 2)}`

    const provider = aiProvider || 'zai'
    let responseText = ''

    if (provider === 'zai') {
      const ZAIClass = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAIClass.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      })
      responseText = completion.choices?.[0]?.message?.content || ''
    } else if (provider === 'openai') {
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
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
        }),
      })
      const data = await res.json()
      responseText = data.choices?.[0]?.message?.content || ''
    } else if (provider === 'gemini') {
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
            contents: [{ parts: [{ text: `${ANALYSIS_SYSTEM_PROMPT}\n\n${prompt}` }] }],
            generationConfig: { maxOutputTokens: 4096 },
          }),
        }
      )
      const data = await res.json()
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (provider === 'custom') {
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
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
        }),
      })
      const data = await res.json()
      responseText = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // Parse the JSON response
    let findings: Array<{
      type: string
      title: string
      description: string
      severity: string
      eventIds: string[]
    }> = []

    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = responseText.trim()
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      const parsed = JSON.parse(jsonStr)
      findings = parsed.patterns || []
    } catch {
      // If JSON parsing fails, create a single finding from the raw text
      findings = [{
        type: 'behavioral',
        title: 'Analysis Complete',
        description: responseText.slice(0, 500),
        severity: 'medium',
        eventIds: [],
      }]
    }

    // Generate summary
    const typeCounts: Record<string, number> = {}
    findings.forEach(f => {
      typeCounts[f.type] = (typeCounts[f.type] || 0) + 1
    })

    const summaryParts = Object.entries(typeCounts).map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    const summary = `Auto-analysis complete: Found ${findings.length} findings across ${events.length} events — ${summaryParts.join(', ')}.`

    return NextResponse.json({
      summary,
      findings,
    })
  } catch (error) {
    console.error('Auto-analysis failed:', error)
    return NextResponse.json(
      { error: 'Auto-analysis failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
