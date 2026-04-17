export type ObjectCategory = 'furniture' | 'people' | 'outdoor' | 'props' | 'generated'

export type WeatherMood = 'clear' | 'overcast' | 'foggy' | 'stormy'

export type SceneMode = 'build' | 'navigate' | 'safe-space'

export interface Vector3Like {
  x: number
  y: number
  z: number
}

export interface TransformConfig {
  position: Vector3Like
  rotation: Vector3Like
  scaling: Vector3Like
}

export interface SceneObject {
  id: string
  definitionId: string
  label: string
  category: ObjectCategory
  transform: TransformConfig
  glbPath: string
  generatedFromPrompt?: string
}

export interface EnvironmentConfig {
  timeOfDay: number        // 0-24
  weatherMood: WeatherMood
  ambientIntensity: number // 0-1
  fogDensity: number       // 0-1
}

export interface ObjectDefinition {
  id: string
  label: string
  category: ObjectCategory
  glbPath: string
  thumbnailEmoji: string
  defaultScale: Vector3Like
  pivotAtBase: boolean
}
