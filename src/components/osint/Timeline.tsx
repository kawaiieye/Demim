'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CalendarDays,
  Search,
  Download,
  MapPin,
  Clock,
  ChevronDown,
  Filter,
  Loader2,
  Trash2,
  List,
  GitBranch,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VisualTimeline from '@/components/osint/VisualTimeline'
import { useOsintStore } from '@/stores/osint-store'
import { toast } from 'sonner'

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

const sourceColors: Record<string, string> = {
  'google-activity': 'bg-green-500/10 text-green-400 border-green-500/20',
  'google-location': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'google-chrome': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'google-photos': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'facebook-posts': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'facebook-messages': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'exif': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'audio-transcript': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'browser-history': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'json-data': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'csv-data': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'text': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'manual': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export default function Timeline() {
  const { currentCaseId } = useOsintStore()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list')

  const loadEvents = useCallback(async () => {
    if (!currentCaseId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ caseId: currentCaseId })
      if (sourceFilter && sourceFilter !== 'all') params.set('sourceType', sourceFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (search) params.set('search', search)

      const res = await fetch(`/api/timeline?${params}`)
      const data = await res.json()
      setEvents(data)
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }, [currentCaseId, sourceFilter, dateFrom, dateTo, search])

  useEffect(() => {
    loadEvents()
  }, [currentCaseId, sourceFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) loadEvents()
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return
    try {
      const res = await fetch(`/api/timeline/${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Event deleted')
        loadEvents()
      } else {
        toast.error('Failed to delete event')
      }
    } catch {
      toast.error('Failed to delete event')
    }
  }

  const exportTimeline = async (format: 'json' | 'markdown') => {
    if (!currentCaseId) return
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: currentCaseId }),
      })
      const data = await res.json()
      if (data.downloadPath) {
        window.open(data.downloadPath, '_blank')
        toast.success('Export started')
      }
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const formatDate = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return date.toLocaleDateString()
  }

  // Group events by date
  const groupedEvents = events.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    const date = new Date(event.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {})

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Timeline</h2>
        <div className="flex gap-2 items-center">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'visual')}>
            <TabsList className="h-8">
              <TabsTrigger value="list" className="text-xs px-2 h-6 gap-1">
                <List className="h-3 w-3" /> List
              </TabsTrigger>
              <TabsTrigger value="visual" className="text-xs px-2 h-6 gap-1">
                <GitBranch className="h-3 w-3" /> Visual
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTimeline('json')}
            className="gap-1 text-xs border-primary/20"
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-primary/10">
        <CardContent className="pt-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Source filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="google-activity">Google Activity</SelectItem>
                <SelectItem value="google-location">Location</SelectItem>
                <SelectItem value="google-chrome">Chrome</SelectItem>
                <SelectItem value="facebook-posts">Facebook</SelectItem>
                <SelectItem value="facebook-messages">FB Messages</SelectItem>
                <SelectItem value="exif">EXIF / Photos</SelectItem>
                <SelectItem value="audio-transcript">Audio</SelectItem>
                <SelectItem value="browser-history">Browser</SelectItem>
                <SelectItem value="json-data">JSON</SelectItem>
                <SelectItem value="csv-data">CSV</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px] h-9 text-xs"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px] h-9 text-xs"
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      {/* Events count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <Card className="border-primary/10">
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No events found.</p>
            <p className="text-xs text-muted-foreground mt-1">Upload and process files to extract timeline events.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'visual' ? (
        <VisualTimeline events={events} onEventClick={(event) => setExpandedId(expandedId === event.id ? null : event.id)} onEventDelete={handleDeleteEvent} />
      ) : (
        <ScrollArea className="max-h-[calc(100vh-320px)]">
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs font-medium text-muted-foreground px-2">{date}</span>
                  <div className="h-px bg-border flex-1" />
                </div>

                {/* Events for this date */}
                <div className="space-y-2 ml-4 border-l-2 border-primary/20 pl-4">
                  {dateEvents.map(event => (
                    <Collapsible
                      key={event.id}
                      open={expandedId === event.id}
                      onOpenChange={(open) => setExpandedId(open ? event.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
                          <div className="flex items-start gap-3">
                            {/* Timeline dot */}
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0 -ml-[22px]" />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${sourceColors[event.source] || sourceColors.text}`}
                                >
                                  {sourceLabels[event.source] || event.source}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm font-medium">{event.title}</p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                              )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-0 p-3 bg-muted/20 rounded-lg border border-border/30 mt-1 space-y-2">
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            {event.latitude && event.longitude && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                              </span>
                            )}
                          </div>
                          {event.file && (
                            <p className="text-xs text-muted-foreground">
                              Source file: {event.file.originalName}
                            </p>
                          )}
                          {event.rawData && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer">Raw Data</summary>
                              <pre className="mt-1 text-xs bg-background/50 p-2 rounded overflow-auto max-h-40">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(event.rawData), null, 2)
                                  } catch {
                                    return event.rawData
                                  }
                                })()}
                              </pre>
                            </details>
                          )}
                          <div className="flex justify-end pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="h-7 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
