import { useState } from 'react'
import { useTherapistStore } from '@/store/therapistStore'

interface Props {
  onNewPhoto: () => void
}

export function MinimalHUD({ onNewPhoto }: Props) {
  const { isPaused, safeSpaceActive, triggerSafeSpace, dismissSafeSpace } = useTherapistStore()
  const [showHint, setShowHint] = useState(true)

  return (
    <>
      {/* Pause banner */}
      {isPaused && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-100 text-sm font-medium px-5 py-2 rounded-full shadow-lg">
          Session paused
        </div>
      )}

      {/* Safe space active banner */}
      {safeSpaceActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-950/50 backdrop-blur-sm pointer-events-auto z-10">
          <div className="bg-slate-900/95 rounded-2xl p-8 max-w-xs text-center shadow-2xl border border-sky-800/40">
            <div className="text-4xl mb-3">🌿</div>
            <h2 className="text-xl font-semibold text-sky-100 mb-2">You are safe</h2>
            <p className="text-sky-200/60 text-sm mb-6">Take a breath. Stay here as long as you need.</p>
            <button
              onClick={() => dismissSafeSpace()}
              className="bg-sky-700 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Return to memory
            </button>
          </div>
        </div>
      )}

      {/* Controls hint — dismisses after first interaction */}
      {showHint && !safeSpaceActive && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-white/40 bg-black/30 rounded-full px-4 py-1.5 cursor-pointer"
          onClick={() => setShowHint(false)}
        >
          WASD or arrow keys to walk · mouse to look · click to dismiss
        </div>
      )}

      {/* Top-left: new photo */}
      <button
        onClick={onNewPhoto}
        className="absolute top-4 left-4 text-xs text-white/30 hover:text-white/70 bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-lg transition-colors"
        title="Upload a different photo"
      >
        ← New photo
      </button>

      {/* Bottom-right: safe space — always visible */}
      {!safeSpaceActive && (
        <button
          onClick={triggerSafeSpace}
          className="absolute bottom-4 right-4 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-colors"
          title="Exit to safe space (Esc)"
        >
          🌿 Safe Space
        </button>
      )}
    </>
  )
}
