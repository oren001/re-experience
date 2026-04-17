const DB_NAME = 're-experience'
const STORE_NAME = 'scenes'
const DB_VERSION = 1

export interface SceneMeta {
  id: string
  name: string
  fileName: string
  createdAt: number
  sizeBytes: number
}

interface SceneRecord extends SceneMeta {
  data: ArrayBuffer
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    req.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result)
    req.onerror = (event) => reject((event.target as IDBOpenDBRequest).error)
  })
}

function generateId(): string {
  // crypto.randomUUID is available in all modern browsers (secure contexts)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function saveScene(
  name: string,
  fileName: string,
  data: ArrayBuffer,
): Promise<string> {
  const db = await openDB()
  const id = generateId()
  const record: SceneRecord = {
    id,
    name,
    fileName,
    data,
    createdAt: Date.now(),
    sizeBytes: data.byteLength,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(record)
    req.onsuccess = () => resolve(id)
    req.onerror = (event) => reject((event.target as IDBRequest).error)
    tx.oncomplete = () => db.close()
  })
}

export async function listScenes(): Promise<SceneMeta[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()

    req.onsuccess = (event) => {
      const records = (event.target as IDBRequest<SceneRecord[]>).result
      const metas: SceneMeta[] = records.map(({ id, name, fileName, createdAt, sizeBytes }) => ({
        id,
        name,
        fileName,
        createdAt,
        sizeBytes,
      }))
      // Most recently added first
      metas.sort((a, b) => b.createdAt - a.createdAt)
      resolve(metas)
    }

    req.onerror = (event) => reject((event.target as IDBRequest).error)
    tx.oncomplete = () => db.close()
  })
}

export async function getSceneData(id: string): Promise<ArrayBuffer> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)

    req.onsuccess = (event) => {
      const record = (event.target as IDBRequest<SceneRecord | undefined>).result
      if (!record) {
        reject(new Error(`Scene not found: ${id}`))
      } else {
        resolve(record.data)
      }
    }

    req.onerror = (event) => reject((event.target as IDBRequest).error)
    tx.oncomplete = () => db.close()
  })
}

/** Remove all but the most recent scene for each unique fileName */
export async function deduplicateScenes(): Promise<void> {
  const db = await openDB()
  const all: SceneRecord[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = (e) => resolve((e.target as IDBRequest<SceneRecord[]>).result)
    req.onerror = (e) => reject((e.target as IDBRequest).error)
    tx.oncomplete = () => db.close()
  })

  const seen = new Map<string, SceneRecord>()
  const toDelete: string[] = []
  // Sort oldest first so we keep the newest
  all.sort((a, b) => a.createdAt - b.createdAt)
  for (const r of all) {
    if (seen.has(r.fileName)) toDelete.push(seen.get(r.fileName)!.id)
    seen.set(r.fileName, r)
  }

  for (const id of toDelete) await deleteScene(id)
}

export async function deleteScene(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = (event) => reject((event.target as IDBRequest).error)
    tx.oncomplete = () => db.close()
  })
}
