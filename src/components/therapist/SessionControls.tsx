import { useTherapistStore } from '@/store/therapistStore'

export function SessionControls() {
  const { isPaused, setPaused, speedMultiplier, setSpeedMultiplier } = useTherapistStore()

  return (
    <div className="mx-3 my-2 bg-slate-800/60 border border-white/10 rounded-lg p-2.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">Patient movement</span>
        <button
          onClick={() => setPaused(!isPaused)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            isPaused
              ? 'bg-amber-700 hover:bg-amber-600 text-amber-100'
              : 'bg-slate-700 hover:bg-slate-600 text-white/80'
          }`}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs text-white/40">Speed</span>
          <span className="text-xs text-white/50">{speedMultiplier.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.25}
          value={speedMultiplier}
          onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
          className="w-full accent-sky-400"
        />
      </div>
    </div>
  )
}
