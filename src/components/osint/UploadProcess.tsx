'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Mic,
  FileText,
  Image as ImageIcon,
  Archive,
  Globe,
  FileJson,
  Table,
  File,
  Trash2,
} from 'lucide-react'
import { useOsintStore } from '@/stores/osint-store'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  detectedType: string
  status: string
  error?: string
  createdAt: string
}

const typeIcons: Record<string, React.ReactNode> = {
  'google-takeout': <Archive className="h-4 w-4" />,
  'facebook-takeout': <Archive className="h-4 w-4" />,
  'twitter-archive': <Archive className="h-4 w-4" />,
  'image': <ImageIcon className="h-4 w-4" />,
  'audio': <Mic className="h-4 w-4" />,
  'browser-history': <Globe className="h-4 w-4" />,
  'json': <FileJson className="h-4 w-4" />,
  'csv': <Table className="h-4 w-4" />,
  'text': <FileText className="h-4 w-4" />,
  'pdf': <FileText className="h-4 w-4" />,
  'unknown': <File className="h-4 w-4" />,
}

const typeColors: Record<string, string> = {
  'google-takeout': 'bg-green-500/10 text-green-400 border-green-500/20',
  'facebook-takeout': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'twitter-archive': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'image': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'audio': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'browser-history': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'json': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'csv': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'text': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'pdf': 'bg-red-500/10 text-red-400 border-red-500/20',
  'unknown': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <File className="h-4 w-4 text-muted-foreground" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
}

export default function UploadProcess() {
  const { currentCaseId } = useOsintStore()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    if (!currentCaseId) return
    try {
      const res = await fetch(`/api/cases/${currentCaseId}`)
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }, [currentCaseId])

  // Load files when case changes
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const uploadFile = async (file: File) => {
    if (!currentCaseId) {
      toast.error('No case selected. Please create or select a case first.')
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('caseId', currentCaseId)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await res.json()
      setProgress(100)
      toast.success(`Uploaded: ${file.name}`, {
        description: `Detected as ${data.detectedType}`,
      })

      // Auto-process the file
      await processFile(data.id, data.detectedType)
      await loadFiles()
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const processFile = async (fileId: string, fileType: string) => {
    setProcessingId(fileId)
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: currentCaseId, fileId, fileType }),
      })

      const data = await res.json()

      if (data.needsTranscription) {
        toast.info('Audio file needs transcription', {
          description: 'Click the transcribe button to start',
          duration: 5000,
        })
      } else if (data.success) {
        if (data.eventsExtracted === 0) {
          toast.warning('No events found', {
            description: 'The file was processed but no events could be extracted. Try a different file format.',
            duration: 8000,
          })
        } else {
          toast.success(`Processed: ${data.eventsExtracted} events extracted`)
          triggerQuickObservation(currentCaseId)
        }
      }
    } catch (error) {
      toast.error('Processing failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const triggerQuickObservation = async (caseId: string) => {
    try {
      // Get the latest events for this case
      const eventsRes = await fetch(`/api/timeline?caseId=${caseId}`)
      const events = await eventsRes.json()
      if (events.length > 0) {
        const recentIds = events.slice(-10).map((e: { id: string }) => e.id)
        const obsRes = await fetch('/api/ai/observe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId, eventIds: recentIds, aiProvider: 'zai' }),
        })
        const obsData = await obsRes.json()
        if (obsData.observation) {
          toast.info('AI Observer', {
            description: obsData.observation.slice(0, 200),
            duration: 8000,
          })
        }
      }
    } catch {
      // Silent failure — observation is nice-to-have, not critical
    }
  }

  const transcribeFile = async (fileId: string) => {
    setProcessingId(fileId)
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: currentCaseId, fileId }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Transcription complete')
        await loadFiles()
      }
    } catch (error) {
      toast.error('Transcription failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    for (const file of droppedFiles) {
      uploadFile(file)
    }
  }, [currentCaseId])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      for (const file of Array.from(selectedFiles)) {
        uploadFile(file)
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [currentCaseId])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}" and all its extracted events?`)) return
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('File deleted', { description: fileName })
        await loadFiles()
      } else {
        toast.error('Failed to delete file')
      }
    } catch {
      toast.error('Failed to delete file')
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-primary">Upload & Process</h2>

      {!currentCaseId && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-destructive" />
            <p className="text-muted-foreground">Please create or select a case first.</p>
          </CardContent>
        </Card>
      )}

      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-primary/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-12 text-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileSelect}
            accept=".zip,.json,.csv,.txt,.jpg,.jpeg,.png,.heic,.mp3,.wav,.m4a,.ogg,.flac,.pdf,.sqlite,.db,.html"
          />
          <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop files here' : 'Tap to upload or drag & drop'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Google Takeout ZIP, Facebook ZIP, Images, Audio, Chrome History, JSON, CSV, Text, PDF
          </p>
          {uploading && (
            <div className="mt-4 max-w-xs mx-auto">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Uploaded Files</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadFiles} className="text-xs">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files uploaded yet.</p>
              <p className="text-xs mt-1">Upload files to extract timeline events.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="shrink-0">
                      {statusIcons[file.status] || statusIcons.pending}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{file.originalName}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${typeColors[file.detectedType] || typeColors.unknown}`}
                        >
                          {typeIcons[file.detectedType]}
                          <span className="ml-1">{file.detectedType}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>{new Date(file.createdAt).toLocaleString()}</span>
                        {file.status === 'processing' && processingId === file.id && (
                          <span className="text-primary">Processing...</span>
                        )}
                        {file.error && (
                          <span className="text-destructive">{file.error}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-1">
                      {file.detectedType === 'audio' && file.status !== 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); transcribeFile(file.id) }}
                          disabled={processingId === file.id}
                          className="gap-1 h-8 text-xs"
                        >
                          {processingId === file.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mic className="h-3 w-3" />
                          )}
                          Transcribe
                        </Button>
                      )}
                      {(file.status === 'error' || file.status === 'done') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); processFile(file.id, file.detectedType) }}
                          disabled={processingId === file.id}
                          className="gap-1 h-8 text-xs"
                          title="Re-process this file to extract events"
                        >
                          <Play className="h-3 w-3" />
                          {file.status === 'error' ? 'Retry' : 'Re-process'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); deleteFile(file.id, file.originalName) }}
                        disabled={processingId === file.id}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
