(()=>{
  const API='https://ta-na-mao-9bii.onrender.com/api';
  let condos=[];
  let portal=null;
  const oldFetch=window.fetch.bind(window);

  function isPortalRequest(url){
    return /\/api\/(?:portal|portal-public|public\/portal)(?:\/|\?|$)/i.test(url||'');
  }

  function isResidentPortal(){
    return Boolean(portal||document.querySelector('.pnav')||/Portal do Morador/i.test(document.body?.innerText||''));
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await oldFetch(input,init);
    try{
      const data=await res.clone().json();
      if(isPortalRequest(url)&&data?.condominio) portal=data;
      const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
      if(!isResidentPortal()&&url.includes('condominios')&&list.length&&list[0]?.id&&list[0]?.nome) condos=list;
    }catch{}
    return res;
  };

  const token=()=>localStorage.getItem('tnm_token')||'';
  const currentCondo=()=>{const txt=document.body.innerText||'';return condos.find(c=>txt.includes(c.nome))||condos[0]||null};
  const cacheKey=id=>'tnm_voz_forms_'+id;

  async function saveLink(condo,link){
    const r=await oldFetch(API+'/condominios/'+condo.id+'/portal-config',{
      method:'PUT',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},
      body:JSON.stringify({portalMorador:{vozMoradorFormsUrl:link}})
    });
    if(!r.ok) throw new Error('Não foi possível salvar o link.');
    localStorage.setItem(cacheKey(condo.id),link||'');
    const saved=await r.json().catch(()=>null);
    if(saved?.config) condo.portalConfig=saved.config;
  }

  function currentLink(condo){
    return localStorage.getItem(cacheKey(condo.id))||
      condo?.portalConfig?.portalMorador?.vozMoradorFormsUrl||
      condo?.portalConfig?.vozMoradorFormsUrl||'';
  }

  function adminCard(){
    if(isResidentPortal()||document.querySelector('[data-voz-form-card]'))return;
    if(!/Configurar Portal do Morador/i.test(document.body.innerText||''))return;
    const c=currentCondo();
    if(!c)return;
    const ref=[...document.querySelectorAll('input')].find(i=>String(i.value||i.placeholder||'').toLowerCase().includes('notebook'));
    const refCard=ref?.closest('.card')||ref?.parentElement?.parentElement||[...document.querySelectorAll('.card')][0];
    if(!refCard||!refCard.parentElement)return;
    const card=document.createElement('div');
    card.dataset.vozFormCard='1';
    card.style.cssText='background:#f3fbf3;border:1px solid #d9ead8;border-radius:18px;padding:18px;margin-top:14px;color:#667085;max-width:270px';
    card.innerHTML='<div style="font-size:18px;font-weight:800;color:#667085;line-height:1.2;margin-bottom:12px">Link da Voz do Morador / Google Forms</div><input data-voz-input type="url" placeholder="https://forms.gle/..." style="width:100%;box-sizing:border-box;border:1px solid #d9e5d4;border-radius:14px;padding:13px 14px;font-size:16px;background:white;color:#0f1a12;outline:none"><div style="font-size:14px;line-height:1.45;color:#667085;margin-top:12px">Quando o morador clicar em Voz do Morador, este link será aberto em uma nova aba.</div><button data-voz-save class="btn btn-primary" style="margin-top:12px;width:100%;justify-content:center">Salvar link</button>';
    refCard.insertAdjacentElement('afterend',card);
    const input=card.querySelector('[data-voz-input]');
    input.value=currentLink(c);
    card.querySelector('[data-voz-save]').onclick=async()=>{
      const clean=String(input.value||'').trim();
      if(clean&&!/^https?:\/\//i.test(clean)){alert('Cole um link válido começando com http ou https.');return;}
      try{await saveLink(c,clean);alert(clean?'Link da Voz do Morador salvo.':'Link removido.');}catch(e){alert(e.message||'Erro ao salvar.')}
    };
  }

  function portalLink(){
    return portal?.config?.vozMoradorFormsUrl||
      portal?.config?.portalMorador?.vozMoradorFormsUrl||
      portal?.portalMorador?.vozMoradorFormsUrl||
      portal?.config?.vozMoradorLink||'';
  }

  document.addEventListener('click',ev=>{
    if(!isResidentPortal())return;
    const target=ev.target?.closest?.('button,a');
    if(!target||!/Voz do Morador/i.test(target.textContent||''))return;
    const link=portalLink();
    if(!link)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    window.open(link,'_blank','noopener,noreferrer');
  },true);

  setInterval(adminCard,500);
})();