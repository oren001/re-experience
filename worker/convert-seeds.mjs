/**
 * convert-seeds.mjs
 *
 * Downloads the 3 seed PLY files from R2, converts each to .splat format
 * (32 bytes/Gaussian — ~7× smaller than PLY), then uploads back to R2 via
 * `wrangler r2 object put`.
 *
 * .splat binary layout per Gaussian (32 bytes, little-endian):
 *   [0..11]  position x, y, z         float32 × 3
 *  [12..23]  scale    sx, sy, sz       float32 × 3  (exp of log-scale)
 *  [24..27]  color    r, g, b, a       uint8   × 4
 *  [28..31]  rotation rx, ry, rz, rw  uint8   × 4  (normalised, mapped to 0–255)
 *
 * Run:  node worker/convert-seeds.mjs
 */

import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { execSync }                               from 'child_process'
import { join, dirname }                          from 'path'
import { fileURLToPath }                          from 'url'

const __dir    = dirname(fileURLToPath(import.meta.url))
const WORKER   = 'https://re-experience-uploader.oren001.workers.dev'
const BUCKET   = 're-experience-scenes'
const SH_C0    = 0.28209479177387814   // Y_0^0

const SEEDS = [
  { key: 'seeds/scene.ply',   out: 'seeds/scene.splat',   label: 'My Memory'  },
  { key: 'seeds/rebecca.ply', out: 'seeds/rebecca.splat', label: 'Rebecca'    },
  { key: 'seeds/garden.ply',  out: 'seeds/garden.splat',  label: 'Garden'     },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function sigmoid(x) { return 1 / (1 + Math.exp(-x)) }

function parsePLYHeader(buf) {
  // Find end_header marker
  const marker    = Buffer.from('end_header\n')
  const markerIdx = buf.indexOf(marker)
  if (markerIdx === -1) throw new Error('No end_header found')

  const header     = buf.slice(0, markerIdx).toString('ascii')
  const dataOffset = markerIdx + marker.length

  const lines      = header.split('\n').map(l => l.trim()).filter(Boolean)
  let   vertexCount = 0
  const props      = []  // [{ name, type, byteSize }]

  for (const line of lines) {
    if (line.startsWith('element vertex')) {
      vertexCount = parseInt(line.split(/\s+/)[2], 10)
    }
    const pm = line.match(/^property (float|double|int|uint|uchar|char|ushort|short) (.+)$/)
    if (pm) {
      const typeMap = {
        float: 4, double: 8, int: 4, uint: 4,
        uchar: 1, char: 1, ushort: 2, short: 2,
      }
      props.push({ name: pm[2], type: pm[1], size: typeMap[pm[1]] })
    }
  }

  const strideBytes = props.reduce((s, p) => s + p.size, 0)
  return { vertexCount, props, strideBytes, dataOffset }
}

function plyToSplat(plyBuf) {
  const { vertexCount, props, strideBytes, dataOffset } = parsePLYHeader(plyBuf)

  // Build offset map for properties we care about
  const offsets = {}
  let cur = 0
  for (const p of props) {
    offsets[p.name] = cur
    cur += p.size
  }

  const need = ['x','y','z','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3','opacity','f_dc_0','f_dc_1','f_dc_2']
  for (const n of need) {
    if (offsets[n] === undefined) throw new Error(`Missing PLY property: ${n}`)
  }

  const splatBuf = Buffer.allocUnsafe(vertexCount * 32)
  const view     = new DataView(plyBuf.buffer, plyBuf.byteOffset + dataOffset)

  for (let i = 0; i < vertexCount; i++) {
    const base    = i * strideBytes
    const out     = i * 32

    const rf = (o) => view.getFloat32(base + o, true)

    const x  = rf(offsets.x)
    const y  = rf(offsets.y)
    const z  = rf(offsets.z)

    const sx = Math.exp(rf(offsets.scale_0))
    const sy = Math.exp(rf(offsets.scale_1))
    const sz = Math.exp(rf(offsets.scale_2))

    // DC SH → linear RGB (SH_C0 * f_dc + 0.5), clamp, → uint8
    const r = Math.max(0, Math.min(255, Math.round((SH_C0 * rf(offsets.f_dc_0) + 0.5) * 255)))
    const g = Math.max(0, Math.min(255, Math.round((SH_C0 * rf(offsets.f_dc_1) + 0.5) * 255)))
    const b = Math.max(0, Math.min(255, Math.round((SH_C0 * rf(offsets.f_dc_2) + 0.5) * 255)))
    const a = Math.max(0, Math.min(255, Math.round(sigmoid(rf(offsets.opacity)) * 255)))

    // Normalise quaternion (PLY: w, x, y, z)
    let qw = rf(offsets.rot_0)
    let qx = rf(offsets.rot_1)
    let qy = rf(offsets.rot_2)
    let qz = rf(offsets.rot_3)
    const len = Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz) || 1
    qw /= len; qx /= len; qy /= len; qz /= len

    // Map [-1,1] → [0,255]
    const rqx = Math.max(0, Math.min(255, Math.round(qx * 128 + 128)))
    const rqy = Math.max(0, Math.min(255, Math.round(qy * 128 + 128)))
    const rqz = Math.max(0, Math.min(255, Math.round(qz * 128 + 128)))
    const rqw = Math.max(0, Math.min(255, Math.round(qw * 128 + 128)))

    splatBuf.writeFloatLE(x,  out + 0)
    splatBuf.writeFloatLE(y,  out + 4)
    splatBuf.writeFloatLE(z,  out + 8)
    splatBuf.writeFloatLE(sx, out + 12)
    splatBuf.writeFloatLE(sy, out + 16)
    splatBuf.writeFloatLE(sz, out + 20)
    splatBuf.writeUInt8(r,   out + 24)
    splatBuf.writeUInt8(g,   out + 25)
    splatBuf.writeUInt8(b,   out + 26)
    splatBuf.writeUInt8(a,   out + 27)
    splatBuf.writeUInt8(rqx, out + 28)
    splatBuf.writeUInt8(rqy, out + 29)
    splatBuf.writeUInt8(rqz, out + 30)
    splatBuf.writeUInt8(rqw, out + 31)
  }

  return { splatBuf, vertexCount }
}

