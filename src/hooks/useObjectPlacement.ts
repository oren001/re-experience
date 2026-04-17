import { useEffect } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import { getSceneManager } from './useBabylonEngine'
import { getDefinitionById } from '@/babylon/scene/ObjectLibrary'
import type { SceneObject } from '@/types/scene.types'

export function useObjectPlacement() {
  const addObject = useSceneStore((s) => s.addObject)
  const setPlacementTarget = useSceneStore((s) => s.setPlacementTarget)

  useEffect(() => {
    const handler = async (e: Event) => {
      const { defId, position, glbPath } = (e as CustomEvent).detail
      const sm = getSceneManager()
      if (!sm) return

      const def = getDefinitionById(defId)
      const resolvedGlbPath = glbPath ?? def?.glbPath ?? ''

      const newObj: SceneObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        definitionId: defId,
        label: def?.label ?? defId,
        category: def?.category ?? 'generated',
        glbPath: resolvedGlbPath,
        transform: {
          position,
          rotation: { x: 0, y: 0, z: 0 },
          scaling: def?.defaultScale ?? { x: 1, y: 1, z: 1 },
        },
        generatedFromPrompt: (e as CustomEvent).detail.prompt,
      }

      addObject(newObj)
      await sm.sceneBuilder.addObject(newObj)
      setPlacementTarget(null)
    }

    window.addEventListener('re-experience:place-object', handler)
    return () => window.removeEventListener('re-experience:place-object', handler)
  }, [addObject, setPlacementTarget])
}
