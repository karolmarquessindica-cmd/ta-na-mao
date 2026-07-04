(()=>{
 const isPortalPublic=location.search.includes('portal=');
 let currentCondoId='';
 const NB_PREFIX='tnm_notebooklm_';
 function key(id=currentCondoId){return NB_PREFIX+(id||'current')}
 function saveNotebook(id,url){if(id&&url!==undefined)localStorage.setItem(key(id),url||'')}
 function readNotebook(id=currentCondoId){return localStorage.getItem(key(id))||''}
 function validUrl(url){return /^https?:\/\//i.test(String(url||'').trim())}
 const originalFetch=window.fetch.bind(window);
 window.fetch=async function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  const method=String((init&&init.method)||'GET').toUpperCase();
  const m=url.match(/\/api\/condominios\/([^/]+)\/portal-config/);
  if(m){currentCondoId=m[1]}
  let nextInit=init;
  if(m&&method==='PUT'&&init&&typeof init.body==='string'){
   try{
    const body=JSON.parse(init.body);
    const stored=readNotebook(m[1]).trim();
    if(stored){
     if(body.config){body.config.portalMorador={...(body.config.portalMorador||{}),notebookLmUrl:stored,iaExternaUrl:stored}}
     else if(body.portalMorador){body.portalMorador={...(body.portalMorador||{}),notebookLmUrl:stored,iaExternaUrl:stored}}
     else{body.portalMorador={...(body.portalMorador||{}),notebookLmUrl:stored,iaExternaUrl:stored}}
     nextInit={...init,body:JSON.stringify(body)};
    }
   }catch{}
  }
  const res=await originalFetch(input,nextInit);
  try{
   const clone=res.clone();
   const data=await clone.json();
   if(m&&data?.config?.portalMorador){
    const p=data.config.portalMorador;
    saveNotebook(m[1],p.notebookLmUrl||p.iaExternaUrl||'');
   }
   if(/\/api\/portal\//.test(url)&&data?.config){
    window.__TNM_NOTEBOOKLM_URL=data.config.notebookLmUrl||data.config.iaExternaUrl||data.config.notebookUrl||'';
   }
  }catch{}
  return res;
 };
 const dados={nome:'',whatsapp:'',apartamento:'',bloco:''};
 function input(label,keyName,ph){const w=document.createElement('div');w.className='fg';const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.placeholder=ph;i.oninput=()=>dados[keyName]=i.value.trim();w.append(l,i);return w}
 function setVal(el,v){const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value');d&&d.set?d.set.call(el,v):el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))}
 function addText(root){const a=root.querySelector('textarea');if(!a)return;const l=[];if(dados.nome)l.push('Nome: '+dados.nome);if(dados.whatsapp)l.push('WhatsApp: '+dados.whatsapp);if(dados.apartamento)l.push('Apartamento: '+dados.apartamento);if(dados.bloco)l.push('Bloco: '+dados.bloco);if(!l.length)return;const t=a.value||'';if(t.includes('Dados do morador:'))return;setVal(a,(t+'\n\nDados do morador:\n'+l.join('\n')).trim())}
 function root(){const labels=[...document.querySelectorAll('label')];const cat=labels.find(x=>(x.textContent||'').trim().toLowerCase()==='categoria');const block=cat&&cat.closest('.fg');return block&&block.parentElement}
 function runTickets(){if(!isPortalPublic)return;const r=root();if(!r||r.querySelector('[data-ticket-resident-fields]'))return;const cat=[...r.querySelectorAll('label')].find(x=>(x.textContent||'').trim().toLowerCase()==='categoria');const block=cat&&cat.closest('.fg');if(!block)return;const box=document.createElement('div');box.dataset.ticketResidentFields='1';box.style.cssText='background:#F2FAF1;border:1px solid #DDE7DE;border-radius:14px;padding:12px;margin-bottom:12px';const title=document.createElement('div');title.textContent='Dados do morador';title.style.cssText='font-weight:900;color:#003B24;font-size:13px;margin-bottom:9px';box.appendChild(title);const r1=document.createElement('div');r1.className='row2';r1.append(input('Nome','nome','Nome do morador'),input('WhatsApp','whatsapp','(85) 99999-9999'));box.appendChild(r1);const r2=document.createElement('div');r2.className='row2';r2.append(input('Apartamento','apartamento','Ex: 101'),input('Bloco','bloco','Ex: A'));box.appendChild(r2);block.parentNode.insertBefore(box,block);[...r.querySelectorAll('button')].forEach(b=>{if((b.textContent||'').toLowerCase().includes('enviar chamado')){b.addEventListener('pointerdown',()=>addText(r),true);b.addEventListener('click',()=>addText(r),true)}})}
 function runBannerFix(){if(!isPortalPublic)return;const slides=[...document.querySelectorAll('.cslide')];if(!slides.length)return;const wrap=slides[0].parentElement;const home=wrap&&wrap.parentElement;if(home&&wrap&&home.firstElementChild!==wrap)home.insertBefore(wrap,home.firstElementChild);if(wrap)wrap.style.marginBottom='16px';slides.forEach(sl=>{sl.style.width='100%';sl.style.display=sl.classList.contains('on')?'block':'none';const btn=sl.querySelector('button');if(btn){btn.style.height='auto';btn.style.aspectRatio='1450 / 820';btn.style.minHeight='0';btn.style.borderRadius='22px';btn.style.background='transparent';btn.style.boxShadow='0 12px 30px rgba(1,23,12,.14)';[...btn.children].forEach(ch=>{if(ch.tagName!=='IMG')ch.style.display='none'})}const img=sl.querySelector('img');if(img){img.style.width='100%';img.style.height='100%';img.style.objectFit='cover';img.style.objectPosition='center';img.style.display='block';img.style.filter='none';img.style.opacity='1';img.onerror=()=>{if(!sessionStorage.getItem('tnm_banner_reload')){sessionStorage.setItem('tnm_banner_reload','1');location.reload()}}}})}
 function runNotebookAdminField(){
  if(isPortalPublic)return;
  const modal=[...document.querySelectorAll('.modal')].find(x=>(x.textContent||'').includes('Portal do Morador'));
  if(!modal||modal.querySelector('[data-notebooklm-field]'))return;
  const box=document.createElement('div');box.dataset.notebooklmField='1';box.className='fg';box.style.cssText='background:#F2FAF1;border:1px solid #DDE7DE;border-radius:14px;padding:12px;margin:12px 0';
  const lab=document.createElement('label');lab.textContent='Link do NotebookLM / IA externa';
  const inp=document.createElement('input');inp.type='url';inp.placeholder='https://notebooklm.google.com/...';inp.value=readNotebook();inp.style.marginTop='6px';
  const help=document.createElement('div');help.textContent='Quando o morador clicar em Assistente IA, este link será aberto em uma nova aba.';help.style.cssText='font-size:12px;color:#68766D;margin-top:6px;line-height:1.35';
  inp.addEventListener('input',()=>saveNotebook(currentCondoId,inp.value.trim()));
  box.append(lab,inp,help);
  const firstCard=modal.querySelector('.card')||modal.querySelector('.modal-bd')||modal;
  firstCard.prepend(box);
 }
 function runNotebookPublicButton(){
  if(!isPortalPublic)return;
  const url=(window.__TNM_NOTEBOOKLM_URL||'').trim();
  const buttons=[...document.querySelectorAll('button')].filter(b=>(b.textContent||'').toLowerCase().includes('assistente ia'));
  buttons.forEach(btn=>{
   if(btn.dataset.notebookHandler)return;btn.dataset.notebookHandler='1';
   btn.addEventListener('click',ev=>{const link=(window.__TNM_NOTEBOOKLM_URL||'').trim();if(validUrl(link)){ev.preventDefault();ev.stopImmediatePropagation();window.open(link,'_blank','noopener,noreferrer')}},true);
  });
 }
 setInterval(()=>{runTickets();runBannerFix();runNotebookAdminField();runNotebookPublicButton()},300);
 document.addEventListener('click',()=>setTimeout(()=>{runTickets();runBannerFix();runNotebookAdminField();runNotebookPublicButton()},80),true);
 document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{runBannerFix();runNotebookAdminField();runNotebookPublicButton()},300));
})();