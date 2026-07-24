(()=>{
  if(location.search.includes('portal=')) return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let selectedId='';
  let filter='todas';
  let search='';
  let category='todas';

  function api(){return window.TNMGestaoAcao}
  function condos(){return api()?.getCondominios?.()||[]}
  function currentCondo(){
    const list=condos();
    if(selectedId) return list.find(c=>c.id===selectedId)||null;
    const c=api()?.condo?.()||list[0]||null;
    if(c) selectedId=c.id;
    return c;
  }
  function items(){const c=currentCondo();return c?api()?.read?.(c.id)||[]:[]}
  function dateBR(v){if(!v)return '';const [y,m,d]=String(v).slice(0,10).split('-');return d&&m&&y?`${d}/${m}/${y}`:v}
  function filtered(){
    const now=new Date(),today=now.toISOString().slice(0,10),month=today.slice(0,7);
    return items().filter(x=>{
      if(filter==='publicadas'&&x.publicadoPortal===false)return false;
      if(filter==='ocultas'&&x.publicadoPortal!==false)return false;
      if(filter==='hoje'&&String(x.data||'').slice(0,10)!==today)return false;
      if(filter==='mes'&&!String(x.data||'').startsWith(month))return false;
      if(category!=='todas'&&norm(x.categoria)!==norm(category))return false;
      if(search&&!norm(`${x.titulo} ${x.legenda} ${x.local} ${x.categoria}`).includes(norm(search)))return false;
      return true;
    }).sort((a,b)=>String(b.data||b.createdAt||'').localeCompare(String(a.data||a.createdAt||'')));
  }
  function stats(){const all=items();return {total:all.length,published:all.filter(x=>x.publicadoPortal!==false).length,hidden:all.filter(x=>x.publicadoPortal===false).length,drafts:all.filter(x=>!x.titulo||!x.legenda).length}}
  function report(){
    const reports=[...document.querySelectorAll('a,button')].find(el=>norm(el.textContent).trim()==='relatorios');
    if(reports){document.body.dataset.postagensPage='';delete document.body.dataset.postagensPage;reports.click();setTimeout(()=>{const btn=[...document.querySelectorAll('button')].find(b=>norm(b.textContent).includes('gestao em acao'));btn?.click()},500);return;}
    alert('Abra a aba Relatórios para gerar o relatório de Gestão em Ação.');
  }
  function duplicate(item,c){
    const copy={...item,id:'ga_'+Date.now(),data:new Date().toISOString().slice(0,10),titulo:(item.titulo||'Registro da Gestão')+' — cópia',publicadoPortal:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    api().write(c.id,[copy,...items()]);render();
  }
  function card(item,c){
    const article=document.createElement('article');article.className='tnm-post-card';
    const photos=Array.isArray(item.fotos)?item.fotos:[];
    article.innerHTML=`<div class="tnm-post-head"><div class="tnm-post-avatar">📋</div><div><strong>${esc(c.nome)}</strong><span>${esc(dateBR(item.data))}${item.local?' • '+esc(item.local):''}</span></div><em class="${item.publicadoPortal===false?'internal':'published'}">${item.publicadoPortal===false?'Oculta':'Publicada'}</em></div><h3>${esc(item.titulo||'Registro da Gestão')}</h3>${item.legenda?`<p>${esc(item.legenda)}</p>`:''}${photos.length?`<div class="tnm-post-photos">${photos.slice(0,4).map(src=>`<img src="${esc(src)}" alt="Foto da publicação">`).join('')}</div>`:''}<div class="tnm-post-meta"><span>${esc(item.categoria||'Outros')}</span><span>${esc(item.status||'Concluído')}</span></div><div class="tnm-post-actions"><button data-edit>Editar</button><button data-copy>Duplicar</button><button data-toggle>${item.publicadoPortal===false?'Publicar':'Ocultar'}</button><button data-delete class="danger">Excluir</button></div>`;
    article.querySelector('[data-edit]').onclick=()=>api().openForm(item,c);
    article.querySelector('[data-copy]').onclick=()=>duplicate(item,c);
    article.querySelector('[data-toggle]').onclick=()=>{api().write(c.id,items().map(x=>x.id===item.id?{...x,publicadoPortal:x.publicadoPortal===false,updatedAt:new Date().toISOString()}:x));render()};
    article.querySelector('[data-delete]').onclick=()=>{if(confirm('Excluir esta publicação?')){api().write(c.id,items().filter(x=>x.id!==item.id));render()}};
    return article;
  }
  function ensureCss(){if(document.getElementById('tnm-postagens-css'))return;const style=document.createElement('style');style.id='tnm-postagens-css';style.textContent=`
    .tnm-post-page{max-width:1180px;margin:0 auto;padding:28px}.tnm-post-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}.tnm-post-top h1{margin:0;font-size:30px}.tnm-post-top p{margin:7px 0 0;color:#68766d}.tnm-post-buttons{display:flex;gap:10px;flex-wrap:wrap}.tnm-post-buttons button{border:0;border-radius:12px;padding:11px 16px;font-weight:850;cursor:pointer}.tnm-post-new{background:#08783f;color:#fff}.tnm-post-report{background:#fff;color:#08783f;border:1px solid #d9e5d4!important}.tnm-post-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.tnm-post-stat{background:#fff;border:1px solid #e0e9dd;border-radius:18px;padding:17px}.tnm-post-stat strong{display:block;font-size:28px;color:#101828}.tnm-post-stat span{color:#68766d;font-size:13px;font-weight:750}.tnm-post-filters{background:#fff;border:1px solid #e0e9dd;border-radius:18px;padding:14px;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;margin-bottom:14px}.tnm-post-filters input,.tnm-post-filters select{width:100%;border:1px solid #d9e5d4;border-radius:12px;padding:11px;background:#fff}.tnm-post-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.tnm-post-tabs button{border:1px solid #d9e5d4;background:#fff;color:#526057;border-radius:999px;padding:8px 13px;font-weight:800;cursor:pointer}.tnm-post-tabs button.active{background:#08783f;color:#fff;border-color:#08783f}.tnm-post-list{display:grid;gap:14px}.tnm-post-card{background:#fff;border:1px solid #e0e9dd;border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(16,24,40,.045)}.tnm-post-head{display:flex;gap:10px;align-items:center}.tnm-post-avatar{width:42px;height:42px;border-radius:999px;background:#dcfce7;display:flex;align-items:center;justify-content:center}.tnm-post-head>div:nth-child(2){flex:1}.tnm-post-head strong,.tnm-post-head span{display:block}.tnm-post-head span{font-size:12px;color:#68766d;margin-top:3px}.tnm-post-head em{font-style:normal;font-size:11px;font-weight:900;border-radius:999px;padding:6px 10px}.tnm-post-head em.published{background:#dcfce7;color:#166534}.tnm-post-head em.internal{background:#f2f4f7;color:#475467}.tnm-post-card h3{margin:14px 0 7px;font-size:19px}.tnm-post-card p{white-space:pre-wrap;color:#344038;line-height:1.55}.tnm-post-photos{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:12px 0}.tnm-post-photos img{width:100%;height:220px;object-fit:cover;border-radius:14px}.tnm-post-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tnm-post-meta span{background:#f3f7f1;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;color:#53605a}.tnm-post-actions{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #edf2ea;margin-top:14px;padding-top:12px}.tnm-post-actions button{border:1px solid #d9e5d4;background:#fff;color:#08783f;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer}.tnm-post-actions .danger{color:#b42318;border-color:#fecdca}.tnm-post-empty{background:#fff;border:1px dashed #d9e5d4;border-radius:18px;padding:32px;text-align:center;color:#68766d}
    @media(max-width:768px){.tnm-post-page{padding:16px 12px 100px}.tnm-post-top{display:block}.tnm-post-buttons{margin-top:14px}.tnm-post-stats{grid-template-columns:1fr 1fr}.tnm-post-filters{grid-template-columns:1fr}.tnm-post-photos img{height:150px}}
  `;document.head.appendChild(style)}
  function render(){
    const page=document.querySelector('.page');if(!page||!api())return;
    const c=currentCondo(),s=stats(),list=filtered(),listCondos=condos();
    document.body.dataset.postagensPage='1';ensureCss();
    page.innerHTML=`<div class="tnm-post-page"><div class="tnm-post-top"><div><h1>📋 Postagens</h1><p>Gestão em Ação — acompanhe, edite e publique as atividades dos condomínios.</p></div><div class="tnm-post-buttons"><button class="tnm-post-report" data-report>Gerar relatório</button><button class="tnm-post-new" data-new>+ Nova publicação</button></div></div><div class="tnm-post-stats"><div class="tnm-post-stat"><strong>${s.total}</strong><span>Publicações</span></div><div class="tnm-post-stat"><strong>${s.published}</strong><span>Publicadas</span></div><div class="tnm-post-stat"><strong>${s.hidden}</strong><span>Ocultas</span></div><div class="tnm-post-stat"><strong>${s.drafts}</strong><span>Rascunhos</span></div></div><div class="tnm-post-filters"><select data-condo>${listCondos.map(x=>`<option value="${esc(x.id)}" ${x.id===c?.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select><input data-search placeholder="Pesquisar título, local ou texto" value="${esc(search)}"><select data-category><option value="todas">Todas as categorias</option>${['Vistoria','Melhoria','Manutenção','Treinamento','Cagece','Enel','Limpeza','Jardinagem','Segurança','Outros'].map(x=>`<option ${category===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="tnm-post-tabs">${[['todas','Todas'],['hoje','Hoje'],['mes','Este mês'],['publicadas','Publicadas'],['ocultas','Ocultas']].map(([v,l])=>`<button data-filter="${v}" class="${filter===v?'active':''}">${l}</button>`).join('')}</div><div class="tnm-post-list" data-list></div></div>`;
    const listBox=page.querySelector('[data-list]');if(!c||!list.length)listBox.innerHTML='<div class="tnm-post-empty">Nenhuma publicação encontrada com estes filtros.</div>';else list.forEach(x=>listBox.appendChild(card(x,c)));
    page.querySelector('[data-new]').onclick=()=>api().openForm(null,c);page.querySelector('[data-report]').onclick=report;
    page.querySelector('[data-condo]').onchange=e=>{selectedId=e.target.value;render()};
    page.querySelector('[data-search]').oninput=e=>{search=e.target.value;clearTimeout(window.__tnmPostSearch);window.__tnmPostSearch=setTimeout(render,250)};
    page.querySelector('[data-category]').onchange=e=>{category=e.target.value;render()};
    page.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});
  }
  function addMenu(){
    if(document.querySelector('[data-postagens-nav]'))return;
    const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
    const agenda=[...sidebar.querySelectorAll('a,button')].find(el=>norm(el.textContent).includes('agenda do sindico'));
    const ref=agenda||[...sidebar.querySelectorAll('a,button')].find(el=>norm(el.textContent).includes('chamados'));if(!ref)return;
    const item=ref.cloneNode(true);item.dataset.postagensNav='1';item.removeAttribute('href');item.querySelectorAll('svg').forEach(svg=>svg.remove());
    const textNodes=[...item.childNodes].filter(n=>n.nodeType===3);textNodes.forEach(n=>n.remove());
    const labels=[...item.querySelectorAll('span,div')].filter(x=>x.children.length===0);if(labels.length)labels[labels.length-1].textContent='Postagens';else item.append(' 📋 Postagens');
    item.onclick=e=>{e.preventDefault();e.stopPropagation();render();document.body.classList.remove('mobile-menu-open')};
    ref.insertAdjacentElement(agenda?'afterend':'beforebegin',item);
  }
  window.addEventListener('tnm-postagens-updated',()=>{if(document.body.dataset.postagensPage)render()});
  document.addEventListener('click',e=>{if(document.body.dataset.postagensPage&&!e.target.closest('[data-postagens-nav],.tnm-post-page,[data-ga-form]')){const nav=e.target.closest('.sidebar a,.sidebar button');if(nav){delete document.body.dataset.postagensPage}}},true);
  setInterval(addMenu,600);
})();