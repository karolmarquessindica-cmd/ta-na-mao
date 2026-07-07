(()=>{
  if(!location.search.includes('portal=')) return;

  function isBad(src){
    return !src || src === '#' || src === 'undefined' || src === 'null' || src.startsWith('blob:');
  }

  function fixImg(img){
    if(!img || img.dataset.bannerFixed === '1') return;
    const alt=(img.getAttribute('alt')||'').toLowerCase();
    const src=img.getAttribute('src')||'';
    const isBanner=alt.includes('banner') || alt.includes('bem-vindo') || img.closest('.cslide') || img.closest('[class*="slide"]') || img.closest('[class*="banner"]');
    if(!isBanner) return;

    img.dataset.bannerFixed='1';
    img.style.display='block';
    img.style.width='100%';
    img.style.height='100%';
    img.style.objectFit='cover';
    img.style.borderRadius='22px';

    if(isBad(src)){
      const box=img.closest('.cslide') || img.closest('[class*="slide"]') || img.parentElement;
      if(box){
        box.style.display='none';
        box.style.minHeight='0';
        box.style.height='0';
        box.style.margin='0';
        box.style.overflow='hidden';
      }
      return;
    }

    img.addEventListener('error',()=>{
      const original=img.dataset.originalSrc || img.src;
      img.dataset.originalSrc=original;
      const attempts=Number(img.dataset.retry||0);
      if(attempts<3){
        img.dataset.retry=String(attempts+1);
        setTimeout(()=>{ img.src=original.split('?')[0]+'?reload='+(Date.now()); },600*(attempts+1));
      }else{
        const box=img.closest('.cslide') || img.closest('[class*="slide"]') || img.parentElement;
        if(box){
          box.style.display='none';
          box.style.minHeight='0';
          box.style.height='0';
          box.style.margin='0';
          box.style.overflow='hidden';
        }
      }
    });
  }

  function fixBanners(){
    document.querySelectorAll('img').forEach(fixImg);
    document.querySelectorAll('.cslide,[class*="slide"],[class*="banner"]').forEach(box=>{
      const img=box.querySelector?.('img');
      if(!img) return;
      const src=img.getAttribute('src')||'';
      if(isBad(src) || img.complete && img.naturalWidth===0){
        box.style.display='none';
        box.style.minHeight='0';
        box.style.height='0';
        box.style.margin='0';
        box.style.overflow='hidden';
      }else{
        box.style.overflow='hidden';
      }
    });
  }

  setInterval(fixBanners,700);
  document.addEventListener('DOMContentLoaded',fixBanners);
})();