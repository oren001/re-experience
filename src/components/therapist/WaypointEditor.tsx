import { useState } from 'react'
import { useTherapistStore } from '@/store/therapistStore'
import { useSceneStore } from '@/store/sceneStore'
import type { Waypoint } from '@/types/therapist.types'

export function WaypointEditor() {
  const { waypoints, addWaypoint, removeWaypoint, updateWaypoint, setActiveWaypointIndex, activeWaypointIndex } = useTherapistStore()
  const mode = useSceneStore((s) => s.mode)
  const [newLabel, setNewLabel] = useState('')

  const handleAddWaypoint = () => {
    // Use a placeholder position; in navigate mode the waypoint system
    // would capture the current camera position via an event
    const wp: Waypoint = {
      id: `wp_${Date.now()}`,
      label: newLabel || `Waypoint ${waypoints.length + 1}`,
      position: { x: 0, y: 1.7, z: 0 },
      note: '',
    }
    // Request current camera position from scene
    const event = new CustomEvent('re-experience:add-waypoint', { detail: { wp } })
    window.dispatchEvent(event)
    addWaypoint(wp)
    setNewLabel('')
  }

  const sendPatientTo = (index: number) => {
    const wp = waypoints[index]
    setActiveWaypointIndex(index)
    const event = new CustomEvent('re-experience:goto-waypoint', { detail: { waypoint: wp, index } })
    window.dispatchEvent(event)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-white/40 leading-relaxed">
        Waypoints mark key locations in the scene. Use them to guide the patient's journey.
      </div>

      {/* Add waypoint */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Waypoint label…"
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-sky-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAddWaypoint()}
        />
        <button
          onClick={handleAddWaypoint}
          className="bg-sky-700 hover:bg-sky-600 text-white text-xs px-2.5 py-1 rounded transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Waypoint list */}
      {waypoints.length === 0 ? (
        <div className="text-xs text-white/25 text-center py-4">No waypoints yet</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {waypoints.map((wp, i) => (
            <div
              key={wp.id}
              className={`bg-white/5 border rounded-lg p-2 ${activeWaypointIndex === i ? 'border-sky-500/60' : 'border-white/10'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-white/70 flex-1">
                  {i + 1}. {wp.label}
                </span>
                {mode === 'navigate' && (
                  <button
                    onClick={() => sendPatientTo(i)}
                    className="text-xs bg-sky-800 hover:bg-sky-700 text-sky-200 px-2 py-0.5 rounded transition-colors"
                  >
                    Go →
                  </button>
                )}
                <button
                  onClick={() => removeWaypoint(wp.id)}
                  className="text-white/25 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={wp.note ?? ''}
                onChange={(e) => updateWaypoint(wp.id, { note: e.target.value })}
                placeholder="Add a note for this waypoint…"
                className="w-full bg-transparent text-xs text-white/40 placeholder:text-white/20 focus:outline-none focus:text-white/60"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
