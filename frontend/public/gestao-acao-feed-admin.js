(()=>{
  if(location.search.includes('portal=')) return;

  const storeKey = 'tnm_gestao_acao_feed';
  const read = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; } };
  const write = (items) => localStorage.setItem(storeKey, JSON.stringify(items.slice(0,200)));

  function openModal(){
    document.querySelector('[data-ga-modal]')?.remove();
    const overlay = document.createElement('div');
    overlay.dataset.gaModal = '1';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
    const modal = document.createElement('div');
    modal.style.cssText = 'width:min(620px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28);';
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;gap:12px">
        <div><div style="font-size:22px;font-weight:950;color:#0C140D">Gestão em Ação</div><div style="font-size:13px;color:#68766D">Nova publicação estilo Facebook.</div></div>
        <button data-close style="width:36px;height:36px;border:0;border-radius:999px;background:#EEF6EF;font-size:22px;font-weight:900">×</button>
      </div>
      <div class="row2"><div class="fg"><label>Data</label><input data-data type="date"></div><div class="fg"><label>Status</label><select data-status><option>Concluído</option><option>Em andamento</option><option>Aguardando terceiros</option></select></div></div>
      <div class="row2"><div class="fg"><label>Local</label><input data-local placeholder="Piscina, Portaria, Bloco A"></div><div class="fg"><label>Categoria</label><select data-categoria><option>Vistoria</option><option>Manutenção</option><option>Treinamento</option><option>Cagece</option><option>Enel</option><option>Limpeza</option><option>Jardinagem</option><option>Segurança</option><option>Outros</option></select></div></div>
      <div class="fg"><label>Título</label><input data-titulo placeholder="Ex: Vistoria preventiva da piscina"></div>
      <div class="fg"><label>Legenda</label><textarea data-legenda rows="5" placeholder="Descreva o que foi feito..."></textarea></div>
      <div class="fg"><label>Link da foto</label><input data-foto placeholder="Cole aqui um link de imagem, se houver"></div>
      <label style="display:flex;gap:8px;align-items:center;margin:8px 0 16px;color:#0C140D;font-weight:800"><input data-publicar type="checkbox" checked style="width:auto"> Publicar no Portal do Morador</label>
      <button data-save class="btn btn-primary" style="width:100%;justify-content:center">Publicar</button>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('[data-data]').value = new Date().toISOString().slice(0,10);
    modal.querySelector('[data-close]').onclick = () => overlay.remove();
    modal.querySelector('[data-save]').onclick = () => {
      const item = {
        id:'ga_' + Date.now(),
        data:modal.querySelector('[data-data]').value,
        status:modal.querySelector('[data-status]').value,
        local:modal.querySelector('[data-local]').value.trim(),
        categoria:modal.querySelector('[data-categoria]').value,
        titulo:modal.querySelector('[data-titulo]').value.trim() || 'Registro da Gestão',
        legenda:modal.querySelector('[data-legenda]').value.trim(),
        foto:modal.querySelector('[data-foto]').value.trim(),
        publicadoPortal:modal.querySelector('[data-publicar]').checked,
        createdAt:new Date().toISOString()
      };
      write([item, ...read()]);
      alert('Registro salvo no Gestão em Ação.');
      overlay.remove();
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
