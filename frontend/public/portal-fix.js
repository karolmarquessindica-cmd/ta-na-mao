(() => {
  const params = new URLSearchParams(location.search)
  const portal = params.get('portal')
  if (!portal) return

  document.documentElement.dataset.portalToken = portal

  const apiBase = 'https://ta-na-mao-9bii.onrender.com/api'
  const root = () => document.getElementById('root')
  const esc = value => String(value || '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]))

  function shell(html) {
    const el = root()
    if (!el) return
    el.innerHTML = html
  }

  function loading() {
    shell(`<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f8f3;font-family:Arial,sans-serif;color:#003b24"><div style="text-align:center"><div style="width:38px;height:38px;border:4px solid #dbe7dc;border-top-color:#22c55e;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px"></div><p>Carregando Portal do Morador...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></main>`)
  }

  function error(message) {
    shell(`<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f8f3;font-family:Arial,sans-serif;padding:24px"><section style="max-width:420px;background:white;border:1px solid #dde7de;border-radius:22px;padding:24px;text-align:center;box-shadow:0 14px 40px rgba(0,35,18,.08)"><h1 style="color:#003b24;font-size:22px;margin-bottom:10px">Portal indisponível</h1><p style="color:#68766d;line-height:1.5">${esc(message || 'Não foi possível abrir este portal.')}</p></section></main>`)
  }

  function render(data) {
    const c = data.condominio || {}
    const comunicados = data.comunicados || []
    const docs = data.documentos || []
    const contatos = data.responsaveis || []
    shell(`<main style="min-height:100vh;background:#f5f8f3;font-family:Arial,sans-serif;color:#0f1a12"><header style="background:linear-gradient(135deg,#00150b,#003b24);color:white;padding:30px 22px;border-bottom-left-radius:28px;border-bottom-right-radius:28px"><div style="max-width:720px;margin:0 auto"><div style="font-size:13px;opacity:.8;text-transform:uppercase;font-weight:700;letter-spacing:1px">Portal do Morador</div><h1 style="font-size:30px;margin:8px 0 6px">${esc(c.nome || 'Condomínio')}</h1><p style="opacity:.85;margin:0">${esc([c.endereco,c.cidade,c.estado].filter(Boolean).join(' - '))}</p></div></header><section style="max-width:720px;margin:0 auto;padding:20px"><div style="display:grid;gap:14px"><article style="background:white;border:1px solid #dde7de;border-radius:20px;padding:18px"><h2 style="font-size:18px;color:#003b24;margin-bottom:10px">Comunicados</h2>${comunicados.length ? comunicados.map(item => `<div style="border-top:1px solid #eef3ee;padding:12px 0"><strong>${esc(item.titulo)}</strong><p style="font-size:14px;color:#68766d;line-height:1.45;margin-top:5px">${esc(item.conteudo || '')}</p></div>`).join('') : '<p style="color:#68766d">Nenhum comunicado liberado.</p>'}</article><article style="background:white;border:1px solid #dde7de;border-radius:20px;padding:18px"><h2 style="font-size:18px;color:#003b24;margin-bottom:10px">Documentos</h2>${docs.length ? docs.map(item => `<a href="${esc(item.downloadUrl || item.url || '#')}" target="_blank" rel="noopener noreferrer" style="display:block;border-top:1px solid #eef3ee;padding:12px 0;color:#003b24;text-decoration:none;font-weight:700">${esc(item.titulo || item.nome)}<span style="display:block;color:#68766d;font-size:13px;font-weight:400;margin-top:3px">${esc(item.categoria || item.pasta || 'Documento')}</span></a>`).join('') : '<p style="color:#68766d">Nenhum documento liberado.</p>'}</article><article style="background:white;border:1px solid #dde7de;border-radius:20px;padding:18px"><h2 style="font-size:18px;color:#003b24;margin-bottom:10px">Contatos</h2>${contatos.length ? contatos.map(item => `<div style="border-top:1px solid #eef3ee;padding:12px 0"><strong>${esc(item.nome)}</strong><p style="font-size:14px;color:#68766d;margin-top:4px">${esc(item.funcao || '')} ${item.whatsapp ? '• WhatsApp: ' + esc(item.whatsapp) : ''}</p></div>`).join('') : '<p style="color:#68766d">Nenhum contato liberado.</p>'}</article></div></section></main>`)
  }

  loading()
  fetch(`${apiBase}/portal/${encodeURIComponent(portal)}`)
    .then(res => res.ok ? res.json() : Promise.reject(new Error('Portal não encontrado ou indisponível.')))
    .then(render)
    .catch(err => error(err.message))
})()
