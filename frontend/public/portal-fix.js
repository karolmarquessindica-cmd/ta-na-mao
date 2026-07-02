(() => {
  const params = new URLSearchParams(location.search)
  const portal = params.get('portal')
  if (!portal) return
  document.documentElement.dataset.portalToken = portal
})()
