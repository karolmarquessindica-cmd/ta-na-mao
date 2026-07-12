(()=>{
  if(location.search.includes('portal=')||window.__TNM_PRETTY_PORTAL__) return;

  const OFFICIAL='https://tanamao.tonocondominio.com.br';
  let apiBase='https://ta-na-mao-1.onrender.com/api';
  let condominios=[];
  let busy=false;
  let activeLink='';

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await nativeFetch(input,init);
    try{
      if(url.includes('/api/')) apiBase=url.split('/api/')[0]+'/api';
      const data=await res.clone().json();
      const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
      if(url.includes('/api/condominios')&&list.length&&list[0]?.id) condominios=list;
    }catch{}
    return res;
  };

  function token(){return localStorage.getItem('tnm_token')||''}
  function slugify(value=''){
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  }
  function qrUrl(link,size=420){return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`}
  async function request(path,options={}){
    const res=await nativeFetch(apiBase+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(),...(options.headers||{})}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Não foi possível concluir a operação.');
    return data;
  }
  async function ensureCondominios(){
    if(condominios.length) return condominios;
    try{
      const data=await request('/condominios');
      condominios=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
    }catch{}
    return condominios;
  }
  function modalRoot(){
    return [...document.querySelectorAll('div')].find(el=>/Configurar Portal do Morador/i.test(el.textContent||'')&&el.querySelector('input'))||null;
  }
  function legacyLinkInput(root){
    return [...root.querySelectorAll('input')].find(i=>/\?portal=|ta-na-mao-wine\.vercel\.app|tanamao\.tonocondominio\.com\.br/i.test(i.value||''));
  }
  async function resolveCondo(root,legacy){
    const list=await ensureCondominios();
    const pageText=(root.textContent||'')+' '+(document.body.innerText||'');
    let found=list.find(c=>c?.nome&&pageText.includes(c.nome));
    if(found) return found;
    const old=String(legacy?.value||'');
    const identifier=(old.match(/[?&]portal=([^&]+)/)||[])[1];
    if(identifier){
      try{
        const res=await nativeFetch(apiBase+'/portal/'+encodeURIComponent(identifier));
        const data=await res.json().catch(()=>({}));
        if(data?.condominio?.id) found=list.find(c=>c.id===data.condominio.id)||data.condominio;
      }catch{}
    }
    return found||list[0]||null;
  }
  function updateQrElements(root,link){
    const encoded=qrUrl(link);
    root.querySelectorAll('img').forEach(img=>{
      const src=String(img.src||'');
      const alt=String(img.alt||'').toLowerCase();
      if(src.includes('qrserver.com')||alt.includes('qr')) img.src=encoded;
    });
    root.querySelectorAll('a[href]').forEach(a=>{
      if(String(a.href).includes('qrserver.com')) a.href=encoded;
      else if(/portal|visualizar/i.test(a.textContent||'')) a.href=link;
    });
  }
  function setLegacyArea(root,link){
    activeLink=link;
    const input=legacyLinkInput(root);
    if(input){
      input.value=link;
      input.readOnly=true;
      input.style.fontWeight='800';
      input.style.color='#08783f';
      input.style.background='#f3f8f3';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    updateQrElements(root,link);
  }
  function openQrModal(link){
    document.querySelector('[data-custom-qr-modal]')?.remove();
    const overlay=document.createElement('div');
    overlay.dataset.customQrModal='1';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(3,18,10,.62);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px';
    overlay.innerHTML=`<div style="width:min(430px,100%);background:#fff;border-radius:22px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.30);text-align:center">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><strong style="font-size:20px;color:#101828">QR Code do Portal</strong><button data-close type="button" style="border:0;background:#edf4ed;border-radius:999px;width:38px;height:38px;font-size:22px">×</button></div>
      <img src="${qrUrl(link,500)}" alt="QR Code do Portal" style="width:260px;max-width:100%;border:1px solid #e4ebe3;border-radius:16px;padding:10px;background:#fff">
      <div style="margin-top:14px;padding:10px;border-radius:12px;background:#f4f8f3;color:#08783f;font-size:12px;font-weight:800;word-break:break-all">${link}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px"><button data-copy type="button" class="btn btn-ghost">Copiar link</button><a data-download class="btn btn-primary" href="${qrUrl(link,800)}" download="qr-code-portal.png" target="_blank" rel="noopener">Baixar QR Code</a><button data-open type="button" class="btn btn-ghost">Visualizar portal</button></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-close]').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
    overlay.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(link);alert('Link copiado.')}catch{prompt('Copie o link:',link)}};
    overlay.querySelector('[data-open]').onclick=()=>window.open(link,'_blank','noopener,noreferrer');
  }

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('button,a');
    if(!btn||!activeLink) return;
    const label=(btn.textContent||'').trim().toLowerCase();
    if(label.includes('copiar link')||label==='copiar'){
      e.preventDefault();e.stopImmediatePropagation();
      try{await navigator.clipboard.writeText(activeLink);alert('Link copiado.')}catch{prompt('Copie o link:',activeLink)}
    }else if(label.includes('visualizar portal')||label==='abrir'){
      e.preventDefault();e.stopImmediatePropagation();window.open(activeLink,'_blank','noopener,noreferrer');
    }else if(label.includes('gerar qr')||label.includes('baixar qr')){
      e.preventDefault();e.stopImmediatePropagation();openQrModal(activeLink);
    }
  },true);

  async function mount(){
    if(busy||document.querySelector('[data-portal-custom-link="1"]')) return;
    const root=modalRoot();
    if(!root) return;
    const legacy=legacyLinkInput(root);
    if(!legacy) return;
    busy=true;
    try{
      const condo=await resolveCondo(root,legacy);
      if(!condo?.id) return;
      const data=await request(`/condominios/${condo.id}/portal-slug`).catch(()=>({}));
      const initial=slugify(data.slug||condo.nome||'portal');
      const card=document.createElement('div');
      card.dataset.portalCustomLink='1';
      card.style.cssText='margin:14px 0;padding:16px;border:1px solid #dce8dc;border-radius:16px;background:#f8fbf7;box-shadow:0 8px 22px rgba(0,59,36,.06)';
      card.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px"><div><div style="font-size:16px;font-weight:900;color:#101828">Link personalizado do Portal</div><div style="font-size:12px;color:#667085;margin-top:3px">Escolha um nome curto para o link dos moradores.</div></div><span style="background:#dcfce7;color:#166534;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900">Domínio oficial</span></div>
        <label style="font-size:12px;font-weight:800;color:#344054">Nome do link</label>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:6px"><span style="font-size:12px;color:#667085">${OFFICIAL}/</span><input data-slug value="${initial}" placeholder="esmeralda4" style="flex:1;min-width:180px"></div>
        <div data-preview style="margin-top:10px;padding:10px;border-radius:10px;background:#fff;border:1px solid #dce8dc;color:#08783f;font-size:12px;font-weight:900;word-break:break-all">${OFFICIAL}/${initial}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button data-save type="button" class="btn btn-primary">Salvar link</button><button data-copy type="button" class="btn btn-ghost">Copiar</button><button data-open type="button" class="btn btn-ghost">Abrir</button><button data-qr type="button" class="btn btn-ghost">Gerar QR Code</button></div>`;
      const anchor=legacy.closest('div')?.parentElement||legacy.parentElement;
      anchor.parentElement.insertBefore(card,anchor);
      const input=card.querySelector('[data-slug]');
      const preview=card.querySelector('[data-preview]');
      const currentLink=()=>`${OFFICIAL}/${slugify(input.value)}`;
      input.addEventListener('input',()=>{input.value=slugify(input.value);preview.textContent=currentLink();setLegacyArea(root,currentLink())});
      setLegacyArea(root,data.link||currentLink());
      card.querySelector('[data-save]').onclick=async()=>{
        const slug=slugify(input.value);
        if(slug.length<3){alert('Use pelo menos 3 caracteres.');return;}
        const btn=card.querySelector('[data-save]');btn.disabled=true;btn.textContent='Salvando...';
        try{
          const result=await request(`/condominios/${condo.id}/portal-slug`,{method:'PUT',body:JSON.stringify({slug})});
          input.value=result.slug||slug;
          const link=result.link||currentLink();preview.textContent=link;setLegacyArea(root,link);alert('Link personalizado salvo.');
        }catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent='Salvar link'}
      };
      card.querySelector('[data-qr]').onclick=()=>openQrModal(currentLink());
    }catch(err){console.warn('[portal-link]',err)}finally{busy=false}
  }
  setInterval(()=>{mount();const root=modalRoot();if(root&&activeLink) updateQrElements(root,activeLink)},500);
})();