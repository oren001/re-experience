import { useRef, useState } from 'react'
import { estimateDepth } from '@/services/DepthEstimator'
import { getSceneManager } from '@/hooks/useBabylonEngine'
import { saveScene } from '@/services/sceneLibrary'

interface Props {
  onReady: () => void
  onSplat?: (source: string, fileName: string) => void
  onBackToLibrary?: () => void
}

/**
 * Corrects EXIF orientation by drawing through createImageBitmap (which applies rotation)
 * then re-exporting as a blob. Without this, portrait phone photos appear sideways.
 */
async function correctRotation(file: File): Promise<{ imageUrl: string; imageBlob: Blob }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('canvas toBlob failed')); return }
        resolve({ imageUrl: URL.createObjectURL(blob), imageBlob: blob })
      }, 'image/jpeg', 0.92)
    })
  } catch {
    // Fallback: use file as-is
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
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

export function PhotoUpload({ onReady, onSplat, onBackToLibrary }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const handleUrlSubmit = () => {
    const url = urlInput.trim()
    if (!url) return
    if (url.includes('vid2scene.com/viewer/') && onSplat) {
      onSplat(url, '')
    } else {
      setError('Paste a vid2scene.com viewer URL')
    }
  }

  const processFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    const isPly = file.name.endsWith('.ply') || file.name.endsWith('.spz')
    if (!isVideo && !isImage && !isPly) { setError('Please upload an image, video, or .ply file'); return }

    // PLY / Gaussian Splat — save to IndexedDB then open viewer
    if (isPly && onSplat) {
      const data = await file.arrayBuffer()
      const name = file.name.replace(/\.(ply|spz)$/i, '').replace(/[_-]/g, ' ')
      await saveScene(name, file.name, data)
      onSplat(URL.createObjectURL(file), file.name)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const sm = getSceneManager()
      if (!sm) throw new Error('Scene not ready')

      if (isVideo) {
        setStatus('Loading video…')
        const previewUrl = URL.createObjectURL(file)
        setPreview(previewUrl)
        setStatus('Building immersive world…')
        await sm.loadVideoWorld(file)
      } else {
        setStatus('Preparing image…')
        const { imageUrl, imageBlob } = await correctRotation(file)
        setPreview(imageUrl)
        const photoData = await blobToImageData(imageBlob)
        setStatus('Loading depth model (first run ~30s, then instant)…')
        const depthData = await estimateDepth(imageBlob, setStatus)
        setStatus('Building 3D world…')
        await sm.loadPhotoWorld(imageUrl, photoData, depthData)
      }

      onReady()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setLoading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="mb-10 text-center">
        <div className="text-3xl font-light tracking-[0.2em] text-white/90 mb-1">Re-Experience</div>
        <div className="text-sm text-white/35 tracking-wider">Walk through your memory</div>
      </div>

      {!loading ? (
        <>
        <label
          htmlFor="photo-upload"
          className="flex flex-col items-center justify-center gap-4 w-80 h-56 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-sky-500/60 hover:bg-sky-950/20 transition-all"
        >
          <div className="text-5xl">🎞️</div>
          <div className="text-center">
            <div className="text-white/80 font-medium mb-1">Upload a photo or video</div>
            <div className="text-white/35 text-sm">Drag & drop or click to browse</div>
          </div>
          <div className="text-xs text-white/25">JPG/PNG — photo &nbsp;·&nbsp; MP4 — video &nbsp;·&nbsp; PLY — 3D splat</div>
          <input id="photo-upload" ref={inputRef} type="file" accept="image/*,video/*,.ply,.spz" onChange={onFileChange} className="hidden" />
        </label>

        {/* vid2scene URL input */}
        <div className="mt-6 w-80">
          <div className="text-xs text-white/30 text-center mb-2">or paste a vid2scene viewer URL</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://vid2scene.com/viewer/..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-sky-500/50"
            />
            <button
              onClick={handleUrlSubmit}
              className="px-4 py-2 bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/30 rounded-lg text-sm text-sky-300 transition-colors"
            >
              View
            </button>
          </div>
        </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 w-80">
          {preview && (
            <img src={preview} alt="Uploaded" className="w-full rounded-xl object-cover max-h-48 opacity-80" />
          )}
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <div className="text-sm text-sky-300/80 text-center">{status}</div>
          {onBackToLibrary && (
            <button
              onClick={onBackToLibrary}
              className="text-xs text-white/30 hover:text-white/60 transition-colors mt-2"
            >
              ← Back to memories
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-400 text-sm bg-red-900/20 rounded-lg px-4 py-2 max-w-xs text-center">{error}</div>
      )}

      <div className="absolute bottom-8 text-xs text-white/20 text-center">
        Everything runs in your browser · Free · No data stored
      </div>
    </div>
  )
}
