(()=>{
  const params=new URLSearchParams(location.search);
  if(params.has('portal')) return;

  const slug=location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
  const reserved=new Set(['','login','admin','api','assets','brand','favicon.svg','definir-senha.html']);
  if(!slug||reserved.has(slug.toLowerCase())||slug.includes('.')) return;

  window.__TNM_PRETTY_PORTAL__={slug,path:location.pathname};
  history.replaceState(history.state,'',`/?portal=${encodeURIComponent(slug)}`);

  const restore=()=>{
    const pretty=window.__TNM_PRETTY_PORTAL__;
    if(!pretty) return;
    history.replaceState(history.state,'',pretty.path);
  };
  window.addEventListener('load',()=>setTimeout(restore,1400));
})();