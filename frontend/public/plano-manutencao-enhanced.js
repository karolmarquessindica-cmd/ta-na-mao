(() => {
  if (new URLSearchParams(location.search).has('portal')) return
  document.addEventListener('click', event => {
    const btn = event.target.closest('button')
    if (!btn) return
    const text = (btn.textContent || '').trim().toLowerCase()
    if (!text.includes('gerenciar plano')) return
    console.log('Gerenciar plano clicado')
  }, true)
})()
