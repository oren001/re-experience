import { useEffect } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import { getSceneManager } from './useBabylonEngine'

export function useSceneMode() {
  const mode = useSceneStore((s) => s.mode)

  useEffect(() => {
    const sm = getSceneManager()
    if (!sm) return

    if (mode === 'build') sm.setBuildMode()
    else if (mode === 'navigate') sm.setNavigationMode()
    else if (mode === 'safe-space') sm.setSafeSpaceMode(true)
  }, [mode])
}
