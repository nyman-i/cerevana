// Original Cerevana code. IndexedDB store for CCT sessions — own database
// (NEVER rename: CCTHistory / sessions), mirrors the guarded
// createObjectStore/createIndex idiom used throughout the app (see
// js/quadbox/engine/gamedb.js, js/shared/db.js) but is CCT's own schema,
// not derived from any upstream source.
const DB_NAME = 'CCTHistory'
const DB_VERSION = 1
const STORE_NAME = 'sessions'

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

// last 04:00 day boundary, same rollover convention as the rest of the app
const dayKey = (timestamp) => {
  const date = new Date(timestamp)
  if (date.getHours() < 4) date.setDate(date.getDate() - 1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

// 'YYYY-MM-DD' from LOCAL date parts — toISOString() converts to UTC first,
// which shifts the date by a day for any positive UTC offset
const localDateKey = (timestamp) => {
  const date = new Date(dayKey(timestamp))
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export async function storeSession(record) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).add({ ...record, timestamp: record.endedAt })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getAllSessions() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => { db.close(); resolve(request.result) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

export async function getLastMonthSessions() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const index = tx.objectStore(STORE_NAME).index('timestampIndex')
  const lowerBound = Date.now() - 28 * 24 * 60 * 60 * 1000
  const sessions = []
  return new Promise((resolve, reject) => {
    const cursorRequest = index.openCursor(IDBKeyRange.lowerBound(lowerBound), 'prev')
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) { sessions.push(cursor.value); cursor.continue() }
      else { db.close(); resolve(sessions) }
    }
    cursorRequest.onerror = () => { db.close(); reject(cursorRequest.error) }
  })
}

export async function getPlayTimeSince4AM() {
  const sessions = await getLastMonthSessions()
  const today = dayKey(Date.now())
  return sessions
    .filter((s) => dayKey(s.timestamp) === today)
    .reduce((total, s) => total + s.durationMs, 0)
}

// { 'YYYY-MM-DD': totalMinutes } over the last year, for the Time Spent chart
export async function getYearOfPlayTime() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const index = tx.objectStore(STORE_NAME).index('timestampIndex')
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const days = {}
  return new Promise((resolve, reject) => {
    const cursorRequest = index.openCursor(IDBKeyRange.lowerBound(oneYearAgo.getTime()))
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const key = localDateKey(cursor.value.timestamp)
        days[key] = (days[key] || 0) + cursor.value.durationMs / 60000
        cursor.continue()
      } else {
        db.close(); resolve(days)
      }
    }
    cursorRequest.onerror = () => { db.close(); reject(cursorRequest.error) }
  })
}

export const deleteDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DB_NAME)
  request.onsuccess = () => resolve()
  request.onerror = () => reject(request.error)
  request.onblocked = () => reject(new Error('Delete blocked: another tab may be using the database'))
})
