import { create } from 'zustand'

export type TabId = 'dashboard' | 'upload' | 'timeline' | 'cases' | 'ai' | 'instructions'

interface OsintState {
  activeTab: TabId
  currentCaseId: string | null
  setActiveTab: (tab: TabId) => void
  setCurrentCaseId: (id: string | null) => void
}

export const useOsintStore = create<OsintState>((set) => ({
  activeTab: 'dashboard',
  currentCaseId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentCaseId: (id) => set({ currentCaseId: id }),
}))
