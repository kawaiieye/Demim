'use client'

import { useState, useEffect } from 'react'
import { useOsintStore, type TabId } from '@/stores/osint-store'
import Dashboard from '@/components/osint/Dashboard'
import UploadProcess from '@/components/osint/UploadProcess'
import Timeline from '@/components/osint/Timeline'
import Cases from '@/components/osint/Cases'
import Instructions from '@/components/osint/Instructions'
import AIAssistant from '@/components/osint/AIAssistant'
import { Shield, LayoutDashboard, Upload, CalendarDays, FolderOpen, HelpCircle, Brain } from 'lucide-react'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'upload', label: 'Upload', icon: <Upload className="h-5 w-5" /> },
  { id: 'timeline', label: 'Timeline', icon: <CalendarDays className="h-5 w-5" /> },
  { id: 'cases', label: 'Cases', icon: <FolderOpen className="h-5 w-5" /> },
  { id: 'ai', label: 'AI', icon: <Brain className="h-5 w-5" /> },
  { id: 'instructions', label: 'Help', icon: <HelpCircle className="h-5 w-5" /> },
]

export default function OsintApp() {
  const { activeTab, setActiveTab, currentCaseId, setCurrentCaseId } = useOsintStore()
  const [initialized, setInitialized] = useState(false)

  // Load last active case on mount
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/cases')
        const cases = await res.json()
        if (cases.length > 0 && !currentCaseId) {
          setCurrentCaseId(cases[0].id)
        }
      } catch {
        // ignore
      }
      setInitialized(true)
    }
    init()
  }, [])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading OSINT Timeline...</p>
        </div>
      </div>
    )
  }

  const handleNavigate = (tab: 'upload' | 'timeline' | 'cases' | 'ai') => {
    setActiveTab(tab)
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header - Desktop sidebar layout */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card/50 shrink-0">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-base font-bold text-primary">OSINT Timeline</h1>
                <p className="text-[10px] text-muted-foreground">Reconstruction Tool</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Case indicator */}
          {currentCaseId && (
            <div className="p-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Active Case</p>
              <p className="text-xs font-medium truncate text-foreground">
                Case: {currentCaseId.slice(-6)}
              </p>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className={`flex-1 min-h-0 ${activeTab === 'ai' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-20 md:pb-4'}`}>
          <div className={activeTab === 'ai' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}>
            {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {activeTab === 'upload' && <UploadProcess />}
            {activeTab === 'timeline' && <Timeline />}
            {activeTab === 'cases' && <Cases />}
            {activeTab === 'ai' && <AIAssistant />}
            {activeTab === 'instructions' && <Instructions />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0 ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
