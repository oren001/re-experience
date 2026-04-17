import { useSceneStore } from '@/store/sceneStore'

export function BuilderToolbar() {
  const mode = useSceneStore((s) => s.mode)
  const setMode = useSceneStore((s) => s.setMode)

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-slate-900/80">
      <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Re-Experience</span>

      <div className="flex gap-1 bg-black/30 rounded-lg p-0.5">
        <button
          onClick={() => setMode('build')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            mode === 'build' ? 'bg-sky-700 text-white shadow' : 'text-white/40 hover:text-white/70'
          }`}
          title="Build mode (B)"
        >
          Build
        </button>
        <button
          onClick={() => setMode('navigate')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            mode === 'navigate' ? 'bg-sky-700 text-white shadow' : 'text-white/40 hover:text-white/70'
          }`}
          title="Navigate mode (N)"
        >
          Navigate
        </button>
      </div>

      <div className="text-xs text-white/30">
        {mode === 'build' ? 'Click scene to place objects' : 'WASD + mouse to move'}
      </div>
    </div>
  )
}
