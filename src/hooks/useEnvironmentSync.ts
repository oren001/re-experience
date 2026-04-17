import { useEffect } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import { getSceneManager } from './useBabylonEngine'

export function useEnvironmentSync() {
  const environment = useSceneStore((s) => s.environment)

  useEffect(() => {
    const sm = getSceneManager()
    sm?.applyEnvironment(environment)
  }, [environment])
}
