import { useRef, useState, useEffect } from 'react'
import { useBabylonEngine, getSceneManager } from '@/hooks/useBabylonEngine'
import { PhotoUpload } from '@/components/PhotoUpload'
import { MinimalHUD } from '@/components/MinimalHUD'
import { TherapistOverlay } from '@/components/TherapistOverlay'
import { SplatViewer } from '@/components/SplatViewer'
import { SceneLibrary } from '@/components/SceneLibrary'
import { PreparationScreen } from '@/components/PreparationScreen'
import { GroundingScreen } from '@/components/GroundingScreen'
import { buildPhotoWorldFromUrl } from '@/services/photoWorldLoader'
import { useTherapistStore } from '@/store/therapistStore'

type AppState = 'library' | 'upload' | 'exploring' | 'prepare' | 'splat' | 'photoworld' | 'grounding'

/** A memory is a "photo world" when its source is an image (vs. a gaussian splat). */
function isPhotoSource(src: string): boolean {
  return /\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(src)
}

/** Hooks the Escape key to toggle the safe space while exploring. */
function useSafeSpaceEscape(active = true) {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const { triggerSafeSpace, dismissSafeSpace, safeSpaceActive } = useTherapistStore.getState()
      safeSpaceActive ? dismissSafeSpace() : triggerSafeSpace()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active])
}

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

  useSafeSpaceEscape(appState === 'exploring')

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

/**
 * Opens a bundled photo memory as a navigable depth-parallax world.
 * Mounts its own Babylon engine, estimates depth in-browser, then drops the
 * player into first-person navigation with the therapist HUD.
 */
function PhotoMemoryWorld({
  photoUrl,
  onBack,
}: {
  photoUrl: string
  onBack: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { safeSpaceActive } = useTherapistStore()
  const [status, setStatus] = useState<string | null>('Preparing your memory…')
  const [failed, setFailed] = useState(false)
  const built = useRef(false)
  useBabylonEngine(canvasRef)

  useEffect(() => {
    getSceneManager()?.setSafeSpaceMode(safeSpaceActive)
  }, [safeSpaceActive])

  useSafeSpaceEscape(!status)

  useEffect(() => {
    // Guard with a ref that survives React 18 StrictMode's double-invoke, so the
    // world is built exactly once and its completion is never suppressed.
    if (built.current) return
    built.current = true

    const run = async () => {
      // The Babylon engine mounts via useBabylonEngine's effect; wait for it.
      let sm = getSceneManager()
      while (!sm) {
        await new Promise((res) => window.setTimeout(res, 80))
        sm = getSceneManager()
      }
      try {
        await buildPhotoWorldFromUrl(photoUrl, setStatus)
        setStatus(null)
      } catch (e: any) {
        setFailed(true)
        setStatus(e?.message ?? 'Could not build this memory')
      }
    }
    run()
  }, [photoUrl])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full outline-none"
        style={{ touchAction: 'none' }}
      />

      {/* Loading / error veil while depth is estimated and the world is built */}
      {status && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 text-center px-8">
          {!failed && (
            <div className="w-10 h-10 mb-6 rounded-full border-2 border-sky-500/30 border-t-sky-400 animate-spin" />
          )}
          <div className={`text-sm ${failed ? 'text-red-300' : 'text-sky-200/80'} max-w-xs`}>{status}</div>
          {failed && (
            <button
              onClick={onBack}
              className="mt-6 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              ← Back to memories
            </button>
          )}
        </div>
      )}

      {/* Navigation HUD once the world is ready */}
      {!status && (
        <>
          <MinimalHUD onNewPhoto={() => {}} />
          <TherapistOverlay />
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 text-xs text-white/40 hover:text-white/80 bg-black/25 hover:bg-black/45 px-3 py-1.5 rounded-lg transition-colors"
            title="Leave this memory"
          >
            ← Leave memory
          </button>
        </>
      )}
    </>
  )
}

export default function App() {
  const [appState, setAppState]       = useState<AppState>('library')
  const [splatSource, setSplatSource] = useState<string>('')
  const [splatFileName, setSplatFileName] = useState<string>('')
  const [memoryKind, setMemoryKind]   = useState<'splat' | 'photo'>('splat')

  // Library → Preparation ritual → Splat viewer / Photo world
  const handleOpenSplat = (src: string, name: string) => {
    setSplatSource(src)
    setSplatFileName(name)
    setMemoryKind(isPhotoSource(src) ? 'photo' : 'splat')
    setAppState('prepare')
  }

  const handleEnterFromPrep = () => {
    setAppState(memoryKind === 'photo' ? 'photoworld' : 'splat')
  }

  const handleBackFromPrep = () => {
    setSplatSource('')
    setSplatFileName('')
    setAppState('library')
  }

  // Viewer / world → Grounding moment → Library
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

      {/* ── Photo memory — depth-parallax walkable world ─────────── */}
      {appState === 'photoworld' && (
        <PhotoMemoryWorld
          photoUrl={splatSource}
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
