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

// Per-card color themes — warm, intimate, gallery-like
const THEMES = [
  {
    orb1: 'rgba(255,185,60,0.28)',  orb2: 'rgba(220,100,30,0.18)', orb3: 'rgba(255,230,130,0.14)',
    shimmer: 'rgba(255,210,110,0.6)', glow: 'rgba(255,185,60,0.22)',
    border: 'rgba(255,210,110,0.55)', tag: '#f59e0b',
    btn: 'rgba(255,185,60,0.14)', btnBorder: 'rgba(255,210,110,0.5)', btnText: '#fde68a',
  },
  {
    orb1: 'rgba(255,130,165,0.28)', orb2: 'rgba(200,60,115,0.18)', orb3: 'rgba(255,190,210,0.14)',
    shimmer: 'rgba(255,175,200,0.6)', glow: 'rgba(255,130,165,0.22)',
    border: 'rgba(255,175,200,0.55)', tag: '#f472b6',
    btn: 'rgba(255,130,165,0.14)', btnBorder: 'rgba(255,175,200,0.5)', btnText: '#fbcfe8',
  },
  {
    orb1: 'rgba(55,205,165,0.28)',  orb2: 'rgba(20,140,105,0.18)', orb3: 'rgba(100,235,195,0.14)',
    shimmer: 'rgba(100,225,185,0.6)', glow: 'rgba(55,205,165,0.22)',
    border: 'rgba(100,225,185,0.55)', tag: '#34d399',
    btn: 'rgba(55,205,165,0.14)', btnBorder: 'rgba(100,225,185,0.5)', btnText: '#a7f3d0',
  },
  {
    orb1: 'rgba(145,100,255,0.28)', orb2: 'rgba(100,55,220,0.18)', orb3: 'rgba(195,160,255,0.14)',
    shimmer: 'rgba(185,155,255,0.6)', glow: 'rgba(145,100,255,0.22)',
    border: 'rgba(185,155,255,0.55)', tag: '#a78bfa',
    btn: 'rgba(145,100,255,0.14)', btnBorder: 'rgba(185,155,255,0.5)', btnText: '#ddd6fe',
  },
]

