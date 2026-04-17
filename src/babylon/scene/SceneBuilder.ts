import {
  Scene,
  Vector3,
  GizmoManager,
  Mesh,
  AbstractMesh,
  SceneLoader,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import type { SceneObject, TransformConfig } from '@/types/scene.types'
import { buildPrimitive, isPrimitive } from './PrimitiveBuilder'
import { getDefinitionById } from './ObjectLibrary'
import { useSceneStore } from '@/store/sceneStore'

export class SceneBuilder {
  private gizmoManager: GizmoManager
  private meshMap = new Map<string, AbstractMesh>()  // sceneObjectId → root mesh

  constructor(private scene: Scene) {
    this.gizmoManager = new GizmoManager(scene)
    this.gizmoManager.positionGizmoEnabled = true
    this.gizmoManager.rotationGizmoEnabled = false
    this.gizmoManager.scaleGizmoEnabled = false
    this.gizmoManager.usePointerToAttachGizmos = false

    // Sync gizmo transform back to store when dragging ends
    this.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(() => {
      const mesh = this.gizmoManager.attachedMesh
      if (!mesh) return
      const id = this.findObjectIdByMesh(mesh)
      if (!id) return
      useSceneStore.getState().updateObjectTransform(id, {
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      })
    })
  }

  async addObject(obj: SceneObject): Promise<AbstractMesh> {
    let rootMesh: AbstractMesh

    if (isPrimitive(obj.glbPath)) {
      rootMesh = buildPrimitive(obj.glbPath, obj.id, this.scene)
    } else {
      const result = await SceneLoader.ImportMeshAsync('', '', obj.glbPath, this.scene)
      rootMesh = result.meshes[0]
      rootMesh.name = obj.id
    }

    this.applyTransform(rootMesh, obj.transform)
    rootMesh.isPickable = true
    this.meshMap.set(obj.id, rootMesh)
    return rootMesh
  }

  removeObject(id: string) {
    const mesh = this.meshMap.get(id)
    if (!mesh) return
    mesh.getChildMeshes().forEach((m) => m.dispose())
    mesh.dispose()
    this.meshMap.delete(id)
  }

  selectObject(id: string | null) {
    if (!id) {
      this.gizmoManager.attachToMesh(null)
      return
    }
    const mesh = this.meshMap.get(id)
    if (mesh && mesh instanceof Mesh) {
      this.gizmoManager.attachToMesh(mesh)
    }
  }

  updateTransform(id: string, transform: Partial<TransformConfig>) {
    const mesh = this.meshMap.get(id)
    if (!mesh) return
    if (transform.position) {
      mesh.position.set(transform.position.x, transform.position.y, transform.position.z)
    }
    if (transform.rotation) {
      mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z)
    }
    if (transform.scaling) {
      mesh.scaling.set(transform.scaling.x, transform.scaling.y, transform.scaling.z)
    }
  }

  enableGizmos(enabled: boolean) {
    this.gizmoManager.positionGizmoEnabled = enabled
  }

  getMeshForObject(id: string): AbstractMesh | undefined {
    return this.meshMap.get(id)
  }

  clear() {
    for (const [, mesh] of this.meshMap) {
      mesh.getChildMeshes().forEach((m) => m.dispose())
      mesh.dispose()
    }
    this.meshMap.clear()
  }

  private applyTransform(mesh: AbstractMesh, t: TransformConfig) {
    mesh.position.set(t.position.x, t.position.y, t.position.z)
    mesh.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z)
    mesh.scaling.set(t.scaling.x, t.scaling.y, t.scaling.z)
  }

  private findObjectIdByMesh(mesh: AbstractMesh): string | null {
    for (const [id, m] of this.meshMap) {
      if (m === mesh || m.getChildMeshes().includes(mesh as Mesh)) return id
    }
    return null
  }

  dispose() {
    this.gizmoManager.dispose()
  }
}
