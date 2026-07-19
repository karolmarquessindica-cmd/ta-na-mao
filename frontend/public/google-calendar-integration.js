(()=>{
  if(new URLSearchParams(location.search).has('portal')) return;

  const API='https://ta-na-mao-9bii.onrender.com/api/logo-data/google/calendar';
  const auth=()=>{const token=localStorage.getItem('tnm_token');return token?{Authorization:`Bearer ${token}`}:{}};
  let status=null;
  let loading=false;

  async function request(path,options={}){
    const response=await fetch(API+path,{...options,headers:{...auth(),...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error||`Erro ${response.status}`);
    return body;
  }

  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}

  function ensureCss(){
    if(document.getElementById('tnm-google-calendar-css')) return;
    const style=document.createElement('style');
    style.id='tnm-google-calendar-css';
    style.textContent=`
      .tnm-google-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 18px;margin-bottom:18px;border:1px solid #cfe4d3;border-radius:18px;background:linear-gradient(135deg,#f8fff7,#eefaf0);box-shadow:0 8px 24px rgba(0,59,36,.06)}
      .tnm-google-left{display:flex;align-items:center;gap:13px;min-width:0}.tnm-google-icon{width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid #dce8df;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
      .tnm-google-title{font-weight:900;color:#003b24;font-size:15px}.tnm-google-sub{font-size:12px;color:#68766d;margin-top:3px;line-height:1.4}.tnm-google-state{display:inline-flex;margin-top:7px;padding:4px 9px;border-radius:99px;font-size:11px;font-weight:900}.tnm-google-on{background:#dcfce7;color:#166534}.tnm-google-off{background:#f1f5f2;color:#607067}.tnm-google-error{background:#fee2e2;color:#991b1b}
      .tnm-google-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.tnm-google-btn{border:0;border-radius:11px;padding:10px 14px;font-weight:900;cursor:pointer;font-size:13px}.tnm-google-connect{background:#08783f;color:white}.tnm-google-disconnect{background:white;color:#b42318;border:1px solid #fecaca}.tnm-google-btn:disabled{opacity:.55;cursor:wait}
      @media(max-width:720px){.tnm-google-card{align-items:flex-start;flex-direction:column}.tnm-google-actions{width:100%}.tnm-google-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function messageFromQuery(){
    const params=new URLSearchParams(location.search);
    const result=params.get('googleCalendar');
    if(!result) return '';
    params.delete('googleCalendar');
    history.replaceState({},'',location.pathname+(params.toString()?`?${params}`:'')+location.hash);
    if(result==='connected') return 'Conta Google conectada com sucesso.';
    if(result==='denied') return 'A autorização do Google foi cancelada.';
    return 'Não foi possível conectar a conta Google.';
  }

  const returnMessage=messageFromQuery();

  async function loadStatus(){
    if(loading) return;
    loading=true;
    try{status=await request('/status')}catch(error){status={configured:false,connected:false,error:error.message}}
    finally{loading=false;render()}
  }

  async function connect(button){
    button.disabled=true;button.textContent='Abrindo Google...';
    try{
      const data=await request('/connect');
      location.href=data.url;
    }catch(error){alert(error.message);button.disabled=false;button.textContent='Conectar Google Agenda'}
  }

  async function disconnect(button){
    if(!confirm('Desconectar sua conta do Google Agenda?')) return;
    button.disabled=true;
    try{await request('/disconnect',{method:'DELETE'});status={...status,connected:false,email:null};render()}
    catch(error){alert(error.message);button.disabled=false}
  }

  function render(){
    const heading=[...document.querySelectorAll('h1')].find(el=>normalize(el.textContent).includes('manutenc'));
    if(!heading) return;
    const page=heading.closest('.page');
    if(!page) return;
    let card=page.querySelector('[data-google-calendar-card]');
    if(!card){
      card=document.createElement('section');
      card.dataset.googleCalendarCard='1';
      const header=heading.parentElement?.parentElement;
      if(header&&header.parentElement===page) header.insertAdjacentElement('afterend',card); else page.prepend(card);
    }
    const connected=Boolean(status?.connected);
    const configured=status?.configured!==false;
    const stateClass=status?.error?'tnm-google-error':connected?'tnm-google-on':'tnm-google-off';
    const stateText=status?.error?'Erro de conexão':connected?'Conectado':'Não conectado';
    card.className='tnm-google-card';
    card.innerHTML=`
      <div class="tnm-google-left">
        <div class="tnm-google-icon">📅</div>
        <div><div class="tnm-google-title">Google Agenda</div><div class="tnm-google-sub">Receba no celular os lembretes das manutenções programadas.${connected&&status.email?`<br>Conta: ${status.email}`:''}${returnMessage?`<br><b>${returnMessage}</b>`:''}</div><span class="tnm-google-state ${stateClass}">${stateText}</span></div>
      </div>
      <div class="tnm-google-actions">
        ${connected?'<button class="tnm-google-btn tnm-google-disconnect">Desconectar</button>':`<button class="tnm-google-btn tnm-google-connect" ${configured?'':'disabled'}>${configured?'Conectar Google Agenda':'Configuração pendente'}</button>`}
      </div>`;
    card.querySelector('.tnm-google-connect')?.addEventListener('click',event=>connect(event.currentTarget));
    card.querySelector('.tnm-google-disconnect')?.addEventListener('click',event=>disconnect(event.currentTarget));
  }

  ensureCss();
  const observer=new MutationObserver(render);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(render,1200);
  loadStatus();
})();