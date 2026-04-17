/**
 * Creates the RunPod serverless endpoint via GraphQL API.
 * Run once after the Docker image has been pushed to GHCR.
 *
 * Usage:
 *   node worker/create-endpoint.mjs <github-username>
 *
 * Example:
 *   node worker/create-endpoint.mjs oren001
 */

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || 'rpa_7UAPE1YWTNGO8MEJG1IIEAKOEO62UNZM2X0A4P0Fax1zke'
const ghUser = process.argv[2]

if (!ghUser) {
  console.error('Usage: node create-endpoint.mjs <github-username>')
  process.exit(1)
}

const IMAGE = `ghcr.io/${ghUser.toLowerCase()}/re-experience-worker:latest`

console.log(`\nCreating RunPod endpoint with image: ${IMAGE}\n`)

const mutation = `
  mutation {
    saveEndpoint(input: {
      name: "re-experience-3dgs"
      templateId: null
      dockerArgs: ""
      imageName: "${IMAGE}"
      gpuIds: "AMPERE_48"
      minWorkers: 0
      maxWorkers: 3
      idleTimeout: 60
      scalerType: "QUEUE_DELAY"
      scalerValue: 4
      networkVolumeId: null
      env: [
        { key: "R2_ENDPOINT",   value: "FILL_ME" }
        { key: "R2_BUCKET",     value: "re-experience-videos" }
        { key: "R2_ACCESS_KEY", value: "FILL_ME" }
        { key: "R2_SECRET_KEY", value: "FILL_ME" }
        { key: "R2_PUBLIC_URL", value: "FILL_ME" }
      ]
    }) {
      id
      name
    }
  }
`

const res = await fetch(`https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: mutation }),
})

const json = await res.json()

if (json.errors) {
  console.error('❌ GraphQL errors:', JSON.stringify(json.errors, null, 2))
  process.exit(1)
}

const endpoint = json.data?.saveEndpoint
if (!endpoint) {
  console.error('❌ Unexpected response:', JSON.stringify(json, null, 2))
  process.exit(1)
}

console.log(`✅ Endpoint created!`)
console.log(`   ID   : ${endpoint.id}`)
console.log(`   Name : ${endpoint.name}`)
console.log(`\nNext steps:`)
console.log(`1. Go to https://www.runpod.io/console/serverless`)
console.log(`2. Open "re-experience-3dgs" → edit env vars → fill in R2 credentials`)
console.log(`3. Add to .env:`)
console.log(`   VITE_RUNPOD_ENDPOINT_ID=${endpoint.id}`)
console.log(`   VITE_RUNPOD_API_KEY=rpa_7UAPE1YWTNGO8MEJG1IIEAKOEO62UNZM2X0A4P0Fax1zke`)
