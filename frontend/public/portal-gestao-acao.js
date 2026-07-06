(()=>{
  if(!location.search.includes('portal=')) return;
  let portalPayload=null;
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await originalFetch(input,init);
    try{if(url.includes('/api/portal/')){const data=await res.clone().json();if(data&&data.condominio)portalPayload=data;}}catch{}
    return res;
  };
  function keys(){
    const id=portalPayload?.condominio?.id||'';
    const nome=(portalPayload?.condominio?.nome||'').toLowerCase();
    const all=[];
    if(id)all.push('tnm_gestao_acao_feed_'+id);
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(k.startsWith('tnm_gestao_acao_feed_')&&!all.includes(k))all.push(k);
    }
    return all.filter(k=>{
      if(!nome)return true;
      try{const arr=JSON.parse(localStorage.getItem(k)||'[]');return !arr.length||arr.some(x=>String(x.condominioNome||'').toLowerCase()===nome||String(x.condominioId||'')===id)}catch{return true}
    });
  }
  function read(){
    const map=new Map();
    keys().forEach(k=>{try{(JSON.parse(localStorage.getItem(k)||'[]')||[]).forEach(x=>{if(x&&x.id)map.set(x.id,x)})}catch{}});
    return [...map.values()].sort((a,b)=>new Date(b.data||b.createdAt||0)-new Date(a.data||a.createdAt||0));
  }
  function dateBR(v){try{return new Date(String(v).includes('T')?v:v+'T12:00:00').toLocaleDateString('pt-BR')}catch{return v||''}}
  function post(item){
    const card=document.createElement('article');
    card.style.cssText='background:#fff;border:1px solid #E4ECE2;border-radius:22px;padding:14px;margin-bottom:14px;box-shadow:0 14px 34px rgba(1,23,12,.10);overflow:hidden';
    const top=document.createElement('div');top.style.cssText='display:flex;gap:10px;align-items:center;margin-bottom:10px';
    const av=document.createElement('div');av.textContent='🏢';av.style.cssText='width:42px;height:42px;border-radius:999px;background:#DCFCE7;display:flex;align-items:center;justify-content:center;font-size:20px';
    const info=document.createElement('div');info.style.cssText='flex:1;min-width:0';
    const n=document.createElement('div');n.textContent=portalPayload?.condominio?.nome||item.condominioNome||'Administração';n.style.cssText='font-size:14px;font-weight:950;color:#0C140D';
    const d=document.createElement('div');d.textContent=dateBR(item.data||item.createdAt)+(item.local?' • '+item.local:'');d.style.cssText='font-size:12px;color:#667085';
    info.append(n,d);top.append(av,info);card.appendChild(top);
    const title=document.createElement('div');title.textContent=item.titulo||'Registro da Gestão';title.style.cssText='font-size:15px;font-weight:950;color:#101828;margin-bottom:6px';card.appendChild(title);
    if(item.legenda){const leg=document.createElement('div');leg.textContent=item.legenda;leg.style.cssText='font-size:13px;color:#344038;line-height:1.45;white-space:pre-wrap;margin-bottom:12px';card.appendChild(leg)}
    const fotos=Array.isArray(item.fotos)?item.fotos:[];
    if(fotos.length){const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:'+(fotos.length===1?'1fr':'1fr 1fr')+';gap:6px;margin:10px -2px 12px';fotos.slice(0,4).forEach(src=>{const img=document.createElement('img');img.src=src;img.style.cssText='width:100%;height:170px;object-fit:cover;border-radius:15px;background:#EEF3EE;display:block';grid.appendChild(img)});card.appendChild(grid)}
    const foot=document.createElement('div');foot.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-top:1px solid #EEF3EE;padding-top:10px';
    const st=document.createElement('span');st.textContent=item.status||'Concluído';st.style.cssText='background:#DCFCE7;color:#166534;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900';foot.appendChild(st);
    if(item.categoria){const cat=document.createElement('span');cat.textContent=item.categoria;cat.style.cssText='background:#F5F8F3;color:#53605A;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800';foot.appendChild(cat)}
    card.appendChild(foot);return card;
  }
  function buildModal(){
    document.querySelector('[data-gestao-acao-modal]')?.remove();
    const overlay=document.createElement('div');overlay.dataset.gestaoAcaoModal='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:12px';
    const modal=document.createElement('div');modal.style.cssText='width:min(720px,100%);max-height:88vh;overflow:auto;background:#F7FAF5;border-radius:28px 28px 22px 22px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:18px';overlay.appendChild(modal);
    const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px';
    const txt=document.createElement('div');txt.innerHTML='<div style="font-size:22px;font-weight:950;color:#0C140D;letter-spacing:-.03em">Gestão em Ação</div><div style="font-size:13px;color:#667085;margin-top:4px">Acompanhe as ações realizadas pela administração.</div>';
    const close=document.createElement('button');close.textContent='×';close.style.cssText='width:38px;height:38px;border-radius:999px;border:0;background:#E7EEE4;color:#0C140D;font-size:26px;font-weight:800';close.onclick=()=>overlay.remove();head.append(txt,close);modal.appendChild(head);
    const feed=read().filter(x=>x.publicadoPortal!==false);
    if(!feed.length){const empty=document.createElement('div');empty.textContent='Nenhuma publicação da Gestão em Ação foi publicada ainda.';empty.style.cssText='background:#fff;border:1px dashed #D9E5D4;border-radius:18px;padding:18px;font-size:13px;color:#667085;text-align:center';modal.appendChild(empty)}else feed.forEach(item=>modal.appendChild(post(item)));
    document.body.appendChild(overlay);
  }
  function addButton(){if(document.querySelector('[data-gestao-acao-button]'))return;const root=document.querySelector('.pnav')||document.querySelector('[class*="portal"]')||document.querySelector('#root');if(!root)return;const btn=document.createElement('button');btn.dataset.gestaoAcaoButton='1';btn.type='button';btn.textContent='Gestão em Ação';btn.style.cssText='width:100%;border:0;background:linear-gradient(135deg,#0B6B3A,#14884E);color:#fff;border-radius:18px;padding:14px 16px;font-size:15px;font-weight:950;box-shadow:0 14px 30px rgba(11,107,58,.22);margin:12px 0';btn.onclick=buildModal;const home=document.querySelector('.fadeIn')||root.parentElement||root;const after=home.querySelector('.cslide')?.parentElement;if(after&&after.parentElement===home)after.insertAdjacentElement('afterend',btn);else home.prepend(btn)}
  setInterval(addButton,600);
})();