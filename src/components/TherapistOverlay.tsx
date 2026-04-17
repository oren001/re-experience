import { useState } from 'react'
import { useTherapistStore } from '@/store/therapistStore'
import { getSceneManager } from '@/hooks/useBabylonEngine'

export function TherapistOverlay() {
  const [open, setOpen] = useState(false)
  const {
    isPaused, setPaused,
    speedMultiplier, setSpeedMultiplier,
    triggerSafeSpace, safeSpaceActive,
    notes, setNotes,
  } = useTherapistStore()

  // Sync pause/speed to scene
  const handlePause = (paused: boolean) => {
    setPaused(paused)
    getSceneManager()?.setPaused(paused)
  }

  const handleSpeed = (mult: number) => {
    setSpeedMultiplier(mult)
    getSceneManager()?.setSpeedMultiplier(mult)
  }

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute top-4 right-4 text-xs text-white/35 hover:text-white/70 bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-lg transition-colors z-30"
        title="Therapist controls"
      >
        {open ? 'Close ×' : 'Therapist ›'}
      </button>

      {/* Slide-out panel */}
      {open && (
        <div className="absolute top-12 right-4 w-64 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl z-30 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-widest">Therapist Controls</div>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Safe space */}
            <button
              onClick={() => { triggerSafeSpace(); setOpen(false) }}
              disabled={safeSpaceActive}
              className="w-full bg-emerald-800/80 hover:bg-emerald-700 disabled:opacity-40 text-emerald-100 text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              🌿 Safe Space
            </button>

            {/* Pause / resume */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Patient movement</span>
              <button
                onClick={() => handlePause(!isPaused)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isPaused ? 'bg-amber-700 hover:bg-amber-600 text-amber-100' : 'bg-white/10 hover:bg-white/20 text-white/70'
                }`}
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>

            {/* Speed */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-white/40">Walk speed</span>
                <span className="text-xs text-white/50">{speedMultiplier.toFixed(1)}×</span>
              </div>
              <input
                type="range" min={0.25} max={2} step={0.25}
                value={speedMultiplier}
                onChange={(e) => handleSpeed(parseFloat(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            {/* Notes */}
            <div>
              <div className="text-xs text-white/40 mb-1.5">Session notes</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations…"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white/70 placeholder:text-white/25 resize-none h-24 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
