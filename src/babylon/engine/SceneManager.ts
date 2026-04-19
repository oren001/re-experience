// Scene orchestrator — photo world + safe space
import {
  Scene,
  Engine,
  UniversalCamera,
  Vector3,
  HemisphericLight,
  Color3,
  Color4,
} from '@babylonjs/core'
import { buildLayeredPhotoWorld } from '../scene/PhotoWorldBuilder'
import { buildVideoWorld } from '../scene/VideoWorldBuilder'
import { buildSafeSpace } from '../safeSpace/SafeSpaceScene'

export class SceneManager {
  scene: Scene
  private safeScene: Scene | null = null
  private canvas: HTMLCanvasElement
  private camera: UniversalCamera | null = null
  private isSafeSpace = false

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.canvas = canvas

    this.scene = new Scene(engine)
    this.scene.gravity = new Vector3(0, -0.98, 0)
    this.scene.collisionsEnabled = true
    this.scene.clearColor = new Color4(0.45, 0.6, 0.8, 1)

    // Soft ambient light
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene)
    ambient.intensity = 0.4
    ambient.diffuse = new Color3(1, 1, 1)

    // Idle camera so the scene renders without crashing before a photo is loaded
    const idleCam = new UniversalCamera('idleCam', new Vector3(0, 1.7, -5), this.scene)
    idleCam.setTarget(Vector3.Zero())
    this.scene.activeCamera = idleCam

    engine.runRenderLoop(() => {
      const active = this.isSafeSpace && this.safeScene ? this.safeScene : this.scene
      active.render()
    })
  }

  async loadPhotoWorld(_imageUrl: string, photoData: globalThis.ImageData, depthData: globalThis.ImageData) {
    // Remove previous photo world meshes
    this.scene.meshes
      .filter((m) => m.name.startsWith('layer_') || m.name === 'photoGround' || m.name === 'photoWorld')
      .forEach((m) => { m.material?.dispose(); m.dispose() })

    // Build layers (async — keep the idle camera alive during this await so
    // the render loop never runs without a camera)
    const { startPosition, lookTarget } = await buildLayeredPhotoWorld(
      this.scene,
      photoData,
      depthData,
    )

    // Now safe to remove the idle / previous camera
    const idleCam = this.scene.getCameraByName('idleCam')
    idleCam?.dispose()
    if (this.camera) {
      this.camera.detachControl()
      this.camera.dispose()
    }

    // First-person navigation camera
    const cam = new UniversalCamera('navCam', startPosition, this.scene)
    cam.setTarget(lookTarget)
    cam.speed = 0.12
    cam.angularSensibility = 900
    cam.minZ = 0.1
    cam.checkCollisions = true
    cam.applyGravity = true
    cam.ellipsoid = new Vector3(0.4, 0.85, 0.4)
    cam.keysUp    = [87, 38]  // W / ↑
    cam.keysDown  = [83, 40]  // S / ↓
    cam.keysLeft  = [65, 37]  // A / ←
    cam.keysRight = [68, 39]  // D / →
    cam.attachControl(this.canvas, true)

    this.camera = cam
    this.scene.activeCamera = cam
  }

  async loadVideoWorld(videoFile: File) {
    this.scene.meshes
      .filter((m) => m.name.startsWith('video') || m.name.startsWith('layer_') || m.name === 'photoGround')
      .forEach((m) => { m.material?.dispose(); m.dispose() })

    const { startPosition, lookTarget } = await buildVideoWorld(this.scene, videoFile)

    const idleCam = this.scene.getCameraByName('idleCam')
    idleCam?.dispose()
    if (this.camera) {
      this.camera.detachControl()
      this.camera.dispose()
    }

    const cam = new UniversalCamera('navCam', startPosition, this.scene)
    cam.setTarget(lookTarget)
    cam.speed = 0.08
    cam.angularSensibility = 800
    cam.minZ = 0.1
    cam.checkCollisions = false
    cam.ellipsoid = new Vector3(0.4, 0.85, 0.4)
    cam.keysUp    = [87, 38]
    cam.keysDown  = [83, 40]
    cam.keysLeft  = [65, 37]
    cam.keysRight = [68, 39]
    cam.attachControl(this.canvas, true)

    this.camera = cam
    this.scene.activeCamera = cam
  }

  setSpeedMultiplier(mult: number) {
    if (this.camera) this.camera.speed = 0.12 * mult
  }

  setPaused(paused: boolean) {
    if (!this.camera) return
    if (paused) {
      this.camera.detachControl()
    } else {
      this.camera.attachControl(this.canvas, true)
    }
  }

  // ── Mode stubs (used by legacy CanvasContainer hooks) ──────────────────
  setBuildMode() { /* no-op in current splat-viewer architecture */ }
  setNavigationMode() { /* no-op */ }
  applyEnvironment(_env: unknown) { /* no-op */ }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sceneBuilder: any = null

  setSafeSpaceMode(active: boolean) {
    this.isSafeSpace = active
    if (active && !this.safeScene) {
      this.safeScene = buildSafeSpace(this.scene.getEngine() as Engine)
    }
  }

  dispose() {
    this.scene.dispose()
    this.safeScene?.dispose()
  }
}
