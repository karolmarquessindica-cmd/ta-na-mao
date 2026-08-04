(()=>{
  if(location.search.includes('portal=')) return;
  function selectedCondo(){
    const api=window.TNMGestaoAcao;
    const select=document.querySelector('.tnm-post-page [data-condo]');
    if(select?.value) return api?.getCondominios?.().find(c=>c.id===select.value)||null;
    return api?.condo?.()||api?.getCondominios?.()[0]||null;
  }
  function addButton(){
    const existing=[...document.querySelectorAll('[data-ga-admin-btn]')];
    existing.slice(1).forEach(btn=>btn.remove());
    if(document.body.dataset.postagensPage==='1'){
      existing.forEach(btn=>btn.remove());
      return;
    }
    if(existing.length) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.dataset.gaAdminBtn='1';
    btn.textContent='＋ Gestão em Ação';
    btn.className='btn btn-primary';
    btn.style.cssText='position:fixed;right:22px;bottom:22px;z-index:9999;border-radius:999px;box-shadow:0 18px 42px rgba(0,59,36,.28)';
    btn.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      const api=window.TNMGestaoAcao;
      if(!api?.openForm){alert('O módulo de postagens ainda está carregando. Tente novamente em alguns segundos.');return}
      api.openForm(null,selectedCondo());
    });
    document.body.appendChild(btn);
  }
  setInterval(addButton,700);
})();