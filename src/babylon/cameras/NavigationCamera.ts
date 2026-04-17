import { UniversalCamera, Scene, Vector3 } from '@babylonjs/core'

export function createNavigationCamera(scene: Scene, canvas: HTMLCanvasElement): UniversalCamera {
  const camera = new UniversalCamera('navCam', new Vector3(0, 1.7, -5), scene)
  camera.setTarget(new Vector3(0, 1.7, 0))
  camera.speed = 0.15
  camera.angularSensibility = 800
  camera.minZ = 0.1
  camera.checkCollisions = true
  camera.ellipsoid = new Vector3(0.4, 0.85, 0.4)  // player capsule
  camera.attachControl(canvas, true)

  // WASD keys
  camera.keysUp = [87]     // W
  camera.keysDown = [83]   // S
  camera.keysLeft = [65]   // A
  camera.keysRight = [68]  // D

  return camera
}
