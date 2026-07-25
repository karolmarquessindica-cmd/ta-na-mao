(()=>{
  if(location.search.includes('portal=')) return;
  const BASE='https://ta-na-mao-9bii.onrender.com';
  const token=()=>localStorage.getItem('tnm_token')||'';
  const key=id=>'tnm_gestao_acao_feed_'+id;
  const legacyKeys=id=>[
    key(id),
    'tnm_gestao_acao_'+id,
    'gestao_acao_'+id,
    'tnm_publicacoes_'+id,
    'tnm_gestao_acao_feed_sem-condominio'
  ];
  const loading=new Set();
  const syncing=new Set();
  const loaded=new Set();

  function headers(json=false){
    const h={};
    if(token()) h.Authorization='Bearer '+token();
    if(json) h['Content-Type']='application/json';
    return h;
  }

  function parse(value){try{const v=JSON.parse(value||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function looksLikePost(x){return x&&typeof x==='object'&&(x.titulo||x.legenda||x.descricao||x.categoria||x.local||Array.isArray(x.fotos))}
  function localItems(id){
    const merged=[];
    for(const k of legacyKeys(id)){
      for(const item of parse(localStorage.getItem(k))){
        if(!looksLikePost(item))continue;
        if(item.condominioId&&item.condominioId!==id)continue;
        const identity=String(item.id||item.createdAt||`${item.titulo}|${item.data}`);
        if(!merged.some(x=>String(x.id||x.createdAt||`${x.titulo}|${x.data}`)===identity))merged.push(item);
      }
    }
    return merged;
  }

  function saveLocal(id,items){
    localStorage.setItem(key(id),JSON.stringify((Array.isArray(items)?items:[]).slice(0,500)));
  }

  function mergePosts(remote,local){
    const all=[];
    for(const item of [...remote,...local]){
      if(!looksLikePost(item))continue;
      const identity=String(item.id||item.legacyId||item.createdAt||`${item.titulo}|${item.data}`);
      if(!all.some(x=>String(x.id||x.legacyId||x.createdAt||`${x.titulo}|${x.data}`)===identity))all.push(item);
    }
    return all;
  }

  async function loadPosts(id,force=false){
    if(!id||loading.has(id)||(!force&&loaded.has(id))) return localItems(id);
    loading.add(id);
    try{
      const before=localItems(id);
      const r=await fetch(BASE+'/api/gestao-acao?condominioId='+encodeURIComponent(id),{headers:headers()});
      const body=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(body?.error||'Falha ao carregar postagens');
      const remote=Array.isArray(body?.items)?body.items:[];
      const merged=mergePosts(remote,before);
      saveLocal(id,merged);
      loaded.add(id);
      if(!remote.length&&merged.length) await syncPosts(id,merged);
      else if(merged.length>remote.length) await syncPosts(id,merged);
      window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id,source:'database'}}));
      return merged;
    }catch(e){
      console.warn('Gestão em Ação: não foi possível carregar do banco.',e);
      return localItems(id);
    }finally{loading.delete(id)}
  }

  async function syncPosts(id,items){
    if(!id||syncing.has(id)) return;
    const safe=Array.isArray(items)?items:[];
    if(!safe.length&&localItems(id).length) return;
    syncing.add(id);
    try{
      const r=await fetch(BASE+'/api/gestao-acao/sync',{method:'PUT',headers:headers(true),body:JSON.stringify({condominioId:id,items:safe})});
      const body=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(body?.error||'Falha ao salvar postagens');
      if(Array.isArray(body?.items)&&body.items.length) saveLocal(id,body.items);
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
    (api.getCondominios?.()||[]).forEach(c=>loadPosts(c.id));
  }

  window.addEventListener('tnm-condominios-loaded',()=>{
    connect();
    const api=window.TNMGestaoAcao;
    (api?.getCondominios?.()||[]).forEach(c=>loadPosts(c.id,true));
  });
  window.addEventListener('tnm-postagens-updated',event=>{
    if(event?.detail?.source==='database') return;
    const id=event?.detail?.condominioId;
    if(id&&!loading.has(id)) syncPosts(id,localItems(id));
  });
  setInterval(connect,350);
})();