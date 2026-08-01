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
  const recovered=new Set();
  const memory=new Map();

  function headers(json=false){
    const h={};
    if(token()) h.Authorization='Bearer '+token();
    if(json) h['Content-Type']='application/json';
    return h;
  }

  function parse(value){try{const v=JSON.parse(value||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function looksLikePost(x){return x&&typeof x==='object'&&(x.titulo||x.legenda||x.descricao||x.texto||x.conteudo||x.categoria||x.local||Array.isArray(x.fotos)||Array.isArray(x.imagens))}
  function stripDataPhotos(items){
    return (Array.isArray(items)?items:[]).slice(0,200).map(item=>({
      ...item,
      fotos:(Array.isArray(item?.fotos)?item.fotos:[]).filter(src=>!String(src||'').startsWith('data:'))
    }));
  }
  function localItems(id){
    if(memory.has(id)) return memory.get(id);
    const merged=[];
    for(const k of legacyKeys(id)){
      for(const item of parse(localStorage.getItem(k))){
        if(!looksLikePost(item))continue;
        if(item.condominioId&&item.condominioId!==id)continue;
        const identity=String(item.id||item.legacyId||item.createdAt||`${item.titulo}|${item.data}`);
        if(!merged.some(x=>String(x.id||x.legacyId||x.createdAt||`${x.titulo}|${x.data}`)===identity))merged.push(item);
      }
    }
    return merged;
  }

  function saveLocal(id,items){
    const full=(Array.isArray(items)?items:[]).slice(0,500);
    memory.set(id,full);
    const light=stripDataPhotos(full);
    try{
      localStorage.setItem(key(id),JSON.stringify(light));
    }catch(error){
      try{
        for(const k of Object.keys(localStorage)){
          if(k.startsWith('tnm_gestao_acao_feed_')&&k!==key(id)) localStorage.removeItem(k);
        }
        localStorage.setItem(key(id),JSON.stringify(light.slice(0,60)));
      }catch{
        try{localStorage.removeItem(key(id))}catch{}
        console.warn('Gestão em Ação: cache local cheio. Os dados continuam em memória e no banco.',error);
      }
    }
    return full;
  }

  function cleanupOldCaches(){
    for(const k of Object.keys(localStorage)){
      if(!k.startsWith('tnm_gestao_acao_feed_')) continue;
      try{
        const list=parse(localStorage.getItem(k));
        localStorage.setItem(k,JSON.stringify(stripDataPhotos(list)));
      }catch{try{localStorage.removeItem(k)}catch{}}
    }
  }
  cleanupOldCaches();

  function mergePosts(remote,local){
    const all=[];
    for(const item of [...remote,...local]){
      if(!looksLikePost(item))continue;
      const identity=String(item.id||item.legacyId||item.createdAt||`${item.titulo}|${item.data}`);
      if(!all.some(x=>String(x.id||x.legacyId||x.createdAt||`${x.titulo}|${x.data}`)===identity))all.push(item);
    }
    return all;
  }

  function isEsmeraldaIV(id){
    const list=window.TNMGestaoAcao?.getCondominios?.()||[];
    const condo=list.find(c=>String(c?.id||'')===String(id||''));
    const name=String(condo?.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return name.includes('esmeralda')&&(/\biv\b/.test(name)||name.includes(' 4'));
  }

  async function runAudit(id){
    const r=await fetch(BASE+'/api/gestao-acao/audit?condominioId='+encodeURIComponent(id),{headers:headers()});
    const body=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(body?.error||'Falha na auditoria das postagens');
    return Array.isArray(body?.items)?body.items:[];
  }

  async function runRecovery(id){
    if(!isEsmeraldaIV(id)||recovered.has(id)) return [];
    recovered.add(id);
    const r=await fetch(BASE+'/api/gestao-acao-recovery',{method:'POST',headers:headers(true),body:JSON.stringify({condominioId:id})});
    const body=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(body?.error||'Falha na recuperação das postagens');
    return Array.isArray(body?.items)?body.items:[];
  }

  async function loadPosts(id,force=false){
    if(!id||loading.has(id)||(!force&&loaded.has(id))) return localItems(id);
    loading.add(id);
    try{
      const before=localItems(id);
      const r=await fetch(BASE+'/api/gestao-acao?condominioId='+encodeURIComponent(id),{headers:headers()});
      const body=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(body?.error||'Falha ao carregar postagens');
      let remote=Array.isArray(body?.items)?body.items:[];
      if(!remote.length){try{remote=await runAudit(id)}catch(e){console.warn('Auditoria de postagens não concluída.',e)}}
      if(!remote.length&&isEsmeraldaIV(id)){try{remote=await runRecovery(id)}catch(e){console.warn('Recuperação automática do Esmeralda IV não aplicada.',e)}}
      const merged=mergePosts(remote,before);
      saveLocal(id,merged);
      loaded.add(id);
      if((!remote.length&&merged.length)||merged.length>remote.length) await syncPosts(id,merged);
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
      console.error('Gestão em Ação: não sincronizou com o banco.',e);
      throw e;
    }finally{syncing.delete(id)}
  }

  function connect(){
    const api=window.TNMGestaoAcao;
    if(!api||api.__dbConnected) return;
    api.__dbConnected=true;
    api.loadPosts=loadPosts;
    api.syncPosts=syncPosts;
    api.auditPosts=runAudit;
    api.recoverPosts=runRecovery;
    api.read=id=>localItems(id);
    api.write=(id,items)=>{
      const full=saveLocal(id,items);
      syncPosts(id,full).catch(()=>{});
      window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id,source:'local'}}));
      return full;
    };
    (api.getCondominios?.()||[]).forEach(c=>loadPosts(c.id));
  }

  window.addEventListener('tnm-condominios-loaded',()=>{
    connect();
    const api=window.TNMGestaoAcao;
    (api?.getCondominios?.()||[]).forEach(c=>loadPosts(c.id,true));
  });
  window.addEventListener('tnm-postagens-updated',event=>{
    if(event?.detail?.source==='database'||event?.detail?.source==='local') return;
    const id=event?.detail?.condominioId;
    if(id&&!loading.has(id)) syncPosts(id,localItems(id)).catch(()=>{});
  });
  setInterval(connect,350);
})();