import { useTherapistStore } from '@/store/therapistStore'
import { useSessionStore } from '@/store/sessionStore'
import { useSceneStore } from '@/store/sceneStore'
import type { SavedSession } from '@/types/session.types'

export function SessionNotes() {
  const { notes, setNotes, waypoints, annotations } = useTherapistStore()
  const { saveSession, currentSessionId, sessions } = useSessionStore()
  const { objects, environment } = useSceneStore()

  const handleSave = () => {
    const now = new Date().toISOString()
    const existing = sessions.find((s) => s.id === (currentSessionId ?? ''))

    const session: SavedSession = {
      id: currentSessionId ?? `session_${Date.now()}`,
      name: existing?.name ?? `Session ${new Date().toLocaleDateString()}`,
      patientAlias: existing?.patientAlias ?? 'Patient',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      objects,
      environment,
      waypoints,
      annotations,
      notes,
    }
    saveSession(session)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div>
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Session Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations, reactions, next steps…"
          className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white/80 placeholder:text-white/25 resize-none h-40 focus:outline-none focus:border-sky-500"
        />
      </div>

      <button
        onClick={handleSave}
        className="bg-sky-800 hover:bg-sky-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        Save Session
      </button>

      <div className="text-xs text-white/25 text-center">
        Saves scene, waypoints, and notes to local storage
      </div>
    </div>
  )
}
