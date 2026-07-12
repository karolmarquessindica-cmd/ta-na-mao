(()=>{
  if(location.search.includes('portal=')||window.__TNM_PRETTY_PORTAL__) return;

  const OFFICIAL='https://tanamao.tonocondominio.com.br';
  let condominios=[];
  let apiBase='https://ta-na-mao-9bii.onrender.com/api';
  let loading=false;

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await nativeFetch(input,init);
    try{
      if(url.includes('/api/')) apiBase=url.split('/api/')[0]+'/api';
      const data=await res.clone().json();
      const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
      if(url.includes('/api/condominios')&&list.length&&list[0]?.id&&list[0]?.nome) condominios=list;
    }catch{}
    return res;
  };

  function token(){return localStorage.getItem('tnm_token')||''}
  function slugify(value=''){
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  }
  function currentCondo(){
    const text=document.body.innerText||'';
    return condominios.find(c=>text.includes(c.nome))||condominios[0]||null;
  }
  async function request(path,options={}){
    const res=await nativeFetch(apiBase+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(),...(options.headers||{})}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Não foi possível concluir a operação.');
    return data;
  }
  function cardReference(){
    const notebook=[...document.querySelectorAll('input')].find(i=>String(i.value||i.placeholder||'').toLowerCase().includes('notebook'));
    return notebook?.closest('.card')||notebook?.parentElement?.parentElement||[...document.querySelectorAll('.card')].find(c=>/Configurar Portal|Link do Portal|NotebookLM/i.test(c.textContent||''));
  }
  async function mount(){
    if(loading||document.querySelector('[data-portal-custom-link]')) return;
    if(!/Configurar Portal do Morador/i.test(document.body.innerText||'')) return;
    const condo=currentCondo();
    const ref=cardReference();
    if(!condo||!ref?.parentElement) return;
    loading=true;
    try{
      const data=await request(`/condominios/${condo.id}/portal-config`);
      const saved=slugify(data?.config?.portalMorador?.portalSlug||data?.portalSlug||'');
      const initial=saved||slugify(condo.nome);
      const card=document.createElement('div');
      card.dataset.portalCustomLink='1';
      card.className='card';
      card.style.cssText='padding:20px;margin-top:16px;max-width:560px';
      card.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px">
          <div>
            <div style="font-size:18px;font-weight:900;color:#101828">Link personalizado do Portal</div>
            <div style="font-size:13px;color:#667085;margin-top:4px">Crie um endereço simples para compartilhar com os moradores.</div>
          </div>
          <span style="background:#e8f5e9;color:#166534;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900">Oficial</span>
        </div>
        <label style="font-weight:800;color:#344054">Nome do link</label>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:14px;color:#667085">${OFFICIAL}/</span>
          <input data-slug value="${initial}" placeholder="esmeralda4" style="flex:1;min-width:180px">
        </div>
        <div data-preview style="margin-top:12px;padding:12px;border-radius:12px;background:#f5f8f3;color:#08783f;font-weight:800;word-break:break-all">${OFFICIAL}/${initial}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button data-save class="btn btn-primary">Salvar link</button>
          <button data-copy class="btn btn-ghost">Copiar link</button>
          <button data-open class="btn btn-ghost">Abrir portal</button>
        </div>`;
      ref.insertAdjacentElement('afterend',card);
      const input=card.querySelector('[data-slug]');
      const preview=card.querySelector('[data-preview]');
      const currentLink=()=>`${OFFICIAL}/${slugify(input.value)}`;
      input.addEventListener('input',()=>{input.value=slugify(input.value);preview.textContent=currentLink();});
      card.querySelector('[data-save]').onclick=async()=>{
        const slug=slugify(input.value);
        if(slug.length<3){alert('Use pelo menos 3 caracteres.');return;}
        const btn=card.querySelector('[data-save]');btn.disabled=true;btn.textContent='Salvando...';
        try{
          const result=await request(`/condominios/${condo.id}/portal-config`,{method:'PUT',body:JSON.stringify({portalMorador:{portalSlug:slug}})});
          input.value=result?.config?.portalMorador?.portalSlug||slug;
          preview.textContent=result?.link||currentLink();
          alert('Link personalizado salvo.');
        }catch(e){alert(e.message);}finally{btn.disabled=false;btn.textContent='Salvar link';}
      };
      card.querySelector('[data-copy]').onclick=async()=>{
        try{await navigator.clipboard.writeText(currentLink());alert('Link copiado.');}catch{prompt('Copie o link:',currentLink());}
      };
      card.querySelector('[data-open]').onclick=()=>window.open(currentLink(),'_blank','noopener,noreferrer');
    }catch(e){console.warn('[portal-link]',e);}finally{loading=false;}
  }
  setInterval(mount,800);
})();