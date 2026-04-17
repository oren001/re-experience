import {
  Engine,
  Scene,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  UniversalCamera,
} from '@babylonjs/core'

export function buildSafeSpace(engine: Engine): Scene {
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.55, 0.75, 0.9, 1)
  scene.collisionsEnabled = true

  // Soft ambient lighting
  const light = new HemisphericLight('safeLight', new Vector3(0, 1, 0), scene)
  light.intensity = 1.0
  light.diffuse = new Color3(0.9, 0.95, 1)
  light.groundColor = new Color3(0.4, 0.6, 0.4)

  // Ground - soft green
  const ground = MeshBuilder.CreateGround('safeGround', { width: 100, height: 100 }, scene)
  const groundMat = new StandardMaterial('safeGroundMat', scene)
  groundMat.diffuseColor = new Color3(0.3, 0.55, 0.3)
  groundMat.specularColor = Color3.Black()
  ground.material = groundMat
  ground.checkCollisions = true

  // A few trees for atmosphere
  const treePositions = [
    [-8, 0, -8], [6, 0, -10], [-5, 0, 8], [9, 0, 5], [-12, 0, 3],
    [4, 0, 12], [-3, 0, -14], [13, 0, -4],
  ]
  treePositions.forEach(([x, , z], i) => {
    const trunk = MeshBuilder.CreateCylinder(`st${i}`, { height: 2.5, diameter: 0.3 }, scene)
    trunk.position.set(x, 1.25, z)
    const trunkMat = new StandardMaterial(`stm${i}`, scene)
    trunkMat.diffuseColor = new Color3(0.35, 0.22, 0.1)
    trunk.material = trunkMat

    const crown = MeshBuilder.CreateSphere(`sc${i}`, { diameter: 3.5 }, scene)
    crown.position.set(x, 4, z)
    const crownMat = new StandardMaterial(`scm${i}`, scene)
    crownMat.diffuseColor = new Color3(0.2, 0.6, 0.25)
    crown.material = crownMat
  })

  // Gentle fog
  scene.fogMode = Scene.FOGMODE_EXP
  scene.fogDensity = 0.008
  scene.fogColor = new Color3(0.7, 0.85, 0.95)

  // Camera
  const cam = new UniversalCamera('safeCam', new Vector3(0, 1.7, -3), scene)
  cam.setTarget(new Vector3(0, 1.7, 0))
  cam.checkCollisions = true

  // Text overlay is handled in React (NavigationHUD)

  return scene
}
