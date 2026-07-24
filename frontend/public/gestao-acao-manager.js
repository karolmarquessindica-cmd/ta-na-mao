(()=>{
  if(location.search.includes('portal=')) return;
  let condominios=[];
  let loadingCondos=false;
  const BASE='https://ta-na-mao-9bii.onrender.com';
  const originalFetch=window.fetch.bind(window);
  const token=()=>localStorage.getItem('tnm_token')||'';
  const key=id=>'tnm_gestao_acao_feed_'+(id||'sem-condominio');
  const backendPosts=c=>{
    const cfg=c?.portalConfig||c?.config||{};
    return cfg?.portalMorador?.gestaoAcao||cfg?.gestaoAcao||c?.gestaoAcao||[];
  };
  function hydrate(list=[]){
    condominios=list.filter(c=>c?.id&&c?.nome);
    condominios.forEach(c=>{
      const posts=backendPosts(c);
      if(Array.isArray(posts)&&posts.length){
        const local=read(c.id);
        const merged=[...posts,...local.filter(x=>!posts.some(p=>p.id===x.id))];
        localStorage.setItem(key(c.id),JSON.stringify(merged.slice(0,200)));
      }
    });
    window.dispatchEvent(new CustomEvent('tnm-condominios-loaded',{detail:{count:condominios.length}}));
    window.dispatchEvent(new CustomEvent('tnm-postagens-updated'));
  }
  async function loadCondominios(force=false){
    if(loadingCondos||(!force&&condominios.length)) return condominios;
    loadingCondos=true;
    try{
      const headers=token()?{Authorization:'Bearer '+token()}:{};
      const r=await originalFetch(BASE+'/api/condominios?limit=300',{headers});
      const body=await r.json().catch(()=>[]);
      const list=Array.isArray(body)?body:(Array.isArray(body?.data)?body.data:Array.isArray(body?.items)?body.items:[]);
      if(r.ok) hydrate(list);
    }catch(e){console.warn('Não foi possível carregar os condomínios',e)}
    finally{loadingCondos=false}
    return condominios;
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await originalFetch(input,init);
    try{
      const data=await res.clone().json();
      const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:Array.isArray(data?.items)?data.items:[]);
      if(list.length&&list[0]?.id&&list[0]?.nome&&url.includes('condominios'))hydrate(list);
    }catch{}
    return res;
  };
  function condo(){const txt=document.body.innerText||'';return condominios.find(c=>txt.includes(c.nome))||condominios[0]||null;}
  function read(id){try{return JSON.parse(localStorage.getItem(key(id))||'[]')}catch{return[]}}
  async function saveBackend(id,items){if(!token()||!id||id==='sem-condominio')return;try{await originalFetch(BASE+'/api/condominios/'+id+'/portal-config',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({portalMorador:{gestaoAcao:items}})});}catch(e){console.warn('Gestão em Ação não sincronizou',e)}}
  function write(id,items){const list=items.slice(0,200);localStorage.setItem(key(id),JSON.stringify(list));saveBackend(id,list);const c=condominios.find(x=>x.id===id);if(c){c.portalConfig=c.portalConfig||{};c.portalConfig.portalMorador=c.portalConfig.portalMorador||{};c.portalConfig.portalMorador.gestaoAcao=list}window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id}}))}
  function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
  function preview(box,files,item){box.innerHTML='';if(item?.fotos?.length&&!files.length){box.textContent='Fotos atuais mantidas. Se escolher novas fotos, elas serão substituídas.';box.style.cssText='font-size:12px;color:#68766D;margin-top:8px';return;}if(!files.length){box.textContent='Nenhuma foto selecionada.';box.style.cssText='font-size:12px;color:#68766D;margin-top:8px';return;}[...files].forEach((f,i)=>{const d=document.createElement('div');d.textContent='📷 Foto '+(i+1)+' — '+f.name;d.style.cssText='background:#F5F8F3;border:1px solid #DDE7DE;border-radius:12px;padding:8px 10px;margin-top:6px;font-size:12px;color:#0C140D;font-weight:800';box.appendChild(d);});}
  function openForm(item=null,forcedCondo=null){
    const c=forcedCondo||condo()||(item?{id:item.condominioId,nome:item.condominioNome}:null);if(!c?.id){alert('Selecione o condomínio antes de publicar.');return;}
    document.querySelector('[data-ga-form]')?.remove();
    const overlay=document.createElement('div');overlay.dataset.gaForm='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100002;display:flex;align-items:center;justify-content:center;padding:16px';
    const modal=document.createElement('div');modal.style.cssText='width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)';overlay.appendChild(modal);document.body.appendChild(overlay);
    modal.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:14px;gap:12px"><div><div style="font-size:22px;font-weight:950;color:#0C140D">Gestão em Ação</div><div style="font-size:13px;color:#68766D">'+(item?'Editar publicação':'Nova publicação')+'</div></div><button data-close style="width:36px;height:36px;border:0;border-radius:999px;background:#EEF6EF;font-size:22px;font-weight:900">×</button></div><div style="background:#ECFDF3;border:1px solid #BBF7D0;border-radius:16px;padding:11px 13px;margin-bottom:14px;color:#065F46;font-weight:900;font-size:13px">🏢 Publicando em: '+c.nome+'</div><div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div><div class="row2"><div class="fg"><label>Local</label><input data-local placeholder="Piscina, Portaria, Bloco A"></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Melhoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div><div class="fg"><label>Título</label><input data-titulo placeholder="Ex: Vistoria preventiva da piscina"></div><div class="fg"><label>Legenda</label><textarea data-legenda rows="5" placeholder="Descreva o que foi feito..."></textarea></div><div class="fg"><label>Fotos</label><input data-fotos type="file" accept="image/*" multiple><div data-preview></div></div><label style="display:flex;gap:8px;align-items:center;margin:8px 0 16px;color:#0C140D;font-weight:800"><input data-publicar type="checkbox" checked style="width:auto"> Publicar no Portal do Morador</label><button data-save class="btn btn-primary" style="width:100%;justify-content:center">'+(item?'Salvar alterações':'Publicar')+'</button>';
    modal.querySelector('[data-close]').onclick=()=>overlay.remove();
    modal.querySelector('[data-data]').value=(item?.data||new Date().toISOString().slice(0,10)).slice(0,10);
    modal.querySelector('[data-status]').value=item?.status||'Concluído';modal.querySelector('[data-local]').value=item?.local||'';modal.querySelector('[data-categoria]').value=item?.categoria||'Vistoria';modal.querySelector('[data-titulo]').value=item?.titulo||'';modal.querySelector('[data-legenda]').value=item?.legenda||'';modal.querySelector('[data-publicar]').checked=item?item.publicadoPortal!==false:true;
    const input=modal.querySelector('[data-fotos]');const box=modal.querySelector('[data-preview]');input.onchange=()=>preview(box,input.files||[],item);preview(box,[],item);
    modal.querySelector('[data-save]').onclick=async()=>{const btn=modal.querySelector('[data-save]');btn.disabled=true;btn.textContent='Salvando...';try{const files=[...(input.files||[])].slice(0,8);const fotos=files.length?await Promise.all(files.map(fileToDataUrl)):(item?.fotos||[]);const novo={id:item?.id||'ga_'+Date.now(),condominioId:c.id,condominioNome:c.nome,data:modal.querySelector('[data-data]').value,status:modal.querySelector('[data-status]').value,local:modal.querySelector('[data-local]').value.trim(),categoria:modal.querySelector('[data-categoria]').value,titulo:modal.querySelector('[data-titulo]').value.trim()||'Registro da Gestão',legenda:modal.querySelector('[data-legenda]').value.trim(),fotos,publicadoPortal:modal.querySelector('[data-publicar]').checked,createdAt:item?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};write(c.id,[novo,...read(c.id).filter(x=>x.id!==novo.id)]);overlay.remove();if(!document.body.dataset.postagensPage)openManager();}catch(e){alert('Não foi possível salvar. Tente imagens menores.');btn.disabled=false;btn.textContent=item?'Salvar alterações':'Publicar';}};
  }
  function openManager(){const c=condo();if(!c){alert('Condomínio não identificado. Abra a área do condomínio antes.');return;}document.querySelector('[data-ga-manager]')?.remove();const overlay=document.createElement('div');overlay.dataset.gaManager='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px';const modal=document.createElement('div');modal.style.cssText='width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)';overlay.appendChild(modal);document.body.appendChild(overlay);const items=read(c.id);modal.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:14px"><div><div style="font-size:22px;font-weight:950;color:#0C140D">Publicações - Gestão em Ação</div><div style="font-size:13px;color:#68766D">'+c.nome+'</div></div><button data-close style="width:36px;height:36px;border:0;border-radius:999px;background:#EEF6EF;font-size:22px;font-weight:900">×</button></div><button data-new class="btn btn-primary" style="margin-bottom:14px">+ Nova publicação</button><div data-list></div>';modal.querySelector('[data-close]').onclick=()=>overlay.remove();modal.querySelector('[data-new]').onclick=()=>{overlay.remove();openForm();};const list=modal.querySelector('[data-list]');if(!items.length){list.innerHTML='<div style="padding:18px;border:1px dashed #DDE7DE;border-radius:16px;color:#68766D;text-align:center">Nenhuma publicação cadastrada ainda.</div>';return;}items.forEach(item=>{const card=document.createElement('div');card.style.cssText='border:1px solid #E4ECE2;border-radius:18px;padding:14px;margin-bottom:10px;background:#FDFEFC';card.innerHTML='<div style="font-weight:950;color:#0C140D;margin-bottom:4px">'+(item.titulo||'Registro da Gestão')+'</div><div style="font-size:12px;color:#68766D;margin-bottom:10px">'+(item.data||'')+' • '+(item.local||'Sem local')+' • '+(item.publicadoPortal!==false?'Publicado':'Interno')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button data-edit class="btn btn-sm btn-ghost">Editar</button><button data-toggle class="btn btn-sm btn-ghost">'+(item.publicadoPortal!==false?'Ocultar do portal':'Publicar no portal')+'</button><button data-del class="btn btn-sm btn-danger">Apagar</button></div>';card.querySelector('[data-edit]').onclick=()=>{overlay.remove();openForm(item);};card.querySelector('[data-toggle]').onclick=()=>{write(c.id,read(c.id).map(x=>x.id===item.id?{...x,publicadoPortal:x.publicadoPortal===false}:x));overlay.remove();openManager();};card.querySelector('[data-del]').onclick=()=>{if(confirm('Apagar esta publicação?')){write(c.id,read(c.id).filter(x=>x.id!==item.id));overlay.remove();openManager();}};list.appendChild(card);});}
  function styleMobileButton(btn){if(window.innerWidth>768)return;btn.textContent='+';btn.title='Publicações Gestão em Ação';btn.setAttribute('aria-label','Publicações Gestão em Ação');btn.style.cssText='position:fixed;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);z-index:10040;width:58px;height:58px;border-radius:999px;border:0;background:#08783f;color:#fff;font-size:34px;line-height:1;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(0,59,36,.32)';}
  function addBtn(){const buttons=[...document.querySelectorAll('[data-ga-manager-btn]')];if(document.body.dataset.postagensPage){buttons.forEach(b=>b.remove());return;}buttons.slice(1).forEach(b=>b.remove());if(buttons[0]){styleMobileButton(buttons[0]);return;}const btn=document.createElement('button');btn.dataset.gaManagerBtn='1';btn.textContent='📋 Publicações Gestão em Ação';btn.className='btn btn-ghost';btn.style.cssText='position:fixed;right:22px;bottom:84px;z-index:9999;border-radius:999px;box-shadow:0 14px 34px rgba(0,59,36,.18);background:#fff';btn.onclick=openManager;document.body.appendChild(btn);styleMobileButton(btn);}
  window.TNMGestaoAcao={openForm,openManager,read,write,condo,loadCondominios,getCondominios:()=>condominios.slice()};
  loadCondominios(true);
  setInterval(addBtn,900);
})();