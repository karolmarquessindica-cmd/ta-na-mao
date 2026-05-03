(function(){
  function card(title, value, icon, note, cls){
    return '<div class="tnm-kpi"><div class="tnm-ico">'+icon+'</div><div><strong>'+value+'</strong><span>'+title+'</span>'+(note?'<small class="'+(cls||'g')+'">'+note+'</small>':'')+'</div></div>'
  }

  function isDashboardPage(page){
    if(!page) return false
    var text = page.innerText || ''
    return text.indexOf('Painel administrativo') >= 0 ||
           text.indexOf('Alertas de vencimento') >= 0 ||
           text.indexOf('Linha do tempo de manutenções') >= 0 ||
           text.indexOf('Atividades por usuário') >= 0 ||
           (text.indexOf('Dashboard') >= 0 && text.indexOf('Visão Geral') >= 0)
  }

  function applyDashboard(){
    var page=document.querySelector('.page')
    if(!page) return
    if(page.querySelector('.tnm-dash')) return
    if(!isDashboardPage(page)) return

    page.innerHTML = '<div class="tnm-dash">'+
      '<div class="tnm-head"><div><h1>Olá, Roberto 👋</h1><p>Aqui está o resumo geral do seu condomínio.</p></div><div class="tnm-actions"><div class="tnm-chip">🏢 Residencial Horizonte</div><div class="tnm-chip">📅 Maio/2026</div><div class="tnm-chip tnm-filter">☰ Filtros</div></div></div>'+
      '<div class="tnm-kpis">'+
        card('Manutenções','48','🔧','+15% vs mês anterior','g')+
        card('Chamados','36','💬','6 abertos','r')+
        card('Avisos','8','⚠️','2 urgentes','o')+
        card('Moradores','1.257','👥','+8% mês anterior','g')+
        card('Arrecadado','R$125k','💰','+12% mês anterior','g')+
        card('Comunicados','12','📄','enviados este mês','g')+
      '</div>'+
      '<div class="tnm-grid">'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Resumo de manutenções</h3><p>Comparativo dos últimos meses</p></div><button class="tnm-link">6 meses</button></div><div class="tnm-chart"><div class="tnm-line l1"></div><div class="tnm-line l2"></div><div class="tnm-line l3"></div><div class="tnm-line l4"></div><svg class="tnm-svg" viewBox="0 0 260 220"><polyline points="20,142 58,118 96,150 134,108 172,128 210,86 246,102" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20,170 58,150 96,166 134,132 172,145 210,118 246,130" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 5"/></svg></div><div class="tnm-leg"><span><i class="tnm-dot" style="background:#16a34a"></i>Preventivas</span><span><i class="tnm-dot" style="background:#94a3b8"></i>Corretivas</span></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Chamados por status</h3><p>Distribuição atual</p></div></div><div class="tnm-donut"><div class="tnm-ring"><span>36<small>Total</small></span></div><div class="tnm-status"><div class="tnm-row"><span>🔴 Abertos</span><b>6</b></div><div class="tnm-row"><span>🟠 Em andamento</span><b>12</b></div><div class="tnm-row"><span>🔵 Aguardando</span><b>10</b></div><div class="tnm-row"><span>🟢 Concluídos</span><b>8</b></div></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Atividades recentes</h3><p>Últimas movimentações</p></div><button class="tnm-link">Ver todas</button></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">🔧</div><div><strong>Manutenção preventiva realizada</strong><span>Elevador Social</span></div><time>Hoje</time></div><div class="tnm-item"><div class="tnm-i">💬</div><div><strong>Novo chamado aberto</strong><span>Vazamento no salão</span></div><time>Hoje</time></div><div class="tnm-item"><div class="tnm-i">⚠️</div><div><strong>Aviso publicado</strong><span>Interdição da piscina</span></div><time>Ontem</time></div></div></div>'+
      '</div>'+
      '<div class="tnm-grid2">'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Financeiro do mês</h3><p>Resumo financeiro</p></div></div><div class="tnm-money"><div><span>Arrecadado</span><b class="g">R$125.430</b></div><div><span>A receber</span><b class="o">R$18.250</b></div><div><span>Inadimplência</span><b class="r">R$7.890</b></div></div><p>Taxa de inadimplência <b>5,3%</b></p><div class="tnm-progress"><div></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Próximas manutenções</h3><p>Agenda preventiva</p></div><button class="tnm-link">Ver todas</button></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">🔧</div><div><strong>Elevador Social</strong><span>24/05/2026 às 08:00</span></div><span class="tnm-pill">Preventiva</span></div><div class="tnm-item"><div class="tnm-i">💧</div><div><strong>Bombas d’água</strong><span>27/05/2026 às 09:00</span></div><span class="tnm-pill">Preventiva</span></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Comunicados recentes</h3><p>Últimos avisos</p></div><button class="tnm-link">Ver todos</button></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">📄</div><div><strong>Assembleia geral</strong><span>30/04/2026</span></div><span class="tnm-pill">2h</span></div><div class="tnm-item"><div class="tnm-i">📌</div><div><strong>Interdição da piscina</strong><span>29/04/2026</span></div><span class="tnm-pill">1d</span></div></div></div>'+
      '</div>'+
      '<div class="tnm-over"><div class="tnm-card"><div class="tnm-title"><div><h3>Visão geral do condomínio</h3><p>Acompanhe os principais indicadores.</p></div></div><div class="tnm-overstats"><div><b>6</b><span>Blocos</span></div><div><b>3</b><span>Andares</span></div><div><b>248</b><span>Unidades</span></div><div><b>12</b><span>Funcionários</span></div><div><b>94%</b><span>Ocupação</span></div><div><b>4,8</b><span>Satisfação</span></div></div></div><div class="tnm-card tnm-app"><div class="tnm-phone">APP<br/>Tá na Mão</div><div><h3>Baixe o app do morador</h3><p>Mais praticidade para você e seus moradores.</p><div class="tnm-appbtns"><button class="primary">Baixar agora</button><button class="ghost">Compartilhar</button></div></div></div></div>'+
    '</div>'
  }

  document.addEventListener('DOMContentLoaded', applyDashboard)
  window.addEventListener('load', applyDashboard)
  setInterval(applyDashboard, 700)

  var observer = new MutationObserver(function(){ applyDashboard() })
  observer.observe(document.documentElement,{childList:true,subtree:true})
})()
