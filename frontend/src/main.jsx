import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const LEGACY_MENU_LABELS = new Set([
  'Funcionários',
  'Folha de Ponto',
  'Modo Portaria',
  'Ocorrências',
])

function removeLegacyMenuItems() {
  const elements = Array.from(document.querySelectorAll('button, a, div, span'))
  for (const el of elements) {
    const label = (el.textContent || '').trim()
    if (!LEGACY_MENU_LABELS.has(label)) continue

    const menuItem = el.closest('.nav-item') || el.closest('button') || el
    menuItem.remove()
  }
}

function startLegacyMenuCleanup() {
  removeLegacyMenuItems()
  const observer = new MutationObserver(removeLegacyMenuItems)
  observer.observe(document.body, { childList: true, subtree: true })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

startLegacyMenuCleanup()
