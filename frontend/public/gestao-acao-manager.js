(()=>{
  if(location.search.includes('portal=')) return;
  let condominios=[];
  let loadingCondos=false;
  const loadingPosts=new Map();
  const BASE='https://ta-na-mao-9bii.onrender.com';
  const originalFetch=window.fetch.bind(window);
  const token=()=>localStorage.getItem('tnm_token')||'';
  const key=id=>'tnm_gestao_acao_feed_'+(id||'sem-condominio');
  const extractPosts=value=>{
    const cfg=value?.config||value?.portalConfig||value||{};
    const portal=cfg?.portalMorador||cfg;
    const candidates=[portal?.gestaoAcao,portal?.publicacoesGestao,portal?.gestaoEmAcao,cfg?.gestaoAcao,value?.gestaoAcao];
    return candidates.find(Array.isArray)||[];
  };
  function read(id){try{return JSON.parse(localStorage.getItem(key(id))||'[]')}catch{return[]}}
  function store(id,posts){const list=Array.isArray(posts)?posts.slice(0,200):[];localStorage.setItem(key(id),JSON.stringify(list));const c=condominios.find(x=>x.id===id);if(c){c.portalConfig=c.portalConfig||{};c.portalConfig.portalMorador=c.portalConfig.portalMorador||{};c.portalConfig.portalMorador.gestaoAcao=list}return list}
  function hydrate(list=[]){
    condominios=list.filter(c=>c?.id&&c?.nome);
    condominios.forEach(c=>{const posts=extractPosts(c);if(posts.length)store(c.id,posts)});
    window.dispatchEvent(new CustomEvent('tnm-condominios-loaded',{detail:{count:condominios.length}}));
    window.dispatchEvent(new CustomEvent('tnm-postagens-updated'));
  }
  async function loadCondominios(force=false){
    if(loadingCondos||(!force&&condominios.length))return condominios;
    loadingCondos=true;
    try{const r=await originalFetch(BASE+'/api/condominios',{headers:token()?{Authorization:'Bearer '+token()}:{}});const body=await r.json().catch(()=>[]);const list=Array.isArray(body)?body:(body?.data||body?.items||[]);if(r.ok)hydrate(list)}catch(e){console.warn('Não foi possível carregar os condomínios',e)}finally{loadingCondos=false}
    return condominios;
  }
  async function loadPosts(id,force=false){
    if(!id)return [];
    if(!force&&read(id).length)return read(id);
    if(loadingPosts.has(id))return loadingPosts.get(id);
    const promise=(async()=>{
      try{
        const r=await originalFetch(`${BASE}/api/condominios/${id}/portal-config`,{headers:token()?{Authorization:'Bearer '+token()}:{}});
        const body=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(body?.error||`Erro ${r.status}`);
        const posts=extractPosts(body);
        store(id,posts);
        window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id}}));
        return posts;
      }catch(e){console.warn('Não foi possível carregar as postagens',e);return read(id)}finally{loadingPosts.delete(id)}
    })();
    loadingPosts.set(id,promise);return promise;
  }
  window.fetch=async function(input,init){const url=typeof input==='string'?input:(input&&input.url)||'';const res=await originalFetch(input,init);try{const data=await res.clone().json();const list=Array.isArray(data)?data:(data?.data||data?.items||[]);if(list.length&&list[0]?.id&&list[0]?.nome&&url.includes('condominios'))hydrate(list)}catch{}return res};
  function condo(){const txt=document.body.innerText||'';return condominios.find(c=>txt.includes(c.nome))||condominios[0]||null}
  async function saveBackend(id,items){if(!token()||!id)return;try{const r=await originalFetch(`${BASE}/api/condominios/${id}/portal-config`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({portalMorador:{gestaoAcao:items}})});if(!r.ok)throw new Error(`Erro ${r.status}`)}catch(e){console.warn('Gestão em Ação não sincronizou',e)}}
  function write(id,items){const list=store(id,items);saveBackend(id,list);window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id}}))}
  function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
  function preview(box,files,item){box.innerHTML='';if(item?.fotos?.length&&!files.length){box.textContent='Fotos atuais mantidas. Se escolher novas fotos, elas serão substituídas.';return}if(!files.length){box.textContent='Nenhuma foto selecionada.';return}[...files].forEach((f,i)=>{const d=document.createElement('div');d.textContent=`📷 Foto ${i+1} — ${f.name}`;box.appendChild(d)})}
  function openForm(item=null,forcedCondo=null){
    const c=forcedCondo||condo()||(item?{id:item.condominioId,nome:item.condominioNome}:null);if(!c?.id){alert('Selecione o condomínio antes de publicar.');return}
    document.querySelector('[data-ga-form]')?.remove();const overlay=document.createElement('div');overlay.dataset.gaForm='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100002;display:flex;align-items:center;justify-content:center;padding:16px';const modal=document.createElement('div');modal.style.cssText='width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)';overlay.appendChild(modal);document.body.appendChild(overlay);
    modal.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><div style="font-size:22px;font-weight:950">Gestão em Ação</div><div>'+(item?'Editar publicação':'Nova publicação')+'</div></div><button data-close>×</button></div><div style="background:#ECFDF3;padding:11px;border-radius:16px;margin-bottom:14px">🏢 Publicando em: '+c.nome+'</div><div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div><div class="row2"><div class="fg"><label>Local</label><input data-local></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Melhoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div><div class="fg"><label>Título</label><input data-titulo></div><div class="fg"><label>Legenda</label><textarea data-legenda rows="5"></textarea></div><div class="fg"><label>Fotos</label><input data-fotos type="file" accept="image/*" multiple><div data-preview></div></div><label><input data-publicar type="checkbox" checked> Publicar no Portal do Morador</label><button data-save class="btn btn-primary" style="width:100%;margin-top:14px">'+(item?'Salvar alterações':'Publicar')+'</button>';
    modal.querySelector('[data-close]').onclick=()=>overlay.remove();modal.querySelector('[data-data]').value=(item?.data||new Date().toISOString().slice(0,10)).slice(0,10);modal.querySelector('[data-status]').value=item?.status||'Concluído';modal.querySelector('[data-local]').value=item?.local||'';modal.querySelector('[data-categoria]').value=item?.categoria||'Vistoria';modal.querySelector('[data-titulo]').value=item?.titulo||'';modal.querySelector('[data-legenda]').value=item?.legenda||'';modal.querySelector('[data-publicar]').checked=item?item.publicadoPortal!==false:true;
    const input=modal.querySelector('[data-fotos]'),box=modal.querySelector('[data-preview]');input.onchange=()=>preview(box,input.files||[],item);preview(box,[],item);
    modal.querySelector('[data-save]').onclick=async()=>{const files=[...(input.files||[])].slice(0,8);const fotos=files.length?await Promise.all(files.map(fileToDataUrl)):(item?.fotos||[]);const novo={id:item?.id||'ga_'+Date.now(),condominioId:c.id,condominioNome:c.nome,data:modal.querySelector('[data-data]').value,status:modal.querySelector('[data-status]').value,local:modal.querySelector('[data-local]').value.trim(),categoria:modal.querySelector('[data-categoria]').value,titulo:modal.querySelector('[data-titulo]').value.trim()||'Registro da Gestão',legenda:modal.querySelector('[data-legenda]').value.trim(),fotos,publicadoPortal:modal.querySelector('[data-publicar]').checked,createdAt:item?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};write(c.id,[novo,...read(c.id).filter(x=>x.id!==novo.id)]);overlay.remove()}
  }
  function openManager(){const c=condo();if(!c)return alert('Condomínio não identificado.');loadPosts(c.id,true).then(()=>alert('Use a aba Postagens para administrar as publicações.'))}
  function addBtn(){const buttons=[...document.querySelectorAll('[data-ga-manager-btn]')];if(document.body.dataset.postagensPage){buttons.forEach(b=>b.remove());return}buttons.slice(1).forEach(b=>b.remove())}
  window.TNMGestaoAcao={openForm,openManager,read,write,condo,loadCondominios,loadPosts,getCondominios:()=>condominios.slice()};
  loadCondominios(true);setInterval(addBtn,900);
})();