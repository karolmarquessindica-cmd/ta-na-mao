(()=>{
  if(location.search.includes('portal=')) return;
  const BASE='https://ta-na-mao-9bii.onrender.com';
  const token=()=>localStorage.getItem('tnm_token')||'';
  const key=id=>`tnm_gestao_acao_feed_${id||'sem-condominio'}`;
  const memory=new Map();
  let condominios=[];
  let loading=false;

  const light=items=>(Array.isArray(items)?items:[]).slice(0,200).map(item=>({
    ...item,
    fotos:(Array.isArray(item?.fotos)?item.fotos:[]).filter(src=>!String(src||'').startsWith('data:'))
  }));
  function read(id){
    if(memory.has(id)) return memory.get(id);
    try{const v=JSON.parse(localStorage.getItem(key(id))||'[]');return Array.isArray(v)?v:[]}catch{return[]}
  }
  function store(id,items){
    const full=(Array.isArray(items)?items:[]).slice(0,300);
    memory.set(id,full);
    try{localStorage.setItem(key(id),JSON.stringify(light(full)))}catch{
      try{localStorage.removeItem(key(id))}catch{}
    }
    return full;
  }
  function extractPosts(value){
    const cfg=value?.config||value?.portalConfig||value||{};
    const portal=cfg?.portalMorador||cfg;
    return [portal?.gestaoAcao,portal?.publicacoesGestao,portal?.gestaoEmAcao,cfg?.gestaoAcao,value?.gestaoAcao].find(Array.isArray)||[];
  }
  function hydrate(list=[]){
    condominios=list.filter(c=>c?.id&&c?.nome);
    condominios.forEach(c=>{const posts=extractPosts(c);if(posts.length)store(c.id,posts)});
    window.dispatchEvent(new CustomEvent('tnm-condominios-loaded',{detail:{count:condominios.length}}));
  }
  async function loadCondominios(force=false){
    if(loading||(!force&&condominios.length)) return condominios;
    loading=true;
    try{
      const r=await fetch(`${BASE}/api/condominios`,{headers:token()?{Authorization:`Bearer ${token()}`}:{}});
      const body=await r.json().catch(()=>[]);
      if(!r.ok) throw new Error(body?.error||`Erro ${r.status}`);
      hydrate(Array.isArray(body)?body:(body?.data||body?.items||[]));
    }catch(e){console.warn('Não foi possível carregar os condomínios.',e)}finally{loading=false}
    return condominios;
  }
  async function loadPosts(id,force=false){
    if(!id) return [];
    const api=window.TNMGestaoAcao;
    if(api?.__dbConnected&&api.loadPosts!==loadPosts) return api.loadPosts(id,force);
    try{
      const r=await fetch(`${BASE}/api/condominios/${id}/portal-config`,{headers:token()?{Authorization:`Bearer ${token()}`}:{}});
      const body=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(body?.error||`Erro ${r.status}`);
      const posts=extractPosts(body);store(id,posts);return posts;
    }catch(e){console.warn('Não foi possível carregar as postagens.',e);return read(id)}
  }
  function selectedCondo(){
    const select=document.querySelector('.tnm-post-page [data-condo]');
    if(select?.value) return condominios.find(c=>c.id===select.value)||null;
    const text=document.body.innerText||'';
    return condominios.find(c=>text.includes(c.nome))||condominios[0]||null;
  }
  function imageFromFile(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error(`Não foi possível ler ${file.name}.`));
      reader.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Imagem inválida: ${file.name}.`));img.src=reader.result};
      reader.readAsDataURL(file);
    });
  }
  async function compress(file){
    if(!file.type.startsWith('image/')) throw new Error(`${file.name} não é uma imagem válida.`);
    if(file.size>20*1024*1024) throw new Error(`${file.name} ultrapassa 20 MB.`);
    const img=await imageFromFile(file);
    const max=1200,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Não foi possível processar a foto.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.68);
  }
  async function persist(id,items){
    const api=window.TNMGestaoAcao;
    const operation=api?.syncPosts
      ? Promise.resolve(api.syncPosts(id,items))
      : fetch(`${BASE}/api/condominios/${id}/portal-config`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({portalMorador:{gestaoAcao:items}})}).then(async r=>{if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b?.error||`Erro ${r.status}`)}});
    await Promise.race([operation,new Promise((_,reject)=>setTimeout(()=>reject(new Error('O servidor demorou para confirmar. Tente novamente.')),45000))]);
  }
  function openForm(item=null,forcedCondo=null){
    const c=forcedCondo||selectedCondo()||(item?{id:item.condominioId,nome:item.condominioNome}:null);
    if(!c?.id){alert('Selecione o condomínio antes de publicar.');return}
    document.querySelector('[data-ga-form]')?.remove();
    const overlay=document.createElement('div');overlay.dataset.gaForm='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100002;display:flex;align-items:center;justify-content:center;padding:16px';
    const modal=document.createElement('div');modal.style.cssText='width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)';
    modal.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><div style="font-size:22px;font-weight:950">Gestão em Ação</div><div>${item?'Editar publicação':'Nova publicação'}</div></div><button type="button" data-close style="width:36px;height:36px">×</button></div><div style="background:#ECFDF3;padding:11px;border-radius:16px;margin-bottom:14px">🏢 Publicando em: ${c.nome}</div><div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div><div class="row2"><div class="fg"><label>Local</label><input data-local placeholder="Piscina, Portaria, Bloco A"></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Melhoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div><div class="fg"><label>Título</label><input data-titulo></div><div class="fg"><label>Legenda</label><textarea data-legenda rows="5"></textarea></div><div class="fg"><label>Fotos</label><input data-fotos type="file" accept="image/*" multiple><div data-preview style="font-size:12px;margin-top:7px;color:#68766d"></div></div><label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input data-publicar type="checkbox" checked> Publicar no Portal do Morador</label><div data-error style="display:none;margin-top:12px;padding:10px;border-radius:10px;background:#fef2f2;color:#b42318;font-size:13px;font-weight:700"></div><button type="button" data-save class="btn btn-primary" style="width:100%;margin-top:14px">${item?'Salvar alterações':'Publicar'}</button>`;
    overlay.appendChild(modal);document.body.appendChild(overlay);
    const q=s=>modal.querySelector(s),input=q('[data-fotos]'),preview=q('[data-preview]'),errorBox=q('[data-error]'),save=q('[data-save]');
    q('[data-data]').value=(item?.data||new Date().toISOString().slice(0,10)).slice(0,10);q('[data-status]').value=item?.status||'Concluído';q('[data-local]').value=item?.local||'';q('[data-categoria]').value=item?.categoria||'Vistoria';q('[data-titulo]').value=item?.titulo||'';q('[data-legenda]').value=item?.legenda||'';q('[data-publicar]').checked=item?item.publicadoPortal!==false:true;
    preview.textContent=item?.fotos?.length?'Fotos atuais serão mantidas se nenhuma nova for escolhida.':'Nenhuma foto selecionada.';
    input.onchange=()=>{preview.textContent=input.files?.length?`${input.files.length} foto(s) selecionada(s).`:'Nenhuma foto selecionada.'};
    q('[data-close]').onclick=()=>{if(!save.disabled)overlay.remove()};
    save.onclick=async event=>{
      event.preventDefault();event.stopPropagation();if(save.disabled)return;
      errorBox.style.display='none';save.disabled=true;const original=save.textContent;
      try{
        const files=[...(input.files||[])].slice(0,6),fotos=[];
        for(let i=0;i<files.length;i++){save.textContent=`Preparando foto ${i+1} de ${files.length}...`;fotos.push(await compress(files[i]))}
        const finalFotos=files.length?fotos:(item?.fotos||[]);
        const novo={id:item?.id||`ga_${Date.now()}`,condominioId:c.id,condominioNome:c.nome,data:q('[data-data]').value,status:q('[data-status]').value,local:q('[data-local]').value.trim(),categoria:q('[data-categoria]').value,titulo:q('[data-titulo]').value.trim()||'Registro da Gestão',legenda:q('[data-legenda]').value.trim(),fotos:finalFotos,publicadoPortal:q('[data-publicar]').checked,createdAt:item?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
        const current=window.TNMGestaoAcao?.read?.(c.id)||read(c.id),next=[novo,...current.filter(x=>x.id!==novo.id)];
        save.textContent='Salvando no sistema...';await persist(c.id,next);store(c.id,next);
        window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:c.id,source:'database'}}));
        overlay.remove();
      }catch(e){console.error('Falha ao salvar publicação:',e);errorBox.textContent=e?.message||'Não foi possível salvar a publicação.';errorBox.style.display='block';save.disabled=false;save.textContent=original}
    };
  }
  function write(id,items){const full=store(id,items);persist(id,full).catch(e=>console.warn('Sincronização pendente.',e));window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id,source:'local'}}));return full}
  window.TNMGestaoAcao={...(window.TNMGestaoAcao||{}),openForm,read,write,condo:selectedCondo,loadCondominios,loadPosts,getCondominios:()=>condominios.slice()};
  loadCondominios(true);
})();