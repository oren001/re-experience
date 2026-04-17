// Runs Depth Anything v2 Small entirely in the browser via ONNX/WebAssembly.
// No API key, no CORS issues, free — model (~50MB) downloads once then is cached.
import { pipeline, RawImage } from '@huggingface/transformers'

let depthPipeline: Awaited<ReturnType<typeof pipeline>> | null = null

async function getDepthPipeline(onStatus?: (msg: string) => void) {
  if (depthPipeline) return depthPipeline

  onStatus?.('Loading depth model (first time ~30s, then cached)…')
  depthPipeline = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
    device: 'wasm',
  })
  return depthPipeline
}

export async function estimateDepth(
  imageBlob: Blob,
  onStatus?: (msg: string) => void,
): Promise<ImageData> {
  try {
    const pipe = await getDepthPipeline(onStatus)
    onStatus?.('Estimating depth…')

    const imageUrl = URL.createObjectURL(imageBlob)
    const result = await (pipe as any)(imageUrl) as { depth: RawImage; predicted_depth: any }
    URL.revokeObjectURL(imageUrl)

    onStatus?.('Processing depth map…')
    const depthImg: RawImage = result.depth

    // RawImage → ImageData (normalise to 0-255 grayscale)
    const canvas = document.createElement('canvas')
    canvas.width = depthImg.width
    canvas.height = depthImg.height
    const ctx = canvas.getContext('2d')!
    const imgData = ctx.createImageData(depthImg.width, depthImg.height)

    // depthImg.data is a Float32Array or Uint8Array depending on model output
    const src = depthImg.data as unknown as ArrayLike<number>
    const isFloat = src[0] !== undefined && (src[0] as number) <= 1.0 && (src[0] as number) >= 0

    for (let i = 0; i < depthImg.width * depthImg.height; i++) {
      const v = isFloat ? Math.round((src[i] as number) * 255) : (src[i] as number)
      imgData.data[i * 4 + 0] = v
      imgData.data[i * 4 + 1] = v
      imgData.data[i * 4 + 2] = v
      imgData.data[i * 4 + 3] = 255
    }

    return imgData
  } catch (err) {
    console.warn('Depth estimation failed, using fallback:', err)
    onStatus?.('Using estimated depth…')
    return generateFallbackDepth(512, 384)
  }
}

// Fallback: vertical gradient — ground (bottom) close, sky (top) far
export function generateFallbackDepth(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vt = y / h                          // 0=top, 1=bottom
      const cx = Math.abs(x / w - 0.5) * 2     // 0=centre, 1=edge
      const val = Math.round(Math.min(vt * 0.75 + (1 - cx) * 0.25, 1) * 255)
      const i = (y * w + x) * 4
      data[i] = data[i + 1] = data[i + 2] = val
      data[i + 3] = 255
    }
  }
  return new ImageData(data, w, h)
}
