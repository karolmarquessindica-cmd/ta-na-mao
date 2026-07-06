(()=>{
  if(!location.search.includes('portal=')) return;

  let portalPayload = null;
  const originalFetch = window.fetch.bind(window);

  function normalize(value=''){
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }

  function isGestaoDoc(doc){
    const text = normalize([doc?.titulo, doc?.nome, doc?.categoria, doc?.pasta, doc?.descricao, doc?.tipoDocumento].filter(Boolean).join(' '));
    return text.includes('gestao em acao') || text.includes('diario da gestao') || text.includes('acoes da gestao');
  }

  function parseDocDate(doc){
    const text = [doc?.titulo, doc?.nome, doc?.descricao, doc?.publicadoEm, doc?.createdAt].filter(Boolean).join(' ');
    const br = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(br){
      const day = br[1].padStart(2,'0');
      const month = br[2].padStart(2,'0');
      let year = br[3];
      if(year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    const iso = String(doc?.publicadoEm || doc?.createdAt || '').match(/\d{4}-\d{2}-\d{2}/);
    return iso ? iso[0] : '';
  }

  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const res = await originalFetch(input, init);
    try{
      if(/\/api\/portal\//.test(url)){
        const data = await res.clone().json();
        if(data && data.condominio) portalPayload = data;
      }
    }catch{}
    return res;
  };

  function docs(){
    const list = [...(portalPayload?.documentos || []), ...(portalPayload?.documentosIa || [])];
    const byId = new Map();
    list.filter(isGestaoDoc).forEach(doc => byId.set(doc.id || doc.url || doc.nome, doc));
    return [...byId.values()].map(doc => ({...doc, dataGestao: parseDocDate(doc)})).filter(doc => doc.dataGestao);
  }

  function monthName(date){
    return date.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  }

  function openFile(doc){
    const url = doc.downloadUrl || doc.previewUrl || doc.url;
    if(url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  function buildModal(){
    const existing = document.querySelector('[data-gestao-acao-modal]');
    if(existing) existing.remove();

    let current = new Date();
    current.setDate(1);

    const overlay = document.createElement('div');
    overlay.dataset.gestaoAcaoModal = '1';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:12px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'width:min(720px,100%);max-height:88vh;overflow:auto;background:#F7FAF5;border-radius:28px 28px 22px 22px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:18px;';
    overlay.appendChild(modal);

    function render(){
      const registros = docs();
      const y = current.getFullYear();
      const m = current.getMonth();
      const first = new Date(y, m, 1);
      const startWeek = first.getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const byDate = new Map();
      registros.forEach(doc => {
        if(!byDate.has(doc.dataGestao)) byDate.set(doc.dataGestao, []);
        byDate.get(doc.dataGestao).push(doc);
      });

      modal.innerHTML = '';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px;';
      header.innerHTML = '<div><div style="font-size:22px;font-weight:950;color:#0C140D;letter-spacing:-.03em">Gestão em Ação</div><div style="font-size:13px;color:#667085;margin-top:4px">Acompanhe os relatórios publicados pela administração.</div></div>';
      const close = document.createElement('button');
      close.textContent = '×';
      close.style.cssText = 'width:38px;height:38px;border-radius:999px;border:0;background:#E7EEE4;color:#0C140D;font-size:26px;font-weight:800;';
      close.onclick = () => overlay.remove();
      header.appendChild(close);
      modal.appendChild(header);

      const nav = document.createElement('div');
      nav.style.cssText = 'display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;background:#fff;border:1px solid #E2EBDD;border-radius:18px;padding:8px;margin-bottom:12px;';
      const prev = document.createElement('button'); prev.textContent = '‹';
      const next = document.createElement('button'); next.textContent = '›';
      [prev,next].forEach(btn => btn.style.cssText = 'height:38px;border:0;border-radius:12px;background:#F0F6ED;color:#0B6B3A;font-size:24px;font-weight:900;');
      const label = document.createElement('div'); label.textContent = monthName(current); label.style.cssText = 'text-align:center;text-transform:capitalize;font-weight:900;color:#18251C;';
      prev.onclick = () => { current = new Date(y, m - 1, 1); render(); };
      next.onclick = () => { current = new Date(y, m + 1, 1); render(); };
      nav.append(prev,label,next); modal.appendChild(nav);

      const week = document.createElement('div');
      week.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px;';
      ['D','S','T','Q','Q','S','S'].forEach(w => { const el = document.createElement('div'); el.textContent = w; el.style.cssText = 'text-align:center;font-size:12px;color:#6B766D;font-weight:900;'; week.appendChild(el); });
      modal.appendChild(week);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:14px;';
      for(let i=0;i<startWeek;i++) grid.appendChild(document.createElement('div'));
      for(let d=1; d<=days; d++){
        const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const items = byDate.get(key) || [];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.innerHTML = `<strong>${d}</strong>${items.length ? '<span></span>' : ''}`;
        cell.style.cssText = items.length
          ? 'height:54px;border:0;border-radius:16px;background:#0B6B3A;color:#fff;font-weight:900;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 10px 22px rgba(11,107,58,.2);'
          : 'height:54px;border:1px solid #E4ECE2;border-radius:16px;background:#fff;color:#29352D;font-weight:800;display:flex;align-items:center;justify-content:center;';
        if(items.length){
          const dot = cell.querySelector('span');
          dot.style.cssText = 'width:7px;height:7px;border-radius:999px;background:#D9F99D;display:block;';
          cell.onclick = () => renderList(key, items);
        }
        grid.appendChild(cell);
      }
      modal.appendChild(grid);

      const empty = document.createElement('div');
      empty.style.cssText = 'background:#fff;border:1px dashed #D9E5D4;border-radius:18px;padding:14px;font-size:13px;color:#667085;text-align:center;';
      empty.textContent = registros.length ? 'Toque em um dia verde para abrir o relatório publicado.' : 'Nenhum relatório de Gestão em Ação foi publicado ainda.';
      modal.appendChild(empty);
    }

    function renderList(key, items){
      modal.innerHTML = '';
      const top = document.createElement('div');
      top.style.cssText = 'display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:14px;';
      const date = new Date(key + 'T12:00:00');
      top.innerHTML = `<div><div style="font-size:20px;font-weight:950;color:#0C140D">${date.toLocaleDateString('pt-BR')}</div><div style="font-size:13px;color:#667085">Relatórios publicados neste dia</div></div>`;
      const back = document.createElement('button');
      back.textContent = 'Voltar';
      back.style.cssText = 'border:0;background:#E7EEE4;color:#0B6B3A;border-radius:14px;padding:10px 14px;font-weight:900;';
      back.onclick = render;
      top.appendChild(back);
      modal.appendChild(top);

      items.forEach(doc => {
        const card = document.createElement('button');
        card.type = 'button';
        card.style.cssText = 'width:100%;text-align:left;border:1px solid #E3ECDD;background:#fff;border-radius:20px;padding:15px;margin-bottom:10px;box-shadow:0 10px 26px rgba(1,23,12,.08);';
        card.innerHTML = `<div style="font-size:15px;font-weight:950;color:#101828;margin-bottom:5px">${doc.titulo || doc.nome || 'Relatório da Gestão'}</div><div style="font-size:13px;color:#667085;margin-bottom:12px">${doc.descricao || 'Clique para abrir o PDF do relatório.'}</div><div style="display:inline-flex;background:#0B6B3A;color:#fff;border-radius:14px;padding:9px 12px;font-size:13px;font-weight:900">Abrir PDF</div>`;
        card.onclick = () => openFile(doc);
        modal.appendChild(card);
      });
    }

    render();
    document.body.appendChild(overlay);
  }

  function addButton(){
    if(document.querySelector('[data-gestao-acao-button]')) return;
    const portalRoot = document.querySelector('.pnav') || document.querySelector('[class*="portal"]') || document.querySelector('#root');
    if(!portalRoot) return;

    const btn = document.createElement('button');
    btn.dataset.gestaoAcaoButton = '1';
    btn.type = 'button';
    btn.textContent = 'Gestão em Ação';
    btn.style.cssText = 'width:100%;border:0;background:linear-gradient(135deg,#0B6B3A,#14884E);color:#fff;border-radius:18px;padding:14px 16px;font-size:15px;font-weight:950;box-shadow:0 14px 30px rgba(11,107,58,.22);margin:12px 0;';
    btn.onclick = buildModal;

    const home = document.querySelector('.fadeIn') || portalRoot.parentElement || portalRoot;
    const afterBanner = home.querySelector('.cslide')?.parentElement;
    if(afterBanner && afterBanner.parentElement === home) afterBanner.insertAdjacentElement('afterend', btn);
    else home.prepend(btn);
  }

  setInterval(addButton, 600);
  document.addEventListener('DOMContentLoaded', () => setTimeout(addButton, 500));
})();
