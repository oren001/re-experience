import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Color4,
  Vector3,
} from '@babylonjs/core'

// 4 depth layers ordered far → close.
// minD / maxD are normalised depth values (0 = far/dark, 1 = close/bright).
// z is the distance from the player's start position (positive = forward).
const LAYERS = [
  { minD: 0.00, maxD: 0.32, z: 22, feather: 0.07 },  // sky + far horizon
  { minD: 0.22, maxD: 0.58, z: 14, feather: 0.10 },  // background (trees, buildings)
  { minD: 0.48, maxD: 0.78, z:  8, feather: 0.10 },  // midground
  { minD: 0.68, maxD: 1.00, z:  4, feather: 0.08 },  // foreground (bench, people)
]

// Reference distance for perspective-consistent plane sizing.
// A plane at Z_REF with width WORLD_WIDTH exactly fills a 46° FOV camera from z=0.
const Z_REF = 22
const WORLD_WIDTH = 18  // metres

/**
 * Builds a layered parallax 3D scene from a photo + depth map.
 *
 * Each layer is a transparent plane placed at a different Z distance.
 * As the player walks forward (increasing Z) they move between the layers,
 * experiencing genuine 3D parallax and depth.
 *
 * Requires the original photo as an ImageData (pixel array) for alpha masking,
 * and the imageUrl for efficient Babylon texture loading.
 */
export async function buildLayeredPhotoWorld(
  scene: Scene,
  photoData: ImageData,
  depthData: ImageData,
  opts: { eyeLineFraction?: number } = {},
): Promise<{ startPosition: Vector3; lookTarget: Vector3 }> {
  const { eyeLineFraction = 0.52 } = opts   // fraction from top where the horizon / eye-line sits

  const aspect = photoData.width / photoData.height
  const worldHeight = WORLD_WIDTH / aspect

  // bottomY: the Y coordinate corresponding to the bottom edge of the image.
  // We want eyeLineFraction * worldHeight from top = eye-line at Y=0.
  const eyeLineFromBottom = 1 - eyeLineFraction
  const bottomY = -(eyeLineFromBottom * worldHeight)

  // Remove any old layers
  scene.meshes
    .filter((m) => m.name.startsWith('layer_') || m.name === 'photoGround')
    .forEach((m) => { m.material?.dispose(); m.dispose() })

  // Build all 4 layers in parallel (canvas operations + texture creation)
  await Promise.all(
    LAYERS.map(async (layer, i) => {
      const blobUrl = await maskLayerToUrl(photoData, depthData, layer.minD, layer.maxD, layer.feather)

      // Plane size: proportional to Z so all layers fill the same FOV from z=0
      const planeW = (layer.z / Z_REF) * WORLD_WIDTH
      const planeH = planeW / aspect

      const plane = MeshBuilder.CreatePlane(`layer_${i}`, {
        width: planeW,
        height: planeH,
        sideOrientation: Mesh.DOUBLESIDE,
      }, scene)

      plane.position = new Vector3(0, bottomY + eyeLineFromBottom * worldHeight, layer.z)
      plane.isPickable = false

      const mat = new StandardMaterial(`layerMat_${i}`, scene)
      const tex = new Texture(blobUrl, scene, false, true, Texture.BILINEAR_SAMPLINGMODE)
      tex.hasAlpha = true
      mat.diffuseTexture = tex
      mat.emissiveTexture = tex
      mat.emissiveColor = new Color3(1, 1, 1)
      mat.useAlphaFromDiffuseTexture = true
      mat.backFaceCulling = false
      mat.disableLighting = true
      mat.alphaMode = 2  // BABYLON.Engine.ALPHA_COMBINE
      plane.material = mat
    }),
  )

  // Invisible ground for player collision
  const ground = MeshBuilder.CreateGround('photoGround', { width: 80, height: 80 }, scene)
  ground.position.y = bottomY
  ground.checkCollisions = true
  ground.isVisible = false

  // Subtle sky colour (sample average of top row of photo)
  const skyColor = sampleAverageColor(photoData, 0, 0.08)
  scene.clearColor = new Color4(skyColor[0] / 255, skyColor[1] / 255, skyColor[2] / 255, 1)

  // Player starts slightly to the right of centre so depth layers are
  // immediately visible from an angle — makes the 3D obvious on first look.
  const startPosition = new Vector3(2.5, 0, -3)
  const lookTarget = new Vector3(-0.5, 0, LAYERS[1].z * 0.6)  // look toward background

  return { startPosition, lookTarget }
}

/** Produces a blob URL for a depth-range-masked version of the photo (PNG with alpha). */
async function maskLayerToUrl(
  photoData: ImageData,
  depthData: ImageData,
  minD: number,
  maxD: number,
  feather: number,
): Promise<string> {
  const w = photoData.width
  const h = photoData.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const result = ctx.createImageData(w, h)

  const dw = depthData.width
  const dh = depthData.height

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dpx = Math.min(Math.round((x / w) * dw), dw - 1)
      const dpy = Math.min(Math.round((y / h) * dh), dh - 1)
      const d = depthData.data[(dpy * dw + dpx) * 4] / 255

      let alpha = 0
      if (d >= minD && d <= maxD) {
        const edge = Math.min((d - minD) / feather, (maxD - d) / feather, 1)
        alpha = Math.round(Math.min(edge, 1) * 255)
      }

      const pi = (y * w + x) * 4
      result.data[pi + 0] = photoData.data[pi + 0]
      result.data[pi + 1] = photoData.data[pi + 1]
      result.data[pi + 2] = photoData.data[pi + 2]
      result.data[pi + 3] = alpha
    }
  }

  ctx.putImageData(result, 0, 0)

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob failed')),
      'image/png',
    )
  })
}

/** Returns [r, g, b] average of a horizontal band (topFrac to botFrac from top). */
function sampleAverageColor(d: ImageData, topFrac: number, botFrac: number): [number, number, number] {
  const y0 = Math.floor(topFrac * d.height)
  const y1 = Math.floor(botFrac * d.height)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y < y1; y += 4) {
    for (let x = 0; x < d.width; x += 4) {
      const i = (y * d.width + x) * 4
      r += d.data[i]; g += d.data[i + 1]; b += d.data[i + 2]; n++
    }
  }
  return n ? [r / n, g / n, b / n] : [100, 140, 200]
}
