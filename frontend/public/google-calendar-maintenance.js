(()=>{
  'use strict';

  const API='https://ta-na-mao-9bii.onrender.com/api/logo-data/google/calendar';
  let status=null;
  let statusLoading=false;
  let pendingEvent=null;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const token=()=>localStorage.getItem('tnm_token');
  const authHeaders=()=>token()?{Authorization:`Bearer ${token}`}:{ };

  async function request(path,options={}){
    const response=await fetch(API+path,{...options,headers:{...authHeaders(),...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error||`Erro ${response.status}`);
    return body;
  }

  function notify(message,type='ok'){
    let box=document.getElementById('tnm-google-calendar-notice');
    if(!box){
      box=document.createElement('div');
      box.id='tnm-google-calendar-notice';
      Object.assign(box.style,{position:'fixed',right:'22px',bottom:'22px',zIndex:'99999',maxWidth:'360px',padding:'13px 16px',borderRadius:'12px',fontFamily:'DM Sans,Arial,sans-serif',fontSize:'13px',fontWeight:'700',boxShadow:'0 12px 32px rgba(0,0,0,.22)',transition:'opacity .2s'});
      document.body.appendChild(box);
    }
    box.style.background=type==='err'?'#7f1d1d':'#064e3b';
    box.style.color='#fff';
    box.style.opacity='1';
    box.textContent=message;
    clearTimeout(box._timer);
    box._timer=setTimeout(()=>{box.style.opacity='0'},4500);
  }

  function ensureCss(){
    if(document.getElementById('tnm-google-maintenance-css')) return;
    const style=document.createElement('style');
    style.id='tnm-google-maintenance-css';
    style.textContent=`
      .tnm-gcal-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;margin-bottom:18px;border:1px solid #cfe4d3;border-radius:18px;background:linear-gradient(135deg,#f8fff7,#eefaf0);box-shadow:0 8px 24px rgba(0,59,36,.06)}
      .tnm-gcal-info{display:flex;align-items:center;gap:12px;min-width:0}.tnm-gcal-icon{width:44px;height:44px;border-radius:13px;background:#fff;border:1px solid #dce8df;display:flex;align-items:center;justify-content:center;font-size:23px;flex:0 0 auto}
      .tnm-gcal-title{font-weight:900;color:#003b24;font-size:15px}.tnm-gcal-sub{font-size:12px;color:#68766d;margin-top:3px;line-height:1.4}.tnm-gcal-state{display:inline-flex;margin-top:6px;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:900;background:#f1f5f2;color:#607067}.tnm-gcal-state.on{background:#dcfce7;color:#166534}.tnm-gcal-state.err{background:#fee2e2;color:#991b1b}
      .tnm-gcal-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.tnm-gcal-btn{border:0;border-radius:11px;padding:10px 14px;font-weight:900;cursor:pointer;font-size:13px}.tnm-gcal-connect{background:#08783f;color:#fff}.tnm-gcal-disconnect{background:#fff;color:#b42318;border:1px solid #fecaca}.tnm-gcal-btn:disabled{opacity:.55;cursor:wait}
      .tnm-gcal-check{display:flex;align-items:center;gap:9px;padding:12px 13px;margin-bottom:14px;border:1px solid #cfe4d3;border-radius:12px;background:#f6fff7;color:#003b24;font-size:13px;font-weight:800}.tnm-gcal-check input{width:auto;margin:0}.tnm-gcal-check small{display:block;color:#68766d;font-weight:500;margin-top:2px}
      @media(max-width:720px){.tnm-gcal-card{align-items:flex-start;flex-direction:column}.tnm-gcal-actions,.tnm-gcal-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function maintenancePage(){
    return [...document.querySelectorAll('h1')].find(el=>normalize(el.textContent)==='manutencoes');
  }

  function renderCard(){
    const heading=maintenancePage();
    if(!heading) return;
    const page=heading.closest('.page');
    if(!page) return;
    let card=page.querySelector('[data-tnm-gcal-card]');
    if(!card){
      card=document.createElement('section');
      card.dataset.tnmGcalCard='1';
      card.className='tnm-gcal-card';
      const header=heading.parentElement?.parentElement;
      if(header&&header.parentElement===page) header.insertAdjacentElement('afterend',card); else page.prepend(card);
    }
    const connected=Boolean(status?.connected);
    const configured=status?.configured!==false;
    const hasError=Boolean(status?.error);
    card.innerHTML=`
      <div class="tnm-gcal-info"><div class="tnm-gcal-icon">📅</div><div>
        <div class="tnm-gcal-title">Google Agenda para manutenções</div>
        <div class="tnm-gcal-sub">As manutenções marcadas serão adicionadas à sua agenda com lembretes de 1 dia e 2 horas.${connected&&status.email?`<br>Conta: ${escapeHtml(status.email)}`:''}</div>
        <span class="tnm-gcal-state ${hasError?'err':connected?'on':''}">${hasError?'Erro de conexão':connected?'Conectado':'Não conectado'}</span>
      </div></div>
      <div class="tnm-gcal-actions">${connected?'<button type="button" class="tnm-gcal-btn tnm-gcal-disconnect">Desconectar</button>':`<button type="button" class="tnm-gcal-btn tnm-gcal-connect" ${configured?'':'disabled'}>${configured?'Conectar Google Agenda':'Configuração pendente'}</button>`}</div>`;
    card.querySelector('.tnm-gcal-connect')?.addEventListener('click',connect);
    card.querySelector('.tnm-gcal-disconnect')?.addEventListener('click',disconnect);
  }

  function escapeHtml(value){
    const div=document.createElement('div'); div.textContent=String(value||''); return div.innerHTML;
  }

  async function loadStatus(){
    if(statusLoading||!token()) return;
    statusLoading=true;
    try{status=await request('/status')}catch(error){status={configured:true,connected:false,error:error.message}}
    finally{statusLoading=false;renderCard()}
  }

  async function connect(event){
    const button=event.currentTarget;
    button.disabled=true; button.textContent='Abrindo Google...';
    try{const data=await request('/connect'); location.href=data.url}
    catch(error){notify(error.message,'err');button.disabled=false;button.textContent='Conectar Google Agenda'}
  }

  async function disconnect(event){
    if(!confirm('Desconectar sua conta do Google Agenda?')) return;
    const button=event.currentTarget; button.disabled=true;
    try{await request('/disconnect',{method:'DELETE'});status={configured:true,connected:false};renderCard();notify('Google Agenda desconectado.')}
    catch(error){notify(error.message,'err');button.disabled=false}
  }

  function ensureCheckbox(){
    if(!status?.connected) return;
    const modals=[...document.querySelectorAll('.modal')];
    const modal=modals.find(item=>normalize(item.textContent).includes('nova manutencao'));
    if(!modal||modal.querySelector('[data-tnm-gcal-check]')) return;
    const actions=[...modal.querySelectorAll('button')].find(button=>normalize(button.textContent)==='salvar')?.parentElement;
    if(!actions) return;
    const label=document.createElement('label');
    label.dataset.tnmGcalCheck='1';
    label.className='tnm-gcal-check';
    label.innerHTML='<input type="checkbox" checked data-tnm-gcal-checkbox><span>Adicionar ao Google Agenda<small>O evento será criado após salvar a manutenção.</small></span>';
    actions.insertAdjacentElement('beforebegin',label);
  }

  function fieldByLabel(modal,labelText){
    const wanted=normalize(labelText);
    const label=[...modal.querySelectorAll('label')].find(item=>normalize(item.textContent)===wanted);
    return label?.parentElement?.querySelector('input,select,textarea')?.value||'';
  }

  function preparePendingEvent(event){
    const button=event.target.closest('button');
    if(!button||normalize(button.textContent)!=='salvar') return;
    const modal=button.closest('.modal');
    if(!modal||!normalize(modal.textContent).includes('nova manutencao')) return;
    const checkbox=modal.querySelector('[data-tnm-gcal-checkbox]');
    if(!checkbox?.checked){pendingEvent=null;return}
    const condoSelect=maintenancePage()?.closest('.page')?.querySelector('select');
    pendingEvent={
      titulo:fieldByLabel(modal,'Manutencao')||fieldByLabel(modal,'Título'),
      local:fieldByLabel(modal,'Local'),
      descricao:fieldByLabel(modal,'Descricao')||fieldByLabel(modal,'Descrição'),
      responsavel:fieldByLabel(modal,'Responsavel')||fieldByLabel(modal,'Responsável'),
      dataVencimento:fieldByLabel(modal,'Data prevista')||fieldByLabel(modal,'Vencimento'),
      prioridade:fieldByLabel(modal,'Prioridade'),
      condominio:condoSelect?.selectedOptions?.[0]?.textContent||'',
    };
    if(!pendingEvent.titulo||!pendingEvent.dataVencimento) pendingEvent=null;
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const response=await originalFetch(input,init);
    try{
      const url=typeof input==='string'?input:input?.url||'';
      const method=String(init?.method||input?.method||'GET').toUpperCase();
      const isMaintenanceCreate=method==='POST'&&/\/api\/manutencoes(?:\?|$)/.test(url);
      if(isMaintenanceCreate&&response.ok&&pendingEvent){
        const payload=pendingEvent; pendingEvent=null;
        request('/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
          .then(result=>notify(result.htmlLink?'Manutenção salva e adicionada ao Google Agenda.':'Manutenção adicionada ao Google Agenda.'))
          .catch(error=>notify(`Manutenção salva, mas a agenda não foi atualizada: ${error.message}`,'err'));
      } else if(isMaintenanceCreate&&!response.ok){pendingEvent=null}
    }catch(error){console.error('[google-calendar-maintenance]',error)}
    return response;
  };

  document.addEventListener('click',preparePendingEvent,true);
  ensureCss();

  const params=new URLSearchParams(location.search);
  const oauthResult=params.get('googleCalendar');
  if(oauthResult){
    params.delete('googleCalendar');
    history.replaceState({},'',location.pathname+(params.toString()?`?${params}`:'')+location.hash);
    if(oauthResult==='connected') notify('Google Agenda conectado com sucesso.');
    else if(oauthResult==='denied') notify('A conexão com o Google foi cancelada.','err');
    else notify('Não foi possível conectar o Google Agenda.','err');
  }

  function tick(){
    if(maintenancePage()){
      if(!status&&!statusLoading) loadStatus();
      renderCard();
      ensureCheckbox();
    }
  }
  tick();
  setInterval(tick,1200);
})();
