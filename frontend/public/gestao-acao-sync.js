(()=>{
  if(location.search.includes('portal=')) return;
  const BASE=(window.__API_URL__||'https://ta-na-mao-9bii.onrender.com').replace(/\/$/,'');
  const originalSet=Storage.prototype.setItem;
  let timer=null;
  async function sync(key,value){
    if(!key||!key.startsWith('tnm_gestao_acao_feed_'))return;
    const condominioId=key.replace('tnm_gestao_acao_feed_','');
    if(!condominioId||condominioId==='sem-condominio')return;
    const token=localStorage.getItem('tnm_token');
    if(!token)return;
    let items=[];
    try{items=JSON.parse(value||'[]')}catch{return;}
    clearTimeout(timer);
    timer=setTimeout(async()=>{
      try{
        await fetch(BASE+'/api/condominios/'+condominioId+'/portal-config',{
          method:'PUT',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify({portalMorador:{gestaoAcao:items}})
        });
      }catch(e){console.warn('[Gestao em Acao] falha ao sincronizar',e)}
    },250);
  }
  Storage.prototype.setItem=function(key,value){
    const result=originalSet.apply(this,arguments);
    try{if(this===localStorage)sync(String(key),String(value));}catch{}
    return result;
  };
})();