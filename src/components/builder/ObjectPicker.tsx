import { useState } from 'react'
import { OBJECT_LIBRARY, getByCategory } from '@/babylon/scene/ObjectLibrary'
import { useSceneStore } from '@/store/sceneStore'
import { generateFromText, generateFromImage } from '@/babylon/scene/MeshyService'
import type { ObjectCategory } from '@/types/scene.types'

const CATEGORIES: { id: ObjectCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'people', label: 'People' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'props', label: 'Props' },
]

export function ObjectPicker() {
  const [tab, setTab] = useState<'library' | 'generate'>('library')
  const [activeCategory, setActiveCategory] = useState<ObjectCategory | 'all'>('all')
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genError, setGenError] = useState('')
  const [imageMode, setImageMode] = useState(false)

  const placementTargetId = useSceneStore((s) => s.placementTargetId)
  const setPlacementTarget = useSceneStore((s) => s.setPlacementTarget)

  const displayed = activeCategory === 'all'
    ? OBJECT_LIBRARY
    : getByCategory(activeCategory)

  const handleLibraryPick = (defId: string) => {
    setPlacementTarget(placementTargetId === defId ? null : defId)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGenError('')
    setGenProgress(0)
    try {
      const glbUrl = await generateFromText(prompt, setGenProgress)
      // Place in center of scene
      const event = new CustomEvent('re-experience:place-object', {
        detail: {
          defId: `generated_${Date.now()}`,
          position: { x: 0, y: 0, z: 0 },
          glbPath: glbUrl,
          prompt,
        },
      })
      window.dispatchEvent(event)
      setPrompt('')
    } catch (err: any) {
      setGenError(err.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setGenerating(true)
      setGenError('')
      setGenProgress(0)
      try {
        const glbUrl = await generateFromImage(base64, setGenProgress)
        const event = new CustomEvent('re-experience:place-object', {
          detail: {
            defId: `generated_${Date.now()}`,
            position: { x: 0, y: 0, z: 0 },
            glbPath: glbUrl,
          },
        })
        window.dispatchEvent(event)
      } catch (err: any) {
        setGenError(err.message ?? 'Generation failed')
      } finally {
        setGenerating(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-white/10 mb-2">
        {(['library', 'generate'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === t ? 'text-sky-300 border-b-2 border-sky-400' : 'text-white/40 hover:text-white/70'}`}
          >
            {t === 'library' ? 'Library' : 'AI Generate'}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <>
          {/* Category filter */}
          <div className="flex gap-1 flex-wrap mb-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${activeCategory === c.id ? 'bg-sky-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Object grid */}
          <div className="grid grid-cols-3 gap-1.5 overflow-y-auto flex-1 pr-1">
            {displayed.map((def) => (
              <button
                key={def.id}
                onClick={() => handleLibraryPick(def.id)}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-xs border transition-all ${
                  placementTargetId === def.id
                    ? 'border-sky-400 bg-sky-900/60 text-sky-200'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                <span className="text-2xl">{def.thumbnailEmoji}</span>
                <span className="truncate w-full text-center">{def.label}</span>
              </button>
            ))}
          </div>

          {placementTargetId && (
            <div className="mt-2 text-xs text-sky-300/80 text-center bg-sky-900/30 rounded py-1">
              Click anywhere on the scene to place
            </div>
          )}
        </>
      )}

      {tab === 'generate' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => setImageMode(false)}
              className={`flex-1 text-xs py-1 rounded ${!imageMode ? 'bg-sky-700 text-white' : 'bg-white/10 text-white/50'}`}
            >
              Text → 3D
            </button>
            <button
              onClick={() => setImageMode(true)}
              className={`flex-1 text-xs py-1 rounded ${imageMode ? 'bg-sky-700 text-white' : 'bg-white/10 text-white/50'}`}
            >
              Photo → 3D
            </button>
          </div>

          {!imageMode ? (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the object… e.g. 'ornate metal park bench with wooden slats'"
                className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white/80 placeholder:text-white/30 resize-none h-20 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-sm py-2 rounded-lg font-medium transition-colors"
              >
                {generating ? `Generating… ${genProgress}%` : 'Generate Object'}
              </button>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-xl p-6 cursor-pointer hover:border-sky-500/50 transition-colors">
              <span className="text-3xl">📷</span>
              <span className="text-xs text-white/50">Upload a photo of the object</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {generating && <span className="text-sky-300 text-xs">Processing… {genProgress}%</span>}
            </label>
          )}

          {genError && (
            <div className="text-red-400 text-xs bg-red-900/20 rounded p-2">{genError}</div>
          )}

          <div className="text-xs text-white/30 leading-relaxed">
            Requires a Meshy API key in <code className="text-white/50">.env</code><br />
            (<code>VITE_MESHY_API_KEY=your_key</code>)
          </div>
        </div>
      )}
    </div>
  )
}
