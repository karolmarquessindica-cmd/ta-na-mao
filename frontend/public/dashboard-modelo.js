(function(){
  function card(title, value, icon, note, cls){
    return '<div class="tnm-kpi"><div class="tnm-ico">'+icon+'</div><div><strong>'+value+'</strong><span>'+title+'</span>'+(note?'<small class="'+(cls||'g')+'">'+note+'</small>':'')+'</div></div>'
  }

  function applyDashboard(){
    var page=document.querySelector('.page')
    if(!page) return
    if(page.querySelector('.tnm-dash')) return
    var text=page.innerText||''
    if(!(text.indexOf('Dashboard')>=0 && (text.indexOf('Dados em tempo real')>=0 || text.indexOf('Visão Geral')>=0))) return

    page.innerHTML = '<div class="tnm-dash">'+
      '<div class="tnm-head"><div><h1>Olá, Roberto 👋</h1><p>Aqui está o resumo geral do seu condomínio.</p></div><div class="tnm-actions"><div class="tnm-chip">Residencial Horizonte</div><div class="tnm-chip">Maio/2026</div><div class="tnm-chip tnm-filter">Filtros</div></div></div>'+
      '<div class="tnm-kpis">'+
        card('Manutenções','48','🔧','+15%','g')+
        card('Chamados','36','💬','6 abertos','r')+
        card('Avisos','8','⚠️','2 urgentes','o')+
        card('Moradores','1.257','👥','','')+
        card('Arrecadado','R$125k','💰','+8%','g')+
        card('Comunicados','12','📄','mês atual','g')+
      '</div>'+
      '<div class="tnm-grid">'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Resumo de manutenções</h3><p>Comparativo dos últimos meses</p></div><button class="tnm-link">Ver detalhes</button></div><div class="tnm-chart"><div class="tnm-line l1"></div><div class="tnm-line l2"></div><div class="tnm-line l3"></div><div class="tnm-line l4"></div><svg class="tnm-svg" viewBox="0 0 260 220"><polyline points="20,142 58,118 96,150 134,108 172,128 210,86 246,102" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20,170 58,150 96,166 134,132 172,145 210,118 246,130" fill="none" stroke="#93c5fd" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="tnm-leg"><span><i class="tnm-dot" style="background:#16a34a"></i>Preventivas</span><span><i class="tnm-dot" style="background:#93c5fd"></i>Corretivas</span></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Chamados por status</h3><p>Distribuição atual</p></div></div><div class="tnm-donut"><div class="tnm-ring"><span>36<small>Total</small></span></div><div class="tnm-status"><div class="tnm-row"><span>🔴 Abertos</span><b>6</b></div><div class="tnm-row"><span>🟠 Andamento</span><b>12</b></div><div class="tnm-row"><span>🔵 Retorno</span><b>10</b></div><div class="tnm-row"><span>🟢 Concluídos</span><b>8</b></div></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Atividades recentes</h3><p>Últimas movimentações</p></div></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">🔧</div><div><strong>Manutenção registrada</strong><span>Casa de bombas</span></div><time>Hoje</time></div><div class="tnm-item"><div class="tnm-i">💬</div><div><strong>Novo chamado</strong><span>Iluminação do bloco E</span></div><time>Hoje</time></div><div class="tnm-item"><div class="tnm-i">📢</div><div><strong>Comunicado enviado</strong><span>Limpeza preventiva</span></div><time>Ontem</time></div></div></div>'+
      '</div>'+
      '<div class="tnm-grid2">'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Financeiro do mês</h3><p>Resumo financeiro</p></div></div><div class="tnm-money"><div><span>Receitas</span><b>R$125k</b></div><div><span>Despesas</span><b>R$72k</b></div><div><span>Saldo</span><b>R$53k</b></div></div><div class="tnm-progress"><div></div></div><p>58% do orçamento mensal executado.</p></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Próximas manutenções</h3><p>Agenda preventiva</p></div></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">🧯</div><div><strong>Extintores</strong><span>Inspeção mensal</span></div><span class="tnm-pill">05/05</span></div><div class="tnm-item"><div class="tnm-i">💧</div><div><strong>Caixa d’água</strong><span>Verificação</span></div><span class="tnm-pill">12/05</span></div></div></div>'+
        '<div class="tnm-card"><div class="tnm-title"><div><h3>Comunicados</h3><p>Últimos avisos</p></div></div><div class="tnm-list"><div class="tnm-item"><div class="tnm-i">📄</div><div><strong>Limpeza das caixas</strong><span>Publicado hoje</span></div></div><div class="tnm-item"><div class="tnm-i">📌</div><div><strong>Uso das áreas comuns</strong><span>Publicado ontem</span></div></div></div></div>'+
      '</div>'+
      '<div class="tnm-over"><div class="tnm-card"><div class="tnm-title"><div><h3>Visão geral do condomínio</h3><p>Indicadores estruturais</p></div></div><div class="tnm-overstats"><div><b>6</b><span>Blocos</span></div><div><b>3</b><span>Andares</span></div><div><b>248</b><span>Unidades</span></div><div><b>12</b><span>Funcionários</span></div><div><b>94%</b><span>Em dia</span></div><div><b>18</b><span>Contratos</span></div></div></div><div class="tnm-card tnm-app"><div class="tnm-phone">APP<br/>Tá na Mão</div><div><h3>Portal do morador</h3><p>Acesso rápido a comunicados, chamados, documentos e manutenção.</p><div class="tnm-appbtns"><button class="primary">Abrir portal</button><button class="ghost">Ver QR Code</button></div></div></div></div>'+
    '</div>'
  }

  document.addEventListener('DOMContentLoaded', applyDashboard)
  setInterval(applyDashboard, 1200)
})()
