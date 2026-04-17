import { useRef } from 'react'
import { useBabylonEngine } from '@/hooks/useBabylonEngine'
import { useSceneMode } from '@/hooks/useSceneMode'
import { useObjectPlacement } from '@/hooks/useObjectPlacement'
import { useEnvironmentSync } from '@/hooks/useEnvironmentSync'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { NavigationHUD } from '../navigation/NavigationHUD'
import { SafeSpaceOverlay } from '../navigation/SafeSpaceOverlay'

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useBabylonEngine(canvasRef)
  useSceneMode()
  useObjectPlacement()
  useEnvironmentSync()
  useKeyboardShortcuts()

  return (
    <div className="relative w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        style={{ touchAction: 'none' }}
      />
      <NavigationHUD />
      <SafeSpaceOverlay />
    </div>
  )
}
