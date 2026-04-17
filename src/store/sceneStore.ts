import { create } from 'zustand'
import type { EnvironmentConfig, SceneMode, SceneObject } from '@/types/scene.types'

interface SceneState {
  objects: SceneObject[]
  selectedObjectId: string | null
  mode: SceneMode
  environment: EnvironmentConfig
  placementTargetId: string | null  // object def id waiting to be placed

  addObject: (obj: SceneObject) => void
  removeObject: (id: string) => void
  updateObjectTransform: (id: string, transform: Partial<SceneObject['transform']>) => void
  setSelectedObjectId: (id: string | null) => void
  setMode: (mode: SceneMode) => void
  setEnvironment: (env: Partial<EnvironmentConfig>) => void
  setPlacementTarget: (defId: string | null) => void
  clearObjects: () => void
  loadObjects: (objects: SceneObject[]) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  objects: [],
  selectedObjectId: null,
  mode: 'build',
  placementTargetId: null,
  environment: {
    timeOfDay: 10,
    weatherMood: 'clear',
    ambientIntensity: 0.6,
    fogDensity: 0,
  },

  addObject: (obj) => set((s) => ({ objects: [...s.objects, obj] })),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id), selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId })),
  updateObjectTransform: (id, transform) => set((s) => ({
    objects: s.objects.map((o) => o.id === id ? { ...o, transform: { ...o.transform, ...transform } } : o),
  })),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setMode: (mode) => set({ mode, selectedObjectId: null, placementTargetId: null }),
  setEnvironment: (env) => set((s) => ({ environment: { ...s.environment, ...env } })),
  setPlacementTarget: (defId) => set({ placementTargetId: defId }),
  clearObjects: () => set({ objects: [], selectedObjectId: null }),
  loadObjects: (objects) => set({ objects }),
}))
