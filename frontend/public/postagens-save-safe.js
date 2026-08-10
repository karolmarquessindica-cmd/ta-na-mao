(()=>{
  if(location.search.includes('portal=')) return;
  const BASE=(window.__TNM_API_BASE__||'https://ta-na-mao-9bii.onrender.com').replace(/\/$/,'');
  const token=()=>localStorage.getItem('tnm_token')||'';

  async function install(){
    const api=window.TNMGestaoAcao;
    if(!api||api.__safeSaveInstalled)return false;
    api.__safeSaveInstalled=true;
    const originalLoad=api.loadPosts;
    api.syncPosts=async(id,items)=>{
      const response=await fetch(`${BASE}/api/gestao-acao/sync-safe`,{
        method:'PUT',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},
        body:JSON.stringify({condominioId:id,items:Array.isArray(items)?items:[]})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body?.error||`Erro ${response.status} ao salvar publicação.`);
      try{
        const light=(Array.isArray(body?.items)?body.items:[]).map(item=>({
          ...item,
          fotos:(Array.isArray(item?.fotos)?item.fotos:[]).filter(src=>!String(src||'').startsWith('data:'))
        }));
        localStorage.setItem(`tnm_gestao_acao_feed_${id}`,JSON.stringify(light));
      }catch{}
      if(typeof originalLoad==='function'){
        try{await originalLoad(id,true)}catch{}
      }
      window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id,source:'database'}}));
      return body;
    };
    return true;
  }

  if(!install()){
    const t=setInterval(()=>{if(install())clearInterval(t)},200);
    setTimeout(()=>clearInterval(t),15000);
  }
})();