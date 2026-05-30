'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Brain,
  Send,
  Loader2,
  Settings,
  Sparkles,
  MapPin,
  AlertTriangle,
  GitBranch,
  Eye,
  TrendingUp,
  Link2,
  Zap,
  Save,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useOsintStore } from '@/stores/osint-store'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  patterns?: string[]
  findings?: Array<{
    type: string
    title: string
    description: string
    severity: string
    eventIds: string[]
  }>
  timestamp: Date
}

type AIProvider = 'zai' | 'openai' | 'gemini' | 'custom'

const providerLabels: Record<AIProvider, string> = {
  zai: 'ZAI Built-in',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  custom: 'Custom Endpoint',
}

const quickPrompts = [
  { label: 'Analyze patterns', icon: TrendingUp, prompt: 'Analyze patterns in this timeline' },
  { label: 'Find anomalies', icon: AlertTriangle, prompt: 'Find anomalies and outliers' },
  { label: 'Location patterns', icon: MapPin, prompt: 'Map out location patterns' },
  { label: 'Behavioral trends', icon: Eye, prompt: 'Identify behavioral trends' },
  { label: 'Find connections', icon: Link2, prompt: 'Find connections between events' },
]

const findingTypeConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pattern: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: TrendingUp },
  anomaly: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle },
  cluster: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: GitBranch },
  gap: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Sparkles },
  location: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: MapPin },
  behavioral: { color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', icon: Eye },
  connection: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Link2 },
}

