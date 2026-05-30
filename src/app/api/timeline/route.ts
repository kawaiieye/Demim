import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const caseId = searchParams.get('caseId')
    const sourceType = searchParams.get('sourceType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { caseId }

    if (sourceType && sourceType !== 'all') {
      where.source = sourceType
    }

    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) (where.timestamp as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.timestamp as Record<string, unknown>).lte = new Date(dateTo)
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ]
    }

    const events = await db.timelineEvent.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        file: {
          select: { originalName: true, detectedType: true }
        }
      },
      take: 2000,
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to fetch timeline:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}
