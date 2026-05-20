import { useRef, useState, useEffect } from 'react'
import { useBabylonEngine, getSceneManager } from '@/hooks/useBabylonEngine'
import { PhotoUpload } from '@/components/PhotoUpload'
import { MinimalHUD } from '@/components/MinimalHUD'
import { TherapistOverlay } from '@/components/TherapistOverlay'
import { SplatViewer } from '@/components/SplatViewer'
import { SceneLibrary } from '@/components/SceneLibrary'
import { PreparationScreen } from '@/components/PreparationScreen'
import { GroundingScreen } from '@/components/GroundingScreen'
import { useTherapistStore } from '@/store/therapistStore'

type AppState = 'library' | 'upload' | 'exploring' | 'prepare' | 'splat' | 'grounding'

/** Babylon canvas + engine — unmounts (and disposes WebGL context) when not needed */
function BabylonWorld({
  appState,
  onReady,
  onSplat,
  onBackToLibrary,
}: {
  appState: 'upload' | 'exploring'
  onReady: () => void
  onSplat: (src: string, name: string) => void
  onBackToLibrary: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { safeSpaceActive } = useTherapistStore()
  useBabylonEngine(canvasRef)

  useEffect(() => {
    getSceneManager()?.setSafeSpaceMode(safeSpaceActive)
  }, [safeSpaceActive])

  useEffect(() => {
    if (appState !== 'exploring') return
    const { triggerSafeSpace, dismissSafeSpace, safeSpaceActive: active } = useTherapistStore.getState()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') active ? dismissSafeSpace() : triggerSafeSpace()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [appState])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full outline-none"
        style={{ touchAction: 'none', display: appState === 'exploring' ? 'block' : 'none' }}
      />
      {appState === 'upload' && (
        <PhotoUpload onReady={onReady} onSplat={onSplat} onBackToLibrary={onBackToLibrary} />
      )}
      {appState === 'exploring' && (
        <>
          <MinimalHUD onNewPhoto={() => {}} />
          <TherapistOverlay />
        </>
      )}
    </>
  )
}

export default function App() {
  const [appState, setAppState]       = useState<AppState>('library')
  const [splatSource, setSplatSource] = useState<string>('')
  const [splatFileName, setSplatFileName] = useState<string>('')

  // Library → Preparation ritual → Splat viewer
  const handleOpenSplat = (src: string, name: string) => {
    setSplatSource(src)
    setSplatFileName(name)
    setAppState('prepare')
  }

  const handleEnterFromPrep = () => {
    setAppState('splat')
  }

  const handleBackFromPrep = () => {
    setSplatSource('')
    setSplatFileName('')
    setAppState('library')
  }

  // Splat viewer → Grounding moment → Library
  const handleBackFromSplat = () => {
    if (splatSource.startsWith('blob:')) URL.revokeObjectURL(splatSource)
    setAppState('grounding')
  }

  const handleContinueFromGrounding = () => {
    setSplatSource('')
    setSplatFileName('')
    setAppState('library')
  }

  return (
    <div className="w-full h-full relative bg-slate-950 overflow-hidden">

      {/* ── Library — default home screen ───────────────────────── */}
      {appState === 'library' && (
        <SceneLibrary
          onOpen={handleOpenSplat}
          onAddPhoto={() => setAppState('upload')}
        />
      )}

      {/* ── Preparation ritual — breathe before entering ─────────── */}
      {appState === 'prepare' && (
        <PreparationScreen
          sceneName={splatFileName}
          onEnter={handleEnterFromPrep}
          onBack={handleBackFromPrep}
        />
      )}

      {/* ── Gaussian Splat viewer ────────────────────────────────── */}
      {appState === 'splat' && (
        <SplatViewer
          source={splatSource}
          fileName={splatFileName}
          onBack={handleBackFromSplat}
        />
      )}

      {/* ── Grounding moment — after leaving a scene ─────────────── */}
      {appState === 'grounding' && (
        <GroundingScreen onContinue={handleContinueFromGrounding} />
      )}

      {/* ── Babylon world — only mounts for photo upload flow ────── */}
      {(appState === 'upload' || appState === 'exploring') && (
        <BabylonWorld
          appState={appState}
          onReady={() => setAppState('exploring')}
          onSplat={handleOpenSplat}
          onBackToLibrary={() => setAppState('library')}
        />
      )}

    </div>
  )
}
