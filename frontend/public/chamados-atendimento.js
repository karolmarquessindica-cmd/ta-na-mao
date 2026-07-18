(()=>{
  if(location.search.includes('portal=')) return

  const API='https://ta-na-mao-9bii.onrender.com/api'
  const headers=()=>{
    const token=localStorage.getItem('tnm_token')
    return token?{Authorization:`Bearer ${token}`}:{ }
  }
  const list=value=>Array.isArray(value)?value:(Array.isArray(value?.data)?value.data:[])
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]))
  const date=value=>value?new Date(value).toLocaleString('pt-BR',{
    day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'
  }):''

  async function api(path,options={}){
    const response=await fetch(API+path,{
      ...options,
      headers:{...headers(),...(options.headers||{})}
    })
    const body=await response.json().catch(()=>({}))
    if(!response.ok) throw new Error(body.error||`Erro ${response.status}`)
    return body
  }

  function info(ticket){
    const description=ticket.descricao||''
    const pick=label=>{
      const match=description.match(new RegExp(`${label}:\\s*([^\\n]+)`,'i'))
      return match?match[1].trim():''
    }
    return {
      nome:pick('Nome')||ticket.morador?.nome||'Portal do Morador',
      whatsapp:pick('WhatsApp'),
      apartamento:pick('Apartamento'),
      bloco:pick('Bloco'),
      local:pick('Local informado'),
      condominio:ticket.condominio?.nome||ticket.condominioNome||'Condomínio não identificado',
      descricao:description.replace(/Dados do morador:[\s\S]*/i,'').trim()
    }
  }

  function phone(value){ return String(value||'').replace(/\D/g,'') }
  function whatsappLink(ticket){
    const data=info(ticket)
    const number=phone(data.whatsapp)
    if(!number) return '#'
    const message=`Olá, ${data.nome}! Recebemos seu chamado no ${data.condominio}: ${ticket.titulo}. Protocolo: ${String(ticket.id).slice(0,8).toUpperCase()}.`
    return `https://wa.me/55${number.replace(/^55/,'')}?text=${encodeURIComponent(message)}`
  }

  function ensureCss(){
    if(document.getElementById('atcss')) return
    const style=document.createElement('style')
    style.id='atcss'
    style.textContent=`
      .at-page{padding:24px;max-width:1400px;margin:0 auto}
      .at-wrap{display:grid;grid-template-columns:350px 1fr;gap:14px}
      .at-list,.at-detail{background:white;border:1px solid #dde7de;border-radius:18px;overflow:hidden}
      .at-item{padding:14px;border-bottom:1px solid #eef2ec;cursor:pointer}
      .at-item.on{background:#e8fbea}
      .at-title{font-weight:900;color:#0f1a12;font-size:14px}
      .at-muted{color:#68766d;font-size:12px}
      .at-head{background:#003b24;color:white;padding:18px}
      .at-body{padding:18px;display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
      .at-card{border:1px solid #dde7de;border-radius:16px;padding:15px;background:#fff}
      .at-btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;padding:11px 14px;font-weight:900;text-decoration:none;cursor:pointer}
      .at-green{background:#08783f;color:white}
      .at-badge{display:inline-flex;border-radius:99px;padding:5px 10px;background:#dcfce7;color:#166534;font-size:11px;font-weight:900}
      .at-status{width:100%;padding:10px;border:1px solid #dde7de;border-radius:12px}
      .at-text{white-space:pre-wrap;line-height:1.5;color:#0f1a12;font-size:14px}
      .at-condo{background:#f0fdf4;border:1px solid #bbf7d0;color:#065f46;border-radius:14px;padding:12px;margin-bottom:12px;font-size:14px;font-weight:900}
      @media(max-width:900px){.at-wrap,.at-body{grid-template-columns:1fr}.at-page{padding:14px}}
    `
    document.head.appendChild(style)
  }

  function chamadosRequested(){
    const path=`${location.pathname} ${location.hash}`.toLowerCase()
    if(path.includes('chamado')) return true
    return [...document.querySelectorAll('button,a,[role="button"]')].some(element=>{
      const text=(element.textContent||'').trim().toLowerCase()
      return text==='chamados' && (element.getAttribute('aria-current')==='page'||element.className?.toString().toLowerCase().includes('active'))
    })
  }

  function resolvePage(){
    const title=[...document.querySelectorAll('h1,h2')].find(element=>(element.textContent||'').toLowerCase().includes('chamado'))
    if(title) return title.closest('.page,main,[class*="content"],[class*="page"]')||title.parentElement
    return document.querySelector('main')||document.querySelector('#root>div')||document.getElementById('root')
  }

  let loading=false
  let mounted=false

  async function mount(force=false){
    if(loading) return
    if(!force&&!chamadosRequested()) return
    const page=resolvePage()
    if(!page) return
    if(page.querySelector('[data-atendimento]')) return

    loading=true
    ensureCss()
    page.innerHTML='<div class="at-page" data-atendimento><h1>Central de Atendimento</h1><div class="at-card">Carregando chamados...</div></div>'

    try{
      const response=await api('/chamados?limit=200')
      const tickets=list(response)
      let selected=tickets[0]

      function render(){
        if(!tickets.length){
          page.innerHTML='<div class="at-page" data-atendimento><h1>Central de Atendimento</h1><div class="at-card">Nenhum chamado encontrado para os condomínios deste usuário.</div></div>'
          return
        }
        const details=info(selected)
        page.innerHTML=`
          <div class="at-page" data-atendimento>
            <div style="margin-bottom:16px">
              <h1 style="margin:0;font-size:24px">Central de Atendimento</h1>
              <p class="at-muted" style="margin-top:6px">Chamados enviados pelos moradores.</p>
            </div>
            <div class="at-wrap">
              <div class="at-list">
                ${tickets.map(ticket=>{
                  const data=info(ticket)
                  return `<div class="at-item ${ticket.id===selected.id?'on':''}" data-id="${ticket.id}">
                    <div class="at-title">#${String(ticket.id).slice(0,8).toUpperCase()} · ${esc(ticket.titulo||'Chamado')}</div>
                    <div class="at-muted" style="margin-top:5px">🏢 ${esc(data.condominio)}</div>
                    <div class="at-muted" style="margin-top:5px">${esc(data.nome)} ${data.bloco||data.apartamento?'· '+esc([data.bloco,data.apartamento].filter(Boolean).join(' / ')):''}</div>
                    <div style="margin-top:8px"><span class="at-badge">${esc(ticket.status||'ABERTO')}</span></div>
                  </div>`
                }).join('')}
              </div>
              <div class="at-detail">
                <div class="at-head">
                  <div style="font-size:20px;font-weight:900">Chamado #${String(selected.id).slice(0,8).toUpperCase()}</div>
                  <div style="opacity:.8;margin-top:5px">${esc(selected.categoria||'')} · ${date(selected.createdAt)}</div>
                  <div style="opacity:.95;margin-top:8px;font-weight:900">🏢 ${esc(details.condominio)}</div>
                </div>
                <div class="at-body">
                  <div>
                    <div class="at-condo">Condomínio de origem: ${esc(details.condominio)}</div>
                    <div class="at-card"><h3>Descrição</h3><div class="at-text">${esc(details.descricao||selected.descricao||'Sem descrição registrada.')}</div></div>
                  </div>
                  <div>
                    <div class="at-card">
                      <h3>Dados do morador</h3>
                      <p><b>Nome:</b><br>${esc(details.nome)}</p>
                      <p><b>Bloco:</b><br>${esc(details.bloco)||'—'}</p>
                      <p><b>Apartamento:</b><br>${esc(details.apartamento)||'—'}</p>
                      <p><b>Local:</b><br>${esc(details.local)||'—'}</p>
                      <p><b>WhatsApp:</b><br>${esc(details.whatsapp)||'—'}</p>
                      <a class="at-btn at-green" style="width:100%;box-sizing:border-box" target="_blank" rel="noopener" href="${whatsappLink(selected)}">Responder no WhatsApp</a>
                    </div>
                    <div class="at-card" style="margin-top:12px">
                      <h3>Status</h3>
                      <select class="at-status" id="at-status">
                        <option value="ABERTO">Aberto</option>
                        <option value="EM_ANALISE">Em análise</option>
                        <option value="CONCLUIDO">Concluído</option>
                      </select>
                      <button class="at-btn at-green" id="at-save" style="width:100%;margin-top:10px">Salvar status</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>`

        page.querySelectorAll('.at-item').forEach(item=>item.addEventListener('click',()=>{
          selected=tickets.find(ticket=>ticket.id===item.dataset.id)||selected
          render()
        }))
        const status=page.querySelector('#at-status')
        if(status) status.value=selected.status||'ABERTO'
        page.querySelector('#at-save')?.addEventListener('click',async()=>{
          await api(`/chamados/${selected.id}`,{
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({status:status.value})
          })
          selected.status=status.value
          render()
        })
      }

      render()
      mounted=true
    }catch(error){
      page.innerHTML=`<div class="at-page" data-atendimento><h1>Central de Atendimento</h1><div class="at-card" style="color:#b42318">${esc(error.message)}</div></div>`
    }finally{
      loading=false
    }
  }

  document.addEventListener('click',event=>{
    const control=event.target.closest('button,a,[role="button"]')
    if(!control) return
    if((control.textContent||'').trim().toLowerCase()==='chamados'){
      mounted=false
      setTimeout(()=>mount(true),250)
      setTimeout(()=>mount(true),900)
    }
  },true)

  setInterval(()=>{
    if(chamadosRequested()&&!mounted) mount()
  },1000)
})()
