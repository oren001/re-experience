import {
  MeshBuilder,
  Mesh,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core'

// Creates placeholder primitive meshes for objects that don't have GLB files yet.
// glbPath format: __primitive:<type>:<params>
// e.g. __primitive:box:1,2,1  or  __primitive:capsule:0.3,1.75

export function isPrimitive(glbPath: string): boolean {
  return glbPath.startsWith('__primitive:')
}

export function buildPrimitive(glbPath: string, name: string, scene: Scene): Mesh {
  const parts = glbPath.replace('__primitive:', '').split(':')
  const type = parts[0]
  const params = parts[1] ? parts[1].split(',').map(Number) : []

  let mesh: Mesh

  switch (type) {
    case 'capsule': {
      const radius = params[0] ?? 0.3
      const height = params[1] ?? 1.75
      mesh = MeshBuilder.CreateCapsule(name, { radius, height }, scene)
      mesh.position.y = height / 2
      applyColor(mesh, scene, new Color3(0.6, 0.5, 0.4))
      break
    }
    case 'tree': {
      const trunk = MeshBuilder.CreateCylinder(`${name}_trunk`, { height: 1.5, diameter: 0.3 }, scene)
      trunk.position.y = 0.75
      const crown = MeshBuilder.CreateSphere(`${name}_crown`, { diameter: 2.5 }, scene)
      crown.position.y = 2.5
      applyColor(trunk, scene, new Color3(0.4, 0.25, 0.1))
      applyColor(crown, scene, new Color3(0.2, 0.55, 0.2))
      mesh = trunk
      crown.parent = trunk
      break
    }
    case 'bench': {
      const seat = MeshBuilder.CreateBox(`${name}_seat`, { width: 1.5, height: 0.1, depth: 0.5 }, scene)
      seat.position.y = 0.45
      const legFL = MeshBuilder.CreateBox(`${name}_legFL`, { width: 0.08, height: 0.45, depth: 0.08 }, scene)
      legFL.position.set(0.65, 0.225, 0.2)
      const legFR = legFL.clone(`${name}_legFR`)
      legFR.position.set(-0.65, 0.225, 0.2)
      const legBL = legFL.clone(`${name}_legBL`)
      legBL.position.set(0.65, 0.225, -0.2)
      const legBR = legFL.clone(`${name}_legBR`)
      legBR.position.set(-0.65, 0.225, -0.2)
      const backrest = MeshBuilder.CreateBox(`${name}_back`, { width: 1.5, height: 0.4, depth: 0.06 }, scene)
      backrest.position.set(0, 0.7, -0.22)
      applyColor(seat, scene, new Color3(0.45, 0.3, 0.15))
      ;[legFL, legFR, legBL, legBR, backrest].forEach((m) => {
        applyColor(m, scene, new Color3(0.3, 0.2, 0.1))
        m.parent = seat
      })
      mesh = seat
      break
    }
    case 'streetlight': {
      const pole = MeshBuilder.CreateCylinder(`${name}_pole`, { height: 3.5, diameter: 0.1 }, scene)
      pole.position.y = 1.75
      const arm = MeshBuilder.CreateBox(`${name}_arm`, { width: 0.8, height: 0.08, depth: 0.08 }, scene)
      arm.position.set(0.4, 3.55, 0)
      const bulb = MeshBuilder.CreateSphere(`${name}_bulb`, { diameter: 0.2 }, scene)
      bulb.position.set(0.8, 3.55, 0)
      applyColor(pole, scene, new Color3(0.5, 0.5, 0.5))
      applyColor(arm, scene, new Color3(0.5, 0.5, 0.5))
      applyColor(bulb, scene, new Color3(1, 0.95, 0.7))
      arm.parent = pole
      bulb.parent = pole
      mesh = pole
      break
    }
    default: {
      // box: w,h,d
      const w = params[0] ?? 1
      const h = params[1] ?? 1
      const d = params[2] ?? 1
      mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene)
      mesh.position.y = h / 2
      applyColor(mesh, scene, new Color3(0.55, 0.55, 0.6))
      break
    }
  }

  mesh.isPickable = true
  mesh.checkCollisions = true
  return mesh
}

function applyColor(mesh: Mesh, scene: Scene, color: Color3) {
  const mat = new StandardMaterial(`${mesh.name}_mat`, scene)
  mat.diffuseColor = color
  mat.specularColor = new Color3(0.1, 0.1, 0.1)
  mesh.material = mat
}
