(()=>{
  if(!location.search.includes('portal=')) return;
  let payload=null;
  const oldFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const res=await oldFetch(input,init);
    try{if(url.includes('/api/portal/')){const d=await res.clone().json();if(d&&d.condominio)payload=d;}}catch{}
    return res;
  };
  function items(){const a=payload?.config?.gestaoAcao;return Array.isArray(a)?a.filter(x=>x.publicadoPortal!==false):[]}
  function dateBR(v){try{return new Date(String(v).includes('T')?v:v+'T12:00:00').toLocaleDateString('pt-BR')}catch{return v||''}}
  function card(item){
    const c=document.createElement('div');c.style.cssText='background:#fff;color:#101828;border-radius:20px;padding:14px;margin:0 0 12px;box-shadow:0 12px 28px rgba(0,0,0,.18)';
    const h=document.createElement('div');h.textContent=item.titulo||'Registro da Gestão';h.style.cssText='font-size:15px;font-weight:900;margin-bottom:5px';c.appendChild(h);
    const m=document.createElement('div');m.textContent=(dateBR(item.data||item.createdAt))+(item.local?' • '+item.local:'');m.style.cssText='font-size:12px;color:#667085;margin-bottom:8px';c.appendChild(m);
    if(item.legenda){const p=document.createElement('div');p.textContent=item.legenda;p.style.cssText='font-size:13px;line-height:1.45;color:#344038;white-space:pre-wrap';c.appendChild(p)}
    (Array.isArray(item.fotos)?item.fotos:[]).slice(0,4).forEach(src=>{const img=document.createElement('img');img.src=src;img.style.cssText='width:100%;height:150px;object-fit:cover;border-radius:14px;margin-top:9px;background:#eef3ee';c.appendChild(img)});
    const s=document.createElement('span');s.textContent=item.status||'Concluído';s.style.cssText='display:inline-block;margin-top:10px;background:#dcfce7;color:#166534;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900';c.appendChild(s);return c;
  }
  function render(box){box.textContent='';const title=document.createElement('h2');title.textContent='Gestão em Ação';title.style.cssText='font-family:Sora,sans-serif;font-size:22px;font-weight:950;color:#fff;margin:0 0 6px';box.appendChild(title);const sub=document.createElement('p');sub.textContent='Acompanhe as ações realizadas pela administração do condomínio.';sub.style.cssText='font-size:13px;color:rgba(255,255,255,.75);margin:0 0 16px;line-height:1.45';box.appendChild(sub);const list=items();if(!list.length){const empty=document.createElement('div');empty.textContent='Nenhuma publicação da Gestão em Ação foi publicada ainda.';empty.style.cssText='background:#fff;color:#667085;border:1px dashed #d9e5d4;border-radius:18px;padding:18px;text-align:center;font-size:13px';box.appendChild(empty);return;}list.forEach(x=>box.appendChild(card(x)));}
  function ensureGestaoTitle(homeCard){
    const hasTitle=[...homeCard.querySelectorAll('div,span,strong,h1,h2,h3,p')].some(el=>(el.textContent||'').trim()==='Gestão em Ação');
    if(!hasTitle){
      const desc=[...homeCard.querySelectorAll('div,span,p')].find(el=>(el.textContent||'').includes('Acompanhe as ações'));
      if(desc){
        const title=document.createElement('div');
        title.textContent='Gestão em Ação';
        title.setAttribute('data-gestao-card-title','1');
        title.style.cssText='font-size:16px;font-weight:900;line-height:1.15;color:#0C140D;letter-spacing:-0.01em;margin:10px 0 6px;text-align:left';
        desc.parentElement.insertBefore(title,desc);
      }
    }
    [...homeCard.querySelectorAll('div,span,strong,h1,h2,h3,p')].forEach(el=>{if((el.textContent||'').trim()==='Gestão em Ação'){el.style.fontWeight='900';el.style.fontSize='16px';el.style.lineHeight='1.15';el.style.color='#0C140D';el.style.letterSpacing='-0.01em';el.style.marginBottom='6px';}})
  }
  function swapIcon(homeCard){const iconSvg=[...homeCard.querySelectorAll('svg')][0];if(!iconSvg)return;const iconWrap=iconSvg.parentElement;if(!iconWrap||iconWrap.dataset.clipboardIcon==='1')return;iconWrap.dataset.clipboardIcon='1';iconWrap.innerHTML='<span data-main-clipboard="1" aria-hidden="true" style="font-size:22px;line-height:1;color:#08783f">📋</span>';}
  function fixBanners(){document.querySelectorAll('img').forEach(img=>{const alt=(img.alt||'').toLowerCase();const near=((img.parentElement?.className||'')+' '+(img.parentElement?.parentElement?.className||'')).toLowerCase();if(alt.includes('seja')||alt.includes('banner')||near.includes('slide')||near.includes('banner')||near.includes('cslide')){img.loading='eager';img.style.display='block';img.style.width='100%';img.style.height='100%';img.style.objectFit='cover';img.style.opacity='1';img.style.visibility='visible';const box=img.closest('.cslide')||img.closest('[class*="slide"]')||img.parentElement;if(box){box.style.display='block';box.style.visibility='visible';box.style.opacity='1';box.style.overflow='hidden';box.style.minHeight='180px'}}})}
  function run(){fixBanners();const homeCard=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Transparência')||(b.textContent||'').includes('Gestão em Ação')||(b.textContent||'').includes('Acompanhe as ações'));if(homeCard){swapIcon(homeCard);if(homeCard.dataset.ga!=='1'){homeCard.dataset.ga='1';[...homeCard.querySelectorAll('div')].forEach(d=>{const t=(d.textContent||'').trim();if(t==='Transparência')d.textContent='Gestão em Ação';if(t.includes('receitas')||t.includes('despesas'))d.textContent='Acompanhe as ações realizadas pela administração.'});}ensureGestaoTitle(homeCard)}const h=[...document.querySelectorAll('h1,h2,h3')].find(x=>(x.textContent||'').trim()==='Transparência');if(!h)return;const box=h.closest('.fadeIn')||h.parentElement;if(box&&box.dataset.gaPage!=='1'){box.dataset.gaPage='1';render(box)}}
  setInterval(run,300);
})();