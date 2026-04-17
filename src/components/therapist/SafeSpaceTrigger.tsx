import { useState } from 'react'
import { useTherapistStore } from '@/store/therapistStore'

export function SafeSpaceTrigger() {
  const triggerSafeSpace = useTherapistStore((s) => s.triggerSafeSpace)
  const safeSpaceActive = useTherapistStore((s) => s.safeSpaceActive)
  const [confirming, setConfirming] = useState(false)

  if (safeSpaceActive) {
    return (
      <div className="mx-3 my-2 bg-emerald-900/50 border border-emerald-700/50 rounded-lg px-3 py-2 text-xs text-emerald-300 text-center">
        Safe space active
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="mx-3 my-2 bg-red-950/60 border border-red-700/40 rounded-lg p-2 flex gap-2">
        <button
          onClick={() => { triggerSafeSpace(); setConfirming(false) }}
          className="flex-1 bg-red-700 hover:bg-red-600 text-white text-xs py-1.5 rounded font-semibold"
        >
          Yes — Go to Safe Space
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-white/40 hover:text-white/70 text-xs px-2"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mx-3 my-2 w-[calc(100%-1.5rem)] bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-600/40 text-emerald-100 text-sm font-semibold py-2 rounded-lg transition-colors"
    >
      🌿 Safe Space
    </button>
  )
}
