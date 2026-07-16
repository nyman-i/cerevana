import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { error } from './stores/errorStore'
import { settings } from './stores/settingsStore'

// Follow the Cerevana host theme at load (read-only; never write sllgms-v3-* keys).
// The in-app theme swapper still works for the rest of the session.
try {
  const hostState = JSON.parse(localStorage.getItem('sllgms-v3-app-state'))
  if (hostState && typeof hostState.darkMode === 'boolean') {
    settings.update('theme', hostState.darkMode ? 'dark' : 'light')
  }
} catch { /* host state unreadable — keep Quad Box's own theme */ }

// Cerevana host bridge: the quadbox.html corner tabs postMessage panel
// toggles into this frame (same-origin embed).
import { panelRequest } from './stores/panelRequestStore'
window.addEventListener('message', (e) => {
  const d = e.data
  if (d && d.cerevana === 'toggle' && ['settings', 'chart', 'info'].includes(d.panel)) {
    panelRequest.request(d.panel)
  }
})

window.addEventListener('error', (e) => {
  error.set({ message: e.message, stacktrace: e.stack })
})

window.addEventListener('unhandledrejection', (e) => {
  error.set({
    message: (e.reason?.message || 'Unhandled promise rejection'),
    stacktrace: (e.reason?.stack || e.reason)
  })
})

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
