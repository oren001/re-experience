import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Color4,
  Vector3,
  VertexData,
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

/**
 * Builds a single CONTINUOUS depth-displaced mesh from a photo + depth map —
 * not a stack of flat billboards. Every grid vertex is pushed along Z by its
 * per-pixel depth, so the scene becomes a true 3D relief: foreground objects
 * stand proud, the background recedes, and you fly *through* the geometry.
 *
 * Quads spanning a sharp depth discontinuity (e.g. a person's silhouette
 * against a far wall) are dropped rather than stretched, giving crisp edges
 * with the dark void behind instead of rubbery smears.
 */
export async function buildDepthMeshWorld(
  scene: Scene,
  photoData: ImageData,
  depthData: ImageData,
  imageUrl: string,
): Promise<{ startPosition: Vector3; lookTarget: Vector3; fov: number }> {
  // Clear any previous world (layers or a prior mesh)
  scene.meshes
    .filter((m) => m.name.startsWith('layer_') || m.name === 'photoMesh' || m.name === 'photoGround')
    .forEach((m) => { m.material?.dispose(); m.dispose() })

  const imgAspect = photoData.width / photoData.height
  const FOV      = 0.95            // vertical field of view (radians) for un-projection
  const tanV     = Math.tan(FOV / 2)
  const NEAR     = 3               // distance (m) of the closest pixels
  const FAR      = 15              // distance (m) of the farthest pixels (shallower = less smear)
  const MAX_STEP = 0.12            // cut quads across depth edges so foreground detaches from background

  // Grid resolution — denser along the longer image axis, capped for perf
  const cols = imgAspect >= 1 ? 220 : Math.round(220 * imgAspect)
  const rows = Math.max(2, Math.round(cols / imgAspect))

  const dw = depthData.width
  const dh = depthData.height
  const sampleDepth = (u: number, v: number) => {
    const x = Math.min(dw - 1, Math.max(0, Math.round(u * (dw - 1))))
    const y = Math.min(dh - 1, Math.max(0, Math.round(v * (dh - 1))))
    return depthData.data[(y * dw + x) * 4] / 255   // 1 = close, 0 = far
  }

  const positions: number[] = []
  const uvs: number[] = []
  const depthAt: number[] = []
  const stride = cols + 1

  // Perspective UN-projection: place each pixel along its camera ray at a
  // distance set by its depth. A camera at the origin with this same FOV then
  // sees the original photo, and moving reveals genuine parallax.
  for (let j = 0; j <= rows; j++) {
    const v = j / rows
    const ny = (0.5 - v) * 2
    for (let i = 0; i <= cols; i++) {
      const u = i / cols
      const nx = (u - 0.5) * 2
      const d = sampleDepth(u, v)
      depthAt.push(d)
      const Z = NEAR + (1 - d) * (FAR - NEAR)
      positions.push(nx * Z * tanV * imgAspect, ny * Z * tanV, Z)
      uvs.push(u, v)
    }
  }

  const indices: number[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * stride + i
      const b = a + 1
      const c = a + stride
      const e = c + 1
      // Skip quads bridging a steep depth edge (avoids stretched smears)
      const dmax = Math.max(depthAt[a], depthAt[b], depthAt[c], depthAt[e])
      const dmin = Math.min(depthAt[a], depthAt[b], depthAt[c], depthAt[e])
      if (dmax - dmin > MAX_STEP) continue
      indices.push(a, c, b, b, c, e)
    }
  }

  const mesh = new Mesh('photoMesh', scene)
  const vd = new VertexData()
  vd.positions = positions
  vd.indices = indices
  vd.uvs = uvs
  const normals: number[] = []
  VertexData.ComputeNormals(positions, indices, normals)
  vd.normals = normals
  vd.applyToMesh(mesh)
  mesh.isPickable = false

  const mat = new StandardMaterial('photoMeshMat', scene)
  const tex = new Texture(imageUrl, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE)
  mat.diffuseTexture = tex
  mat.emissiveTexture = tex
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.disableLighting = true
  mat.backFaceCulling = false
  mesh.material = mat

  // Dark, slightly tinted void + fog so cut edges and the far rim fade out
  const sky = sampleAverageColor(photoData, 0, 0.1)
  const bg = new Color3((sky[0] / 255) * 0.18, (sky[1] / 255) * 0.18, (sky[2] / 255) * 0.18)
  scene.clearColor = new Color4(bg.r, bg.g, bg.b, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogColor = bg
  scene.fogDensity = 0.018

  // Start at the projection apex (the photo fills the view) looking straight in
  const startPosition = new Vector3(0, 0, 0)
  const lookTarget = new Vector3(0, 0, NEAR + 4)
  return { startPosition, lookTarget, fov: FOV }
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
