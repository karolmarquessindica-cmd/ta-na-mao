(()=>{
  if(new URLSearchParams(location.search).has('portal')) return;

  const API='https://ta-na-mao-9bii.onrender.com/api';
  const auth=()=>{const t=localStorage.getItem('tnm_token');return t?{Authorization:'Bearer '+t}:{}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const onlyDigits=v=>String(v||'').replace(/\D/g,'');
  let cache=[];

  async function request(path,options={}){
    const response=await fetch(API+path,{...options,headers:{...auth(),...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error||`Erro ${response.status}`);
    return body;
  }

  async function load(){
    try{
      const data=await request('/chamados?limit=200');
      cache=Array.isArray(data)?data:(Array.isArray(data.data)?data.data:(Array.isArray(data.items)?data.items:[]));
    }catch{}
  }

  function info(item){
    const descricao=String(item?.descricao||item?.resposta||'');
    const pick=label=>{
      const m=descricao.match(new RegExp(`${label}:\\s*([^\\n]+)`,'i'));
      return m?m[1].trim():'';
    };
    const morador=item?.morador||{};
    return {
      nome:pick('Nome')||morador.nome||item?.nomeMorador||'Portal do Morador',
      whatsapp:pick('WhatsApp')||morador.whatsapp||morador.telefone||item?.whatsapp||item?.telefone||'',
      apartamento:pick('Apartamento')||morador.apartamento||morador.unidade||item?.apartamento||'',
      bloco:pick('Bloco')||morador.bloco||item?.bloco||'',
      local:pick('Local informado')||item?.local||'',
      condominio:item?.condominio?.nome||item?.condominioNome||'Condomínio não identificado',
      descricao:descricao.replace(/Dados do morador:[\s\S]*/i,'').trim()||'Sem descrição registrada.'
    };
  }

  function whatsappUrl(item){
    const data=info(item);
    let numero=onlyDigits(data.whatsapp);
    if(!numero) return '';
    if(!numero.startsWith('55')) numero='55'+numero;
    const protocolo=String(item.id||'').slice(0,8).toUpperCase();
    const texto=`Olá, ${data.nome}! Recebemos seu chamado no ${data.condominio}: ${item.titulo||'Chamado'}. Protocolo: ${protocolo}.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  function anexos(item){
    return [item?.fotos,item?.anexos,item?.imagens,item?.arquivos].flat().filter(Boolean).map((a,i)=>typeof a==='string'?{url:a,nome:`Anexo ${i+1}`}:{url:a.url||a.fileUrl||a.path,nome:a.nome||a.fileName||`Anexo ${i+1}`}).filter(a=>a.url);
  }

  function ensureCss(){
    if(document.getElementById('tnm-chamados-modal-css')) return;
    const s=document.createElement('style');
    s.id='tnm-chamados-modal-css';
    s.textContent=`
      .tnm-ver-detalhes{margin-left:7px!important;white-space:nowrap}
      #tnm-chamado-modal{position:fixed;inset:0;z-index:2147483000;background:rgba(0,21,11,.58);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',Arial,sans-serif}
      #tnm-chamado-modal *{box-sizing:border-box}
      .tnm-modal-box{width:min(980px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;box-shadow:0 28px 90px rgba(0,21,11,.30)}
      .tnm-modal-head{background:linear-gradient(135deg,#003b24,#08783f);color:#fff;padding:20px 22px;display:flex;justify-content:space-between;gap:16px}
      .tnm-modal-close{width:36px;height:36px;border:0;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:22px;cursor:pointer}
      .tnm-modal-body{padding:20px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,.7fr);gap:16px}
      .tnm-card{border:1px solid #dde7de;border-radius:16px;padding:16px;background:#fff;margin-bottom:12px}
      .tnm-card h3{margin:0 0 12px;color:#003b24;font-size:15px}
      .tnm-description{white-space:pre-wrap;line-height:1.6;font-size:14px}
      .tnm-meta{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .tnm-meta div{background:#f5f8f3;border-radius:10px;padding:10px;font-size:13px}
      .tnm-meta b{display:block;color:#68766d;font-size:11px;margin-bottom:3px}
      .tnm-wa,.tnm-save{width:100%;display:flex;align-items:center;justify-content:center;border:0;border-radius:12px;padding:12px 14px;font-weight:800;text-decoration:none;cursor:pointer;background:#16a34a;color:#fff;font-size:14px}
      .tnm-wa.disabled{background:#b8c4bc;pointer-events:none}
      .tnm-status{width:100%;margin:10px 0;padding:11px;border:1px solid #dde7de;border-radius:11px;background:#fff}
      .tnm-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:9px}
      .tnm-files a{border:1px solid #dde7de;border-radius:11px;padding:10px;text-decoration:none;color:#003b24;font-size:12px}
      @media(max-width:760px){#tnm-chamado-modal{padding:8px;align-items:flex-end}.tnm-modal-box{max-height:95vh;border-radius:20px 20px 0 0}.tnm-modal-body{grid-template-columns:1fr}.tnm-meta{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  function closeModal(){document.getElementById('tnm-chamado-modal')?.remove()}

  function openModal(item){
    ensureCss();
    closeModal();
    const data=info(item);
    const wa=whatsappUrl(item);
    const files=anexos(item);
    const modal=document.createElement('div');
    modal.id='tnm-chamado-modal';
    modal.innerHTML=`
      <div class="tnm-modal-box" role="dialog" aria-modal="true">
        <div class="tnm-modal-head">
          <div><div style="font-size:12px;opacity:.82;font-weight:800">CHAMADO #${esc(String(item.id||'').slice(0,8).toUpperCase())}</div><h2 style="margin:5px 0 4px;font-size:21px">${esc(item.titulo||'Chamado')}</h2><div style="font-size:13px;opacity:.88">${esc(data.condominio)}</div></div>
          <button class="tnm-modal-close" aria-label="Fechar">×</button>
        </div>
        <div class="tnm-modal-body">
          <div>
            <div class="tnm-card"><h3>Descrição completa</h3><div class="tnm-description">${esc(data.descricao)}</div></div>
            ${files.length?`<div class="tnm-card"><h3>Fotos e anexos</h3><div class="tnm-files">${files.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.nome)}</a>`).join('')}</div></div>`:''}
          </div>
          <div>
            <div class="tnm-card"><h3>Dados do morador</h3><div class="tnm-meta"><div><b>Nome</b>${esc(data.nome)}</div><div><b>WhatsApp</b>${esc(data.whatsapp||'—')}</div><div><b>Bloco</b>${esc(data.bloco||'—')}</div><div><b>Apartamento</b>${esc(data.apartamento||'—')}</div><div style="grid-column:1/-1"><b>Local informado</b>${esc(data.local||'—')}</div></div></div>
            <div class="tnm-card"><h3>Atendimento</h3><a class="tnm-wa ${wa?'':'disabled'}" ${wa?`href="${esc(wa)}" target="_blank" rel="noopener"`:''}>Responder no WhatsApp</a><select class="tnm-status"><option value="ABERTO">Aberto</option><option value="EM_ANALISE">Em análise</option><option value="CONCLUIDO">Concluído</option></select><button class="tnm-save">Salvar status</button></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const status=modal.querySelector('.tnm-status');
    status.value=item.status||'ABERTO';
    modal.querySelector('.tnm-modal-close').addEventListener('click',closeModal);
    modal.addEventListener('click',e=>{if(e.target===modal) closeModal()});
    modal.querySelector('.tnm-save').addEventListener('click',async e=>{
      const b=e.currentTarget;b.disabled=true;b.textContent='Salvando...';
      try{
        await request(`/chamados/${item.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:status.value})});
        item.status=status.value;b.textContent='Status salvo ✓';setTimeout(()=>location.reload(),650);
      }catch(err){b.disabled=false;b.textContent='Tentar novamente';alert(err.message)}
    });
  }

  function findItem(tr,index){
    const first=tr.querySelector('td');
    const titleNode=first?.childNodes?.[0];
    const title=normalize(titleNode?.textContent||first?.textContent||'');
    return cache.find(c=>normalize(c.titulo)===title)||cache[index]||null;
  }

  function patch(){
    const h=[...document.querySelectorAll('h1')].find(x=>normalize(x.textContent).includes('central de chamados'));
    if(!h) return;
    const page=h.closest('.page')||document;
    page.querySelectorAll('table tbody tr').forEach((tr,index)=>{
      const item=findItem(tr,index);
      if(!item) return;
      const first=tr.querySelector('td');
      if(first&&!tr.dataset.descOk){
        tr.dataset.descOk='1';
        const data=info(item);
        const local=[data.bloco,data.apartamento].filter(Boolean).join(' - ');
        const box=document.createElement('div');
        box.style.cssText='margin-top:7px;font-size:12px;line-height:1.45;color:#68766d;background:#f5f8f3;border:1px solid #dde7de;border-radius:10px;padding:8px;max-width:420px;white-space:normal';
        box.innerHTML='<b style="color:#003b24">Reclamação do morador:</b> '+esc(data.descricao)+(local?'<br><span>Local: '+esc(local)+'</span>':'');
        first.appendChild(box);
      }
      const action=tr.querySelector('td:last-child');
      if(action&&!action.querySelector('.tnm-ver-detalhes')){
        const btn=document.createElement('button');
        btn.type='button';btn.className='btn btn-ghost btn-xs tnm-ver-detalhes';btn.textContent='Ver detalhes';
        btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openModal(item)});
        action.appendChild(btn);
      }
    });
  }

  async function run(){await load();patch()}
  ensureCss();
  setInterval(patch,1000);
  document.addEventListener('click',()=>setTimeout(run,500),true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  run();
})();