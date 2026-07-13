(()=>{
  const OLD='https://ta-na-mao-wine.vercel.app';
  const OFFICIAL='https://tanamao.tonocondominio.com.br';

  function executionTokenFrom(value=''){
    const raw=String(value||'');
    const query=raw.match(/[?&]execucao=([^&#\s"'<>]+)/i);
    if(query) return decodeURIComponent(query[1]);
    const path=raw.match(/\/execucao\/([^/?#\s"'<>]+)/i);
    return path?decodeURIComponent(path[1]):'';
  }

  function officialize(value=''){
    const raw=String(value||'');
    const token=executionTokenFrom(raw);
    if(token) return `${OFFICIAL}/execucao/${encodeURIComponent(token)}`;
    return raw.replaceAll(OLD,OFFICIAL)
      .replace(/^https:\/\/(?:www\.)?tonocondominio\.com\.br/i,OFFICIAL);
  }

  const nativeWriteText=navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if(nativeWriteText) navigator.clipboard.writeText=value=>nativeWriteText(officialize(value));

  const nativeOpen=window.open.bind(window);
  window.open=(url,...args)=>nativeOpen(officialize(url),...args);

  function candidatesNear(button){
    const row=button.closest('tr,[role="row"],article,.card,[class*="card"],section')||button.parentElement?.parentElement||document;
    const values=[];
    row.querySelectorAll?.('input,textarea,a[href],[data-link],[data-url]')?.forEach(el=>{
      values.push(el.value||'',el.href||'',el.dataset?.link||'',el.dataset?.url||'');
    });
    values.push(row.innerText||'',document.body.innerText||'');
    return values;
  }

  function executionLinkNear(button){
    for(const value of candidatesNear(button)){
      const token=executionTokenFrom(value);
      if(token) return `${OFFICIAL}/execucao/${encodeURIComponent(token)}`;
    }
    return '';
  }

  function portalLinkNear(button){
    for(const value of candidatesNear(button)){
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
      const next=officialize(node.nodeValue||'');
      if(next!==node.nodeValue) node.nodeValue=next;
    });

    document.querySelectorAll('input,textarea').forEach(el=>{
      const value=officialize(el.value||'');
      if(value!==el.value) el.value=value;
      const placeholder=officialize(el.placeholder||'');
      if(placeholder!==el.placeholder) el.placeholder=placeholder;
    });

    document.querySelectorAll('a[href]').forEach(a=>{
      const next=officialize(a.href);
      if(next!==a.href) a.href=next;
    });
  }

  function downloadQr(link){
    const qr=`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`;
    const a=document.createElement('a');
    a.href=qr;a.download='qr-code.png';a.target='_blank';a.rel='noopener noreferrer';
    document.body.appendChild(a);a.click();a.remove();
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('button,a');
    if(!button) return;
    const label=(button.textContent||'').trim().toLowerCase();
    const isExecution=['enviar para execução','enviar para execucao','copiar link','qr code','abrir'].some(x=>label.includes(x)) && Boolean(button.closest('tr,[role="row"],article,[class*="manut"],.card'));
    const isPortal=['visualizar portal','gerar qr code','baixar qr code'].some(x=>label.includes(x));
    if(!isExecution&&!isPortal) return;

    const link=isExecution?executionLinkNear(button):portalLinkNear(button);
    if(!link) return;

    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();

    if(label.includes('copiar')){
      try{await navigator.clipboard.writeText(link);alert('Link copiado.');}
      catch{prompt('Copie o link:',link);}
      return;
    }
    if(label.includes('qr code')){downloadQr(link);return;}
    window.open(link,'_blank','noopener,noreferrer');
  },true);

  const observer=new MutationObserver(()=>replaceText());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','value','placeholder']});
  document.addEventListener('DOMContentLoaded',()=>replaceText());
  setInterval(replaceText,1000);
})();