(function(){
  function icon(type){
    var icons={
      manut:'<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.2-3.2a6 6 0 0 1-7.9 7.9l-6.7 6.7a2.1 2.1 0 0 1-3-3l6.7-6.7a6 6 0 0 1 7.9-7.9l-3.2 3.2z"/></svg>',
      chat:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      alert:'<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
      users:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      money:'<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      doc:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
      cal:'<svg viewBox="0 0 24 24"><path d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18"/></svg>'
    }
    return '<span class="tnm-svgicon">'+(icons[type]||icons.doc)+'</span>'
  }

  function card(title, value, type, note, cls){
    return '<div class="tnm-kpi"><div class="tnm-ico '+type+'">'+icon(type)+'</div><div><strong>'+value+'</strong><span>'+title+'</span>'+(note?'<small class="'+(cls||'g')+'">'+note+'</small>':'')+'</div></div>'
  }

  function isDashboardPage(page){
    if(!page) return false
    var text = page.innerText || ''
    return text.indexOf('Painel administrativo') >= 0 || text.indexOf('Alertas de vencimento') >= 0 || text.indexOf('Linha do tempo de manutenções') >= 0 || text.indexOf('Atividades por usuário') >= 0 || (text.indexOf('Dashboard') >= 0 && text.indexOf('Visão Geral') >= 0)
  }

  function applyDashboard(){
    var page=document.querySelector('.page')
    if(!page) return
    if(page.querySelector('.tnm-dash')) return
    if(!isDashboardPage(page)) return

    page.innerHTML = '<div class="tnm-dash">'+
      '<div class="tnm-head"><div><h1>Resumo geral</h1><p>Visão consolidada do Residencial Horizonte neste mês.</p></div><div class="tnm-actions"><div class="tnm-chip">Residencial Horizonte</div><div class="tnm-chip">Maio/2026</div><div class="tnm-chip tnm-filter">Filtros</div></div></div>'+
      '<div class="tnm-kpis">'+
        card('Manutenções','48','manut','15% acima do mês anterior','g')+
        card('Chamados','36','chat','6 ainda abertos','r')+
        card('Avisos','8','alert','2 classificados como urgentes','o')+
        card('Moradores','1.257','users','cadastro ativo','g')+
        card('Arrecadado','R$ 125,4 mil','money','12% acima do previsto','g')+
        card('Comunicados','12','doc','publicados no mês','g')+
      '</div>'+
      '<div class="tnm-grid">'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Evolução das manutenções</h3><p>Preventivas e corretivas nos últimos 6 meses</p></div><button class="tnm-link">6 meses</button></div><div class="tnm-chart"><div class="tnm-line l1"></div><div class="tnm-line l2"></div><div class="tnm-line l3"></div><div class="tnm-line l4"></div><svg class="tnm-svg" viewBox="0 0 260 220"><polyline points="20,142 58,118 96,150 134,108 172,128 210,86 246,102" fill="none" stroke="#0f7a3d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20,170 58,150 96,166 134,132 172,145 210,118 246,130" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 6"/></svg></div><div class="tnm-leg"><span><i class="tnm-dot" style="background:#0f7a3d"></i>Preventivas</span><span><i class="tnm-dot" style="background:#94a3b8"></i>Corretivas</span></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Chamados por status</h3><p>Distribuição atual dos registros</p></div></div><div class="tnm-donut"><div class="tnm-ring"><span>36<small>Total</small></span></div><div class="tnm-status"><div class="tnm-row"><span><i class="tnm-dot red"></i>Abertos</span><b>6</b></div><div class="tnm-row"><span><i class="tnm-dot orange"></i>Em andamento</span><b>12</b></div><div class="tnm-row"><span><i class="tnm-dot blue"></i>Aguardando</span><b>10</b></div><div class="tnm-row"><span><i class="tnm-dot green"></i>Concluídos</span><b>8</b></div></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Atividades recentes</h3><p>Últimas movimentações operacionais</p></div><button class="tnm-link">Ver todas</button></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">'+icon('manut')+'</div><div><strong>Manutenção preventiva realizada</strong><span>Elevador social</span></div><time>Hoje</time></div><div class="tnm-item"><div class="tnm-i">'+icon('chat')+'</div><div><strong>Novo chamado aberto</strong><span>Vazamento no salão</span></div><time>Hoje</time></div><div class="tnm-item"><div class="tnm-i">'+icon('alert')+'</div><div><strong>Aviso publicado</strong><span>Interdição da piscina</span></div><time>Ontem</time></div></div></div>'+
      '</div>'+
      '<div class="tnm-grid2">'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Financeiro do mês</h3><p>Resumo financeiro consolidado</p></div></div><div class="tnm-money"><div><span>Arrecadado</span><b class="g">R$ 125.430</b></div><div><span>A receber</span><b class="o">R$ 18.250</b></div><div><span>Inadimplência</span><b class="r">R$ 7.890</b></div></div><p>Taxa de inadimplência <b>5,3%</b></p><div class="tnm-progress"><div></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Próximas manutenções</h3><p>Agenda preventiva</p></div><button class="tnm-link">Ver todas</button></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">'+icon('manut')+'</div><div><strong>Elevador social</strong><span>24/05/2026 às 08:00</span></div><span class="tnm-pill">Preventiva</span></div><div class="tnm-item"><div class="tnm-i">'+icon('cal')+'</div><div><strong>Bombas d’água</strong><span>27/05/2026 às 09:00</span></div><span class="tnm-pill">Preventiva</span></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Comunicados recentes</h3><p>Últimos avisos publicados</p></div><button class="tnm-link">Ver todos</button></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">'+icon('doc')+'</div><div><strong>Assembleia geral</strong><span>30/04/2026</span></div><span class="tnm-pill">2h</span></div><div class="tnm-item"><div class="tnm-i">'+icon('alert')+'</div><div><strong>Interdição da piscina</strong><span>29/04/2026</span></div><span class="tnm-pill">1d</span></div></div></div>'+
      '</div>'+
      '<div class="tnm-over"><div class="tnm-card"><div class="tnm-title"><div><h3>Visão geral do condomínio</h3><p>Indicadores estruturais e operacionais.</p></div></div><div class="tnm-overstats"><div><b>6</b><span>Blocos</span></div><div><b>3</b><span>Andares</span></div><div><b>248</b><span>Unidades</span></div><div><b>12</b><span>Funcionários</span></div><div><b>94%</b><span>Ocupação</span></div><div><b>4,8</b><span>Satisfação</span></div></div></div><div class="tnm-card tnm-app"><div class="tnm-phone">APP<br/>Tá na Mão</div><div><h3>Portal do morador</h3><p>Acesso rápido para chamados, documentos, comunicados e reservas.</p><div class="tnm-appbtns"><button class="primary">Abrir portal</button><button class="ghost">Compartilhar</button></div></div></div></div>'+
    '</div>'
  }

  document.addEventListener('DOMContentLoaded', applyDashboard)
  window.addEventListener('load', applyDashboard)
  setInterval(applyDashboard, 700)

  var observer = new MutationObserver(function(){ applyDashboard() })
  observer.observe(document.documentElement,{childList:true,subtree:true})
})()
