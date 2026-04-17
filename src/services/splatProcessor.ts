/**
 * splatProcessor.ts
 * Uploads a video to R2, submits a RunPod job, polls until done,
 * then saves the resulting .ply into the scene library.
 */

const RUNPOD_API_KEY  = import.meta.env.VITE_RUNPOD_API_KEY as string
const RUNPOD_ENDPOINT = import.meta.env.VITE_RUNPOD_ENDPOINT_ID as string   // e.g. "abc123xyz"
const R2_UPLOAD_URL   = import.meta.env.VITE_R2_UPLOAD_URL as string        // Worker URL that returns presigned PUT

const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}`

export type ProcessingStatus =
  | { stage: 'uploading';   progress: number }
  | { stage: 'queued' }
  | { stage: 'processing';  message: string }
  | { stage: 'done';        plyUrl: string; splatCount: number }
  | { stage: 'error';       message: string }

export async function processVideo(
  videoFile: File,
  sceneName: string,
  onStatus: (s: ProcessingStatus) => void,
): Promise<string> {   // returns ply URL

  // ── 1. Get presigned PUT URL from our Cloudflare Worker ─────────────────
  onStatus({ stage: 'uploading', progress: 0 })
  const presignRes = await fetch(`${R2_UPLOAD_URL}?name=${encodeURIComponent(videoFile.name)}`)
  if (!presignRes.ok) throw new Error('Failed to get upload URL')
  const { uploadUrl, publicUrl } = await presignRes.json() as { uploadUrl: string; publicUrl: string }

  // ── 2. Upload video to R2 ────────────────────────────────────────────────
  await uploadWithProgress(videoFile, uploadUrl, (p) =>
    onStatus({ stage: 'uploading', progress: p })
  )

  // ── 3. Submit RunPod job ─────────────────────────────────────────────────
  onStatus({ stage: 'queued' })
  const submitRes = await fetch(`${RUNPOD_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({
      input: {
        video_url:  publicUrl,
        scene_name: sceneName,
        quality:    'default',
      },
    }),
  })
  if (!submitRes.ok) throw new Error(`RunPod submit failed: ${submitRes.statusText}`)
  const { id: jobId } = await submitRes.json() as { id: string }

  // ── 4. Poll until complete ───────────────────────────────────────────────
  const plyUrl = await pollJob(jobId, onStatus)
  return plyUrl
}

async function pollJob(
  jobId: string,
  onStatus: (s: ProcessingStatus) => void,
): Promise<string> {
  const POLL_INTERVAL = 8_000   // 8 s
  const TIMEOUT_MS    = 45 * 60 * 1000  // 45 min max

  const deadline = Date.now() + TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL)

    const res = await fetch(`${RUNPOD_BASE}/status/${jobId}`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
    })
    if (!res.ok) continue

    const data = await res.json() as RunPodStatus
    const { status, output, error } = data

    if (status === 'IN_QUEUE') {
      onStatus({ stage: 'queued' })
    } else if (status === 'IN_PROGRESS') {
      onStatus({ stage: 'processing', message: 'Processing your memory…' })
    } else if (status === 'COMPLETED') {
      if (output?.ply_url) {
        onStatus({ stage: 'done', plyUrl: output.ply_url, splatCount: output.splat_count ?? 0 })
        return output.ply_url
      }
      throw new Error('Job completed but no ply_url returned')
    } else if (status === 'FAILED') {
      throw new Error(error ?? 'RunPod job failed')
    }
  }

  throw new Error('Processing timed out after 45 minutes')
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface RunPodStatus {
  id: string
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  output?: {
    ply_url: string
    scene_name: string
    splat_count: number
    ply_size_mb: number
    elapsed_seconds: number
  }
  error?: string
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload  = () => xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Upload network error'))
    xhr.send(file)
  })
}
