import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthGate from './components/AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
)

if (
  !window.luminaDesktop
  && 'serviceWorker' in navigator
  && window.location.protocol === 'https:'
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The player remains usable online if service-worker registration fails.
    })
  })
}
