/**
 * splatProcessor.ts
 * Uploads a video to R2, submits a RunPod job, polls until done,
 * then returns the resulting .ply URL for the scene library.
 */

const RUNPOD_API_KEY  = import.meta.env.VITE_RUNPOD_API_KEY  as string
const RUNPOD_ENDPOINT = import.meta.env.VITE_RUNPOD_ENDPOINT_ID as string
const R2_UPLOAD_URL   = import.meta.env.VITE_R2_UPLOAD_URL   as string

const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}`

export type ProcessingStatus =
  | { stage: 'uploading';  progress: number }
  | { stage: 'queued' }
  | { stage: 'processing'; message: string }
  | { stage: 'done';       plyUrl: string; splatCount: number }
  | { stage: 'error';      message: string }

export async function processVideo(
  videoFile: File,
  sceneName: string,
  onStatus: (s: ProcessingStatus) => void,
): Promise<string> {   // returns PLY URL

  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT || !R2_UPLOAD_URL) {
    throw new Error('Missing configuration — VITE_RUNPOD_API_KEY, VITE_RUNPOD_ENDPOINT_ID and VITE_R2_UPLOAD_URL must be set')
  }

  // ── 1. Upload video to R2 via the Cloudflare Worker ───────────────────────
  onStatus({ stage: 'uploading', progress: 0 })
  const publicUrl = await uploadVideoWithProgress(
    videoFile,
    `${R2_UPLOAD_URL}/upload-video`,
    (p) => onStatus({ stage: 'uploading', progress: p }),
  )

  // ── 2. Submit RunPod job ──────────────────────────────────────────────────
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
  if (!submitRes.ok) {
    const txt = await submitRes.text().catch(() => submitRes.statusText)
    throw new Error(`RunPod submit failed (${submitRes.status}): ${txt}`)
  }
  const { id: jobId } = await submitRes.json() as { id: string }
  console.log('[splatProcessor] RunPod job submitted:', jobId)

  // ── 3. Poll until complete ────────────────────────────────────────────────
  return pollJob(jobId, onStatus)
}

async function uploadVideoWithProgress(
  file: File,
  url: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('video', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 400) {
        reject(new Error(`Video upload failed (${xhr.status}): ${xhr.responseText}`))
        return
      }
      try {
        const { publicUrl } = JSON.parse(xhr.responseText) as { publicUrl: string }
        if (!publicUrl) throw new Error('No publicUrl in upload response')
        resolve(publicUrl)
      } catch (e) {
        reject(new Error(`Bad upload response: ${xhr.responseText}`))
      }
    }
    xhr.onerror = () => reject(new Error('Video upload network error'))
    xhr.send(form)
  })
}

async function pollJob(
  jobId: string,
  onStatus: (s: ProcessingStatus) => void,
): Promise<string> {
  const POLL_INTERVAL_MS = 10_000          // 10 s between polls
  const TIMEOUT_MS       = 60 * 60 * 1000 // 60 min max

  const deadline = Date.now() + TIMEOUT_MS
  let lastStage  = ''

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    let data: RunPodStatus
    try {
      const res = await fetch(`${RUNPOD_BASE}/status/${jobId}`, {
        headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
      })
      if (!res.ok) continue
      data = await res.json() as RunPodStatus
    } catch {
      continue  // transient network error — keep polling
    }

    const { status, output, error } = data
    console.log('[splatProcessor] poll:', status, output?.elapsed_seconds ? `${output.elapsed_seconds}s` : '')

    if (status === 'IN_QUEUE' && lastStage !== 'queued') {
      onStatus({ stage: 'queued' })
      lastStage = 'queued'
    } else if (status === 'IN_PROGRESS' && lastStage !== 'processing') {
      onStatus({ stage: 'processing', message: 'Building your 3D scene…' })
      lastStage = 'processing'
    } else if (status === 'COMPLETED') {
      if (!output?.ply_url) throw new Error('Job completed but no ply_url returned')
      onStatus({ stage: 'done', plyUrl: output.ply_url, splatCount: output.splat_count ?? 0 })
      return output.ply_url
    } else if (status === 'FAILED') {
      throw new Error(error ?? 'RunPod job failed')
    } else if (status === 'CANCELLED') {
      throw new Error('RunPod job was cancelled')
    }
  }

  throw new Error('Processing timed out after 60 minutes')
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RunPodStatus {
  id: string
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  output?: {
    ply_url:          string
    scene_name:       string
    splat_count:      number
    ply_size_mb:      number
    elapsed_seconds:  number
  }
  error?: string
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
