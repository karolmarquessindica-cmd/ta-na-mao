(()=>{
  const state={loaded:false,loading:false,items:[]};
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

  function apiOrigin(){ return apiBase().replace(/\/api\/?$/,''); }
  function authHeaders(){
    const token=localStorage.getItem('tnm_token');
    return token?{Authorization:`Bearer ${token}`}:{ };
  }
  function list(value){ return Array.isArray(value)?value:Array.isArray(value?.data)?value.data:Array.isArray(value?.items)?value.items:[]; }

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
    }finally{ state.loading=false; }
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

  function resolveFileUrl(value){
    const raw=String(value||'').trim();
    if(!raw) return '';
    if(/^https?:\/\//i.test(raw)||/^data:/i.test(raw)||/^blob:/i.test(raw)) return raw;
    if(raw.startsWith('/uploads/')) return apiOrigin()+raw;
    if(raw.startsWith('uploads/')) return `${apiOrigin()}/${raw}`;
    if(raw.startsWith('/api/')) return apiOrigin()+raw;
    if(raw.startsWith('api/')) return `${apiOrigin()}/${raw}`;
    return `${apiBase()}/arquivos/${raw.replace(/^\/+/, '')}`;
  }

  function attachments(item){
    const sources=[item?.fotos,item?.anexos,item?.imagens,item?.arquivos,item?.attachments,item?.files].flat(Infinity).filter(Boolean);
    return sources.map((entry,index)=>{
      const raw=typeof entry==='string'?entry:(entry.url||entry.fileUrl||entry.path||entry.key||entry.location||entry.downloadUrl||'');
      return {
        url:resolveFileUrl(raw),
        name:typeof entry==='string'?`Foto ${index+1}`:(entry.nome||entry.fileName||entry.filename||entry.originalname||entry.name||`Foto ${index+1}`),
        mime:typeof entry==='string'?'':(entry.mimeType||entry.mimetype||entry.type||'')
      };
    }).filter(file=>file.url);
  }

  async function fetchFile(file){
    if(/^data:|^blob:/i.test(file.url)) return {url:file.url,revoke:false};
    const response=await fetch(file.url,{headers:authHeaders(),redirect:'follow'});
    if(!response.ok) throw new Error('Não foi possível abrir o arquivo.');
    const blob=await response.blob();
    return {url:URL.createObjectURL(blob),revoke:true,blob};
  }

  async function showPreview(card,file){
    const area=card.querySelector('.tnm-file-preview');
    area.textContent='Carregando imagem...';
    try{
      const result=await fetchFile(file);
      const isImage=(result.blob?.type||file.mime||'').startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(file.url);
      if(isImage){
        const img=document.createElement('img');
        img.src=result.url;
        img.alt=file.name;
        area.replaceChildren(img);
      }else{
        area.innerHTML=`<span style="font-size:28px">📎</span><span>${esc(file.name)}</span>`;
      }
      area.dataset.objectUrl=result.revoke?result.url:'';
    }catch(error){
      area.innerHTML=`<span style="font-size:28px">📷</span><span>Não foi possível carregar</span>`;
    }
  }

  async function openFile(file,download=false,button){
    const old=button?.textContent;
    if(button){ button.disabled=true; button.textContent=download?'Baixando...':'Abrindo...'; }
    try{
      const result=await fetchFile(file);
      if(download){
        const a=document.createElement('a');
        a.href=result.url;a.download=file.name||'anexo-do-chamado';document.body.appendChild(a);a.click();a.remove();
      }else window.open(result.url,'_blank','noopener,noreferrer');
      if(result.revoke) setTimeout(()=>URL.revokeObjectURL(result.url),10000);
    }catch(error){
      window.open(file.url,'_blank','noopener,noreferrer');
    }finally{
      if(button){ button.disabled=false; button.textContent=old; }
    }
  }

  function ensureCss(){
    if(document.getElementById('tnm-chamados-drawer-css')) return;
    const style=document.createElement('style');
    style.id='tnm-chamados-drawer-css';
    style.textContent=`
      .tnm-chamado-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .tnm-chamado-ver{border:1px solid #cfe0d1;background:#fff;color:#003b24;border-radius:9px;padding:6px 11px;font:700 12px 'DM Sans',sans-serif;cursor:pointer}.tnm-chamado-ver:hover{background:#eff8f0}
      #tnm-chamado-drawer-overlay{position:fixed;inset:0;background:rgba(0,21,11,.42);z-index:2147483000;backdrop-filter:blur(2px)}
      #tnm-chamado-drawer{position:fixed;right:0;top:0;height:100vh;width:min(620px,96vw);background:#fff;z-index:2147483001;box-shadow:-20px 0 60px rgba(0,21,11,.25);display:flex;flex-direction:column;font-family:'DM Sans',sans-serif;animation:tnmDrawer .2s ease}
      @keyframes tnmDrawer{from{transform:translateX(100%)}to{transform:translateX(0)}}
      .tnm-drawer-head{padding:22px;background:linear-gradient(135deg,#003b24,#08783f);color:#fff;display:flex;justify-content:space-between;gap:16px}.tnm-drawer-close{width:36px;height:36px;border:0;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:22px;cursor:pointer}
      .tnm-drawer-body{padding:20px;overflow:auto;display:grid;gap:13px}.tnm-drawer-card{border:1px solid #dde7de;border-radius:15px;padding:15px;background:#fff}.tnm-drawer-card h3{margin:0 0 10px;color:#003b24;font-size:14px}.tnm-drawer-message{white-space:pre-wrap;line-height:1.6;font-size:14px;color:#17231b}
      .tnm-drawer-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.tnm-drawer-grid div{background:#f5f8f3;border-radius:10px;padding:10px;font-size:13px}.tnm-drawer-grid b{display:block;color:#68766d;font-size:11px;margin-bottom:3px}
      .tnm-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.tnm-file{border:1px solid #dde7de;border-radius:13px;padding:9px;background:#f8fbf7;display:grid;gap:8px}.tnm-file-preview{height:145px;border-radius:10px;background:#eaf3eb;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;overflow:hidden;color:#31513d;font-size:12px;text-align:center}.tnm-file-preview img{width:100%;height:100%;object-fit:cover}.tnm-file-name{font-size:12px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tnm-file-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tnm-file-actions button{border:0;border-radius:9px;padding:9px 6px;font-size:12px;font-weight:800;cursor:pointer}.tnm-file-open{background:#003b24;color:#fff}.tnm-file-download{background:#dcfce7;color:#166534}
      .tnm-drawer-wa{display:flex;justify-content:center;text-decoration:none;background:#16a34a;color:#fff;border-radius:11px;padding:12px;font-weight:800}.tnm-drawer-wa.disabled{background:#b8c4bc;pointer-events:none}
      @media(max-width:560px){.tnm-drawer-grid{grid-template-columns:1fr}.tnm-files{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function closeDrawer(){
    document.querySelectorAll('.tnm-file-preview[data-object-url]').forEach(el=>{if(el.dataset.objectUrl) URL.revokeObjectURL(el.dataset.objectUrl)});
    document.getElementById('tnm-chamado-drawer')?.remove();
    document.getElementById('tnm-chamado-drawer-overlay')?.remove();
  }

  function openDrawer(item){
    ensureCss();closeDrawer();
    const data=details(item), files=attachments(item), wa=whatsapp(item,data);
    const overlay=document.createElement('div');overlay.id='tnm-chamado-drawer-overlay';
    const drawer=document.createElement('aside');drawer.id='tnm-chamado-drawer';
    const filesHtml=files.length?files.map((file,index)=>`<div class="tnm-file" data-index="${index}"><div class="tnm-file-preview"><span style="font-size:28px">📷</span><span>Preparando imagem...</span></div><div class="tnm-file-name" title="${esc(file.name)}">${esc(file.name)}</div><div class="tnm-file-actions"><button type="button" class="tnm-file-open">Ver</button><button type="button" class="tnm-file-download">Baixar</button></div></div>`).join(''):'<p style="font-size:13px;color:#68766d">Nenhuma foto ou anexo foi localizado neste chamado.</p>';
    drawer.innerHTML=`<div class="tnm-drawer-head"><div><div style="font-size:11px;font-weight:800;opacity:.8">CHAMADO #${esc(String(item.id||'').slice(0,8).toUpperCase())}</div><h2 style="margin:6px 0 3px;font-size:20px">${esc(item.titulo||'Chamado')}</h2><div style="font-size:12px;opacity:.86">${esc(data.condominio)}</div></div><button class="tnm-drawer-close" aria-label="Fechar">×</button></div><div class="tnm-drawer-body"><section class="tnm-drawer-card"><h3>Mensagem do morador</h3><div class="tnm-drawer-message">${esc(data.mensagem)}</div></section><section class="tnm-drawer-card"><h3>Fotos e anexos enviados</h3><div class="tnm-files">${filesHtml}</div></section><section class="tnm-drawer-card"><h3>Dados do morador</h3><div class="tnm-drawer-grid"><div><b>Nome</b>${esc(data.nome)}</div><div><b>WhatsApp</b>${esc(data.whatsapp||'—')}</div><div><b>Bloco</b>${esc(data.bloco||'—')}</div><div><b>Apartamento</b>${esc(data.unidade||'—')}</div><div style="grid-column:1/-1"><b>Local informado</b>${esc(data.local||'—')}</div></div></section><a class="tnm-drawer-wa ${wa?'':'disabled'}" ${wa?`href="${esc(wa)}" target="_blank" rel="noopener"`:''}>Responder no WhatsApp</a></div>`;
    document.body.append(overlay,drawer);overlay.addEventListener('click',closeDrawer);drawer.querySelector('.tnm-drawer-close').addEventListener('click',closeDrawer);
    drawer.querySelectorAll('.tnm-file').forEach(card=>{
      const file=files[Number(card.dataset.index)];
      showPreview(card,file);
      card.querySelector('.tnm-file-open').addEventListener('click',e=>openFile(file,false,e.currentTarget));
      card.querySelector('.tnm-file-download').addEventListener('click',e=>openFile(file,true,e.currentTarget));
    });
  }

  function findItem(row,index){
    const title=normalize(row.querySelector('td')?.textContent||'');
    return state.items.find(item=>normalize(item.titulo)===title)||state.items[index]||null;
  }
  function patch(){
    const page=chamadosPage();if(!page) return;
    [...page.querySelectorAll('table tbody tr')].forEach((row,index)=>{
      const cell=row.querySelector('td:last-child');if(!cell||cell.querySelector('.tnm-chamado-ver')) return;
      const item=findItem(row,index);if(!item) return;
      cell.classList.add('tnm-chamado-actions');
      const button=document.createElement('button');button.type='button';button.className='tnm-chamado-ver';button.textContent='Ver';button.addEventListener('click',()=>openDrawer(item));cell.appendChild(button);
    });
  }
  async function activate(){ if(!chamadosPage()) return;await load();patch(); }
  const observer=new MutationObserver(()=>activate());observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('click',()=>setTimeout(activate,120),true);activate();
})();