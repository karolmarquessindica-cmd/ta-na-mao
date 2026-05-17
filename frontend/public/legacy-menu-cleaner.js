(function () {
  const BLOCKED_LABELS = [
    'Funcionários',
    'Funcionarios',
    'Folha de Ponto',
    'Modo Portaria',
    'Ocorrências',
    'Ocorrencias'
  ]

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  const blocked = new Set(BLOCKED_LABELS.map(normalize))

  function clean() {
    document.querySelectorAll('.sidebar .nav-item, .nav-item, button').forEach(function (item) {
      const label = normalize(item.textContent)
      if (blocked.has(label)) item.remove()
    })
  }

  clean()
  document.addEventListener('DOMContentLoaded', clean)
  window.addEventListener('load', clean)
  setInterval(clean, 500)

  new MutationObserver(clean).observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})()
