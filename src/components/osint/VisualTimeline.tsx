'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MapPin,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'

interface TimelineEvent {
  id: string
  timestamp: string
  source: string
  title: string
  description: string
  location?: string
  latitude?: number
  longitude?: number
  rawData?: string
  tags?: string
  file?: {
    originalName: string
    detectedType: string
  }
}

interface VisualTimelineProps {
  events: TimelineEvent[]
  onEventClick: (event: TimelineEvent) => void
  onEventDelete: (eventId: string) => void
}

const sourceColors: Record<string, string> = {
  'google-activity': '#22c55e',
  'google-location': '#10b981',
  'google-chrome': '#3b82f6',
  'google-photos': '#a855f7',
  'facebook-posts': '#6366f1',
  'facebook-messages': '#8b5cf6',
  'exif': '#ec4899',
  'audio-transcript': '#f59e0b',
  'browser-history': '#06b6d4',
  'json-data': '#eab308',
  'csv-data': '#f97316',
  'text': '#6b7280',
  'manual': '#f43f5e',
}

const sourceLabels: Record<string, string> = {
  'google-activity': 'Google Activity',
  'google-location': 'Location',
  'google-chrome': 'Chrome',
  'google-photos': 'Photos',
  'facebook-posts': 'Facebook',
  'facebook-messages': 'FB Messages',
  'exif': 'EXIF',
  'audio-transcript': 'Audio',
  'browser-history': 'Browser',
  'json-data': 'JSON',
  'csv-data': 'CSV',
  'text': 'Text',
  'manual': 'Manual',
}

// Group sources into categories for branching
const sourceCategory: Record<string, string> = {
  'google-activity': 'google',
  'google-location': 'google',
  'google-chrome': 'google',
  'google-photos': 'google',
  'facebook-posts': 'social',
  'facebook-messages': 'social',
  'exif': 'media',
  'audio-transcript': 'media',
  'browser-history': 'web',
  'json-data': 'data',
  'csv-data': 'data',
  'text': 'other',
  'manual': 'other',
}

const categoryColors: Record<string, string> = {
  google: '#22c55e',
  social: '#6366f1',
  media: '#a855f7',
  web: '#06b6d4',
  data: '#eab308',
  other: '#6b7280',
}

const categoryLabels: Record<string, string> = {
  google: 'Google',
  social: 'Social Media',
  media: 'Media & Photos',
  web: 'Web Activity',
  data: 'Data Files',
  other: 'Other',
}

