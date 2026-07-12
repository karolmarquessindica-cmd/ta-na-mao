(()=>{
  if(location.search.includes('portal=')||window.__TNM_PRETTY_PORTAL__) return;

  const OFFICIAL='https://tanamao.tonocondominio.com.br';
  let apiBase='https://ta-na-mao-1.onrender.com/api';
  let condominios=[];
  let busy=false;

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
  function setLegacyArea(root,link){
    const input=legacyLinkInput(root);
    if(input){
      input.value=link;
      input.readOnly=true;
      input.style.fontWeight='800';
      input.style.color='#08783f';
      input.style.background='#f3f8f3';
    }
    [...root.querySelectorAll('button')].forEach(btn=>{
      const text=(btn.textContent||'').trim().toLowerCase();
      if(text.includes('copiar link')) btn.onclick=async e=>{e.preventDefault();try{await navigator.clipboard.writeText(link);alert('Link copiado.');}catch{prompt('Copie o link:',link);}};
      if(text.includes('visualizar portal')) btn.onclick=e=>{e.preventDefault();window.open(link,'_blank','noopener,noreferrer');};
    });
  }
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
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div>
            <div style="font-size:16px;font-weight:900;color:#101828">Link personalizado do Portal</div>
            <div style="font-size:12px;color:#667085;margin-top:3px">Escolha um nome curto para o link dos moradores.</div>
          </div>
          <span style="background:#dcfce7;color:#166534;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900">Domínio oficial</span>
        </div>
        <label style="font-size:12px;font-weight:800;color:#344054">Nome do link</label>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:6px">
          <span style="font-size:12px;color:#667085">${OFFICIAL}/</span>
          <input data-slug value="${initial}" placeholder="esmeralda4" style="flex:1;min-width:180px">
        </div>
        <div data-preview style="margin-top:10px;padding:10px;border-radius:10px;background:#fff;border:1px solid #dce8dc;color:#08783f;font-size:12px;font-weight:900;word-break:break-all">${OFFICIAL}/${initial}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button data-save type="button" class="btn btn-primary">Salvar link</button>
          <button data-copy type="button" class="btn btn-ghost">Copiar</button>
          <button data-open type="button" class="btn btn-ghost">Abrir</button>
        </div>`;
      const anchor=legacy.closest('div')?.parentElement||legacy.parentElement;
      anchor.parentElement.insertBefore(card,anchor);
      const input=card.querySelector('[data-slug]');
      const preview=card.querySelector('[data-preview]');
      const currentLink=()=>`${OFFICIAL}/${slugify(input.value)}`;
      input.addEventListener('input',()=>{input.value=slugify(input.value);preview.textContent=currentLink();setLegacyArea(root,currentLink());});
      setLegacyArea(root,currentLink());
      card.querySelector('[data-save]').onclick=async()=>{
        const slug=slugify(input.value);
        if(slug.length<3){alert('Use pelo menos 3 caracteres.');return;}
        const btn=card.querySelector('[data-save]');btn.disabled=true;btn.textContent='Salvando...';
        try{
          const result=await request(`/condominios/${condo.id}/portal-slug`,{method:'PUT',body:JSON.stringify({slug})});
          input.value=result.slug||slug;
          preview.textContent=result.link||currentLink();
          setLegacyArea(root,result.link||currentLink());
          alert('Link personalizado salvo.');
        }catch(e){alert(e.message);}finally{btn.disabled=false;btn.textContent='Salvar link';}
      };
      card.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(currentLink());alert('Link copiado.');}catch{prompt('Copie o link:',currentLink());}};
      card.querySelector('[data-open]').onclick=()=>window.open(currentLink(),'_blank','noopener,noreferrer');
    }catch(e){console.warn('[portal-link]',e);}finally{busy=false;}
  }
  setInterval(mount,500);
})();