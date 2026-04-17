import { Engine } from '@babylonjs/core'

let engineInstance: Engine | null = null

export function initEngine(canvas: HTMLCanvasElement): Engine | null {
  if (engineInstance) {
    engineInstance.dispose()
  }
  try {
    engineInstance = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    })
    window.addEventListener('resize', () => {
      engineInstance?.resize()
    })
    return engineInstance
  } catch (e) {
    console.warn('[Babylon] WebGL init failed — PLY viewer still works:', e)
    return null
  }
}

export function getEngine(): Engine | null {
  return engineInstance
}

export function disposeEngine() {
  if (engineInstance) {
    engineInstance.dispose()
    engineInstance = null
  }
}
