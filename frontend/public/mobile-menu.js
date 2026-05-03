(function () {
  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches
  }

  function ensureMobileMenu() {
    if (!isMobile()) {
      document.body.classList.remove('tnm-menu-open')
      return
    }

    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return

    let toggle = document.querySelector('.tnm-menu-toggle')
    if (!toggle) {
      toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'tnm-menu-toggle'
      toggle.setAttribute('aria-label', 'Abrir menu')
      toggle.innerHTML = '&#9776;'
      document.body.appendChild(toggle)
      toggle.addEventListener('click', function () {
        document.body.classList.add('tnm-menu-open')
      })
    }

    let backdrop = document.querySelector('.tnm-menu-backdrop')
    if (!backdrop) {
      backdrop = document.createElement('div')
      backdrop.className = 'tnm-menu-backdrop'
      document.body.appendChild(backdrop)
      backdrop.addEventListener('click', function () {
        document.body.classList.remove('tnm-menu-open')
      })
    }

    let close = sidebar.querySelector('.tnm-menu-close')
    if (!close) {
      close = document.createElement('button')
      close.type = 'button'
      close.className = 'tnm-menu-close'
      close.setAttribute('aria-label', 'Fechar menu')
      close.innerHTML = '&times;'
      sidebar.insertBefore(close, sidebar.firstChild)
      close.addEventListener('click', function () {
        document.body.classList.remove('tnm-menu-open')
      })
    }

    sidebar.querySelectorAll('.nav-item').forEach(function (item) {
      if (item.dataset.tnmCloseBound === 'true') return
      item.dataset.tnmCloseBound = 'true'
      item.addEventListener('click', function () {
        if (isMobile()) document.body.classList.remove('tnm-menu-open')
      })
    })
  }

  document.addEventListener('DOMContentLoaded', ensureMobileMenu)
  window.addEventListener('resize', ensureMobileMenu)

  const observer = new MutationObserver(function () {
    ensureMobileMenu()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})()
