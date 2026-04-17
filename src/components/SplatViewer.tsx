interface Props {
  source: string
  fileName?: string
  onBack: () => void
}

export function SplatViewer({ source, fileName = '', onBack }: Props) {
  // Build the URL for the standalone splat.html viewer
  const viewerUrl = `/splat.html?url=${encodeURIComponent(source)}&file=${encodeURIComponent(fileName)}`

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
          Drag to orbit · scroll to zoom · right-drag to pan
        </span>
      </div>

      {/* Isolated splat viewer — its own WebGL context, no React involvement */}
      <iframe
        src={viewerUrl}
        className="flex-1 w-full border-0"
        allow="fullscreen"
        title="Memory Viewer"
      />
    </div>
  )
}
