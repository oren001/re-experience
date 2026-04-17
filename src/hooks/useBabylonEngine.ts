import { useEffect, useRef } from 'react'
import { initEngine, disposeEngine } from '@/babylon/engine/BabylonEngine'
import { SceneManager } from '@/babylon/engine/SceneManager'

let sceneManagerInstance: SceneManager | null = null

export function getSceneManager(): SceneManager | null {
  return sceneManagerInstance
}

export function useBabylonEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !canvasRef.current) return
    initialized.current = true

    const engine = initEngine(canvasRef.current)
    if (!engine) return          // WebGL unavailable — splat viewer still works
    sceneManagerInstance = new SceneManager(engine, canvasRef.current)

    return () => {
      sceneManagerInstance?.dispose()
      sceneManagerInstance = null
      disposeEngine()
      initialized.current = false
    }
  }, [canvasRef])
}
