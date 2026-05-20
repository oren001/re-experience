import { useEffect } from 'react'

interface Props {
  source: string
  fileName?: string
  onBack: () => void
}

export function SplatViewer({ source, fileName = '', onBack }: Props) {
  const viewerUrl = `/splat.html?url=${encodeURIComponent(source)}&file=${encodeURIComponent(fileName)}`

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Thumbnail auto-captured by splat.html — store for library card preview
      if (e.data?.type === 're-exp-thumbnail') {
        const { url, thumb } = e.data as { url: string; thumb: string }
        if (url && thumb) {
          try { localStorage.setItem(`re-exp-thumb:${url}`, thumb) } catch { /* quota */ }
        }
      }
      // "Leave for today" button inside the safe space — triggers the back handler
      if (e.data?.type === 're-exp-leave') {
        onBack()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onBack])

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: '#080810' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={onBack}
          className="text-white/50 hover:text-white/90 text-sm transition-colors"
        >
          ← Back
        </button>
        <span className="text-white/20 text-xs tracking-wider">
          W A S D to walk · mouse to look · V to speak · Q safe space
        </span>
      </div>

      {/* Isolated splat viewer — its own WebGL context, no React involvement */}
      <iframe
        src={viewerUrl}
        className="flex-1 w-full border-0"
        allow="fullscreen *; pointer-lock *"
        title="Memory Viewer"
      />
    </div>
  )
}
