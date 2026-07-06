(()=>{
  if(location.search.includes('portal=')) return;
  let condominios=[];
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await originalFetch(input,init);
    try{const data=await res.clone().json();const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);if(list.length&&list[0]?.id&&list[0]?.nome&&url.includes('condominios'))condominios=list;}catch{}
    return res;
  };
  function condo(){
    const txt=document.body.innerText||'';
    return condominios.find(c=>txt.includes(c.nome))||condominios[0]||null;
  }
  function key(id){return 'tnm_gestao_acao_feed_'+(id||'sem-condominio')}
  function read(id){try{return JSON.parse(localStorage.getItem(key(id))||'[]')}catch{return[]}}
  function write(id,items){localStorage.setItem(key(id),JSON.stringify(items.slice(0,200)))}
  function openManager(){
    const c=condo();
    if(!c){alert('Condomínio não identificado. Abra a área do condomínio antes.');return;}
    document.querySelector('[data-ga-manager]')?.remove();
    const overlay=document.createElement('div');overlay.dataset.gaManager='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px';
    const modal=document.createElement('div');modal.style.cssText='width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)';overlay.appendChild(modal);document.body.appendChild(overlay);
    const items=read(c.id);
    modal.innerHTML='';
    const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;gap:12px;margin-bottom:14px';
    head.innerHTML='<div><div style="font-size:22px;font-weight:950;color:#0C140D">Publicações - Gestão em Ação</div><div style="font-size:13px;color:#68766D">'+c.nome+'</div></div>';
    const close=document.createElement('button');close.textContent='×';close.style.cssText='width:36px;height:36px;border:0;border-radius:999px;background:#EEF6EF;font-size:22px;font-weight:900';close.onclick=()=>overlay.remove();head.appendChild(close);modal.appendChild(head);
    if(!items.length){const empty=document.createElement('div');empty.textContent='Nenhuma publicação cadastrada ainda.';empty.style.cssText='padding:18px;border:1px dashed #DDE7DE;border-radius:16px;color:#68766D;text-align:center';modal.appendChild(empty);return;}
    items.forEach(item=>{
      const card=document.createElement('div');card.style.cssText='border:1px solid #E4ECE2;border-radius:18px;padding:14px;margin-bottom:10px;background:#FDFEFC';
      const title=document.createElement('div');title.textContent=item.titulo||'Registro da Gestão';title.style.cssText='font-weight:950;color:#0C140D;margin-bottom:4px';
      const meta=document.createElement('div');meta.textContent=(item.data||'')+' • '+(item.local||'Sem local')+' • '+(item.publicadoPortal!==false?'Publicado':'Interno');meta.style.cssText='font-size:12px;color:#68766D;margin-bottom:10px';
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
      const edit=document.createElement('button');edit.textContent='Editar';edit.className='btn btn-sm btn-ghost';edit.onclick=()=>{
        const titulo=prompt('Título:',item.titulo||''); if(titulo===null)return;
        const legenda=prompt('Legenda:',item.legenda||''); if(legenda===null)return;
        const local=prompt('Local:',item.local||''); if(local===null)return;
        const status=prompt('Status:',item.status||'Concluído'); if(status===null)return;
        const updated={...item,titulo,legenda,local,status,updatedAt:new Date().toISOString()};
        write(c.id,read(c.id).map(x=>x.id===item.id?updated:x));
        overlay.remove();openManager();
      };
      const toggle=document.createElement('button');toggle.textContent=item.publicadoPortal!==false?'Ocultar do portal':'Publicar no portal';toggle.className='btn btn-sm btn-ghost';toggle.onclick=()=>{const updated={...item,publicadoPortal:item.publicadoPortal===false};write(c.id,read(c.id).map(x=>x.id===item.id?updated:x));overlay.remove();openManager();};
      const del=document.createElement('button');del.textContent='Apagar';del.className='btn btn-sm btn-danger';del.onclick=()=>{if(confirm('Apagar esta publicação?')){write(c.id,read(c.id).filter(x=>x.id!==item.id));overlay.remove();openManager();}};
      actions.append(edit,toggle,del);card.append(title,meta,actions);modal.appendChild(card);
    });
  }
  function addBtn(){
    if(document.querySelector('[data-ga-manager-btn]'))return;
    const btn=document.createElement('button');btn.dataset.gaManagerBtn='1';btn.textContent='📋 Publicações Gestão em Ação';btn.className='btn btn-ghost';btn.style.cssText='position:fixed;right:22px;bottom:74px;z-index:9999;border-radius:999px;box-shadow:0 14px 34px rgba(0,59,36,.18);background:#fff';btn.onclick=openManager;document.body.appendChild(btn);
  }
  setInterval(addBtn,900);
})();