(()=>{
  if(location.search.includes('portal=')) return;

  const baseKey = 'tnm_gestao_acao_feed';
  let condominios = [];
  let selectedCondo = null;

  function normalizeId(value=''){
    return String(value || '').trim();
  }

  function condoKey(condoId){
    const id = normalizeId(condoId || selectedCondo?.id || 'sem-condominio');
    return `${baseKey}_${id}`;
  }

  const read = (condoId) => { try { return JSON.parse(localStorage.getItem(condoKey(condoId)) || '[]'); } catch { return []; } };
  const write = (items, condoId) => localStorage.setItem(condoKey(condoId), JSON.stringify(items.slice(0,200)));

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const res = await originalFetch(input, init);
    try{
      const data = await res.clone().json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      if(list.length && list[0]?.id && list[0]?.nome && /condominios/i.test(url)){
        condominios = list;
        if(!selectedCondo) selectedCondo = condominios[0];
      }
    }catch{}
    return res;
  };

  function getSelectedCondoFromPage(){
    const selects = [...document.querySelectorAll('select')];
    for(const select of selects){
      const option = select.selectedOptions && select.selectedOptions[0];
      if(!option) continue;
      const text = (option.textContent || '').trim();
      const condo = condominios.find(c => c.nome === text || c.id === select.value);
      if(condo) return condo;
    }
    const pageText = document.body.innerText || '';
    const condo = condominios.find(c => c?.nome && pageText.includes(c.nome));
    return condo || selectedCondo || condominios[0] || null;
  }

  function fileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderPreview(container, files){
    container.innerHTML = '';
    if(!files.length){
      container.innerHTML = '<div style="font-size:12px;color:#68766D">Nenhuma foto selecionada.</div>';
      return;
    }
    [...files].forEach((file, index)=>{
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;background:#F5F8F3;border:1px solid #DDE7DE;border-radius:12px;padding:8px 10px;margin-top:6px;font-size:12px;color:#0C140D;font-weight:800;';
      item.textContent = `📷 Foto ${index + 1} — ${file.name}`;
      container.appendChild(item);
    });
  }

  function openModal(){
    selectedCondo = getSelectedCondoFromPage();
    document.querySelector('[data-ga-modal]')?.remove();
    const overlay = document.createElement('div');
    overlay.dataset.gaModal = '1';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
    const modal = document.createElement('div');
    modal.style.cssText = 'width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28);';
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;gap:12px">
        <div><div style="font-size:22px;font-weight:950;color:#0C140D">Gestão em Ação</div><div style="font-size:13px;color:#68766D">Nova publicação estilo Facebook.</div></div>
        <button data-close style="width:36px;height:36px;border:0;border-radius:999px;background:#EEF6EF;font-size:22px;font-weight:900">×</button>
      </div>
      <div style="background:#ECFDF3;border:1px solid #BBF7D0;border-radius:16px;padding:11px 13px;margin-bottom:14px;color:#065F46;font-weight:900;font-size:13px">🏢 Publicando em: <span data-condo-label>${selectedCondo?.nome || 'Condomínio não identificado'}</span></div>
      <div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div>
      <div class="row2"><div class="fg"><label>Local</label><input data-local placeholder="Piscina, Portaria, Bloco A"></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div>
      <div class="fg"><label>Título</label><input data-titulo placeholder="Ex: Vistoria preventiva da piscina"></div>
      <div class="fg"><label>Legenda</label><textarea data-legenda rows="5" placeholder="Descreva o que foi feito..."></textarea></div>
      <div class="fg">
        <label>Fotos</label>
        <input data-fotos type="file" accept="image/*" multiple>
        <div data-preview style="margin-top:8px"></div>
      </div>
      <label style="display:flex;gap:8px;align-items:center;margin:8px 0 16px;color:#0C140D;font-weight:800"><input data-publicar type="checkbox" checked style="width:auto"> Publicar no Portal do Morador</label>
      <button data-save class="btn btn-primary" style="width:100%;justify-content:center">Publicar</button>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('[data-data]').value = new Date().toISOString().slice(0,10);
    modal.querySelector('[data-close]').onclick = () => overlay.remove();

    const fileInput = modal.querySelector('[data-fotos]');
    const preview = modal.querySelector('[data-preview]');
    fileInput.onchange = () => renderPreview(preview, fileInput.files || []);
    renderPreview(preview, []);

    modal.querySelector('[data-save]').onclick = async () => {
      const saveBtn = modal.querySelector('[data-save]');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
      try{
        const currentCondo = selectedCondo || getSelectedCondoFromPage();
        if(!currentCondo?.id){
          alert('Selecione um condomínio antes de publicar.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Publicar';
          return;
        }
        const files = [...(fileInput.files || [])].slice(0,8);
        const fotos = await Promise.all(files.map(fileToDataUrl));
        const item = {
          id:'ga_' + Date.now(),
          condominioId: currentCondo.id,
          condominioNome: currentCondo.nome,
          data:modal.querySelector('[data-data]').value,
          status:modal.querySelector('[data-status]').value,
          local:modal.querySelector('[data-local]').value.trim(),
          categoria:modal.querySelector('[data-categoria]').value,
          titulo:modal.querySelector('[data-titulo]').value.trim() || 'Registro da Gestão',
          legenda:modal.querySelector('[data-legenda]').value.trim(),
          fotos,
          publicadoPortal:modal.querySelector('[data-publicar]').checked,
          createdAt:new Date().toISOString()
        };
        write([item, ...read(currentCondo.id)], currentCondo.id);
        alert(`Registro salvo no Gestão em Ação de ${currentCondo.nome}.`);
        overlay.remove();
      }catch(e){
        alert('Não foi possível salvar as fotos. Tente imagens menores.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Publicar';
      }
    };
  }

  function addButton(){
    if(document.querySelector('[data-ga-admin-btn]')) return;
    const btn = document.createElement('button');
    btn.dataset.gaAdminBtn = '1';
    btn.textContent = '＋ Gestão em Ação';
    btn.className = 'btn btn-primary';
    btn.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:9999;border-radius:999px;box-shadow:0 18px 42px rgba(0,59,36,.28);';
    btn.onclick = openModal;
    document.body.appendChild(btn);
  }
  setInterval(addButton, 800);
})();