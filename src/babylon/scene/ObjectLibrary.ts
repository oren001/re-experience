import type { ObjectDefinition } from '@/types/scene.types'

// Fallback library using Babylon.js built-in primitives (no external GLB files needed for MVP)
// When Meshy generates a model, it gets added dynamically with category 'generated'
export const OBJECT_LIBRARY: ObjectDefinition[] = [
  // Furniture
  { id: 'chair', label: 'Chair', category: 'furniture', glbPath: '__primitive:box:0.5,0.9,0.5', thumbnailEmoji: '🪑', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'table', label: 'Table', category: 'furniture', glbPath: '__primitive:box:1.2,0.75,0.6', thumbnailEmoji: '🪵', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'sofa', label: 'Sofa', category: 'furniture', glbPath: '__primitive:box:1.8,0.8,0.8', thumbnailEmoji: '🛋️', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'bed', label: 'Bed', category: 'furniture', glbPath: '__primitive:box:1.4,0.5,2.0', thumbnailEmoji: '🛏️', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'desk', label: 'Desk', category: 'furniture', glbPath: '__primitive:box:1.4,0.75,0.7', thumbnailEmoji: '🗃️', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'door', label: 'Door', category: 'furniture', glbPath: '__primitive:box:0.9,2.1,0.1', thumbnailEmoji: '🚪', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },

  // People
  { id: 'person-adult', label: 'Adult', category: 'people', glbPath: '__primitive:capsule:0.3,1.75', thumbnailEmoji: '🧍', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'person-child', label: 'Child', category: 'people', glbPath: '__primitive:capsule:0.25,1.2', thumbnailEmoji: '🧒', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'person-sitting', label: 'Sitting Figure', category: 'people', glbPath: '__primitive:box:0.4,0.9,0.4', thumbnailEmoji: '🪑', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },

  // Outdoor
  { id: 'tree', label: 'Tree', category: 'outdoor', glbPath: '__primitive:tree', thumbnailEmoji: '🌳', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'bench', label: 'Park Bench', category: 'outdoor', glbPath: '__primitive:bench', thumbnailEmoji: '🪑', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'car', label: 'Car', category: 'outdoor', glbPath: '__primitive:box:4,1.5,2', thumbnailEmoji: '🚗', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'fence', label: 'Fence Section', category: 'outdoor', glbPath: '__primitive:box:2,1,0.1', thumbnailEmoji: '🏚️', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'streetlight', label: 'Street Light', category: 'outdoor', glbPath: '__primitive:streetlight', thumbnailEmoji: '💡', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },

  // Props
  { id: 'box-small', label: 'Small Box', category: 'props', glbPath: '__primitive:box:0.4,0.4,0.4', thumbnailEmoji: '📦', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
  { id: 'wall', label: 'Wall Section', category: 'props', glbPath: '__primitive:box:3,2.5,0.2', thumbnailEmoji: '🧱', defaultScale: { x: 1, y: 1, z: 1 }, pivotAtBase: true },
]

export function getDefinitionById(id: string): ObjectDefinition | undefined {
  return OBJECT_LIBRARY.find((d) => d.id === id)
}

export function getByCategory(category: string): ObjectDefinition[] {
  return OBJECT_LIBRARY.filter((d) => d.category === category)
}
