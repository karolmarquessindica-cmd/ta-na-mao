(()=>{
 if(new URLSearchParams(location.search).has('portal'))return;
 const API='https://ta-na-mao-9bii.onrender.com/api';
 const H=()=>{const t=localStorage.getItem('tnm_token');return t?{Authorization:'Bearer '+t}:{}};
 const esc=v=>String(v||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 let cache=[];
 async function load(){try{const r=await fetch(API+'/chamados?limit=200',{headers:H()});const d=await r.json();cache=Array.isArray(d)?d:(Array.isArray(d.data)?d.data:[])}catch{}}
 function patch(){
  const h=[...document.querySelectorAll('h1')].find(x=>(x.textContent||'').toLowerCase().includes('central de chamados'));
  if(!h)return;
  document.querySelectorAll('table tbody tr').forEach(tr=>{
   if(tr.dataset.descOk)return;
   const td=tr.querySelector('td'); if(!td)return;
   const title=(td.textContent||'').trim();
   const item=cache.find(c=>(c.titulo||'').trim()===title);
   if(!item)return;
   tr.dataset.descOk='1';
   const desc=item.descricao||item.resposta||'';
   const local=[item.morador?.bloco,item.morador?.unidade].filter(Boolean).join(' - ');
   const box=document.createElement('div');
   box.style.cssText='margin-top:7px;font-size:12px;line-height:1.45;color:#68766d;background:#f5f8f3;border:1px solid #dde7de;border-radius:10px;padding:8px;max-width:420px;white-space:normal';
   box.innerHTML='<b style="color:#003b24">Reclamação do morador:</b> '+(desc?esc(desc):'Sem descrição registrada.')+(local?'<br><span>Local: '+esc(local)+'</span>':'');
   td.appendChild(box);
  });
 }
 async function run(){await load();patch()}
 setInterval(patch,1500);
 document.addEventListener('click',()=>setTimeout(run,600),true);
 run();
})();