const CSS = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes orb1    { 0%,100%{transform:translate(0,0) scale(1)}  40%{transform:translate(-10px,14px) scale(1.06)} 70%{transform:translate(12px,-8px) scale(0.96)} }
  @keyframes orb2    { 0%,100%{transform:translate(0,0) scale(1)}  35%{transform:translate(12px,-10px) scale(1.09)} 68%{transform:translate(-8px,12px) scale(0.94)} }
  @keyframes orb3    { 0%,100%{transform:translate(0,0) scale(1)}  50%{transform:translate(8px,-12px) scale(1.12)} }
  @keyframes breathe { 0%,100%{opacity:0.5} 50%{opacity:1} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }

  .scene-card { transition: transform 0.55s cubic-bezier(0.22,1,0.36,1), box-shadow 0.55s cubic-bezier(0.22,1,0.36,1), border-color 0.4s; }
  .scene-card:hover { transform: translateY(-8px) scale(1.012); }
  .scene-card .card-orb1 { transition: opacity 0.5s; }
  .scene-card .card-orb2 { transition: opacity 0.5s; }
  .scene-card .card-orb3 { transition: opacity 0.5s; }
  .scene-card .card-shimmer { transition: opacity 0.5s; }
  .scene-card:hover .card-orb1 { opacity: 1 !important; }
  .scene-card:hover .card-orb2 { opacity: 0.9 !important; }
  .scene-card:hover .card-orb3 { opacity: 0.75 !important; }
  .scene-card:hover .card-shimmer { opacity: 1 !important; }
  .scene-card .card-cta { transition: height 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s; }
  .scene-card:hover .card-cta { height: 48px !important; opacity: 1 !important; }
  .scene-card .card-meta { transition: opacity 0.4s; }
  .scene-card:hover .card-meta { opacity: 0.65 !important; }

  .add-btn:hover { background: rgba(255,255,255,0.09) !important; border-color: rgba(255,255,255,0.22) !important; color: rgba(255,255,255,0.7) !important; }
  .enter-btn:hover { filter: brightness(1.15); }
  .del-btn:hover { background: rgba(239,68,68,0.22) !important; color: #fca5a5 !important; }
`

function PortalCard({
  scene, index, onOpen, onDelete,
}: {
  scene: SceneMeta
  index: number
  onOpen: (scene: SceneMeta) => void
  onDelete: (id: string) => void
}) {
  const [opening, setOpening]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isSeed = scene.id.startsWith('seed-')
  const t   = THEMES[index % THEMES.length]
  const fmt = scene.fileName.endsWith('.spz') ? 'SPZ' : scene.fileName.endsWith('.splat') ? 'SPLAT' : 'PLY'

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (opening) return
    setOpening(true)
    try {
      if (scene.url) {
        onOpen({ ...scene, id: scene.url } as unknown as SceneMeta)
      } else {
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
      className="scene-card"
      onClick={handleOpen}
      style={{
        position: 'relative',
        borderRadius: '22px',
        overflow: 'hidden',
        aspectRatio: '4 / 5',
        background: '#09090f',
        border: `1px solid rgba(255,255,255,0.07)`,
        boxShadow: `0 6px 40px rgba(0,0,0,0.65)`,
        cursor: opening ? 'wait' : 'pointer',
        animation: `fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.07}s both`,
      }}
    >
      {/* ── Atmospheric background ──────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="card-orb1" style={{
          position: 'absolute', width: '75%', height: '75%',
          top: '-20%', right: '-15%',
          background: `radial-gradient(circle, ${t.orb1} 0%, transparent 70%)`,
          borderRadius: '50%', opacity: 0.55,
          animation: 'orb1 9s ease-in-out infinite',
        }} />
        <div className="card-orb2" style={{
          position: 'absolute', width: '60%', height: '60%',
          bottom: '-15%', left: '-10%',
          background: `radial-gradient(circle, ${t.orb2} 0%, transparent 70%)`,
          borderRadius: '50%', opacity: 0.45,
          animation: 'orb2 12s ease-in-out infinite',
        }} />
        <div className="card-orb3" style={{
          position: 'absolute', width: '45%', height: '45%',
          top: '35%', left: '25%',
          background: `radial-gradient(circle, ${t.orb3} 0%, transparent 70%)`,
          borderRadius: '50%', opacity: 0.3,
          animation: 'orb3 7s ease-in-out infinite',
        }} />
        {/* Top shimmer edge */}
        <div className="card-shimmer" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent, ${t.shimmer}, transparent)`,
          opacity: 0.25,
        }} />
      </div>

      {/* ── Bottom vignette so text is always readable ──── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%',
        background: 'linear-gradient(to top, rgba(9,9,15,0.98) 0%, rgba(9,9,15,0.55) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Top row — format badge + delete ─────────────── */}
      <div style={{
        position: 'absolute', top: 18, left: 18, right: 18,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.22em',
          color: t.tag, padding: '3px 10px', borderRadius: '99px',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: `1px solid ${t.border}`, textTransform: 'uppercase',
        }}>
          {fmt}
        </span>
        {!isSeed && (
          <button
            className="del-btn"
            onClick={handleDelete}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: confirmDelete ? 'rgba(239,68,68,0.22)' : 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              color: confirmDelete ? '#fca5a5' : 'rgba(255,255,255,0.25)',
              fontSize: 16, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title={confirmDelete ? 'Click again to confirm' : 'Delete'}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Bottom — name + metadata + CTA ──────────────── */}
      <div style={{
        position: 'absolute', bottom: 22, left: 22, right: 22,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(1.5rem, 2.2vw, 2rem)',
          fontWeight: 200, letterSpacing: '0.03em', lineHeight: 1.1,
          color: 'rgba(255,255,255,0.93)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {scene.name}
        </h2>
        <p className="card-meta" style={{
          margin: '5px 0 0', fontSize: '10px',
          letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)',
          opacity: 0.45,
        }}>
          {formatSize(scene.sizeBytes)}
        </p>

        {/* CTA — hidden, slides up on hover */}
        <div className="card-cta" style={{ height: 0, opacity: 0, overflow: 'hidden', marginTop: 14 }}>
          <button
            className="enter-btn"
            onClick={handleOpen}
            disabled={opening}
            style={{
              width: '100%', padding: '12px',
              borderRadius: '11px',
              border: `1px solid ${t.btnBorder}`,
              background: t.btn,
              color: t.btnText,
              fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em',
              cursor: opening ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'filter 0.2s',
              opacity: opening ? 0.6 : 1,
            }}
          >
            {opening ? (
              <>
                <span style={{
                  width: 12, height: 12,
                  border: `1.5px solid ${t.btnText}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Loading…
              </>
            ) : 'Enter memory  →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton card
function SkeletonCard({ index }: { index: number }) {
  return (
    <div style={{
      borderRadius: '22px', aspectRatio: '4 / 5',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.04)',
      animation: `fadeUp 0.5s ease ${index * 0.06}s both`,
    }} />
  )
}

export function SceneLibrary({ onOpen, onAddPhoto }: Props) {
  const [scenes, setScenes]                   = useState<SceneMeta[]>([])
  const [loading, setLoading]                 = useState(true)
  const [showVideoProcessor, setShowVideoProcessor] = useState(false)

  const WORKER = import.meta.env.VITE_R2_UPLOAD_URL ?? 'https://re-experience-uploader.oren001.workers.dev'

  const SEEDS: SceneMeta[] = [
    {
      id: 'seed-my-memory', name: 'My Memory',
      fileName: 'scene.splat', createdAt: 1_000_000_001, sizeBytes: 5_682_240,
      url: `${WORKER}/read-scene?key=${encodeURIComponent('seeds/scene.splat')}`,
    },
    {
      id: 'seed-rebecca', name: 'Rebecca',
      fileName: 'rebecca.splat', createdAt: 1_000_000_002, sizeBytes: 14_805_600,
      url: `${WORKER}/read-scene?key=${encodeURIComponent('seeds/rebecca.splat')}`,
    },
    {
      id: 'seed-garden', name: 'Garden',
      fileName: 'garden.splat', createdAt: 1_000_000_003, sizeBytes: 22_534_592,
      url: `${WORKER}/read-scene?key=${encodeURIComponent('seeds/garden.splat')}`,
    },
  ]

  const load = useCallback(async () => {
    try {
      const allRaw = await listScenes()
      const staleIds = allRaw.filter(s => s.sizeBytes < 1_000).map(s => s.id)
      await Promise.all(staleIds.map(id => deleteScene(id)))
      await deduplicateScenes()
      const userScenes    = await listScenes()
      const userFileNames = new Set(userScenes.map(s => s.fileName))
      const filteredSeeds = SEEDS.filter(s => !userFileNames.has(s.fileName))
      setScenes([...userScenes, ...filteredSeeds])
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
      position: 'absolute', inset: 0,
      background: '#07070e',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <style>{CSS}</style>

      {/* ── Ambient background glows ──────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: '70vw', height: '55vh',
          top: '-18%', left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(80,40,200,0.07) 0%, transparent 70%)',
          animation: 'breathe 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '45vw', height: '45vh',
          bottom: '-12%', right: '-8%',
          background: 'radial-gradient(ellipse, rgba(20,120,80,0.05) 0%, transparent 70%)',
          animation: 'breathe 14s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', width: '35vw', height: '35vh',
          top: '40%', left: '-8%',
          background: 'radial-gradient(ellipse, rgba(180,60,100,0.04) 0%, transparent 70%)',
          animation: 'breathe 18s ease-in-out infinite 4s',
        }} />
      </div>

      {/* ── Header ────────────────────────────────────────── */}
      <header style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: 'clamp(28px, 4vw, 52px) clamp(24px, 5vw, 56px) clamp(20px, 3vw, 32px)',
        flexShrink: 0,
        animation: 'fadeUp 0.7s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div>
          <div style={{
            fontSize: '9px', fontFamily: 'monospace',
            letterSpacing: '0.45em', color: 'rgba(255,255,255,0.18)',
            marginBottom: 10, textTransform: 'uppercase',
          }}>
            Re·Experience
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
            fontWeight: 100,
            letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.88)',
            lineHeight: 1,
          }}>
            Your Memories
          </h1>
          <p style={{
            margin: '8px 0 0', fontSize: '12px',
            letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)',
          }}>
            Walk through what matters
          </p>
        </div>

        <button
          className="add-btn"
          onClick={() => setShowVideoProcessor(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '11px 22px',
            borderRadius: '100px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.38)',
            fontSize: '12px', letterSpacing: '0.08em',
            cursor: 'pointer', transition: 'all 0.3s',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Memory
        </button>
      </header>

      {/* Hairline divider */}
      <div style={{
        height: '1px',
        margin: '0 clamp(24px, 5vw, 56px)',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
        flexShrink: 0, zIndex: 2, position: 'relative',
      }} />

      {/* ── VideoProcessor overlay ────────────────────────── */}
      {showVideoProcessor && (
        <VideoProcessor
          onDone={() => { setShowVideoProcessor(false); load() }}
          onCancel={() => setShowVideoProcessor(false)}
        />
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <main style={{
        flex: 1, overflowY: 'auto',
        padding: 'clamp(24px, 3vw, 36px) clamp(24px, 5vw, 56px) 60px',
        position: 'relative', zIndex: 2,
      }}>

        {/* Loading skeletons */}
        {loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'clamp(14px, 2vw, 22px)',
          }}>
            {[0, 1, 2].map(i => <SkeletonCard key={i} index={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && scenes.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '60vh', gap: 24, textAlign: 'center',
            animation: 'fadeIn 0.6s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, opacity: 0.2,
            }}>
              ◎
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', fontWeight: 300, margin: 0 }}>
                No memories yet
              </p>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px', marginTop: 8, letterSpacing: '0.06em' }}>
                Process a video to create your first 3D space
              </p>
            </div>
            <button
              onClick={() => setShowVideoProcessor(true)}
              style={{
                padding: '13px 32px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px', letterSpacing: '0.08em',
                cursor: 'pointer', transition: 'all 0.3s',
              }}
            >
              + Create first memory
            </button>
          </div>
        )}

        {/* Scene grid */}
        {!loading && scenes.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'clamp(14px, 2vw, 22px)',
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
