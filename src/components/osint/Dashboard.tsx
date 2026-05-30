'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  FileUp,
  CalendarDays,
  FolderOpen,
  Clock,
  ArrowRight,
  HardDrive,
  List,
} from 'lucide-react'
import { useOsintStore } from '@/stores/osint-store'

interface CaseData {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  _count: { files: number; events: number }
}

interface DashboardProps {
  onNavigate: (tab: 'upload' | 'timeline' | 'cases') => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { currentCaseId, setCurrentCaseId } = useOsintStore()
  const [cases, setCases] = useState<CaseData[]>([])
  const [currentCase, setCurrentCase] = useState<CaseData | null>(null)
  const [recentEvents, setRecentEvents] = useState<Array<{
    id: string
    title: string
    source: string
    timestamp: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [currentCaseId])

  async function loadDashboard() {
    try {
      const res = await fetch('/api/cases')
      const data = await res.json()
      setCases(data)

      if (currentCaseId) {
        const found = data.find((c: CaseData) => c.id === currentCaseId)
        setCurrentCase(found || data[0] || null)
        if (found) setCurrentCaseId(found.id)
        else if (data[0]) setCurrentCaseId(data[0].id)
      } else if (data.length > 0) {
        setCurrentCase(data[0])
        setCurrentCaseId(data[0].id)
      }

      // Load recent events for current case
      const activeCaseId = currentCaseId || data[0]?.id
      if (activeCaseId) {
        try {
          const eventsRes = await fetch(`/api/timeline?caseId=${activeCaseId}`)
          const events = await eventsRes.json()
          setRecentEvents(events.slice(-5).reverse())
        } catch {
          setRecentEvents([])
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalFiles = cases.reduce((sum, c) => sum + c._count.files, 0)
  const totalEvents = cases.reduce((sum, c) => sum + c._count.events, 0)

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
        <Card className="border-primary/20">
          <CardContent className="pt-6 text-center space-y-4">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">No Cases Yet</h3>
            <p className="text-muted-foreground">
              Create your first case to start building an OSINT timeline.
            </p>
            <Button onClick={() => onNavigate('cases')} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Create a Case
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
          {currentCase && (
            <p className="text-muted-foreground text-sm mt-1">
              Current case: <span className="text-foreground font-medium">{currentCase.name}</span>
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-primary border-primary/30">
          {cases.length} case{cases.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-primary/10 bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFiles}</p>
                <p className="text-xs text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-xs text-muted-foreground">Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cases.length}</p>
                <p className="text-xs text-muted-foreground">Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => onNavigate('upload')} className="gap-2 border-primary/20 hover:bg-primary/10">
            <FileUp className="h-4 w-4" />
            Upload Files
          </Button>
          <Button variant="outline" onClick={() => onNavigate('timeline')} className="gap-2 border-primary/20 hover:bg-primary/10">
            <CalendarDays className="h-4 w-4" />
            View Timeline
          </Button>
          <Button variant="outline" onClick={() => handleExportCase()} className="gap-2 border-accent/20 hover:bg-accent/10">
            <HardDrive className="h-4 w-4" />
            Export Case
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            {recentEvents.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => onNavigate('timeline')} className="gap-1 text-xs text-primary">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events yet. Upload files to extract timeline events.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {recentEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()} · {event.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Case Info */}
      {currentCase && (
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Case</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{currentCase.name}</h3>
              {currentCase.description && (
                <p className="text-sm text-muted-foreground">{currentCase.description}</p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{currentCase._count.files} files</span>
                <span>{currentCase._count.events} events</span>
                <span>Created {new Date(currentCase.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  async function handleExportCase() {
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
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }
}
