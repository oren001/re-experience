import type { Vector3Like } from './scene.types'

export interface Waypoint {
  id: string
  label: string
  position: Vector3Like
  lookAt?: Vector3Like
  note?: string
}

export interface Annotation {
  id: string
  text: string
  position: Vector3Like
  waypointId?: string
}

export interface PacingState {
  isPaused: boolean
  speedMultiplier: number  // 0.25 – 2.0
}
