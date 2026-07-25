(()=>{
  if(location.search.includes('portal=')) return;
  const API='https://ta-na-mao-9bii.onrender.com/api';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token=()=>localStorage.getItem('tnm_token')||'';
  const headers=()=>token()?{Authorization:'Bearer '+token()}:{};
  const list=v=>Array.isArray(v)?v:Array.isArray(v?.data)?v.data:Array.isArray(v?.items)?v.items:[];
  const monthNow=()=>new Date().toISOString().slice(0,7);
  const dateBR=v=>{if(!v)return'';try{return new Date(String(v).includes('T')?v:v+'T12:00:00').toLocaleDateString('pt-BR')}catch{return v}};
  async function condos(){const r=await fetch(API+'/condominios?limit=200',{headers:headers()});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Não foi possível carregar os condomínios.');return list(d)}
  function posts(c){const remote=c?.portalConfig?.portalMorador?.gestaoAcao||c?.portalConfig?.gestaoAcao;let local=[];try{local=JSON.parse(localStorage.getItem('tnm_gestao_acao_feed_'+c.id)||'[]')}catch{}return Array.isArray(remote)&&remote.length?remote:local}
  function address(c){return [c.endereco,c.cidade,c.estado].filter(Boolean).join(' - ')||'Endereço não informado'}
  function monthLabel(m){if(!m)return'';const [y,mo]=m.split('-').map(Number);return new Date(y,mo-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
  function classify(items){const n=x=>String(x?.categoria||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return{acoes:items.length,visitas:items.filter(x=>n(x).includes('vistoria')||n(x).includes('visita')).length}}
  function statusClass(status){const s=String(status||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(s.includes('conclu'))return'done';if(s.includes('andamento'))return'progress';if(s.includes('terceir'))return'waiting';return'neutral'}
  function printReport(c,m,items){
    const s=classify(items), fotos=items.reduce((a,x)=>a+(Array.isArray(x.fotos)?x.fotos.length:0),0);
    const cards=items.map((x,i)=>{
      const all=Array.isArray(x.fotos)?x.fotos.filter(Boolean):[];
      const shown=all.slice(0,4);
      const imgs=shown.map((src,j)=>`<figure><img src="${esc(src)}" alt="Foto ${j+1} da ação ${i+1}"><figcaption>Foto ${j+1}</figcaption></figure>`).join('');
      const extra=all.length>4?`<div class="more">+${all.length-4} foto${all.length-4===1?'':'s'} disponível${all.length-4===1?'':'is'} no sistema</div>`:'';
      return `<article class="post"><div class="post-head"><div><div class="date">${esc(dateBR(x.data||x.createdAt))}</div><h2>${esc(x.titulo||'Registro da Gestão')}</h2></div><span class="status ${statusClass(x.status)}">${esc(x.status||'Sem status')}</span></div>${imgs?`<div class="photos">${imgs}</div>${extra}`:'<div class="no-photo">Sem foto registrada</div>'}</article>`
    }).join('');
    const w=window.open('','_blank');if(!w){alert('Permita pop-ups para gerar o relatório.');return;}
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Gestão em Ação - ${esc(c.nome)}</title><style>
      @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172019;margin:0;background:#fff}
      .header{border:1px solid #dfe7df;border-top:7px solid #08783f;padding:16px 18px 14px;margin-bottom:14px}
      .brand{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#08783f}.header h1{font-size:24px;margin:7px 0 3px}.period{font-size:14px;font-weight:700;color:#526057}
      .details{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;margin-top:12px}.detail{border-top:1px solid #e4ebe4;padding-top:7px;font-size:11px;line-height:1.35}.detail b{display:block;color:#08783f;margin-bottom:2px}
      .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.stat{border:1px solid #dfe7df;padding:9px 11px}.stat b{display:block;font-size:20px;color:#08783f}.stat span{font-size:10px;color:#647067}
      .post{border:1px solid #dfe7df;margin:0 0 12px;padding:11px;break-inside:avoid;page-break-inside:avoid}.post-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:9px}.date{font-size:10px;color:#68766d;margin-bottom:3px}.post h2{font-size:15px;line-height:1.25;margin:0}.status{white-space:nowrap;border-radius:999px;padding:4px 8px;font-size:9px;font-weight:800}.done{background:#dcfce7;color:#166534}.progress{background:#fef3c7;color:#92400e}.waiting{background:#dbeafe;color:#1d4ed8}.neutral{background:#eef2f1;color:#475569}
      .photos{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.photos figure{margin:0;border:1px solid #e5ebe5;padding:4px}.photos img{display:block;width:100%;height:118px;object-fit:cover}.photos figcaption{font-size:8px;color:#778279;margin-top:3px}.more,.no-photo{font-size:9px;color:#68766d;margin-top:6px}.no-photo{border:1px dashed #d3ddd3;padding:12px;text-align:center}
      .empty{text-align:center;padding:28px;border:1px dashed #cfdccf;color:#667085}.footer{font-size:9px;color:#68766d;text-align:center;margin-top:12px}
      @media print{.header{print-color-adjust:exact;-webkit-print-color-adjust:exact}.status,.stat{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><section class="header"><div class="brand">Tá na Mão • Gestão Condominial</div><h1>Relatório Fotográfico — Gestão em Ação</h1><div class="period">${esc(monthLabel(m))}</div><div class="details"><div class="detail"><b>Condomínio</b>${esc(c.nome)}</div><div class="detail"><b>Endereço</b>${esc(address(c))}</div></div></section><section class="stats"><div class="stat"><b>${s.acoes}</b><span>Ações registradas</span></div><div class="stat"><b>${s.visitas}</b><span>Visitas e vistorias</span></div><div class="stat"><b>${fotos}</b><span>Fotos registradas</span></div></section>${cards||'<div class="empty">Nenhuma postagem registrada neste período.</div>'}<div class="footer">Relatório gerado automaticamente pelo Tá na Mão Gestão Condominial</div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
  }
  async function modal(){
    document.querySelector('[data-ga-report-modal]')?.remove();
    const all=await condos().catch(e=>{alert(e.message);return[]});if(!all.length)return;
    const ov=document.createElement('div');ov.dataset.gaReportModal='1';ov.style.cssText='position:fixed;inset:0;background:rgba(2,18,10,.55);z-index:100100;display:flex;align-items:center;justify-content:center;padding:16px';
    const box=document.createElement('div');box.style.cssText='width:min(520px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.28)';ov.appendChild(box);document.body.appendChild(ov);
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:18px"><div><div style="font-size:22px;font-weight:950;color:#0c140d">Relatório Gestão em Ação</div><div style="font-size:13px;color:#68766d;margin-top:4px">Escolha o condomínio e o mês do relatório.</div></div><button data-close style="width:38px;height:38px;border:0;border-radius:999px;background:#eef6ef;font-size:23px">×</button></div><div class="fg"><label>Condomínio</label><select data-condo></select></div><div class="fg"><label>Mês de referência</label><input data-month type="month"></div><button data-generate class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px">📋 Gerar relatório mensal</button>';
    const sel=box.querySelector('[data-condo]');all.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;sel.appendChild(o)});box.querySelector('[data-month]').value=monthNow();box.querySelector('[data-close]').onclick=()=>ov.remove();
    box.querySelector('[data-generate]').onclick=()=>{const c=all.find(x=>x.id===sel.value),m=box.querySelector('[data-month]').value;if(!c||!m){alert('Selecione o condomínio e o mês.');return;}const filtered=posts(c).filter(x=>String(x.data||x.createdAt||'').slice(0,7)===m).sort((a,b)=>String(a.data||'').localeCompare(String(b.data||'')));printReport(c,m,filtered)};
  }
  function addCard(){
    const h=[...document.querySelectorAll('h1,h2')].find(x=>(x.textContent||'').trim()==='Relatórios');if(!h||document.querySelector('[data-ga-report-card]'))return;
    const buttons=[...document.querySelectorAll('button')].filter(b=>/Gerar PDF/i.test(b.textContent||''));if(!buttons.length)return;
    const grid=buttons[0].closest('.card')?.parentElement||buttons[0].parentElement?.parentElement?.parentElement;if(!grid)return;
    const card=document.createElement('div');card.dataset.gaReportCard='1';card.className='card';card.style.cssText='padding:18px;display:flex;flex-direction:column;justify-content:space-between;min-height:184px';card.innerHTML='<div><div style="font-size:30px;margin-bottom:10px">📋</div><div style="font-weight:900;color:#101828;margin-bottom:6px">Gestão em Ação</div><div style="font-size:13px;color:#68766d;line-height:1.4">Relatório fotográfico compacto com título, status e fotos.</div></div><button data-open class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px">📄 Gerar PDF</button>';card.querySelector('[data-open]').onclick=modal;grid.appendChild(card);
  }
  setInterval(addCard,700);
})();