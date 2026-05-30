'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  FileUp,
  Calendar,
  Activity,
  HardDrive,
  Check,
  Loader2,
} from 'lucide-react'
import { useOsintStore } from '@/stores/osint-store'
import { toast } from 'sonner'

interface CaseData {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  _count: { files: number; events: number }
}

export default function Cases() {
  const { currentCaseId, setCurrentCaseId } = useOsintStore()
  const [cases, setCases] = useState<CaseData[]>([])
  const [loading, setLoading] = useState(true)
  const [newCaseName, setNewCaseName] = useState('')
  const [newCaseDesc, setNewCaseDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const loadCases = useCallback(async () => {
    try {
      const res = await fetch('/api/cases')
      const data = await res.json()
      setCases(data)
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const createCase = async () => {
    if (!newCaseName.trim()) {
      toast.error('Please enter a case name')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCaseName, description: newCaseDesc }),
      })

      if (!res.ok) throw new Error('Failed to create case')

      const data = await res.json()
      setCurrentCaseId(data.id)
      setNewCaseName('')
      setNewCaseDesc('')
      setDialogOpen(false)
      toast.success('Case created', { description: data.name })
      await loadCases()
    } catch (error) {
      toast.error('Failed to create case')
    } finally {
      setCreating(false)
    }
  }

  const deleteCase = async (caseId: string) => {
    try {
      await fetch(`/api/cases/${caseId}`, { method: 'DELETE' })
      if (currentCaseId === caseId) setCurrentCaseId(null)
      toast.success('Case deleted')
      await loadCases()
    } catch (error) {
      toast.error('Failed to delete case')
    }
  }

  const exportCase = async (caseId: string) => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
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

  const importCase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setCurrentCaseId(data.case.id)
        toast.success('Case imported', { description: data.case.name })
        await loadCases()
      }
    } catch (error) {
      toast.error('Import failed')
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-32" />
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Cases</h2>
        <div className="flex gap-2">
          {/* Import */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="gap-1 text-xs border-primary/20"
          >
            {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={importCase}
          />

          {/* New Case */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-xs">
                <Plus className="h-3 w-3" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    placeholder="e.g., Investigation 2024-01"
                    value={newCaseName}
                    onChange={(e) => setNewCaseName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Optional description of this case..."
                    value={newCaseDesc}
                    onChange={(e) => setNewCaseDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={createCase} disabled={creating} className="w-full gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Case
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <Card className="border-primary/10">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No cases yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create a new case to start your investigation.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-200px)]">
          <div className="space-y-3">
            {cases.map(caseItem => (
              <Card
                key={caseItem.id}
                className={`cursor-pointer transition-colors hover:bg-muted/20 ${
                  currentCaseId === caseItem.id ? 'border-primary ring-1 ring-primary/20' : 'border-border/50'
                }`}
                onClick={() => setCurrentCaseId(caseItem.id)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{caseItem.name}</h3>
                        {currentCaseId === caseItem.id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                            Active
                          </Badge>
                        )}
                      </div>
                      {caseItem.description && (
                        <p className="text-sm text-muted-foreground truncate">{caseItem.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileUp className="h-3 w-3" />
                          {caseItem._count.files} files
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {caseItem._count.events} events
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(caseItem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); exportCase(caseItem.id) }}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Case</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete &quot;{caseItem.name}&quot; and all its files and events. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCase(caseItem.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
