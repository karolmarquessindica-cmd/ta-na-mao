(()=> {
  if (location.search.includes('portal=') || window.__TNM_ORCAMENTO__) return;
  window.__TNM_ORCAMENTO__ = true;
  const API = 'https://ta-na-mao-9bii.onrender.com/api';
  const token = () => localStorage.getItem('tnm_token') || '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const normalize = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const categoryNames = {IMPOSTO:'Impostos',MAO_DE_OBRA:'Mão de obra',FORNECEDOR:'Fornecedores',MANUTENCAO:'Manutenção',SERVICO:'Serviços',UTILIDADE:'Água, energia e utilidades',SEGURO:'Seguros',OUTRO:'Outros'};
  const categoryOptions = Object.entries(categoryNames).map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  const headers = () => ({Authorization:'Bearer '+token(),'Content-Type':'application/json'});
  async function req(path,opts={}) {
    const r=await fetch(API+path,{...opts,headers:{...headers(),...(opts.headers||{})}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||('Erro '+r.status));
    return data;
  }
  function payloadUser() { try { return JSON.parse(atob(token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { return null; } }
  function css(){
    if(document.getElementById('tnm-budget-css'))return;
    const s=document.createElement('style');s.id='tnm-budget-css';s.textContent=`
      .tnm-budget-launch{margin:8px 0 0;background:#003B24;color:#fff;border:0;border-radius:10px;padding:9px 12px;font-size:12px;font-weight:800;cursor:pointer}
      #tnm-budget-modal{position:fixed;inset:0;z-index:100300;background:rgba(3,20,11,.62);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto;font-family:'DM Sans',Arial,sans-serif;color:#14251a}
      .tnm-budget-shell{width:min(1150px,100%);background:#f5f8f3;border-radius:22px;padding:22px;box-shadow:0 25px 80px #001b1090;margin:auto}
      .tnm-budget-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
      .tnm-budget-title{font-size:24px;font-weight:900;margin:0;color:#003B24}.tnm-budget-sub{font-size:13px;color:#64746a;margin-top:5px}
      .tnm-budget-btn{border:1px solid #dce7dd;border-radius:10px;background:white;color:#003B24;padding:9px 12px;font-weight:800;cursor:pointer}
      .tnm-budget-primary{background:#003B24;color:#fff;border-color:#003B24}
      .tnm-budget-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
      .tnm-budget-stat{background:#fff;border:1px solid #e0e9e0;border-radius:14px;padding:14px}.tnm-budget-stat span{display:block;font-size:11px;color:#68776c;font-weight:800}.tnm-budget-stat strong{display:block;font-size:20px;margin-top:6px;overflow-wrap:anywhere}
      .tnm-budget-card{background:#fff;border:1px solid #dfe8df;border-radius:15px;padding:16px;margin-top:13px}
      .tnm-budget-card h3{font-size:15px;margin:0 0 12px;color:#003B24}
      .tnm-budget-table-wrap{overflow:auto;border:1px solid #e1e9e1;border-radius:11px}
      .tnm-budget-table{border-collapse:collapse;width:100%;font-size:12px;min-width:620px}.tnm-budget-table th,.tnm-budget-table td{padding:10px 11px;border-bottom:1px solid #edf1ed;text-align:right;white-space:nowrap}.tnm-budget-table th{background:#f5f8f3;color:#5b6b60;font-size:10px;text-transform:uppercase}.tnm-budget-table th:first-child,.tnm-budget-table td:first-child{text-align:left}
      .tnm-budget-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tnm-budget-fields label{display:block;font-size:11px;font-weight:800;color:#4e6054;margin-bottom:5px}.tnm-budget-fields input,.tnm-budget-fields select,.tnm-budget-fields textarea{box-sizing:border-box;width:100%;border:1px solid #d7e2d8;border-radius:9px;padding:10px;background:#fff;font:inherit;font-size:13px}.tnm-budget-wide{grid-column:1/-1}
      .tnm-budget-category{display:grid;grid-template-columns:1.1fr 1.3fr .8fr auto;gap:8px;align-items:center;margin:8px 0}.tnm-budget-category input,.tnm-budget-category select{min-width:0;width:100%;box-sizing:border-box;border:1px solid #d7e2d8;border-radius:8px;padding:9px;background:#fff}
      .tnm-budget-muted{font-size:12px;color:#68776c}.tnm-budget-alert{padding:12px;border-radius:10px;background:#fff6e6;color:#815500;font-size:12px;margin-top:10px}.tnm-budget-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}
      @media(max-width:700px){#tnm-budget-modal{padding:7px}.tnm-budget-shell{padding:13px;border-radius:15px}.tnm-budget-title{font-size:20px}.tnm-budget-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.tnm-budget-stat strong{font-size:16px}.tnm-budget-fields{grid-template-columns:1fr}.tnm-budget-category{grid-template-columns:1fr 1fr}.tnm-budget-category>*{min-width:0}.tnm-budget-head{align-items:flex-start}}
    `;document.head.appendChild(s);
  }
  function isEdificacoes(){return [...document.querySelectorAll('h1')].some(el=>normalize(el.textContent)==='edificacoes');}
  function attachButtons(){
    if(!token()||!isEdificacoes())return;
    const user=payloadUser();const current=String(user?.condominioId||'');
    if(!current)return;
    document.querySelectorAll('.card').forEach(card=>{
      const details=[...card.querySelectorAll('button')].find(b=>normalize(b.textContent).includes('detalhes'));
      if(!details||card.querySelector('.tnm-budget-launch')||card.dataset.tnmBudgetPending==='1')return;
      card.dataset.tnmBudgetPending='1';
      const title=normalize(card.textContent);
      // Only expose the budget action on the condominium tied to this authenticated session.
      req('/condominios?limit=200').then(data=>{
        const list=Array.isArray(data)?data:(data.data||data.items||[]);
        const condo=list.find(x=>String(x.id)===current);
        if(!condo||!title.includes(normalize(condo.nome)))return;
        const btn=document.createElement('button');btn.type='button';btn.className='tnm-budget-launch';btn.textContent='▤ Previsão orçamentária';
        btn.addEventListener('click',()=>openBudget(condo));details.insertAdjacentElement('afterend',btn);
      }).catch(()=>{});
    });
  }
  let condoActive=null, currentYear=new Date().getFullYear(), budgetData=null;
  async function openBudget(condo){
    condoActive=condo;css();
    document.getElementById('tnm-budget-modal')?.remove();
    const modal=document.createElement('div');modal.id='tnm-budget-modal';modal.innerHTML='<div class="tnm-budget-shell"><div style="padding:40px;text-align:center">Carregando previsão orçamentária…</div></div>';document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    try{await loadBudget(currentYear)}catch(e){modal.querySelector('.tnm-budget-shell').innerHTML='<div class="tnm-budget-head"><div><h2 class="tnm-budget-title">Previsão orçamentária</h2><div class="tnm-budget-sub">'+esc(condo.nome)+'</div></div><button class="tnm-budget-btn" data-close>Fechar ✕</button></div><div class="tnm-budget-alert">'+esc(e.message)+'</div>';modal.querySelector('[data-close]').onclick=()=>modal.remove();}
  }
  async function loadBudget(year){
    currentYear=year;
    budgetData=await req('/orcamento?ano='+year);
    renderBudget();
  }
  function renderBudget(){
    const modal=document.getElementById('tnm-budget-modal');if(!modal)return;
    const d=budgetData||{}, o=d.orcamento||{}, cats=o.categorias||[], ind=d.indicadores||{}, real=d.categoriasRealizadas||{};
    const totalMensal=Number(ind.totalMensalOrcado||0), totalAnual=Number(ind.totalAnualOrcado||0), realizado=Number(ind.realizadoAno||0);
    const monthsElapsed=currentYear<new Date().getFullYear()?12:(currentYear>new Date().getFullYear()?0:new Date().getMonth()+1);
    const orcadoAcumulado=totalMensal*monthsElapsed;
    const delta=realizado-orcadoAcumulado, percent=orcadoAcumulado>0?((realizado-orcadoAcumulado)/orcadoAcumulado)*100:null;
    const months=Array.from({length:12},(_,i)=>i+1);
    const monthNames=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthlyRows=months.map((m,i)=>{const act=Object.values(real).reduce((sum,c)=>sum+Number(c.meses?.[m]||0),0);const diff=act-totalMensal;return '<tr><td>'+monthNames[i]+'</td><td>'+money(totalMensal)+'</td><td>'+money(act)+'</td><td style="color:'+(diff>0?'#b42318':'#167344')+'">'+money(diff)+'</td></tr>'}).join('');
    const catRows=cats.map(c=>{const r=real[c.categoria]||{total:0,pago:0,aberto:0};const annual=Number(c.valorMensal)*12;const budgetToDate=Number(c.valorMensal)*monthsElapsed;const diff=Number(r.total)-budgetToDate;return '<tr><td>'+esc(categoryNames[c.categoria]||c.categoria)+'</td><td>'+money(Number(c.valorMensal))+'</td><td>'+money(annual)+'</td><td>'+money(r.total)+'</td><td>'+money(r.pago)+'</td><td>'+money(r.aberto)+'</td><td style="color:'+(diff>0?'#b42318':'#167344')+'">'+money(diff)+'</td></tr>'}).join('');
    const budgetedKeys=new Set(cats.map(c=>c.categoria));
    const unbudgetedRows=Object.entries(real).filter(([key])=>!budgetedKeys.has(key)).map(([key,r])=>'<tr><td>'+esc((categoryNames[key]||key)+' · sem previsão')+'</td><td>'+money(0)+'</td><td>'+money(0)+'</td><td>'+money(r.total)+'</td><td>'+money(r.pago)+'</td><td>'+money(r.aberto)+'</td><td style="color:#b42318">'+money(r.total)+'</td></tr>').join('');
    const alert= !o.id?'<div class="tnm-budget-alert">Ainda não existe orçamento cadastrado para '+currentYear+'. Cadastre os valores aprovados em assembleia abaixo para ativar a comparação.</div>':'<div class="tnm-budget-muted" style="margin-top:9px">As despesas são agrupadas pela competência e categoria dos lançamentos financeiros. Os lançamentos cancelados são desconsiderados.</div>';
    modal.querySelector('.tnm-budget-shell').innerHTML=`
      <div class="tnm-budget-head"><div><div style="font-size:10px;font-weight:900;letter-spacing:1px;color:#16804a;text-transform:uppercase">Financeiro da edificação</div><h2 class="tnm-budget-title">Previsão orçamentária</h2><div class="tnm-budget-sub">${esc(condoActive?.nome)} · Orçado x realizado</div></div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><select id="tnm-budget-year" class="tnm-budget-btn">${Array.from({length:7},(_,i)=>new Date().getFullYear()-3+i).map(y=>'<option '+(y===currentYear?'selected':'')+' value="'+y+'">'+y+'</option>').join('')}</select><button class="tnm-budget-btn" data-close>Fechar ✕</button></div></div>
      <div class="tnm-budget-stats">
        <div class="tnm-budget-stat"><span>ORÇAMENTO MENSAL</span><strong>${money(totalMensal)}</strong></div>
        <div class="tnm-budget-stat"><span>ORÇADO ACUMULADO</span><strong>${money(orcadoAcumulado)}</strong></div>
        <div class="tnm-budget-stat"><span>REALIZADO NO ANO</span><strong>${money(realizado)}</strong></div>
        <div class="tnm-budget-stat"><span>DESVIO ANUAL</span><strong style="color:${delta>0?'#b42318':'#167344'}">${money(delta)} ${percent===null?'': '('+Number(percent).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%)'}</strong></div>
      </div>
      <div class="tnm-budget-muted">Pago no ano: <b>${money(ind.pagoAno)}</b> · Em aberto: <b>${money(ind.abertoAno)}</b>. O desvio compara as despesas lançadas com o orçamento esperado até o mês selecionado. Orçamento anual completo: <b>${money(totalAnual)}</b>.</div>
      ${alert}
      <section class="tnm-budget-card"><h3>Comparativo mensal</h3><div class="tnm-budget-table-wrap"><table class="tnm-budget-table"><thead><tr><th>Mês</th><th>Orçado</th><th>Realizado</th><th>Diferença</th></tr></thead><tbody>${monthlyRows}</tbody></table></div></section>
      <section class="tnm-budget-card"><h3>Por categoria</h3><div class="tnm-budget-table-wrap"><table class="tnm-budget-table"><thead><tr><th>Categoria</th><th>Orçado/mês</th><th>Orçado/ano</th><th>Realizado</th><th>Pago</th><th>Em aberto</th><th>Desvio</th></tr></thead><tbody>${catRows+unbudgetedRows||'<tr><td colspan="7" style="text-align:center;padding:20px">Cadastre as categorias orçadas abaixo.</td></tr>'}</tbody></table></div></section>
      <section class="tnm-budget-card"><h3>${o.id?'Atualizar orçamento':'Cadastrar orçamento aprovado'}</h3><div class="tnm-budget-fields">
        <div><label>Ano do orçamento</label><input id="tnm-budget-form-year" type="number" min="2000" max="2200" value="${currentYear}"></div>
        <div><label>Data da assembleia</label><input id="tnm-budget-date" type="date" value="${o.dataAssembleia?String(o.dataAssembleia).slice(0,10):''}"></div>
        <div class="tnm-budget-wide"><label>Referência da ata / assembleia</label><input id="tnm-budget-ata" value="${esc(o.referenciaAta||'')}" placeholder="Ex.: Ata da AGO de 15/12/${currentYear}"></div>
        <div class="tnm-budget-wide"><label>Observações</label><textarea id="tnm-budget-notes" rows="2" placeholder="Critérios, ressalvas ou informações do orçamento aprovado">${esc(o.observacoes||'')}</textarea></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:15px"><h3 style="margin:0">Valores aprovados por categoria (mensais)</h3><button type="button" class="tnm-budget-btn" id="tnm-budget-add">＋ Categoria</button></div>
      <div id="tnm-budget-categories">${cats.map(c=>categoryEditor(c)).join('')}</div>
      <div class="tnm-budget-muted">Atenção: salvar uma alteração registra um histórico da versão anterior. Informe a referência da assembleia correspondente; o sistema não presume aprovação automática.</div>
      <div class="tnm-budget-actions"><button class="tnm-budget-btn" data-close>Cancelar</button><button class="tnm-budget-btn tnm-budget-primary" id="tnm-budget-save">Salvar orçamento</button></div></section>
      <div id="tnm-budget-message" class="tnm-budget-muted" role="status" style="margin-top:10px"></div>`;
    modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal.remove());
    modal.querySelector('#tnm-budget-year').onchange=async e=>{try{await loadBudget(Number(e.target.value))}catch(err){alert(err.message)}};
    modal.querySelector('#tnm-budget-add').onclick=()=>{const host=modal.querySelector('#tnm-budget-categories');host.insertAdjacentHTML('beforeend',categoryEditor({categoria:'OUTRO',descricao:'',valorMensal:'0.00'}));};
    modal.querySelector('#tnm-budget-categories').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)b.closest('.tnm-budget-category').remove()});
    modal.querySelector('#tnm-budget-save').onclick=saveBudget;
  }
  function categoryEditor(c){
    return '<div class="tnm-budget-category"><select data-category>'+Object.entries(categoryNames).map(([v,l])=>'<option value="'+v+'" '+(v===c.categoria?'selected':'')+'>'+l+'</option>').join('')+'</select><input data-description maxlength="300" placeholder="Descrição opcional" value="'+esc(c.descricao||'')+'"><input data-value type="number" min="0" step="0.01" placeholder="R$/mês" value="'+esc(c.valorMensal??'0')+'"><button type="button" class="tnm-budget-btn" data-remove aria-label="Remover categoria">×</button></div>';
  }
  async function saveBudget(){
    const modal=document.getElementById('tnm-budget-modal'), button=modal.querySelector('#tnm-budget-save'), message=modal.querySelector('#tnm-budget-message');
    const rows=[...modal.querySelectorAll('.tnm-budget-category')];
    const categories=rows.map(row=>({categoria:row.querySelector('[data-category]').value,descricao:row.querySelector('[data-description]').value,valorMensal:row.querySelector('[data-value]').value}));
    if(new Set(categories.map(c=>c.categoria)).size!==categories.length){message.textContent='Cada categoria pode aparecer apenas uma vez. Ajuste os itens duplicados.';return;}
    button.disabled=true;button.textContent='Salvando…';message.textContent='';
    try{
      const year=Number(modal.querySelector('#tnm-budget-form-year').value);
      await req('/orcamento',{method:'PUT',body:JSON.stringify({ano:year,dataAssembleia:modal.querySelector('#tnm-budget-date').value||null,referenciaAta:modal.querySelector('#tnm-budget-ata').value,observacoes:modal.querySelector('#tnm-budget-notes').value,categorias,motivoRevisao:'Atualização realizada pela tela de previsão orçamentária'})});
      currentYear=year;budgetData=await req('/orcamento?ano='+year);renderBudget();
      const m=document.getElementById('tnm-budget-message');if(m)m.textContent='Orçamento salvo e histórico atualizado.';
    }catch(e){message.textContent='Não foi possível salvar: '+e.message;}
    finally{const b=modal.querySelector('#tnm-budget-save');if(b){b.disabled=false;b.textContent='Salvar orçamento';}}
  }
  const observer=new MutationObserver(()=>attachButtons());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',attachButtons);
  setTimeout(attachButtons,800);setTimeout(attachButtons,1800);
})();