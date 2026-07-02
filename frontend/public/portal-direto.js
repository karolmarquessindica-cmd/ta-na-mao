(() => {
  const portal = new URLSearchParams(location.search).get('portal')
  if (!portal) return
  const API = 'https://ta-na-mao-9bii.onrender.com/api'
  const root = document.getElementById('root')
  const esc = v => String(v || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const date = v => v ? new Date(v).toLocaleDateString('pt-BR') : 'Data a definir'

  function html(content) {
    if (root) root.innerHTML = content
  }

  html('<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial;background:#f5f8f3;color:#003b24"><strong>Carregando Portal do Morador...</strong></main>')

  fetch(API + '/portal/' + encodeURIComponent(portal))
    .then(async res => {
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    })
    .then(data => {
      const c = data.condominio || {}
      const manutencoes = data.manutencoesPrevistas || []
      const comunicados = data.comunicados || []
      const docs = data.documentos || []
      html(`<main style="min-height:100vh;background:#f5f8f3;font-family:Arial;color:#0f1a12"><header style="background:#003b24;color:white;padding:32px 20px;border-bottom-left-radius:26px;border-bottom-right-radius:26px"><div style="max-width:860px;margin:auto"><small>Portal do Morador</small><h1 style="margin:8px 0 4px;font-size:30px">${esc(c.nome || 'Condomínio')}</h1><p style="margin:0;opacity:.85">${esc([c.endereco,c.cidade,c.estado].filter(Boolean).join(' - '))}</p></div></header><section style="max-width:860px;margin:auto;padding:20px;display:grid;gap:16px"><article style="background:white;border-radius:18px;padding:18px"><h2 style="color:#003b24;margin-top:0">Manutenções agendadas</h2>${manutencoes.length ? manutencoes.map(m => `<div style="border-top:1px solid #eee;padding:12px 0"><b>${esc(m.titulo || m.nome || 'Manutenção')}</b><p style="color:#68766d">${esc(m.descricao || '')}</p><small>${date(m.dataPrevista || m.dataVencimento || m.data)}</small></div>`).join('') : '<p>Nenhuma manutenção agendada.</p>'}</article><article style="background:white;border-radius:18px;padding:18px"><h2 style="color:#003b24;margin-top:0">Comunicados</h2>${comunicados.length ? comunicados.map(i => `<div style="border-top:1px solid #eee;padding:12px 0"><b>${esc(i.titulo)}</b><p style="color:#68766d">${esc(i.conteudo || '')}</p></div>`).join('') : '<p>Nenhum comunicado liberado.</p>'}</article><article style="background:white;border-radius:18px;padding:18px"><h2 style="color:#003b24;margin-top:0">Documentos</h2>${docs.length ? docs.map(d => `<a href="${esc(d.downloadUrl || d.url || '#')}" target="_blank" style="display:block;border-top:1px solid #eee;padding:12px 0;color:#003b24;text-decoration:none"><b>${esc(d.titulo || d.nome)}</b></a>`).join('') : '<p>Nenhum documento liberado.</p>'}</article></section></main>`)
    })
    .catch(err => {
      html(`<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f8f3;font-family:Arial;padding:20px"><section style="background:white;border-radius:20px;padding:24px;max-width:520px;text-align:center"><h1 style="color:#003b24">Portal indisponível</h1><p>O condomínio não foi encontrado no banco atual.</p><small style="color:#999;word-break:break-all">${esc(err.message)}</small></section></main>`)
    })
})()
