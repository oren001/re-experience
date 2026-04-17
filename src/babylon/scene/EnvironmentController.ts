import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
} from '@babylonjs/core'
import type { EnvironmentConfig, WeatherMood } from '@/types/scene.types'

export class EnvironmentController {
  private hemi: HemisphericLight
  private sun: DirectionalLight

  constructor(private scene: Scene) {
    this.hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
    this.hemi.intensity = 0.5

    this.sun = new DirectionalLight('sun', new Vector3(-1, -2, -1).normalize(), scene)
    this.sun.intensity = 0.8
    this.sun.position = new Vector3(20, 40, 20)
  }

  apply(config: EnvironmentConfig) {
    this.setTimeOfDay(config.timeOfDay, config.ambientIntensity)
    this.setWeatherMood(config.weatherMood, config.fogDensity)
  }

  setTimeOfDay(hour: number, ambientIntensity: number) {
    // 0=midnight, 6=dawn, 10=morning, 14=afternoon, 18=dusk, 22=night
    const t = hour / 24

    // Sun color temperature
    const isDawn = hour >= 5 && hour <= 8
    const isDusk = hour >= 17 && hour <= 20
    const isNight = hour < 5 || hour > 21

    let sunColor: Color3
    let skyColor: Color4

    if (isNight) {
      sunColor = new Color3(0.05, 0.05, 0.15)
      skyColor = new Color4(0.02, 0.02, 0.08, 1)
      this.sun.intensity = 0.05
      this.hemi.intensity = 0.1
    } else if (isDawn || isDusk) {
      sunColor = new Color3(1, 0.5, 0.2)
      skyColor = new Color4(0.6, 0.3, 0.15, 1)
      this.sun.intensity = 0.5
      this.hemi.intensity = 0.4
    } else {
      sunColor = new Color3(1, 0.95, 0.85)
      skyColor = new Color4(0.4, 0.6, 0.9, 1)
      this.sun.intensity = ambientIntensity
      this.hemi.intensity = ambientIntensity * 0.7
    }

    this.sun.diffuse = sunColor
    this.scene.clearColor = skyColor

    // Sun angle
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2
    this.sun.direction = new Vector3(Math.cos(angle), -Math.abs(Math.sin(angle)) - 0.3, 0.5).normalize()
  }

  setWeatherMood(mood: WeatherMood, fogDensity: number) {
    switch (mood) {
      case 'clear':
        this.scene.fogMode = Scene.FOGMODE_NONE
        this.hemi.groundColor = new Color3(0.3, 0.3, 0.3)
        break
      case 'overcast':
        this.scene.fogMode = Scene.FOGMODE_EXP
        this.scene.fogDensity = 0.005
        this.scene.fogColor = new Color3(0.7, 0.7, 0.75)
        this.sun.intensity *= 0.4
        this.hemi.intensity *= 0.6
        break
      case 'foggy':
        this.scene.fogMode = Scene.FOGMODE_EXP2
        this.scene.fogDensity = 0.03
        this.scene.fogColor = new Color3(0.8, 0.8, 0.82)
        this.sun.intensity *= 0.2
        this.hemi.intensity *= 0.5
        break
      case 'stormy':
        this.scene.fogMode = Scene.FOGMODE_EXP
        this.scene.fogDensity = 0.02
        this.scene.fogColor = new Color3(0.3, 0.3, 0.35)
        this.scene.clearColor = new Color4(0.15, 0.15, 0.2, 1)
        this.sun.intensity *= 0.15
        this.hemi.intensity *= 0.3
        break
    }
  }

  dispose() {
    this.hemi.dispose()
    this.sun.dispose()
  }
}