export default function AIAssistant() {
  const { currentCaseId } = useOsintStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [provider, setProvider] = useState<AIProvider>('zai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/ai/settings')
        const data = await res.json()
        if (data.provider) setProvider(data.provider as AIProvider)
        if (data.model) setModel(data.model)
        if (data.endpoint) setCustomEndpoint(data.endpoint)
      } catch {
        // ignore
      }
    }
    loadSettings()
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveSettings = async () => {
    try {
      await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          endpoint: customEndpoint,
          model: provider === 'openai' ? model : provider === 'gemini' ? model : customModel,
          apiKey,
        }),
      })
      toast.success('AI settings saved')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const downloadApp = async () => {
    try {
      // Export case data as JSON — this can be re-imported later
      if (currentCaseId) {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: currentCaseId }),
        })
        const data = await res.json()
        if (data.downloadPath) {
          window.open(data.downloadPath, '_blank')
          toast.success('Case data saved! This ZIP contains your events & can be re-imported.', { duration: 6000 })
        }
      }
    } catch {
      toast.error('Download failed')
    }
  }

  const downloadFullApp = async () => {
    try {
      const appRes = await fetch('/api/download-app')
      if (appRes.ok) {
        const blob = await appRes.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'osint-timeline-app.zip'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('App downloaded! Run start.sh to launch, then import your case data.', { duration: 8000 })
      }
    } catch {
      toast.error('Download failed')
    }
  }

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || loading || !currentCaseId) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCaseId,
          prompt,
          apiKey: provider !== 'zai' ? apiKey : undefined,
          aiProvider: provider,
          customEndpoint: provider === 'custom' ? customEndpoint : undefined,
          customModel: provider === 'openai' ? (model || 'gpt-4o-mini') : provider === 'gemini' ? (model || 'gemini-2.0-flash') : provider === 'custom' ? customModel : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'AI request failed')
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        patterns: data.patterns,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get AI response'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
      toast.error('AI request failed')
    } finally {
      setLoading(false)
    }
  }

  const runAutoAnalyze = async () => {
    if (!currentCaseId || analyzing) return
    setAnalyzing(true)

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: '🔍 Auto-Analyze: Full timeline analysis',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCaseId,
          apiKey: provider !== 'zai' ? apiKey : undefined,
          aiProvider: provider,
          customEndpoint: provider === 'custom' ? customEndpoint : undefined,
          customModel: provider === 'openai' ? (model || 'gpt-4o-mini') : provider === 'gemini' ? (model || 'gemini-2.0-flash') : provider === 'custom' ? customModel : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.summary || 'Analysis complete',
        findings: data.findings || [],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
      toast.success('Auto-analysis complete')
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Analysis error: ${error instanceof Error ? error.message : 'Failed to analyze'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
      toast.error('Auto-analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  // Truncate long messages for display
  const MAX_PREVIEW = 200
  const truncate = (text: string, id: string) => {
    if (expandedMsg === id || text.length <= MAX_PREVIEW) return text
    return text.slice(0, MAX_PREVIEW) + '...'
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Fixed Header */}
      <div className="shrink-0 p-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-primary">AI Assistant</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadApp}
              className="gap-1 text-xs border-primary/20"
              title="Export your case data (events, files) as a ZIP you can re-import later"
            >
              <Save className="h-3 w-3" />
              Save Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadFullApp}
              className="gap-1 text-xs border-primary/20"
              title="Download the full app to run on your own computer"
            >
              <Download className="h-3 w-3" />
              Get App
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-1 text-xs border-primary/20"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          </div>
        </div>

        {/* AI Provider Settings — collapsible */}
        {showSettings && (
          <Card className="border-primary/10">
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(providerLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {provider === 'openai' && (
                  <>
                    <Input
                      type="password"
                      placeholder="OpenAI API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-[220px] h-9 text-xs"
                    />
                    <Select value={model || 'gpt-4o-mini'} onValueChange={setModel}>
                      <SelectTrigger className="w-[160px] h-9 text-xs">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                {provider === 'gemini' && (
                  <>
                    <Input
                      type="password"
                      placeholder="Gemini API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-[220px] h-9 text-xs"
                    />
                    <Select value={model || 'gemini-2.0-flash'} onValueChange={setModel}>
                      <SelectTrigger className="w-[160px] h-9 text-xs">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                {provider === 'custom' && (
                  <>
                    <Input
                      placeholder="Endpoint URL"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      className="w-[220px] h-9 text-xs"
                    />
                    <Input
                      type="password"
                      placeholder="API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-[180px] h-9 text-xs"
                    />
                    <Input
                      placeholder="Model name"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="w-[140px] h-9 text-xs"
                    />
                  </>
                )}
              </div>
              <Button onClick={saveSettings} size="sm" className="gap-1">
                <Save className="h-3 w-3" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Prompt Buttons */}
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp) => (
            <Button
              key={qp.label}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(qp.prompt)}
              disabled={loading || !currentCaseId}
              className="gap-1 text-xs border-primary/20 hover:bg-primary/10 h-7"
            >
              <qp.icon className="h-3 w-3" />
              {qp.label}
            </Button>
          ))}
          <Button
            variant="default"
            size="sm"
            onClick={runAutoAnalyze}
            disabled={analyzing || !currentCaseId}
            className="gap-1 text-xs bg-primary/80 hover:bg-primary h-7"
          >
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Auto-Analyze
          </Button>
        </div>
      </div>

      {/* Scrollable Chat Area — takes remaining space, must have min-h-0 for flex shrink */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-3 max-w-4xl mx-auto w-full scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ask the AI to analyze your timeline data.</p>
            <p className="text-xs mt-1">Use quick prompts above or type your own question below.</p>
          </div>
        )}

        {messages.map(msg => {
          const isLong = msg.content.length > MAX_PREVIEW
          const isExpanded = expandedMsg === msg.id

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/30 border border-border/30'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">AI Analyst</span>
                  </div>
                )}

                {/* Findings display for auto-analyze */}
                {msg.findings && msg.findings.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {msg.findings.map((finding, i) => {
                      const config = findingTypeConfig[finding.type] || findingTypeConfig.pattern
                      const IconComp = config.icon
                      return (
                        <div key={i} className="p-2 rounded-md border border-border/20 bg-background/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                              <IconComp className="h-2.5 w-2.5 mr-0.5" />
                              {finding.type}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              finding.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              finding.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-green-500/10 text-green-400 border-green-500/20'
                            }`}>
                              {finding.severity}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium">{finding.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{finding.description}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Pattern highlights */}
                {msg.patterns && msg.patterns.length > 0 && isExpanded && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {msg.patterns.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        {p.slice(0, 50)}{p.length > 50 ? '...' : ''}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Message content — expandable for long messages */}
                <div className="text-sm whitespace-pre-wrap break-words">
                  {truncate(msg.content, msg.id)}
                </div>

                {/* Expand/collapse for long messages */}
                {isLong && (
                  <button
                    onClick={() => setExpandedMsg(isExpanded ? null : msg.id)}
                    className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Show more ({msg.content.length} chars) <ChevronDown className="h-3 w-3" /></>
                    )}
                  </button>
                )}

                <div className="text-[10px] text-muted-foreground mt-2">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/30 border border-border/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analyzing timeline data...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={chatEndRef} />
      </div>

      {/* Fixed Input Area — always visible at bottom */}
      <div className="shrink-0 p-4 pt-2 border-t border-border/30 bg-background max-w-4xl mx-auto w-full z-10">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your timeline data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            disabled={loading || !currentCaseId}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim() || !currentCaseId}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