// ── Main ─────────────────────────────────────────────────────────────────────

for (const seed of SEEDS) {
  console.log(`\n─── ${seed.label} ───────────────────────────────`)

  // 1. Download PLY from R2 via worker proxy
  const downloadUrl = `${WORKER}/read-scene?key=${encodeURIComponent(seed.key)}`
  console.log(`⬇  Downloading ${seed.key}…`)
  const res = await fetch(downloadUrl)
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} for ${seed.key}`)
  const plyBuf = Buffer.from(await res.arrayBuffer())
  console.log(`   PLY size: ${(plyBuf.length / 1024 / 1024).toFixed(1)} MB`)

  // 2. Convert
  console.log(`⚙  Converting to .splat…`)
  const { splatBuf, vertexCount } = plyToSplat(plyBuf)
  console.log(`   Gaussians: ${vertexCount.toLocaleString()}`)
  console.log(`   .splat size: ${(splatBuf.length / 1024 / 1024).toFixed(1)} MB  (${((1 - splatBuf.length / plyBuf.length) * 100).toFixed(0)}% smaller)`)

  // 3. Write to /tmp
  const tmpPath = `/tmp/${seed.out.replace('seeds/', '')}`
  writeFileSync(tmpPath, splatBuf)
  console.log(`   Written to ${tmpPath}`)

  // 4. Upload to R2 via wrangler
  console.log(`⬆  Uploading to R2 as ${seed.out}…`)
  execSync(
    `wrangler r2 object put ${BUCKET}/${seed.out} --file="${tmpPath}" --content-type="application/octet-stream" --remote`,
    { stdio: 'inherit', cwd: join(__dir, 'r2-uploader') }
  )

  // Clean up
  unlinkSync(tmpPath)
  console.log(`✅ Done: ${seed.out}`)
}

console.log('\n🎉 All seeds converted and uploaded.')
console.log('Update SceneLibrary.tsx: change .ply → .splat in seed URLs and sizeBytes.')