export default function VisualTimeline({ events, onEventClick, onEventDelete }: VisualTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [layoutMode, setLayoutMode] = useState<'branch' | 'spine'>('branch')
  const containerRef = useRef<HTMLDivElement>(null)

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {}
    events.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(event)
    })
    return groups
  }, [events])

  // Group events by source category for branch layout
  const categoryGroups = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {}
    events.forEach(event => {
      const cat = sourceCategory[event.source] || 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(event)
    })
    return groups
  }, [events])

  // Track auto-scroll to latest
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events.length])

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)))
  }

  // Render a single event card
  const renderEventCard = (event: TimelineEvent, isExpanded: boolean, color: string, compact = false) => (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg border-l-3 ${
        isExpanded ? 'shadow-lg border-l-primary' : ''
      } ${compact ? 'max-w-[220px]' : 'max-w-[280px]'}`}
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
      onClick={() => {
        setExpandedId(isExpanded ? null : event.id)
        onEventClick(event)
      }}
    >
      <CardContent className={`p-2.5 space-y-1 ${compact ? 'p-2' : ''}`}>
        <div className="flex items-center justify-between gap-1">
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 shrink-0"
            style={{
              backgroundColor: `${color}15`,
              color: color,
              borderColor: `${color}33`,
            }}
          >
            {sourceLabels[event.source] || event.source}
          </Badge>
          <span className="text-[9px] text-muted-foreground shrink-0">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className={`font-medium leading-tight ${compact ? 'text-xs' : 'text-sm'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.title}
        </p>
        {event.location && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">{event.location}</span>
          </p>
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="pt-2 mt-1 border-t border-border/30 space-y-1.5">
            {event.description && (
              <p className="text-xs text-muted-foreground">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {new Date(event.timestamp).toLocaleString()}
              </span>
              {event.latitude && event.longitude && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                </span>
              )}
            </div>
            {event.file && (
              <p className="text-[10px] text-muted-foreground">
                Source: {event.file.originalName}
              </p>
            )}
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEventDelete(event.id)
                }}
                className="h-6 gap-1 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-2.5 w-2.5" />
                Delete
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button
            variant={layoutMode === 'branch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLayoutMode('branch')}
            className="text-xs h-7 gap-1"
          >
            <Maximize2 className="h-3 w-3" />
            Branch
          </Button>
          <Button
            variant={layoutMode === 'spine' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLayoutMode('spine')}
            className="text-xs h-7 gap-1"
          >
            Spine
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(-0.1)}
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(0.1)}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[calc(100vh-360px)]" ref={containerRef}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          {layoutMode === 'branch' ? (
            <BranchLayout
              events={events}
              groupedEvents={groupedEvents}
              expandedId={expandedId}
              onExpand={setExpandedId}
              onEventClick={onEventClick}
              renderEventCard={renderEventCard}
            />
          ) : (
            <SpineLayout
              events={events}
              groupedEvents={groupedEvents}
              expandedId={expandedId}
              onExpand={setExpandedId}
              onEventClick={onEventClick}
              renderEventCard={renderEventCard}
            />
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="pt-3 border-t border-border/20">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Source Legend</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sourceLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: sourceColors[key] || sourceColors.text }}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Branch Layout: Category-based branching mind-map style
function BranchLayout({
  events,
  groupedEvents,
  expandedId,
  onExpand,
  onEventClick,
  renderEventCard,
}: {
  events: TimelineEvent[]
  groupedEvents: Record<string, TimelineEvent[]>
  expandedId: string | null
  onExpand: (id: string | null) => void
  onEventClick: (event: TimelineEvent) => void
  renderEventCard: (event: TimelineEvent, isExpanded: boolean, color: string, compact?: boolean) => React.ReactNode
}) {
  // For each date, group events by category and lay them out in branches
  return (
    <div className="space-y-10 pb-8">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => {
        // Group this date's events by category
        const catGroups: Record<string, TimelineEvent[]> = {}
        dateEvents.forEach(event => {
          const cat = sourceCategory[event.source] || 'other'
          if (!catGroups[cat]) catGroups[cat] = []
          catGroups[cat].push(event)
        })

        return (
          <div key={date}>
            {/* Date node */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative z-10">
                <div className="bg-primary/20 border-2 border-primary/40 rounded-full px-6 py-2 shadow-lg">
                  <span className="text-sm font-bold text-primary">{date}</span>
                </div>
              </div>
            </div>

            {/* Branches from date */}
            <div className="relative">
              {/* Vertical connector from date */}
              <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-border/30" />

              <div className="space-y-4">
                {Object.entries(catGroups).map(([category, catEvents]) => {
                  const catColor = categoryColors[category] || categoryColors.other
                  const catLabel = categoryLabels[category] || 'Other'
                  const isLeft = Object.keys(catGroups).indexOf(category) % 2 === 0

                  return (
                    <div key={category} className="relative">
                      {/* Category branch */}
                      <div className={`flex items-start gap-0 ${isLeft ? 'flex-row-reverse' : ''}`}>
                        {/* Connector from spine to branch */}
                        <div className="relative z-10 shrink-0 w-6 flex items-center justify-center">
                          <div
                            className="h-4 w-4 rounded-full border-2"
                            style={{
                              borderColor: catColor,
                              backgroundColor: `${catColor}30`,
                            }}
                          />
                        </div>

                        {/* Branch content */}
                        <div className={`flex-1 ${isLeft ? 'pr-4' : 'pl-4'}`}>
                          {/* Category header */}
                          <div className={`flex items-center gap-2 mb-3 ${isLeft ? 'justify-end' : ''}`}>
                            <div
                              className="h-1 flex-1 max-w-[60px] rounded-full"
                              style={{ backgroundColor: `${catColor}40` }}
                            />
                            <Badge
                              className="text-xs font-semibold"
                              style={{
                                backgroundColor: `${catColor}15`,
                                color: catColor,
                                borderColor: `${catColor}33`,
                              }}
                              variant="outline"
                            >
                              {catLabel}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {catEvents.length} event{catEvents.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Events in this branch */}
                          <div className={`space-y-2 ${isLeft ? 'flex flex-col items-end' : ''}`}>
                            {catEvents.map(event => {
                              const color = sourceColors[event.source] || sourceColors.text
                              const isExpanded = expandedId === event.id
                              return (
                                <div key={event.id} className="relative">
                                  {/* Connector line from branch to event */}
                                  <div
                                    className={`absolute top-1/2 h-px ${isLeft ? 'right-0 translate-x-full' : 'left-0 -translate-x-full'} w-3`}
                                    style={{ backgroundColor: `${color}40` }}
                                  />
                                  {renderEventCard(event, isExpanded, color, true)}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {events.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No events to visualize.</p>
        </div>
      )}
    </div>
  )
}

// Spine Layout: Classic alternating timeline with enhanced visuals
function SpineLayout({
  events,
  groupedEvents,
  expandedId,
  onExpand,
  onEventClick,
  renderEventCard,
}: {
  events: TimelineEvent[]
  groupedEvents: Record<string, TimelineEvent[]>
  expandedId: string | null
  onExpand: (id: string | null) => void
  onEventClick: (event: TimelineEvent) => void
  renderEventCard: (event: TimelineEvent, isExpanded: boolean, color: string, compact?: boolean) => React.ReactNode
}) {
  let globalIndex = 0

  return (
    <div className="relative py-4">
      {/* Central spine */}
      <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-primary/20 hidden sm:block" />

      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date}>
            {/* Date header on the spine */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative z-10">
                <div className="bg-card border border-primary/20 rounded-full px-4 py-1.5">
                  <span className="text-xs font-semibold text-primary">{date}</span>
                </div>
              </div>
            </div>

            {/* Events for this date */}
            <div className="space-y-4">
              {dateEvents.map(event => {
                const isLeft = globalIndex % 2 === 0
                const color = sourceColors[event.source] || sourceColors.text
                const isExpanded = expandedId === event.id
                globalIndex++

                return (
                  <div key={event.id} className="relative">
                    {/* Desktop: alternating left/right layout */}
                    <div className="hidden sm:block">
                      <div className="flex items-start">
                        {isLeft ? (
                          <>
                            <div className="w-[45%] pr-4 flex justify-end">
                              {renderEventCard(event, isExpanded, color)}
                            </div>
                            <svg className="w-[10%] h-12 shrink-0 overflow-visible" viewBox="0 0 40 48" preserveAspectRatio="none">
                              <line x1="0" y1="24" x2="40" y2="24" stroke={color} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
                              <circle cx="40" cy="24" r="4" fill={color} opacity="0.8" />
                            </svg>
                            <div className="w-[45%] pl-4" />
                          </>
                        ) : (
                          <>
                            <div className="w-[45%] pr-4" />
                            <svg className="w-[10%] h-12 shrink-0 overflow-visible" viewBox="0 0 40 48" preserveAspectRatio="none">
                              <circle cx="0" cy="24" r="4" fill={color} opacity="0.8" />
                              <line x1="0" y1="24" x2="40" y2="24" stroke={color} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
                            </svg>
                            <div className="w-[45%] pl-4 flex justify-start">
                              {renderEventCard(event, isExpanded, color)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile: linear vertical layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start gap-3 ml-4 border-l-2 pl-4" style={{ borderLeftColor: `${color}40` }}>
                        <div className="mt-2 h-3 w-3 rounded-full shrink-0 -ml-[22px]" style={{ backgroundColor: color }} />
                        {renderEventCard(event, isExpanded, color)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
