import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  VideoTexture,
  Vector3,
  Color3,
  Color4,
  Mesh,
} from '@babylonjs/core'

/**
 * Wraps the player inside a giant sphere with the video playing on the inner surface.
 * Creates an immediate "inside the memory" feeling — no processing, no queue.
 */
export async function buildVideoWorld(
  scene: Scene,
  videoFile: File,
): Promise<{ startPosition: Vector3; lookTarget: Vector3 }> {
  // Clean up old meshes
  scene.meshes
    .filter((m) => m.name.startsWith('video') || m.name.startsWith('layer_') || m.name === 'photoGround')
    .forEach((m) => { m.material?.dispose(); m.dispose() })

  const videoUrl = URL.createObjectURL(videoFile)

  // Large sphere — player inside, video on inner surface
  const sphere = MeshBuilder.CreateSphere('videoSphere', {
    diameter: 120,
    segments: 64,
    sideOrientation: Mesh.BACKSIDE,
  }, scene)
  sphere.isPickable = false

  const videoTexture = new VideoTexture('videoTex', videoUrl, scene, false, true)
  videoTexture.video.loop = true
  videoTexture.video.playsInline = true

  // Autoplay — browsers may block unmuted autoplay
  videoTexture.video.muted = true
  videoTexture.video.play().catch(() => {})

  const mat = new StandardMaterial('videoMat', scene)
  mat.diffuseTexture = videoTexture
  mat.emissiveTexture = videoTexture
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.backFaceCulling = false
  mat.disableLighting = true
  sphere.material = mat

  // Invisible ground
  const ground = MeshBuilder.CreateGround('videoGround', { width: 80, height: 80 }, scene)
  ground.position.y = -1.7
  ground.checkCollisions = true
  ground.isVisible = false

  scene.clearColor = new Color4(0, 0, 0, 1)

  return {
    startPosition: new Vector3(0, 0, 0),
    lookTarget: new Vector3(0, 0, 10),
  }
}
