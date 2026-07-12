(()=>{
  const OLD='https://ta-na-mao-wine.vercel.app';
  const SITE='https://tonocondominio.com.br';
  const OFFICIAL='https://tanamao.tonocondominio.com.br';

  function officialize(value=''){
    let next=String(value).replaceAll(OLD,OFFICIAL);
    next=next.replace(/^https:\/\/tonocondominio\.com\.br(?=\/\?execucao=)/i,OFFICIAL);
    return next;
  }

  const nativeWriteText=navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if(nativeWriteText){
    navigator.clipboard.writeText=value=>nativeWriteText(officialize(value));
  }

  const nativeOpen=window.open.bind(window);
  window.open=(url,...args)=>nativeOpen(officialize(url),...args);

  function extractPortalLink(){
    const candidates=[];
    document.querySelectorAll('input,textarea,a[href]').forEach(el=>{
      candidates.push(el.value||'',el.placeholder||'',el.href||'');
    });
    candidates.push(document.body.innerText||'');
    for(const value of candidates){
      const match=String(value).match(/https:\/\/(?:ta-na-mao-wine\.vercel\.app|tanamao\.tonocondominio\.com\.br)(?:\/[^\s"'<>]*)?/i);
      if(match) return officialize(match[0].replace(/[),.;]+$/,''));
    }
    const token=new URLSearchParams(location.search).get('portal');
    return token?`${OFFICIAL}/?portal=${encodeURIComponent(token)}`:'';
  }

  function replaceText(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(node.nodeValue?.includes(OLD)||node.nodeValue?.includes(`${SITE}/?execucao=`)) node.nodeValue=officialize(node.nodeValue);
    });

    document.querySelectorAll('input,textarea').forEach(el=>{
      if(String(el.value||'').includes(OLD)||String(el.value||'').includes(`${SITE}/?execucao=`)) el.value=officialize(el.value);
      if(String(el.placeholder||'').includes(OLD)||String(el.placeholder||'').includes(`${SITE}/?execucao=`)) el.placeholder=officialize(el.placeholder);
    });

    document.querySelectorAll('a[href]').forEach(a=>{
      const next=officialize(a.href);
      if(next!==a.href) a.href=next;
    });
  }

  function downloadQr(link){
    const qr=`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`;
    const a=document.createElement('a');
    a.href=qr;
    a.download='qr-code-portal-morador.png';
    a.target='_blank';
    a.rel='noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('button,a');
    if(!button) return;
    const label=(button.textContent||'').trim().toLowerCase();
    if(!['copiar link','visualizar portal','gerar qr code','baixar qr code'].some(x=>label.includes(x))) return;

    const link=extractPortalLink();
    if(!link) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if(label.includes('copiar link')){
      try{await navigator.clipboard.writeText(link);alert('Link oficial copiado.');}
      catch{prompt('Copie o link oficial:',link);}
      return;
    }

    if(label.includes('visualizar portal')){
      window.open(link,'_blank','noopener,noreferrer');
      return;
    }

    if(label.includes('qr code')) downloadQr(link);
  },true);

  const observer=new MutationObserver(()=>replaceText());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','value','placeholder']});
  document.addEventListener('DOMContentLoaded',()=>replaceText());
  setInterval(replaceText,1000);
})();