(()=>{
  const MARK='data-tnm-horario-alerta';
  const API_FALLBACK='https://ta-na-mao-9bii.onrender.com/api';
  let cache=[];
  let loading=null;
  const H72=72*60*60*1000;
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const authHeaders=()=>{const token=localStorage.getItem('tnm_token');return token?{Authorization:`Bearer ${token}`}:{};};
  const list=v=>Array.isArray(v)?v:(Array.isArray(v?.data)?v.data:(Array.isArray(v?.items)?v.items:[]));
  function apiBase(){
    const hit=performance.getEntriesByType('resource').map(e=>e.name).reverse().find(url=>/\/api\/chamados(?:\?|$)/.test(url));
    if(hit){try{const u=new URL(hit);return `${u.origin}/api`;}catch{}}
    return API_FALLBACK;
  }
  async function load(){
    if(cache.length) return cache;
    if(loading) return loading;
    loading=fetch(`${apiBase()}/chamados?limit=200`,{headers:authHeaders()}).then(async r=>{
      const body=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(body.error||`Erro ${r.status}`);
      cache=list(body);return cache;
    }).catch(()=>[]).finally(()=>{loading=null;});
    return loading;
  }
  function formatDateTime(value){
    if(!value) return '—';
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function urgent(item){
    if(!item?.createdAt) return false;
    const status=normalize(item.status);
    if(['concluido','cancelado','fechado'].includes(status)) return false;
    if(item.resposta) return false;
    return Date.now()-new Date(item.createdAt).getTime()>=H72;
  }
  function findItem(row,index){
    const cells=[...row.querySelectorAll('td')];
    const title=normalize(cells[0]?.textContent);
    const condo=normalize(cells[1]?.textContent);
    return cache.find(item=>normalize(item.titulo)===title && (!condo || normalize(item.condominio?.nome||item.condominioNome)===condo)) || cache.find(item=>normalize(item.titulo)===title) || cache[index] || null;
  }
  function css(){
    if(document.getElementById('tnm-horario-alerta-css')) return;
    const s=document.createElement('style');s.id='tnm-horario-alerta-css';s.textContent=`
      .tnm-data-hora{display:flex;flex-direction:column;gap:3px;white-space:nowrap;font-variant-numeric:tabular-nums}
      .tnm-data-hora .tnm-hora{font-size:11px;color:#68766d;font-weight:700}
      .tnm-alerta-72{display:inline-flex;align-items:center;gap:6px;margin-top:3px;padding:3px 7px;border-radius:999px;background:#fee2e2;color:#b42318;font-size:10px;font-weight:900;white-space:nowrap}
      .tnm-alerta-72-dot{width:8px;height:8px;border-radius:50%;background:#dc2626;display:inline-block;box-shadow:0 0 0 2px #fecaca}
      tr.tnm-row-urgente{background:#fff8f8!important}
      tr.tnm-row-urgente td:first-child{border-left:3px solid #dc2626}
    `;document.head.appendChild(s);
  }
  function patch(){
    const heading=[...document.querySelectorAll('h1')].find(el=>normalize(el.textContent).includes('central de chamados'));
    const page=heading?.closest('.page')||document.body;
    const table=page.querySelector('table');
    if(!table) return;
    const rows=[...table.querySelectorAll('tbody tr')];
    rows.forEach((row,index)=>{
      const item=findItem(row,index);if(!item) return;
      const cells=row.querySelectorAll('td');
      if(cells[5]){
        const current=cells[5];
        current.innerHTML=`<div class="tnm-data-hora"><span>${esc(formatDateTime(item.createdAt).split(',')[0])}</span><span class="tnm-hora">${esc(formatDateTime(item.createdAt).split(',')[1]?.trim()||'')}</span></div>`;
      }
      const old=row.querySelector('.tnm-alerta-72');if(old) old.remove();
      if(urgent(item)){
        row.classList.add('tnm-row-urgente');
        const dateCell=cells[5];
        if(dateCell) dateCell.insertAdjacentHTML('beforeend','<span class="tnm-alerta-72"><span class="tnm-alerta-72-dot"></span>72h sem resposta</span>');
      }else row.classList.remove('tnm-row-urgente');
      row.setAttribute(MARK,'1');
    });
  }
  async function run(){css();await load();patch();}
  const observer=new MutationObserver(()=>{clearTimeout(window.__tnmHorarioTimer);window.__tnmHorarioTimer=setTimeout(()=>run(),80);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{cache=[];run();},60000);
  run();
})();
