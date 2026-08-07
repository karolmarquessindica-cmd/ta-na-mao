(()=>{
  if(location.search.includes('portal=')) return;

  const isMobile=()=>window.matchMedia('(max-width: 820px)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  let lastOpenAt=0;

  function chamadosPage(){
    const heading=[...document.querySelectorAll('h1')].find(el=>norm(el.textContent).includes('central de chamados'));
    return heading?.closest('.page')||null;
  }

  function makeRowsTappable(){
    if(!isMobile()) return;
    const page=chamadosPage();
    if(!page) return;
    page.querySelectorAll('table tbody tr').forEach(row=>{
      if(row.dataset.tnmMobileOpen==='1') return;
      row.dataset.tnmMobileOpen='1';
      row.setAttribute('role','button');
      row.setAttribute('tabindex','0');
      row.style.cursor='pointer';
      row.style.touchAction='manipulation';
      row.style.webkitTapHighlightColor='rgba(8,120,63,.10)';
    });
  }

  function openFromRow(row){
    if(!row || !isMobile()) return;
    const now=Date.now();
    if(now-lastOpenAt<450) return;
    const button=row.querySelector('.tnm-chamado-ver');
    if(!button){
      setTimeout(()=>{
        const retry=row.querySelector('.tnm-chamado-ver');
        if(retry){ lastOpenAt=Date.now(); retry.click(); }
      },180);
      return;
    }
    lastOpenAt=now;
    button.click();
  }

  function shouldIgnore(target,row){
    const interactive=target.closest('button,a,input,select,textarea,label');
    return !!interactive && interactive!==row;
  }

  function handleTap(event){
    if(!isMobile()) return;
    const row=event.target.closest('table tbody tr');
    if(!row || !chamadosPage()?.contains(row) || shouldIgnore(event.target,row)) return;
    if(event.cancelable) event.preventDefault();
    openFromRow(row);
  }

  document.addEventListener('pointerup',handleTap,{capture:true,passive:false});
  document.addEventListener('touchend',handleTap,{capture:true,passive:false});
  document.addEventListener('click',event=>{
    if(!isMobile()) return;
    const row=event.target.closest('table tbody tr');
    if(!row || !chamadosPage()?.contains(row) || shouldIgnore(event.target,row)) return;
    openFromRow(row);
  },true);

  document.addEventListener('keydown',event=>{
    if(!isMobile() || !['Enter',' '].includes(event.key)) return;
    const row=event.target.closest('table tbody tr[data-tnm-mobile-open="1"]');
    if(!row) return;
    event.preventDefault();
    openFromRow(row);
  });

  const style=document.createElement('style');
  style.textContent=`
    @media (max-width:820px){
      table tbody tr[data-tnm-mobile-open="1"]{cursor:pointer;transition:background .12s ease;-webkit-user-select:none;user-select:none}
      table tbody tr[data-tnm-mobile-open="1"]:active{background:#eef8f0!important}
      #tnm-chamado-drawer{width:100vw!important;max-width:100vw!important;height:100dvh!important}
      #tnm-chamado-drawer .tnm-drawer-body{padding:14px!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important}
      #tnm-chamado-drawer .tnm-drawer-head{padding-top:calc(16px + env(safe-area-inset-top))!important}
      #tnm-chamado-drawer .tnm-files{grid-template-columns:1fr!important}
      .tnm-chamado-ver{display:inline-flex!important;position:relative!important;z-index:2}
    }
  `;
  document.head.appendChild(style);

  new MutationObserver(makeRowsTappable).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',makeRowsTappable);
  setInterval(makeRowsTappable,400);
  makeRowsTappable();
})();