import { useState } from 'react'
import { SessionControls } from './SessionControls'
import { WaypointEditor } from './WaypointEditor'
import { SessionNotes } from './SessionNotes'
import { SafeSpaceTrigger } from './SafeSpaceTrigger'
import { ObjectPicker } from '../builder/ObjectPicker'
import { ObjectInspector } from '../builder/ObjectInspector'
import { EnvironmentPanel } from '../builder/EnvironmentPanel'
import { useSceneStore } from '@/store/sceneStore'

type PanelTab = 'objects' | 'inspector' | 'environment' | 'waypoints' | 'notes'

export function TherapistPanel() {
  const [tab, setTab] = useState<PanelTab>('objects')
  const mode = useSceneStore((s) => s.mode)

  const tabs: { id: PanelTab; label: string; buildOnly?: boolean; navOnly?: boolean }[] = [
    { id: 'objects', label: 'Objects', buildOnly: true },
    { id: 'inspector', label: 'Inspect', buildOnly: true },
    { id: 'environment', label: 'Scene' },
    { id: 'waypoints', label: 'Waypoints' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-white/10">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 bg-slate-900/60">
        <div className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-0.5">Therapist Panel</div>
        <div className="text-xs text-white/30">{mode === 'navigate' ? 'Session active' : 'Scene building'}</div>
      </div>

      {/* Safe space trigger — always visible */}
      <SafeSpaceTrigger />

      {/* Session controls (navigate mode) */}
      {mode === 'navigate' && <SessionControls />}

      {/* Tab bar */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map((t) => {
          const disabled = (t.buildOnly && mode === 'navigate') || (t.navOnly && mode === 'build')
          return (
            <button
              key={t.id}
              onClick={() => !disabled && setTab(t.id)}
              className={`flex-1 py-1.5 text-xs font-medium whitespace-nowrap px-2 transition-colors ${
                tab === t.id
                  ? 'text-sky-300 border-b-2 border-sky-400 bg-sky-950/40'
                  : disabled
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'objects' && <ObjectPicker />}
        {tab === 'inspector' && <ObjectInspector />}
        {tab === 'environment' && <EnvironmentPanel />}
        {tab === 'waypoints' && <WaypointEditor />}
        {tab === 'notes' && <SessionNotes />}
      </div>
    </div>
  )
}
