import { writable } from 'svelte/store'

// Event bus for the Cerevana host page: corner tabs postMessage into the
// iframe and main.js forwards them here. Each request is a fresh object so
// repeated toggles of the same panel still notify subscribers.
const { subscribe, set } = writable(null)
let seq = 0

export const panelRequest = {
  subscribe,
  request: (panel) => set({ panel, seq: ++seq }),
}
