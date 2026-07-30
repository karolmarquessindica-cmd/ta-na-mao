(()=>{
  if(location.search.includes('portal=')) return;

  const baseKey='tnm_gestao_acao_feed';
  let condominios=[];
  let selectedCondo=null;

  const normalizeId=value=>String(value||'').trim();
  const condoKey=condoId=>`${baseKey}_${normalizeId(condoId||selectedCondo?.id||'sem-condominio')}`;
  const read=condoId=>{try{const value=JSON.parse(localStorage.getItem(condoKey(condoId))||'[]');return Array.isArray(value)?value:[]}catch{return[]}};

  function safeWrite(items,condoId){
    const limited=(Array.isArray(items)?items:[]).slice(0,200);
    try{
      localStorage.setItem(condoKey(condoId),JSON.stringify(limited));
      return true;
    }catch(error){
      try{
        const lightweight=limited.map(item=>({...item,fotos:(item.fotos||[]).filter(src=>!String(src).startsWith('data:'))}));
        localStorage.setItem(condoKey(condoId),JSON.stringify(lightweight));
        return true;
      }catch{
        console.warn('Gestão em Ação: armazenamento local cheio.',error);
        return false;
      }
    }
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await originalFetch(input,init);
    try{
      const data=await res.clone().json();
      const list=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
      if(list.length&&list[0]?.id&&list[0]?.nome&&/condominios/i.test(url)){
        condominios=list;
        if(!selectedCondo) selectedCondo=condominios[0];
      }
    }catch{}
    return res;
  };

  function getSelectedCondoFromPage(){
    for(const select of [...document.querySelectorAll('select')]){
      const option=select.selectedOptions&&select.selectedOptions[0];
      if(!option) continue;
      const text=(option.textContent||'').trim();
      const condo=condominios.find(c=>c.nome===text||c.id===select.value);
      if(condo) return condo;
    }
    const pageText=document.body.innerText||'';
    return condominios.find(c=>c?.nome&&pageText.includes(c.nome))||selectedCondo||condominios[0]||null;
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error(`Não foi possível ler ${file.name}.`));
      reader.onload=()=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error(`Formato de imagem não suportado: ${file.name}.`));
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function compressImage(file){
    const img=await loadImage(file);
    const maxSide=1280;
    const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    const width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
    const height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,width,height);
    ctx.drawImage(img,0,0,width,height);
    return canvas.toDataURL('image/jpeg',0.72);
  }

  function renderPreview(container,files){
    container.innerHTML='';
    if(!files.length){
      container.innerHTML='<div style="font-size:12px;color:#68766D">Nenhuma foto selecionada.</div>';
      return;
    }
    [...files].forEach((file,index)=>{
      const item=document.createElement('div');
      item.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;background:#F5F8F3;border:1px solid #DDE7DE;border-radius:12px;padding:8px 10px;margin-top:6px;font-size:12px;color:#0C140D;font-weight:800;';
      const size=file.size?` • ${(file.size/1024/1024).toFixed(1)} MB`:'';
      item.textContent=`📷 Foto ${index+1} — ${file.name}${size}`;
      container.appendChild(item);
    });
  }

  async function persistPosts(condoId,items){
    const api=window.TNMGestaoAcao;
    if(api?.syncPosts){
      await api.syncPosts(condoId,items);
      safeWrite(items,condoId);
      return;
    }
    safeWrite(items,condoId);
  }

  function openModal(){
    selectedCondo=getSelectedCondoFromPage();
    document.querySelector('[data-ga-modal]')?.remove();
    const overlay=document.createElement('div');
    overlay.dataset.gaModal='1';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
    const modal=document.createElement('div');
    modal.style.cssText='width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28);';
    modal.innerHTML=`
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;gap:12px">
        <div><div style="font-size:22px;font-weight:950;color:#0C140D">Gestão em Ação</div><div style="font-size:13px;color:#68766D">Nova publicação.</div></div>
        <button data-close style="width:36px;height:36px;border:0;border-radius:999px;background:#EEF6EF;font-size:22px;font-weight:900">×</button>
      </div>
      <div style="background:#ECFDF3;border:1px solid #BBF7D0;border-radius:16px;padding:11px 13px;margin-bottom:14px;color:#065F46;font-weight:900;font-size:13px">🏢 Publicando em: ${selectedCondo?.nome||'Condomínio não identificado'}</div>
      <div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div>
      <div class="row2"><div class="fg"><label>Local</label><input data-local placeholder="Piscina, Portaria, Bloco A"></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div>
      <div class="fg"><label>Título</label><input data-titulo placeholder="Ex: Vistoria preventiva da piscina"></div>
      <div class="fg"><label>Legenda</label><textarea data-legenda rows="5" placeholder="Descreva o que foi feito..."></textarea></div>
      <div class="fg"><label>Fotos</label><input data-fotos type="file" accept="image/*" multiple><div data-preview style="margin-top:8px"></div><div style="font-size:11px;color:#68766D;margin-top:6px">As fotos serão reduzidas automaticamente para facilitar o envio.</div></div>
      <label style="display:flex;gap:8px;align-items:center;margin:8px 0 16px;color:#0C140D;font-weight:800"><input data-publicar type="checkbox" checked style="width:auto"> Publicar no Portal do Morador</label>
      <button data-save class="btn btn-primary" style="width:100%;justify-content:center">Publicar</button>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('[data-data]').value=new Date().toISOString().slice(0,10);
    modal.querySelector('[data-close]').onclick=()=>overlay.remove();

    const fileInput=modal.querySelector('[data-fotos]');
    const preview=modal.querySelector('[data-preview]');
    fileInput.onchange=()=>renderPreview(preview,fileInput.files||[]);
    renderPreview(preview,[]);

    modal.querySelector('[data-save]').onclick=async()=>{
      const saveBtn=modal.querySelector('[data-save]');
      saveBtn.disabled=true;
      saveBtn.textContent='Preparando fotos...';
      try{
        const currentCondo=selectedCondo||getSelectedCondoFromPage();
        if(!currentCondo?.id) throw new Error('Selecione um condomínio antes de publicar.');
        const files=[...(fileInput.files||[])].slice(0,8);
        const fotos=[];
        for(let i=0;i<files.length;i+=1){
          saveBtn.textContent=`Preparando foto ${i+1} de ${files.length}...`;
          fotos.push(await compressImage(files[i]));
        }
        const item={
          id:'ga_'+Date.now(),condominioId:currentCondo.id,condominioNome:currentCondo.nome,
          data:modal.querySelector('[data-data]').value,status:modal.querySelector('[data-status]').value,
          local:modal.querySelector('[data-local]').value.trim(),categoria:modal.querySelector('[data-categoria]').value,
          titulo:modal.querySelector('[data-titulo]').value.trim()||'Registro da Gestão',
          legenda:modal.querySelector('[data-legenda]').value.trim(),fotos,
          publicadoPortal:modal.querySelector('[data-publicar]').checked,createdAt:new Date().toISOString()
        };
        saveBtn.textContent='Salvando publicação...';
        const next=[item,...read(currentCondo.id)];
        await persistPosts(currentCondo.id,next);
        window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:currentCondo.id,source:'admin'}}));
        alert(`Registro salvo no Gestão em Ação de ${currentCondo.nome}.`);
        overlay.remove();
      }catch(error){
        console.error('Falha ao publicar Gestão em Ação:',error);
        alert(error?.message||'Não foi possível salvar a publicação. Tente novamente.');
        saveBtn.disabled=false;
        saveBtn.textContent='Publicar';
      }
    };
  }

  function addButton(){
    if(document.querySelector('[data-ga-admin-btn]')) return;
    const btn=document.createElement('button');
    btn.dataset.gaAdminBtn='1';
    btn.textContent='＋ Gestão em Ação';
    btn.className='btn btn-primary';
    btn.style.cssText='position:fixed;right:22px;bottom:22px;z-index:9999;border-radius:999px;box-shadow:0 18px 42px rgba(0,59,36,.28);';
    btn.onclick=openModal;
    document.body.appendChild(btn);
  }
  setInterval(addButton,800);
})();