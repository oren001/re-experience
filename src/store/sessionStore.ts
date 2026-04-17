import { create } from 'zustand'
import type { SavedSession, SessionMetadata } from '@/types/session.types'

const STORAGE_KEY = 're-experience-sessions'

function loadFromStorage(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(sessions: SavedSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    console.warn('Failed to save session to localStorage')
  }
}

interface SessionState {
  sessions: SavedSession[]
  currentSessionId: string | null
  isManagerOpen: boolean

  loadSessions: () => void
  saveSession: (session: SavedSession) => void
  deleteSession: (id: string) => void
  setCurrentSessionId: (id: string | null) => void
  openManager: () => void
  closeManager: () => void
  getCurrentSession: () => SavedSession | null
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  isManagerOpen: false,

  loadSessions: () => set({ sessions: loadFromStorage() }),

  saveSession: (session) => set((s) => {
    const updated = session.updatedAt
      ? s.sessions.map((x) => x.id === session.id ? session : x)
      : s.sessions

    const exists = s.sessions.some((x) => x.id === session.id)
    const next = exists
      ? s.sessions.map((x) => x.id === session.id ? session : x)
      : [...s.sessions, session]

    saveToStorage(next)
    return { sessions: next, currentSessionId: session.id }
  }),

  deleteSession: (id) => set((s) => {
    const next = s.sessions.filter((x) => x.id !== id)
    saveToStorage(next)
    return { sessions: next, currentSessionId: s.currentSessionId === id ? null : s.currentSessionId }
  }),

  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  openManager: () => set({ isManagerOpen: true }),
  closeManager: () => set({ isManagerOpen: false }),

  getCurrentSession: () => {
    const { sessions, currentSessionId } = get()
    return sessions.find((s) => s.id === currentSessionId) ?? null
  },
}))
