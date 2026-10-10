import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useStudio } from './store'

// Read-only store access for automated checks: development builds, or `?test` in the URL.
// Absent in the normal presentation build.
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('test')) {
  Object.defineProperty(window, '__studio', { value: Object.freeze({ getState: useStudio.getState }), enumerable: false })
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Once-per-session intro overlay (separate root; skipped under ?test, ?nointro and automation).
import './intro/mount'
