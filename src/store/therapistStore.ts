import { create } from 'zustand'
import type { Annotation, Waypoint } from '@/types/therapist.types'

interface TherapistState {
  waypoints: Waypoint[]
  annotations: Annotation[]
  isPaused: boolean
  speedMultiplier: number
  safeSpaceActive: boolean
  notes: string
  activeWaypointIndex: number | null

  addWaypoint: (wp: Waypoint) => void
  removeWaypoint: (id: string) => void
  updateWaypoint: (id: string, patch: Partial<Waypoint>) => void
  addAnnotation: (ann: Annotation) => void
  removeAnnotation: (id: string) => void
  setPaused: (paused: boolean) => void
  setSpeedMultiplier: (speed: number) => void
  triggerSafeSpace: () => void
  dismissSafeSpace: () => void
  setNotes: (notes: string) => void
  setActiveWaypointIndex: (index: number | null) => void
  loadTherapistData: (data: { waypoints: Waypoint[]; annotations: Annotation[]; notes: string }) => void
}

export const useTherapistStore = create<TherapistState>((set) => ({
  waypoints: [],
  annotations: [],
  isPaused: false,
  speedMultiplier: 1,
  safeSpaceActive: false,
  notes: '',
  activeWaypointIndex: null,

  addWaypoint: (wp) => set((s) => ({ waypoints: [...s.waypoints, wp] })),
  removeWaypoint: (id) => set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id) })),
  updateWaypoint: (id, patch) => set((s) => ({ waypoints: s.waypoints.map((w) => w.id === id ? { ...w, ...patch } : w) })),
  addAnnotation: (ann) => set((s) => ({ annotations: [...s.annotations, ann] })),
  removeAnnotation: (id) => set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
  setPaused: (paused) => set({ isPaused: paused }),
  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),
  triggerSafeSpace: () => set({ safeSpaceActive: true }),
  dismissSafeSpace: () => set({ safeSpaceActive: false }),
  setNotes: (notes) => set({ notes }),
  setActiveWaypointIndex: (index) => set({ activeWaypointIndex: index }),
  loadTherapistData: ({ waypoints, annotations, notes }) => set({ waypoints, annotations, notes }),
}))
