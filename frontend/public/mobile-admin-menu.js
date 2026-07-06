(()=>{
  if(location.search.includes('portal=')) return;
  function isMobile(){ return window.matchMedia('(max-width: 768px)').matches; }
  function ensure(){
    if(!isMobile()){
      document.body.classList.remove('mobile-menu-open');
      return;
    }
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return;
    if(!document.querySelector('.mobile-menu-backdrop')){
      const backdrop=document.createElement('div');
      backdrop.className='mobile-menu-backdrop';
      backdrop.onclick=()=>document.body.classList.remove('mobile-menu-open');
      document.body.appendChild(backdrop);
    }
    if(!document.querySelector('.mobile-menu-toggle')){
      const btn=document.createElement('button');
      btn.className='mobile-menu-toggle';
      btn.type='button';
      btn.setAttribute('aria-label','Abrir menu');
      btn.textContent='☰';
      btn.onclick=()=>document.body.classList.toggle('mobile-menu-open');
      document.body.appendChild(btn);
    }
    sidebar.querySelectorAll('a,button').forEach(item=>{
      if(item.dataset.mobileClose==='1') return;
      item.dataset.mobileClose='1';
      item.addEventListener('click',()=>setTimeout(()=>document.body.classList.remove('mobile-menu-open'),120));
    });
  }
  setInterval(ensure,500);
  window.addEventListener('resize',ensure);
  document.addEventListener('DOMContentLoaded',ensure);
})();