/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MESHY_API_KEY: string
  readonly VITE_RUNPOD_API_KEY: string
  readonly VITE_RUNPOD_ENDPOINT_ID: string
  readonly VITE_R2_UPLOAD_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
