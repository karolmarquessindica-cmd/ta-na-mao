(()=>{
  if(location.search.includes('portal='))return;
  let lastLoaded='';
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function navItems(){return [...document.querySelectorAll('.sidebar a,.sidebar button,.sidebar [role="button"]')]}
  function markActive(){
    const active=document.body.dataset.postagensPage==='1';
    const post=navItems().find(el=>el.dataset.postagensNav==='1'||norm(el.textContent).trim()==='postagens');
    if(!post)return;
    navItems().forEach(el=>{
      if(el===post&&active){
        el.dataset.tnmPostActive='1';
        el.style.background='#08783f';el.style.color='#fff';el.style.borderRadius='12px';
        el.classList.add('active');
      }else if(active){
        delete el.dataset.tnmPostActive;
        if(norm(el.textContent).includes('dashboard')){el.style.background='transparent';el.style.color='';el.classList.remove('active')}
      }else if(el===post){
        el.style.background='transparent';el.style.color='';el.classList.remove('active')
      }
    });
  }
  async function syncSelected(force=false){
    if(document.body.dataset.postagensPage!=='1')return;
    const select=document.querySelector('.tnm-post-page [data-condo]');
    const id=select?.value||'';
    if(!id||(!force&&lastLoaded===id))return;
    lastLoaded=id;
    const page=document.querySelector('.tnm-post-list');
    if(page&&!window.TNMGestaoAcao?.read?.(id)?.length)page.innerHTML='<div class="tnm-post-empty">Carregando publicações do condomínio...</div>';
    await window.TNMGestaoAcao?.loadPosts?.(id,true);
    window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:id}}));
  }
  document.addEventListener('click',e=>{
    const post=e.target.closest('[data-postagens-nav]');
    if(post)setTimeout(()=>{markActive();syncSelected(true)},120);
    const other=e.target.closest('.sidebar a,.sidebar button');
    if(other&&!post)setTimeout(markActive,80);
  },true);
  document.addEventListener('change',e=>{
    if(e.target.matches('.tnm-post-page [data-condo]')){lastLoaded='';setTimeout(()=>syncSelected(true),40)}
  },true);
  window.addEventListener('tnm-condominios-loaded',()=>setTimeout(()=>syncSelected(true),100));
  setInterval(()=>{markActive();syncSelected(false)},500);
})();