import { CanvasContainer } from './CanvasContainer'
import { TherapistPanel } from '../therapist/TherapistPanel'
import { BuilderToolbar } from '../builder/BuilderToolbar'

export function AppLayout() {
  return (
    <div className="w-full h-full flex flex-col bg-slate-950">
      {/* Top toolbar */}
      <BuilderToolbar />

      {/* Main area: canvas + therapist panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* 3D Canvas - takes most of the space */}
        <div className="flex-1 min-w-0">
          <CanvasContainer />
        </div>

        {/* Therapist panel - fixed width sidebar */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden">
          <TherapistPanel />
        </div>
      </div>
    </div>
  )
}
