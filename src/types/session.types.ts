import type { EnvironmentConfig, SceneObject } from './scene.types'
import type { Annotation, Waypoint } from './therapist.types'

export interface SessionMetadata {
  id: string
  name: string
  patientAlias: string
  createdAt: string
  updatedAt: string
}

export interface SavedSession extends SessionMetadata {
  objects: SceneObject[]
  environment: EnvironmentConfig
  waypoints: Waypoint[]
  annotations: Annotation[]
  notes: string
  babylonScene?: object  // serialized Babylon scene JSON
}
