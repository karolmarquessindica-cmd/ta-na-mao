(()=>{
  const state={loaded:false,loading:false,items:[],page:null};
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits=v=>String(v||'').replace(/\D/g,'');

  function chamadosPage(){
    const heading=[...document.querySelectorAll('h1')].find(el=>normalize(el.textContent).includes('central de chamados'));
    return heading?.closest('.page')||null;
  }

  function apiBase(){
    const entries=performance.getEntriesByType('resource').map(e=>e.name).reverse();
    const hit=entries.find(url=>/\/api\/chamados(?:\?|$)/.test(url));
    if(hit){
      const u=new URL(hit);
      return `${u.origin}/api`;
    }
    return 'https://ta-na-mao-9bii.onrender.com/api';
  }

  function authHeaders(){
    const token=localStorage.getItem('tnm_token');
    return token?{Authorization:`Bearer ${token}`}:{ };
  }

  function list(value){
    return Array.isArray(value)?value:Array.isArray(value?.data)?value.data:Array.isArray(value?.items)?value.items:[];
  }

  async function load(){
    if(state.loading||state.loaded) return;
    state.loading=true;
    try{
      const response=await fetch(`${apiBase()}/chamados?limit=200`,{headers:authHeaders()});
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||`Erro ${response.status}`);
      state.items=list(body);
      state.loaded=true;
    }catch(error){
      console.warn('[chamados-detalhes]',error.message);
    }finally{
      state.loading=false;
    }
  }

  function details(item){
    const raw=String(item?.descricao||item?.mensagem||item?.resposta||'');
    const pick=label=>raw.match(new RegExp(`${label}:\\s*([^\\n]+)`,'i'))?.[1]?.trim()||'';
    const morador=item?.morador||{};
    return {
      nome:pick('Nome')||morador.nome||item?.nomeMorador||'Portal do Morador',
      whatsapp:pick('WhatsApp')||morador.whatsapp||morador.telefone||item?.whatsapp||item?.telefone||'',
      bloco:pick('Bloco')||morador.bloco||item?.bloco||'',
      unidade:pick('Apartamento')||morador.unidade||morador.apartamento||item?.unidade||item?.apartamento||'',
      local:pick('Local informado')||item?.local||'',
      mensagem:raw.replace(/Dados do morador:[\s\S]*/i,'').trim()||'Sem mensagem registrada.',
      condominio:item?.condominio?.nome||item?.condominioNome||'Condomínio não identificado'
    };
  }

  function whatsapp(item,data){
    let number=digits(data.whatsapp);
    if(!number) return '';
    if(!number.startsWith('55')) number=`55${number}`;
    const protocol=String(item?.id||'').slice(0,8).toUpperCase();
    const text=`Olá, ${data.nome}! Recebemos seu chamado no ${data.condominio}: ${item?.titulo||'Chamado'}. Protocolo: ${protocol}.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  function ensureCss(){
    if(document.getElementById('tnm-chamados-drawer-css')) return;
    const style=document.createElement('style');
    style.id='tnm-chamados-drawer-css';
    style.textContent=`
      .tnm-chamado-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .tnm-chamado-ver{border:1px solid #cfe0d1;background:#fff;color:#003b24;border-radius:9px;padding:6px 11px;font:700 12px 'DM Sans',sans-serif;cursor:pointer}
      .tnm-chamado-ver:hover{background:#eff8f0}
      #tnm-chamado-drawer-overlay{position:fixed;inset:0;background:rgba(0,21,11,.42);z-index:2147483000;backdrop-filter:blur(2px)}
      #tnm-chamado-drawer{position:fixed;right:0;top:0;height:100vh;width:min(520px,94vw);background:#fff;z-index:2147483001;box-shadow:-20px 0 60px rgba(0,21,11,.25);display:flex;flex-direction:column;font-family:'DM Sans',sans-serif;animation:tnmDrawer .2s ease}
      @keyframes tnmDrawer{from{transform:translateX(100%)}to{transform:translateX(0)}}
      .tnm-drawer-head{padding:22px;background:linear-gradient(135deg,#003b24,#08783f);color:#fff;display:flex;justify-content:space-between;gap:16px}
      .tnm-drawer-close{width:36px;height:36px;border:0;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:22px;cursor:pointer}
      .tnm-drawer-body{padding:20px;overflow:auto;display:grid;gap:13px}
      .tnm-drawer-card{border:1px solid #dde7de;border-radius:15px;padding:15px;background:#fff}
      .tnm-drawer-card h3{margin:0 0 10px;color:#003b24;font-size:14px}
      .tnm-drawer-message{white-space:pre-wrap;line-height:1.6;font-size:14px;color:#17231b}
      .tnm-drawer-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .tnm-drawer-grid div{background:#f5f8f3;border-radius:10px;padding:10px;font-size:13px}
      .tnm-drawer-grid b{display:block;color:#68766d;font-size:11px;margin-bottom:3px}
      .tnm-drawer-wa{display:flex;justify-content:center;text-decoration:none;background:#16a34a;color:#fff;border-radius:11px;padding:12px;font-weight:800}
      .tnm-drawer-wa.disabled{background:#b8c4bc;pointer-events:none}
    `;
    document.head.appendChild(style);
  }

  function closeDrawer(){
    document.getElementById('tnm-chamado-drawer')?.remove();
    document.getElementById('tnm-chamado-drawer-overlay')?.remove();
  }

  function openDrawer(item){
    ensureCss();
    closeDrawer();
    const data=details(item);
    const wa=whatsapp(item,data);
    const overlay=document.createElement('div');
    overlay.id='tnm-chamado-drawer-overlay';
    const drawer=document.createElement('aside');
    drawer.id='tnm-chamado-drawer';
    drawer.innerHTML=`
      <div class="tnm-drawer-head">
        <div><div style="font-size:11px;font-weight:800;opacity:.8">CHAMADO #${esc(String(item.id||'').slice(0,8).toUpperCase())}</div><h2 style="margin:6px 0 3px;font-size:20px">${esc(item.titulo||'Chamado')}</h2><div style="font-size:12px;opacity:.86">${esc(data.condominio)}</div></div>
        <button class="tnm-drawer-close" aria-label="Fechar">×</button>
      </div>
      <div class="tnm-drawer-body">
        <section class="tnm-drawer-card"><h3>Mensagem do morador</h3><div class="tnm-drawer-message">${esc(data.mensagem)}</div></section>
        <section class="tnm-drawer-card"><h3>Dados do morador</h3><div class="tnm-drawer-grid"><div><b>Nome</b>${esc(data.nome)}</div><div><b>WhatsApp</b>${esc(data.whatsapp||'—')}</div><div><b>Bloco</b>${esc(data.bloco||'—')}</div><div><b>Apartamento</b>${esc(data.unidade||'—')}</div><div style="grid-column:1/-1"><b>Local informado</b>${esc(data.local||'—')}</div></div></section>
        <a class="tnm-drawer-wa ${wa?'':'disabled'}" ${wa?`href="${esc(wa)}" target="_blank" rel="noopener"`:''}>Responder no WhatsApp</a>
      </div>`;
    document.body.append(overlay,drawer);
    overlay.addEventListener('click',closeDrawer);
    drawer.querySelector('.tnm-drawer-close').addEventListener('click',closeDrawer);
  }

  function rowTitle(row){
    return normalize(row.querySelector('td')?.textContent||'');
  }

  function findItem(row,index){
    const title=rowTitle(row);
    return state.items.find(item=>normalize(item.titulo)===title)||state.items[index]||null;
  }

  function patch(){
    const page=chamadosPage();
    if(!page){ state.page=null; return; }
    state.page=page;
    const rows=[...page.querySelectorAll('table tbody tr')];
    rows.forEach((row,index)=>{
      const cell=row.querySelector('td:last-child');
      if(!cell||cell.querySelector('.tnm-chamado-ver')) return;
      const item=findItem(row,index);
      if(!item) return;
      cell.classList.add('tnm-chamado-actions');
      const button=document.createElement('button');
      button.type='button';
      button.className='tnm-chamado-ver';
      button.textContent='Ver';
      button.addEventListener('click',()=>openDrawer(item));
      cell.appendChild(button);
    });
  }

  async function activate(){
    if(!chamadosPage()) return;
    await load();
    patch();
  }

  const observer=new MutationObserver(()=>activate());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(activate,120),true);
  activate();
})();