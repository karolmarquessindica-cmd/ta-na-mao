(()=>{
  const API='https://ta-na-mao-9bii.onrender.com/api';
  let condos=[];
  let portal=null;
  const oldFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await oldFetch(input,init);
    try{
      const data=await res.clone().json();
      if(location.search.includes('portal=')&&url.includes('/api/portal/')&&data?.condominio) portal=data;
      const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
      if(!location.search.includes('portal=')&&url.includes('condominios')&&list.length&&list[0]?.id&&list[0]?.nome) condos=list;
    }catch{}
    return res;
  };
  const token=()=>localStorage.getItem('tnm_token')||'';
  const currentCondo=()=>{const txt=document.body.innerText||'';return condos.find(c=>txt.includes(c.nome))||condos[0]||null};
  async function saveLink(condo,link){
    const r=await fetch(API+'/condominios/'+condo.id+'/portal-config',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({portalMorador:{vozMoradorFormsUrl:link}})});
    if(!r.ok) throw new Error('Não foi possível salvar o link.');
  }
  function adminButton(){
    if(location.search.includes('portal=')||document.querySelector('[data-voz-form-admin]'))return;
    const c=currentCondo();
    if(!c)return;
    const btn=document.createElement('button');
    btn.dataset.vozFormAdmin='1';
    btn.textContent='🔗 Link Voz do Morador';
    btn.className='btn btn-ghost';
    btn.style.cssText='position:fixed;right:22px;bottom:132px;z-index:9999;border-radius:999px;background:#fff;box-shadow:0 14px 34px rgba(0,59,36,.18)';
    btn.onclick=async()=>{
      const atual=c.portalConfig?.portalMorador?.vozMoradorFormsUrl||'';
      const link=prompt('Cole o link do Google Forms para a Voz do Morador deste condomínio:',atual);
      if(link===null)return;
      const clean=String(link||'').trim();
      if(clean&&!/^https?:\/\//i.test(clean)){alert('Cole um link válido começando com http ou https.');return;}
      try{await saveLink(c,clean);alert(clean?'Link da Voz do Morador salvo.':'Link removido.');}catch(e){alert(e.message||'Erro ao salvar.')}
    };
    document.body.appendChild(btn);
  }
  function portalLink(){return portal?.config?.vozMoradorFormsUrl||portal?.config?.vozMoradorLink||''}
  function portalBind(){
    if(!location.search.includes('portal='))return;
    const link=portalLink();
    const btn=[...document.querySelectorAll('button,a')].find(b=>/Voz do Morador/i.test(b.textContent||''));
    if(!btn||btn.dataset.vozForms==='1')return;
    btn.dataset.vozForms='1';
    btn.addEventListener('click',ev=>{
      if(!link)return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      window.open(link,'_blank','noopener,noreferrer');
    },true);
  }
  setInterval(()=>{adminButton();portalBind()},700);
})();