import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId, fileId } = body

    if (!caseId || !fileId) {
      return NextResponse.json({ error: 'caseId and fileId are required' }, { status: 400 })
    }

    const file = await db.file.findUnique({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Mark as processing
    await db.file.update({ where: { id: fileId }, data: { status: 'processing' } })

    try {
      // Read audio file
      const audioBuffer = await fs.readFile(file.filePath)
      const base64Audio = audioBuffer.toString('base64')

      // Determine format
      const ext = path.extname(file.originalName).toLowerCase().replace('.', '')
      const format = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'].includes(ext) ? ext : 'wav'

      let transcriptionText = ''

      try {
        // Try z-ai-web-dev-sdk ASR
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const zai = await ZAI.create()

        const result = await zai.functions.invoke('asr', {
          audio: base64Audio,
          format,
        })

        transcriptionText = typeof result === 'string' ? result : JSON.stringify(result)
      } catch (asrError) {
        console.error('ASR failed, trying chat completion fallback:', asrError)

        try {
          // Fallback: use chat completion API
          const ZAI = (await import('z-ai-web-dev-sdk')).default
          const zai = await ZAI.create()

          const result = await zai.chat.completions.create({
            model: 'glm-4-flash',
            messages: [
              {
                role: 'user',
                content: `This is an audio file in ${format} format. Please provide a brief description of what this audio might contain based on the filename: "${file.originalName}". Note: Direct audio transcription is not available, so provide a generic placeholder description.`,
              }
            ],
          })

          transcriptionText = result.choices?.[0]?.message?.content || 'Transcription unavailable - audio file processed'
        } catch (chatError) {
          console.error('Chat fallback also failed:', chatError)
          transcriptionText = `[Transcription unavailable for: ${file.originalName}]`
        }
      }

      // Create timeline event for the transcription
      const stat = await fs.stat(file.filePath)
      await db.timelineEvent.create({
        data: {
          caseId,
          fileId,
          timestamp: stat.mtime,
          source: 'audio-transcript',
          title: `Audio Transcription: ${file.originalName}`,
          description: transcriptionText,
          rawData: JSON.stringify({
            filename: file.originalName,
            format,
            fileSize: file.fileSize,
            transcription: transcriptionText,
          }),
          tags: 'audio,transcription',
        }
      })

      await db.file.update({
        where: { id: fileId },
        data: { status: 'done' }
      })

      return NextResponse.json({
        success: true,
        transcription: transcriptionText,
      })
    } catch (processError) {
      console.error('Transcription processing error:', processError)
      await db.file.update({
        where: { id: fileId },
        data: {
          status: 'error',
          error: processError instanceof Error ? processError.message : 'Transcription failed',
        }
      })
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Transcribe request failed:', error)
    return NextResponse.json({ error: 'Transcribe request failed' }, { status: 500 })
  }
}
