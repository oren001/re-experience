import { useEffect, useState, useCallback } from 'react'
import {
  listScenes, getSceneData, deleteScene,
  deduplicateScenes, type SceneMeta,
} from '@/services/sceneLibrary'
import { VideoProcessor } from './VideoProcessor'

interface Props {
  onOpen: (source: string, fileName: string) => void
  onAddPhoto: () => void
}

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`
}

// Each scene gets a unique portal atmosphere
const PORTALS = [
  {
    bg: '#0a0a1a',
    glow: 'rgba(120,60,255,0.18)',
    orb1: 'rgba(100,40,220,0.35)',
    orb2: 'rgba(60,20,180,0.20)',
    line: 'rgba(160,100,255,0.5)',
    btn: 'rgba(140,80,255,0.15)',
    btnBorder: 'rgba(160,100,255,0.35)',
    btnText: '#c4b5fd',
    label: '#a78bfa',
  },
  {
    bg: '#050f0a',
    glow: 'rgba(20,180,120,0.15)',
    orb1: 'rgba(10,140,90,0.30)',
    orb2: 'rgba(5,100,70,0.18)',
    line: 'rgba(50,210,140,0.5)',
    btn: 'rgba(10,150,100,0.15)',
    btnBorder: 'rgba(50,200,130,0.35)',
    btnText: '#6ee7b7',
    label: '#34d399',
  },
  {
    bg: '#120508',
    glow: 'rgba(220,30,80,0.15)',
    orb1: 'rgba(180,20,60,0.30)',
    orb2: 'rgba(140,10,40,0.18)',
    line: 'rgba(250,80,120,0.5)',
    btn: 'rgba(200,30,70,0.15)',
    btnBorder: 'rgba(250,80,120,0.35)',
    btnText: '#fda4af',
    label: '#fb7185',
  },
]

function PortalCard({
  scene, index, onOpen, onDelete,
}: {
  scene: SceneMeta
  index: number
  onOpen: (scene: SceneMeta) => void
  onDelete: (id: string) => void
}) {
  const [opening, setOpening] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const p = PORTALS[index % PORTALS.length]

  const handleOpen = async () => {
    if (opening) return
    setOpening(true)
    try {
      if (scene.url) {
        // URL-based scene (seed or R2 scene): stream directly — avoids blob URL
        // issues with the gaussian-splats library's progressive loader
        onOpen({ ...scene, id: scene.url } as unknown as SceneMeta)
      } else {
        // Local scene stored in IndexedDB: load as blob
        const data = await getSceneData(scene.id)
        onOpen({ ...scene, id: URL.createObjectURL(new Blob([data])) } as unknown as SceneMeta)
      }
    } finally {
      setOpening(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return }
    deleteScene(scene.id).then(() => onDelete(scene.id))
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: p.bg,
        border: `1px solid ${hovered ? p.line : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered ? `0 0 60px ${p.glow}, 0 24px 48px rgba(0,0,0,0.6)` : '0 8px 32px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-4px) scale(1.008)' : 'translateY(0) scale(1)',
        transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
      }}
    >
      {/* Atmospheric orbs */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', width: '60%', height: '60%',
          top: '-20%', right: '-10%',
          background: p.orb1,
          borderRadius: '50%',
          filter: 'blur(60px)',
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.4s',
        }} />
        <div style={{
          position: 'absolute', width: '50%', height: '50%',
          bottom: '-10%', left: '-10%',
          background: p.orb2,
          borderRadius: '50%',
          filter: 'blur(50px)',
          opacity: hovered ? 0.8 : 0.4,
          transition: 'opacity 0.4s',
        }} />
        {/* Top shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${p.line} 50%, transparent 100%)`,
          opacity: hovered ? 1 : 0.3,
          transition: 'opacity 0.4s',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '28px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <span style={{
            fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: p.label,
            padding: '4px 10px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${p.btnBorder}`,
          }}>
            {scene.fileName.endsWith('.spz') ? 'SPZ' : 'PLY'}
          </span>
          <button
            onClick={handleDelete}
            style={{
              padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: confirmDelete ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: confirmDelete ? '#fca5a5' : 'rgba(255,255,255,0.18)',
              transition: 'all 0.2s',
            }}
            title={confirmDelete ? 'Click again to delete' : 'Delete'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>

        {/* Scene name — large and elegant */}
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '2rem', fontWeight: 200,
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.1, margin: 0,
          }}>
            {scene.name}
          </h2>
          <p style={{
            marginTop: '10px',
            fontSize: '11px', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.22)',
          }}>
            {formatSize(scene.sizeBytes)} · Gaussian Splat
          </p>
        </div>

        {/* Enter button */}
        <button
          onClick={handleOpen}
          disabled={opening}
          style={{
            marginTop: '28px',
            width: '100%', padding: '14px',
            borderRadius: '14px',
            border: `1px solid ${p.btnBorder}`,
            background: hovered ? p.btn : 'rgba(255,255,255,0.04)',
            color: p.btnText,
            fontSize: '13px', fontWeight: 500, letterSpacing: '0.06em',
            cursor: opening ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.3s',
            opacity: opening ? 0.6 : 1,
          }}
        >
          {opening ? (
            <>
              <span style={{
                width: 14, height: 14, border: `2px solid ${p.btnText}`,
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'inline-block',
              }} />
              Loading…
            </>
          ) : (
            <>
              Enter memory
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export function SceneLibrary({ onOpen, onAddPhoto }: Props) {
  const [scenes, setScenes] = useState<SceneMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [showVideoProcessor, setShowVideoProcessor] = useState(false)

  const WORKER = import.meta.env.VITE_R2_UPLOAD_URL ?? 'https://re-experience-uploader.oren001.workers.dev'

  // Seed scenes are virtual — they stream directly from R2 via the Worker proxy
  // (which returns Content-Length, ensuring the gaussian-splats library works reliably)
  const SEEDS: SceneMeta[] = [
    {
      id: 'seed-my-memory',
      name: 'My Memory',
      fileName: 'scene.ply',
      createdAt: 1_000_000_001,
      sizeBytes: 29_122_486,
      url: `${WORKER}/read-scene?key=${encodeURIComponent('seeds/scene.ply')}`,
    },
    {
      id: 'seed-rebecca',
      name: 'Rebecca',
      fileName: 'rebecca.ply',
      createdAt: 1_000_000_002,
      sizeBytes: 72_000_000,
      url: `${WORKER}/read-scene?key=${encodeURIComponent('seeds/rebecca.ply')}`,
    },
    {
      id: 'seed-garden',
      name: 'Garden',
      fileName: 'garden.ply',
      createdAt: 1_000_000_003,
      sizeBytes: 110_000_000,
      url: `${WORKER}/read-scene?key=${encodeURIComponent('seeds/garden.ply')}`,
    },
  ]

  const load = useCallback(async () => {
    try {
      await deduplicateScenes()
      const userScenes = await listScenes()
      // Seeds always appear; user scenes (from drag-drop or video processing) appear on top
      setScenes([...userScenes, ...SEEDS])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleOpen = useCallback((scene: SceneMeta & { id: string }) => {
    onOpen(scene.id, scene.fileName)
  }, [onOpen])

  const handleDelete = useCallback((id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id))
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#080810',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* CSS for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Deep space background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          top: '-200px', left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(80,40,180,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          bottom: '-100px', right: '10%',
          background: 'radial-gradient(circle, rgba(20,120,80,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'relative', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', padding: '48px 40px 32px',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '2rem', fontWeight: 200,
            letterSpacing: '0.22em', color: 'rgba(255,255,255,0.88)',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Re-Experience
          </h1>
          <p style={{
            margin: '6px 0 0', fontSize: '12px',
            letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)',
          }}>
            Walk through your memories
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowVideoProcessor(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '14px',
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc',
              fontSize: '13px', cursor: 'pointer',
              transition: 'all 0.2s', letterSpacing: '0.04em',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10l4.553-2.07A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
            </svg>
            Process Video
          </button>
        </div>
      </header>

      {/* Divider */}
      <div style={{ height: '1px', margin: '0 40px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />

      {/* Video processor overlay */}
      {showVideoProcessor && (
        <VideoProcessor
          onDone={(_id, _name, _fileName) => {
            setShowVideoProcessor(false)
            load()   // refresh scene list
          }}
          onCancel={() => setShowVideoProcessor(false)}
        />
      )}

      {/* Body */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 48px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
            <div style={{
              width: 32, height: 32,
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: 'rgba(255,255,255,0.5)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', letterSpacing: '0.06em' }}>
              Loading…
            </p>
          </div>
        )}

        {!loading && scenes.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', opacity: 0.15 }}>◎</div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '16px', fontWeight: 300, margin: 0 }}>No memories yet</p>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px', marginTop: 8 }}>Drop a PLY or SPZ file to begin</p>
            </div>
            <button onClick={onAddPhoto} style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>
              + Add your first memory
            </button>
          </div>
        )}

        {!loading && scenes.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {scenes.map((scene, i) => (
              <PortalCard
                key={scene.id}
                scene={scene}
                index={i}
                onOpen={handleOpen as (scene: SceneMeta) => void}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
