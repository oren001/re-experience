import { useEffect } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import { useTherapistStore } from '@/store/therapistStore'

export function useKeyboardShortcuts() {
  const setMode = useSceneStore((s) => s.setMode)
  const mode = useSceneStore((s) => s.mode)
  const { triggerSafeSpace, dismissSafeSpace, safeSpaceActive, setPaused, isPaused } = useTherapistStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA') return

      switch (e.key.toLowerCase()) {
        case 'b': if (mode !== 'build') setMode('build'); break
        case 'n': if (mode !== 'navigate') setMode('navigate'); break
        case 'escape':
          if (safeSpaceActive) dismissSafeSpace()
          else if (mode === 'safe-space') { dismissSafeSpace(); setMode('navigate') }
          else if (mode === 'navigate') triggerSafeSpace()
          break
        case 'p': setPaused(!isPaused); break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, safeSpaceActive, isPaused, setMode, triggerSafeSpace, dismissSafeSpace, setPaused])
}
