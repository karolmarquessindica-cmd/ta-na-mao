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
    if(now-lastOpenAt<500) return;
    const button=row.querySelector('.tnm-chamado-ver');
    if(!button) return;
    lastOpenAt=now;
    button.click();
  }

  function shouldIgnore(target){
    return !!target.closest('button,a,input,select,textarea,label,[role="button"]');
  }

  document.addEventListener('pointerup',event=>{
    if(!isMobile() || shouldIgnore(event.target)) return;
    const row=event.target.closest('table tbody tr');
    if(!row || !chamadosPage()?.contains(row)) return;
    event.preventDefault();
    openFromRow(row);
  },{capture:true,passive:false});

  document.addEventListener('click',event=>{
    if(!isMobile() || shouldIgnore(event.target)) return;
    const row=event.target.closest('table tbody tr');
    if(!row || !chamadosPage()?.contains(row)) return;
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
      table tbody tr[data-tnm-mobile-open="1"]{cursor:pointer;transition:background .12s ease}
      table tbody tr[data-tnm-mobile-open="1"]:active{background:#eef8f0!important}
      #tnm-chamado-drawer{width:100vw!important;max-width:100vw!important;height:100dvh!important}
      #tnm-chamado-drawer .tnm-drawer-body{padding:14px!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important}
      #tnm-chamado-drawer .tnm-drawer-head{padding-top:calc(16px + env(safe-area-inset-top))!important}
      #tnm-chamado-drawer .tnm-files{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);

  new MutationObserver(makeRowsTappable).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',makeRowsTappable);
  setInterval(makeRowsTappable,500);
  makeRowsTappable();
})();