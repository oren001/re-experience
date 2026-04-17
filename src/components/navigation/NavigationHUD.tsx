import { useSceneStore } from '@/store/sceneStore'
import { useTherapistStore } from '@/store/therapistStore'

export function NavigationHUD() {
  const mode = useSceneStore((s) => s.mode)
  const { triggerSafeSpace, isPaused, waypoints, activeWaypointIndex } = useTherapistStore()

  if (mode === 'build') {
    return (
      <div className="absolute bottom-4 left-4 text-xs text-white/50 bg-black/30 rounded px-2 py-1">
        Build Mode &nbsp;·&nbsp; Click to place &nbsp;·&nbsp; <kbd>N</kbd> to navigate
      </div>
    )
  }

  if (mode === 'safe-space') return null

  return (
    <>
      {/* Top: status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 items-center">
        {isPaused && (
          <div className="bg-amber-800/90 text-amber-100 text-sm font-medium px-4 py-1.5 rounded-full shadow">
            Session paused by therapist
          </div>
        )}
        {activeWaypointIndex !== null && waypoints[activeWaypointIndex] && (
          <div className="bg-blue-900/80 text-blue-100 text-sm px-4 py-1.5 rounded-full shadow">
            Waypoint {activeWaypointIndex + 1} / {waypoints.length}
            {waypoints[activeWaypointIndex].note && (
              <span className="opacity-70"> — {waypoints[activeWaypointIndex].note}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom left: controls hint */}
      <div className="absolute bottom-4 left-4 text-xs text-white/40 bg-black/30 rounded px-2 py-1">
        WASD to move &nbsp;·&nbsp; <kbd>B</kbd> to build &nbsp;·&nbsp; <kbd>ESC</kbd> for safe space
      </div>

      {/* Bottom right: safe space escape button */}
      <button
        onClick={triggerSafeSpace}
        className="absolute bottom-4 right-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-colors"
        title="Exit to safe space (ESC)"
      >
        Safe Space
      </button>
    </>
  )
}
