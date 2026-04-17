import { useSceneStore } from '@/store/sceneStore'
import { getSceneManager } from '@/hooks/useBabylonEngine'

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-white/40">{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        step={0.1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-sky-500"
      />
    </label>
  )
}

export function ObjectInspector() {
  const selectedId = useSceneStore((s) => s.selectedObjectId)
  const objects = useSceneStore((s) => s.objects)
  const updateObjectTransform = useSceneStore((s) => s.updateObjectTransform)
  const removeObject = useSceneStore((s) => s.removeObject)
  const setSelectedObjectId = useSceneStore((s) => s.setSelectedObjectId)

  const obj = objects.find((o) => o.id === selectedId)
  if (!obj) return (
    <div className="text-xs text-white/30 text-center py-4">Click an object to inspect it</div>
  )

  const update = (axis: 'position' | 'rotation' | 'scaling', component: 'x' | 'y' | 'z', val: number) => {
    const newTransform = {
      ...obj.transform,
      [axis]: { ...obj.transform[axis], [component]: val },
    }
    updateObjectTransform(obj.id, newTransform)
    getSceneManager()?.sceneBuilder.updateTransform(obj.id, newTransform)
  }

  const handleDelete = () => {
    getSceneManager()?.sceneBuilder.removeObject(obj.id)
    removeObject(obj.id)
    setSelectedObjectId(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">{obj.label}</span>
        <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 transition-colors">
          Delete
        </button>
      </div>

      <div>
        <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">Position</div>
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((c) => (
            <NumInput key={c} label={c.toUpperCase()} value={obj.transform.position[c]} onChange={(v) => update('position', c, v)} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">Rotation</div>
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((c) => (
            <NumInput key={c} label={c.toUpperCase()} value={obj.transform.rotation[c]} onChange={(v) => update('rotation', c, v)} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">Scale</div>
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((c) => (
            <NumInput key={c} label={c.toUpperCase()} value={obj.transform.scaling[c]} onChange={(v) => update('scaling', c, v)} />
          ))}
        </div>
      </div>
    </div>
  )
}
