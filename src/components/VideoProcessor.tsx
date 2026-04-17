import { useState, useRef } from 'react'
import { processVideo, ProcessingStatus } from '@/services/splatProcessor'
import { saveScene } from '@/services/sceneLibrary'

interface Props {
  onDone: (id: string, name: string, fileName: string) => void
  onCancel: () => void
}

export function VideoProcessor({ onDone, onCancel }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [name, setName]         = useState('')
  const [status, setStatus]     = useState<ProcessingStatus | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file || !name.trim()) return
    setError(null)

    try {
      const plyUrl = await processVideo(file, name.trim(), setStatus)

      // Download the resulting .ply and save to local IndexedDB library
      setStatus({ stage: 'processing', message: 'Saving to your library…' })
      const res = await fetch(plyUrl)
      if (!res.ok) throw new Error('Failed to download result')
      const buf = await res.arrayBuffer()
      const fileName = `${name.trim().replace(/\s+/g, '-')}.ply`
      const id = await saveScene(name.trim(), fileName, buf)
      onDone(id, name.trim(), fileName)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus(null)
    }
  }

  const busy = status !== null && status.stage !== 'done' && status.stage !== 'error'

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center"
         style={{ background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(8px)' }}>
      <div style={{
        width: 480, background: '#13131a', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 32,
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            Process a new memory
          </h2>
          {!busy && (
            <button onClick={onCancel}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                       cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Drop zone */}
        {!status && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, padding: '32px 24px', textAlign: 'center',
                cursor: 'pointer', marginBottom: 16,
                background: file ? 'rgba(99,102,241,0.06)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <input ref={inputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {file ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 14 }}>
                    {file.name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                    {(file.size / 1e6).toFixed(1)} MB · click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📹</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    Drop a video or click to browse
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 6 }}>
                    MP4, MOV, or any video format · 30–120 sec works best
                  </div>
                </>
              )}
            </div>

            <input
              type="text"
              placeholder="Memory name (e.g. The Park, 2019)"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', marginBottom: 16,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: 'rgba(255,255,255,0.9)', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
              }}
            />

            {error && (
              <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px',
                background: 'rgba(248,113,113,0.08)', borderRadius: 6 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!file || !name.trim()} style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: file && name.trim() ? '#6366f1' : 'rgba(255,255,255,0.06)',
                color: file && name.trim() ? 'white' : 'rgba(255,255,255,0.2)',
                cursor: file && name.trim() ? 'pointer' : 'default',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}>
                Process memory →
              </button>
            </div>
          </>
        )}

        {/* Processing state */}
        {status && status.stage !== 'done' && (
          <ProcessingView status={status} />
        )}
      </div>
    </div>
  )
}

function ProcessingView({ status }: { status: ProcessingStatus }) {
  const stages = ['uploading', 'queued', 'processing']
  const idx = stages.indexOf(status.stage)

  const stageLabels: Record<string, string> = {
    uploading:  'Uploading video…',
    queued:     'Waiting in queue…',
    processing: 'status' in status ? (status as { message: string }).message : 'Building 3D scene…',
  }

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>🧠</div>

      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
        {stageLabels[status.stage] ?? 'Working…'}
      </div>

      {status.stage === 'uploading' && 'progress' in status && (
        <div style={{ margin: '12px auto', width: 240, height: 3,
          background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{ width: `${status.progress}%`, height: '100%',
            background: '#6366f1', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}

      {/* Stage dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
        {stages.map((s, i) => (
          <div key={s} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i <= idx ? '#6366f1' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 20 }}>
        This takes 15–20 minutes. You can leave this tab open.
      </div>
    </div>
  )
}
