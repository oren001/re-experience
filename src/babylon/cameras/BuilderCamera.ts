import { ArcRotateCamera, Scene, Vector3 } from '@babylonjs/core'

export function createBuilderCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
  const camera = new ArcRotateCamera('builderCam', -Math.PI / 2, Math.PI / 3, 20, Vector3.Zero(), scene)
  camera.lowerRadiusLimit = 2
  camera.upperRadiusLimit = 80
  camera.lowerBetaLimit = 0.1
  camera.upperBetaLimit = Math.PI / 2 - 0.05
  camera.wheelPrecision = 10
  camera.attachControl(canvas, true)
  return camera
}
