(()=>{
  if(location.search.includes('portal=')) return;
  const waitApi=()=>new Promise(resolve=>{const t=setInterval(()=>{if(window.TNMGestaoAcao){clearInterval(t);resolve(window.TNMGestaoAcao)}},100)});
  const compress=file=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Formato de imagem não suportado.'));
      img.onload=()=>{
        const max=1280,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',.72));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
  waitApi().then(api=>{
    api.openForm=function(item=null,forcedCondo=null){
      const c=forcedCondo||api.condo?.()||(item?{id:item.condominioId,nome:item.condominioNome}:null);
      if(!c?.id){alert('Selecione o condomínio antes de publicar.');return}
      document.querySelector('[data-ga-form]')?.remove();
      const overlay=document.createElement('div');overlay.dataset.gaForm='1';overlay.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100002;display:flex;align-items:center;justify-content:center;padding:16px';
      const modal=document.createElement('div');modal.style.cssText='width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)';overlay.appendChild(modal);document.body.appendChild(overlay);
      modal.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><div style="font-size:22px;font-weight:950">Gestão em Ação</div><div>'+(item?'Editar publicação':'Nova publicação')+'</div></div><button data-close>×</button></div><div style="background:#ECFDF3;padding:11px;border-radius:16px;margin-bottom:14px">🏢 Publicando em: '+c.nome+'</div><div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div><div class="row2"><div class="fg"><label>Local</label><input data-local></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Melhoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div><div class="fg"><label>Título</label><input data-titulo></div><div class="fg"><label>Legenda</label><textarea data-legenda rows="5"></textarea></div><div class="fg"><label>Fotos</label><input data-fotos type="file" accept="image/*" multiple><div data-preview style="font-size:12px;margin-top:7px;color:#68766d"></div></div><label><input data-publicar type="checkbox" checked> Publicar no Portal do Morador</label><button data-save class="btn btn-primary" style="width:100%;margin-top:14px">'+(item?'Salvar alterações':'Publicar')+'</button>';
      const q=s=>modal.querySelector(s);q('[data-close]').onclick=()=>overlay.remove();q('[data-data]').value=(item?.data||new Date().toISOString().slice(0,10)).slice(0,10);q('[data-status]').value=item?.status||'Concluído';q('[data-local]').value=item?.local||'';q('[data-categoria]').value=item?.categoria||'Vistoria';q('[data-titulo]').value=item?.titulo||'';q('[data-legenda]').value=item?.legenda||'';q('[data-publicar]').checked=item?item.publicadoPortal!==false:true;
      const input=q('[data-fotos]'),preview=q('[data-preview]');preview.textContent=item?.fotos?.length?'Fotos atuais mantidas. Escolhendo novas, elas serão substituídas.':'Nenhuma foto selecionada.';input.onchange=()=>{preview.textContent=[...(input.files||[])].map((f,i)=>`Foto ${i+1}: ${f.name}`).join(' • ')||'Nenhuma foto selecionada.'};
      q('[data-save]').onclick=async()=>{
        const btn=q('[data-save]');btn.disabled=true;btn.textContent='Preparando...';
        try{
          const files=[...(input.files||[])].slice(0,6),fotos=[];
          if(files.length){for(let i=0;i<files.length;i++){btn.textContent=`Preparando foto ${i+1} de ${files.length}...`;fotos.push(await compress(files[i]))}}else fotos.push(...(item?.fotos||[]));
          const novo={id:item?.id||'ga_'+Date.now(),condominioId:c.id,condominioNome:c.nome,data:q('[data-data]').value,status:q('[data-status]').value,local:q('[data-local]').value.trim(),categoria:q('[data-categoria]').value,titulo:q('[data-titulo]').value.trim()||'Registro da Gestão',legenda:q('[data-legenda]').value.trim(),fotos,publicadoPortal:q('[data-publicar]').checked,createdAt:item?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
          const next=[novo,...(api.read(c.id)||[]).filter(x=>x.id!==novo.id)];
          btn.textContent='Salvando...';api.write(c.id,next);overlay.remove();
        }catch(e){console.error(e);alert(e?.message||'Não foi possível salvar.');btn.disabled=false;btn.textContent=item?'Salvar alterações':'Publicar'}
      };
    };
  });
})();