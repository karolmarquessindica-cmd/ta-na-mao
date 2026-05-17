import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const blockedMenuLabels = ['funcionarios', 'funcionario', 'folha de ponto', 'modo portaria', 'ocorrencias', 'ocorrencia']

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function removeLegacyStaffModules() {
  document.querySelectorAll('.sidebar .nav-item, .nav-item').forEach((item) => {
    const label = normalizeLabel(item.textContent)
    if (blockedMenuLabels.some((blocked) => label === blocked || label.includes(blocked))) {
      item.remove()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

removeLegacyStaffModules()
setInterval(removeLegacyStaffModules, 300)
