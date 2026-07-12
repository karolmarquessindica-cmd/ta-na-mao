(()=>{
  const OLD='https://ta-na-mao-wine.vercel.app';
  const OFFICIAL='https://tanamao.tonocondominio.com.br';

  function officialize(value=''){
    return String(value).replaceAll(OLD,OFFICIAL);
  }

  function replaceText(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(node.nodeValue?.includes(OLD)) node.nodeValue=officialize(node.nodeValue);
    });

    document.querySelectorAll('input,textarea').forEach(el=>{
      if(String(el.value||'').includes(OLD)) el.value=officialize(el.value);
      if(String(el.placeholder||'').includes(OLD)) el.placeholder=officialize(el.placeholder);
    });

    document.querySelectorAll('a[href]').forEach(a=>{
      if(a.href.includes('ta-na-mao-wine.vercel.app')) a.href=officialize(a.href);
    });
  }

  function portalLinkNear(button){
    const scope=button.closest('.card,[class*="card"],section,article,div')||document;
    const text=scope.innerText||'';
    const match=text.match(/https:\/\/(?:ta-na-mao-wine\.vercel\.app|tanamao\.tonocondominio\.com\.br)[^\s]*/i);
    return officialize(match?.[0]||'');
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('button,a');
    if(!button) return;
    const label=(button.textContent||'').trim().toLowerCase();
    if(!['copiar link','visualizar portal','gerar qr code','baixar qr code'].some(x=>label.includes(x))) return;
    const link=portalLinkNear(button);
    if(!link) return;

    if(label.includes('copiar link')){
      event.preventDefault();
      event.stopImmediatePropagation();
      try{await navigator.clipboard.writeText(link);alert('Link oficial copiado.');}
      catch{prompt('Copie o link oficial:',link);}
      return;
    }

    if(label.includes('visualizar portal')){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(link,'_blank','noopener,noreferrer');
    }
  },true);

  const observer=new MutationObserver(()=>replaceText());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','value','placeholder']});
  document.addEventListener('DOMContentLoaded',()=>replaceText());
  setInterval(replaceText,1000);
})();