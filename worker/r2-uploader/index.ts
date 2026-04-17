/**
 * Cloudflare Worker — R2 proxy for Re-Experience
 *
 * POST /upload-video   multipart form, field "video"  → re-experience-videos bucket
 * POST /upload-scene   raw body (.ply), header X-Scene-Key: scenes/job123/name.ply
 *                      header X-Worker-Secret: <shared secret>
 *                      → re-experience-scenes bucket
 * GET  /health         → 200 OK
 */

export interface Env {
  VIDEOS:        R2Bucket
  SCENES:        R2Bucket
  PUBLIC_URL_V:  string    // videos public URL
  PUBLIC_URL_S:  string    // scenes public URL
  WORKER_SECRET: string    // shared secret between this Worker and RunPod
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Scene-Key, X-Worker-Secret',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    const path = new URL(request.url).pathname

    // ── Health ────────────────────────────────────────────────────────────
    if (path === '/health') {
      return Response.json({ ok: true }, { headers: CORS })
    }

    // ── Video upload (browser → R2) ───────────────────────────────────────
    if (path === '/upload-video' && request.method === 'POST') {
      try {
        const form = await request.formData()
        const file = form.get('video') as File | null
        if (!file) return Response.json({ error: 'No video field' }, { status: 400, headers: CORS })

        const ext = file.name.split('.').pop() ?? 'mp4'
        const key = `uploads/${Date.now()}.${ext}`

        await env.VIDEOS.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'video/mp4' },
        })

        const publicUrl = `${env.PUBLIC_URL_V.replace(/\/$/, '')}/${key}`
        return Response.json({ publicUrl, key }, { headers: CORS })
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 500, headers: CORS })
      }
    }

    // ── Scene upload (RunPod → R2) ─────────────────────────────────────────
    if (path === '/upload-scene' && request.method === 'POST') {
      // Authenticate with shared secret
      const secret = request.headers.get('X-Worker-Secret')
      if (!secret || secret !== env.WORKER_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
      }

      const key = request.headers.get('X-Scene-Key')
      if (!key) return Response.json({ error: 'Missing X-Scene-Key header' }, { status: 400, headers: CORS })

      try {
        const body = request.body
        if (!body) return Response.json({ error: 'Empty body' }, { status: 400, headers: CORS })

        await env.SCENES.put(key, body, {
          httpMetadata: { contentType: 'application/octet-stream' },
        })

        const publicUrl = `${env.PUBLIC_URL_S.replace(/\/$/, '')}/${key}`
        return Response.json({ publicUrl, key }, { headers: CORS })
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 500, headers: CORS })
      }
    }

    return new Response('Not found', { status: 404, headers: CORS })
  },
}
