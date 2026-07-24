(()=>{
  if(location.search.includes('portal=')) return;
  const BASE='https://ta-na-mao-9bii.onrender.com';
  const token=()=>localStorage.getItem('tnm_token')||'';
  const key=id=>'tnm_gestao_acao_feed_'+id;
  const loading=new Set();
  const syncing=new Set();
  const loaded=new Set();

  function headers(json=false){
    const h={};
    if(token()) h.Authorization='Bearer '+token();
    if(json) h['Content-Type']='application/json';
    return h;
  }

  function localItems(id){
    try{return JSON.parse(localStorage.getItem(key(id))||'[]')}catch{return[]}
  }

  function saveLocal(id,items){
    localStorage.setItem(key(id),JSON.stringify((Array.isArray(items)?items:[]).slice(0,500)));
  }

  async function loadPosts(id,force=false){
    if(!id||loading.has(id)||(!force&&loaded.has(id))) return localItems(id);
    loading.add(id);
    try{
      const r=await fetch(BASE+'/api/gestao-acao?condominioId='+encodeURIComponent(id),{headers:headers()});
      const body=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(body?.error||'Falha ao carregar postagens');
      const items=Array.isArray(body?.items)?body.items:[];
      saveLocal(id,items);
      loaded.add(id);
      window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id,source:'database'}}));
      return items;
    }catch(e){
      console.warn('Gestão em Ação: não foi possível carregar do banco.',e);
      return localItems(id);
    }finally{loading.delete(id)}
  }

  async function syncPosts(id,items){
    if(!id||syncing.has(id)) return;
    syncing.add(id);
    try{
      const r=await fetch(BASE+'/api/gestao-acao/sync',{method:'PUT',headers:headers(true),body:JSON.stringify({condominioId:id,items})});
      const body=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(body?.error||'Falha ao salvar postagens');
      if(Array.isArray(body?.items)) saveLocal(id,body.items);
    }catch(e){
      console.error('Gestão em Ação: as alterações ficaram salvas localmente, mas não sincronizaram com o banco.',e);
    }finally{syncing.delete(id)}
  }

  function connect(){
    const api=window.TNMGestaoAcao;
    if(!api||api.__dbConnected) return;
    api.__dbConnected=true;
    api.loadPosts=loadPosts;
    api.syncPosts=syncPosts;

    const originalWrite=api.write?.bind(api);
    api.write=(id,items)=>{
      if(originalWrite) originalWrite(id,items);
      else saveLocal(id,items);
      syncPosts(id,items);
    };

    const condos=api.getCondominios?.()||[];
    condos.forEach(c=>loadPosts(c.id));
  }

  window.addEventListener('tnm-condominios-loaded',()=>{
    connect();
    const api=window.TNMGestaoAcao;
    (api?.getCondominios?.()||[]).forEach(c=>loadPosts(c.id));
  });

  window.addEventListener('tnm-postagens-updated',event=>{
    if(event?.detail?.source==='database') return;
    const id=event?.detail?.condominioId;
    if(id&&!loading.has(id)) syncPosts(id,localItems(id));
  });

  setInterval(connect,350);
})();