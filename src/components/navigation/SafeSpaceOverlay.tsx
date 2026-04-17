import { useEffect, useState } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import { useTherapistStore } from '@/store/therapistStore'

export function SafeSpaceOverlay() {
  const mode = useSceneStore((s) => s.mode)
  const setMode = useSceneStore((s) => s.setMode)
  const { safeSpaceActive, dismissSafeSpace } = useTherapistStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (safeSpaceActive) {
      setMode('safe-space')
      setVisible(true)
    }
  }, [safeSpaceActive, setMode])

  if (!visible || mode !== 'safe-space') return null

  const handleReturn = () => {
    dismissSafeSpace()
    setMode('navigate')
    setVisible(false)
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-950/40 backdrop-blur-sm">
      <div className="bg-slate-900/90 rounded-2xl p-8 max-w-sm text-center shadow-2xl border border-sky-800/40">
        <div className="text-4xl mb-3">🌿</div>
        <h2 className="text-xl font-semibold text-sky-100 mb-2">You are safe</h2>
        <p className="text-sky-200/70 text-sm mb-6">
          Take a breath. You can stay here as long as you need.
        </p>
        <button
          onClick={handleReturn}
          className="bg-sky-700 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Return to session
        </button>
      </div>
    </div>
  )
}
