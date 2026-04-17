// Meshy AI 3D generation service
// Docs: https://docs.meshy.ai/api-text-to-3d

const API_BASE = 'https://api.meshy.ai/openapi/v2'
const DB_NAME = 're-experience-models'
const DB_VERSION = 1

function getApiKey(): string {
  return (import.meta as any).env?.VITE_MESHY_API_KEY ?? ''
}

// IndexedDB cache for generated GLB blobs
async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore('models', { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCached(key: string): Promise<string | null> {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction('models', 'readonly')
      const req = tx.objectStore('models').get(key)
      req.onsuccess = () => resolve(req.result?.objectUrl ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function setCached(key: string, blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('models', 'readwrite')
      tx.objectStore('models').put({ key, objectUrl })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Cache failure is non-fatal
  }
  return objectUrl
}

async function pollForResult(taskId: string, endpoint: string, onProgress?: (pct: number) => void): Promise<string> {
  const apiKey = getApiKey()
  const maxAttempts = 60
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await fetch(`${API_BASE}/${endpoint}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`)
    const data = await res.json()

    if (data.status === 'SUCCEEDED') {
      onProgress?.(100)
      return data.model_urls?.glb ?? data.model_urls?.obj ?? ''
    }
    if (data.status === 'FAILED') throw new Error(`Generation failed: ${data.message}`)

    onProgress?.(data.progress ?? (i * 2))
  }
  throw new Error('Generation timed out')
}

export async function generateFromText(
  prompt: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const cacheKey = `text:${prompt}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const apiKey = getApiKey()
  if (!apiKey) throw new Error('VITE_MESHY_API_KEY is not set')

  const res = await fetch(`${API_BASE}/text-to-3d`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: 'realistic',
      negative_prompt: 'low quality, blurry',
    }),
  })
  if (!res.ok) throw new Error(`Meshy API error: ${res.status} ${await res.text()}`)
  const { result: taskId } = await res.json()

  const glbUrl = await pollForResult(taskId, 'text-to-3d', onProgress)

  // Download GLB and cache as blob URL
  const glbRes = await fetch(glbUrl)
  const blob = await glbRes.blob()
  return setCached(cacheKey, blob)
}

export async function generateFromImage(
  imageBase64: string,  // data:image/jpeg;base64,...
  onProgress?: (pct: number) => void
): Promise<string> {
  const cacheKey = `image:${imageBase64.slice(0, 80)}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const apiKey = getApiKey()
  if (!apiKey) throw new Error('VITE_MESHY_API_KEY is not set')

  const res = await fetch(`${API_BASE}/image-to-3d`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      image_url: imageBase64,
      enable_pbr: true,
    }),
  })
  if (!res.ok) throw new Error(`Meshy API error: ${res.status} ${await res.text()}`)
  const { result: taskId } = await res.json()

  const glbUrl = await pollForResult(taskId, 'image-to-3d', onProgress)
  const glbRes = await fetch(glbUrl)
  const blob = await glbRes.blob()
  return setCached(cacheKey, blob)
}
