(()=>{
  const BACKEND='https://ta-na-mao-9bii.onrender.com';
  const absolute=value=>{
    const raw=String(value||'').trim();
    if(raw.startsWith('/uploads/')) return BACKEND+raw;
    if(raw.startsWith('uploads/')) return BACKEND+'/'+raw;
    return raw;
  };

  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    if(typeof input==='string') return nativeFetch(absolute(input),init);
    if(input instanceof Request){
      const url=absolute(input.url);
      if(url!==input.url) return nativeFetch(new Request(url,input),init);
    }
    return nativeFetch(input,init);
  };

  const nativeOpen=window.open.bind(window);
  window.open=function(url,...args){return nativeOpen(absolute(url),...args)};

  function patch(){
    document.querySelectorAll('img[src],a[href]').forEach(el=>{
      const attr=el.tagName==='IMG'?'src':'href';
      const current=el.getAttribute(attr)||'';
      const fixed=absolute(current);
      if(fixed!==current) el.setAttribute(attr,fixed);
    });
  }

  new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','href']});
  setInterval(patch,600);
})();