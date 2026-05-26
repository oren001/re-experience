// Builds a navigable depth-parallax world from a photo *URL* (e.g. a bundled
// memory in /public/memories or any same-origin image). Mirrors the File-based
// flow in PhotoUpload, but sourced from a URL so library cards can open into it.
import { estimateDepth } from './DepthEstimator'
import { getSceneManager } from '@/hooks/useBabylonEngine'

/**
 * Corrects EXIF orientation by drawing through createImageBitmap (which applies
 * rotation) then re-exporting. Without this, portrait phone photos can appear
 * sideways.
 */
async function correctRotation(blob: Blob): Promise<{ imageUrl: string; imageBlob: Blob }> {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    return new Promise((resolve, reject) => {
      canvas.toBlob((out) => {
        if (!out) { reject(new Error('canvas toBlob failed')); return }
        resolve({ imageUrl: URL.createObjectURL(out), imageBlob: out })
      }, 'image/jpeg', 0.92)
    })
  } catch {
    return { imageUrl: URL.createObjectURL(blob), imageBlob: blob }
  }
}

/** Draws an image blob to a canvas and returns its pixel data. */
async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/**
 * Fetch a photo by URL, estimate its depth in-browser, and build the layered
 * parallax world inside the live Babylon scene. Resolves once the world is ready.
 */
export async function buildPhotoWorldFromUrl(
  url: string,
  onStatus?: (msg: string) => void,
): Promise<void> {
  onStatus?.('Loading photo…')
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Could not load photo (${resp.status})`)
  const file = await resp.blob()

  onStatus?.('Preparing image…')
  const { imageUrl, imageBlob } = await correctRotation(file)
  const photoData = await blobToImageData(imageBlob)

  onStatus?.('Loading depth model (first run ~30s, then instant)…')
  const depthData = await estimateDepth(imageBlob, onStatus)

  onStatus?.('Building 3D world…')
  // Resolve the SceneManager *after* the async work: React StrictMode disposes
  // and recreates the engine on mount, so grabbing it earlier can target a
  // scene that's since been disposed. This always builds into the live scene.
  const sm = getSceneManager()
  if (!sm) throw new Error('Scene not ready')
  await sm.loadPhotoWorld(imageUrl, photoData, depthData)
}
