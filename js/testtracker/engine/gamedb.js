// Original Cerevana code. IndexedDB store for external test-battery scores -
// own database (own identifiers, never shared with a game's history store),
// mirrors the guarded createObjectStore/createIndex idiom used throughout the
// app (see js/cct/engine/gamedb.js, js/quadbox/engine/gamedb.js, js/shared/db.js).
const DB_NAME = 'TestTrackerHistory'
const DB_VERSION = 1
const STORE_NAME = 'scores'

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = (event) => {
    const db = event.target.result
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      store.createIndex('timestampIndex', 'timestamp')
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

// record: { testId, testName, category, timestamp, score, note }
export async function addScore(record) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).add(record)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getAllScores() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => { db.close(); resolve(request.result) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

export async function deleteScore(id) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export const deleteDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DB_NAME)
  request.onsuccess = () => resolve()
  request.onerror = () => reject(request.error)
  request.onblocked = () => reject(new Error('Delete blocked: another tab may be using the database'))
})
