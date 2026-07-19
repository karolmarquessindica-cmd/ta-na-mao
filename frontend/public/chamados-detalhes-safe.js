(()=>{
  if(location.search.includes('portal=')) return;

  const API='https://ta-na-mao-1.onrender.com/api';
  const MARK='data-tnm-chamado-detalhes';
  let tickets=[];
  let loading=null;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const list=value=>Array.isArray(value)?value:(Array.isArray(value?.data)?value.data:(Array.isArray(value?.items)?value.items:[]));
  const token=()=>localStorage.getItem('tnm_token');
  const api=async(path,options={})=>{
    const authToken=token();
    const response=await fetch(API+path,{
      ...options,
      headers:{
        ...(authToken?{Authorization:`Bearer ${authToken}`} : {}),
        ...(options.headers||{})
      }
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error||`Erro ${response.status}`);
    return body;
  };
  const date=value=>value?new Date(value).toLocaleString('pt-BR'):'—';
  const phone=value=>String(value||'').replace(/\D/g,'');

  function info(ticket){
    const description=String(ticket?.descricao||'');
    const pick=label=>{
      const match=description.match(new RegExp(`${label}:\\s*([^\\n]+)`,'i'));
      return match?match[1].trim():'';
    };
    const morador=ticket?.morador||{};
    return {
      nome:pick('Nome')||morador.nome||ticket?.nomeMorador||'Portal do Morador',
      whatsapp:pick('WhatsApp')||morador.whatsapp||morador.telefone||ticket?.whatsapp||ticket?.telefone||'',
      apartamento:pick('Apartamento')||morador.apartamento||morador.unidade||ticket?.apartamento||'',
      bloco:pick('Bloco')||morador.bloco||ticket?.bloco||'',
      local:pick('Local informado')||ticket?.local||'',
      condominio:ticket?.condominio?.nome||ticket?.condominioNome||'Condomínio não identificado',
      descricao:description.replace(/Dados do morador:[\s\S]*/i,'').trim()||'Sem descrição registrada.'
    };
  }

  function whatsappLink(ticket){
    const data=info(ticket);
    const number=phone(data.whatsapp);
    if(!number) return '';
    const protocolo=String(ticket.id||'').slice(0,8).toUpperCase();
    const message=`Olá, ${data.nome}! Recebemos seu chamado no ${data.condominio}: ${ticket.titulo||'Chamado'}. Protocolo: ${protocolo}.`;
    return `https://wa.me/55${number.replace(/^55/,'')}?text=${encodeURIComponent(message)}`;
  }

  function attachments(ticket){
    const raw=[ticket?.fotos,ticket?.anexos,ticket?.imagens,ticket?.arquivos].flat().filter(Boolean);
    return raw.map(item=>typeof item==='string'?{url:item}:{url:item.url||item.fileUrl||item.path,nome:item.nome||item.fileName||'Anexo'}).filter(item=>item.url);
  }

  async function loadTickets(force=false){
    if(tickets.length&&!force) return tickets;
    if(loading) return loading;
    loading=api('/chamados?limit=200').then(data=>{tickets=list(data);return tickets;}).finally(()=>{loading=null;});
    return loading;
  }

  function ensureCss(){
    if(document.getElementById('tnm-chamados-safe-css')) return;
    const style=document.createElement('style');
    style.id='tnm-chamados-safe-css';
    style.textContent=`
      .tnm-detail-btn{margin-left:6px!important;white-space:nowrap}
      #tnm-chamado-modal{position:fixed;inset:0;z-index:2147483000;background:rgba(0,21,11,.58);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',Arial,sans-serif}
      #tnm-chamado-modal *{box-sizing:border-box}
      .tnm-cm-box{width:min(920px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;border:1px solid #dce8df;box-shadow:0 28px 90px rgba(0,21,11,.28)}
      .tnm-cm-head{background:linear-gradient(135deg,#003b24,#08783f);color:#fff;padding:20px 22px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
      .tnm-cm-close{border:0;background:rgba(255,255,255,.16);color:#fff;width:36px;height:36px;border-radius:10px;font-size:22px;cursor:pointer}
      .tnm-cm-body{padding:20px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:16px}
      .tnm-cm-card{border:1px solid #dde7de;border-radius:16px;padding:16px;background:#fff;margin-bottom:12px}
      .tnm-cm-card h3{margin:0 0 12px;font-size:15px;color:#003b24}
      .tnm-cm-text{white-space:pre-wrap;line-height:1.6;font-size:14px}
      .tnm-cm-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px}
      .tnm-cm-meta div{background:#f5f8f3;border-radius:11px;padding:10px}
      .tnm-cm-meta b{display:block;color:#68766d;font-size:11px;margin-bottom:3px}
      .tnm-cm-actions{display:grid;gap:10px}
      .tnm-cm-wa,.tnm-cm-save{display:flex;align-items:center;justify-content:center;border:0;border-radius:12px;padding:12px 14px;font-weight:800;text-decoration:none;cursor:pointer;background:#16a34a;color:#fff;font-size:14px}
      .tnm-cm-wa.disabled{background:#b8c4bc;pointer-events:none}
      .tnm-cm-select{width:100%;padding:11px;border:1px solid #dde7de;border-radius:11px;background:#fff}
      .tnm-cm-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
      .tnm-cm-files a{border:1px solid #dde7de;border-radius:12px;padding:10px;text-decoration:none;color:#003b24;font-size:12px;overflow:hidden}
      @media(max-width:760px){#tnm-chamado-modal{padding:10px;align-items:flex-end}.tnm-cm-box{max-height:94vh;border-radius:20px 20px 0 0}.tnm-cm-body{grid-template-columns:1fr}.tnm-cm-meta{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function closeModal(){document.getElementById('tnm-chamado-modal')?.remove();}

  function showModal(ticket){
    ensureCss();
    closeModal();
    const data=info(ticket);
    const wa=whatsappLink(ticket);
    const files=attachments(ticket);
    const modal=document.createElement('div');
    modal.id='tnm-chamado-modal';
    modal.innerHTML=`
      <div class="tnm-cm-box" role="dialog" aria-modal="true">
        <div class="tnm-cm-head">
          <div><div style="font-size:12px;opacity:.8;font-weight:800">CHAMADO #${esc(String(ticket.id||'').slice(0,8).toUpperCase())}</div><h2 style="margin:5px 0 4px;font-size:21px">${esc(ticket.titulo||'Chamado')}</h2><div style="font-size:13px;opacity:.85">${esc(data.condominio)} · ${esc(date(ticket.createdAt))}</div></div>
          <button class="tnm-cm-close" aria-label="Fechar">×</button>
        </div>
        <div class="tnm-cm-body">
          <div>
            <div class="tnm-cm-card"><h3>Descrição completa</h3><div class="tnm-cm-text">${esc(data.descricao)}</div></div>
            ${files.length?`<div class="tnm-cm-card"><h3>Fotos e anexos</h3><div class="tnm-cm-files">${files.map((f,i)=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.nome||`Anexo ${i+1}`)}</a>`).join('')}</div></div>`:''}
          </div>
          <div>
            <div class="tnm-cm-card"><h3>Dados do morador</h3><div class="tnm-cm-meta"><div><b>Nome</b>${esc(data.nome)}</div><div><b>WhatsApp</b>${esc(data.whatsapp||'—')}</div><div><b>Bloco</b>${esc(data.bloco||'—')}</div><div><b>Apartamento</b>${esc(data.apartamento||'—')}</div><div style="grid-column:1/-1"><b>Local informado</b>${esc(data.local||'—')}</div><div style="grid-column:1/-1"><b>Categoria</b>${esc(ticket.categoria||'—')}</div></div></div>
            <div class="tnm-cm-card"><h3>Atendimento</h3><div class="tnm-cm-actions"><a class="tnm-cm-wa ${wa?'':'disabled'}" ${wa?`href="${esc(wa)}" target="_blank" rel="noopener"`:''}>Responder no WhatsApp</a><select class="tnm-cm-select"><option value="ABERTO">Aberto</option><option value="EM_ANALISE">Em análise</option><option value="CONCLUIDO">Concluído</option></select><button class="tnm-cm-save">Salvar status</button></div></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const select=modal.querySelector('.tnm-cm-select');
    select.value=ticket.status||'ABERTO';
    modal.querySelector('.tnm-cm-close').addEventListener('click',closeModal);
    modal.addEventListener('click',event=>{if(event.target===modal) closeModal();});
    modal.querySelector('.tnm-cm-save').addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;button.textContent='Salvando...';
      try{
        await api(`/chamados/${ticket.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:select.value})});
        ticket.status=select.value;
        button.textContent='Status salvo ✓';
        setTimeout(closeModal,700);
      }catch(error){button.disabled=false;button.textContent='Tentar novamente';alert(error.message);}
    });
  }

  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}

  function findTicket(row,index){
    const cells=[...row.querySelectorAll('td')];
    const title=normalize(cells[0]?.textContent);
    const condo=normalize(cells[1]?.textContent);
    return tickets.find(t=>normalize(t.titulo)===title&&(!condo||normalize(info(t).condominio)===condo))||tickets[index]||null;
  }

  async function enhance(){
    const heading=[...document.querySelectorAll('h1')].find(el=>normalize(el.textContent)==='central de chamados');
    if(!heading) return;
    const table=heading.closest('.page')?.querySelector('table');
    if(!table) return;
    try{await loadTickets();}catch{return;}
    [...table.querySelectorAll('tbody tr')].forEach((row,index)=>{
      const action=row.querySelector('td:last-child');
      if(!action||action.querySelector(`[${MARK}]`)) return;
      const button=document.createElement('button');
      button.type='button';
      button.className='btn btn-ghost btn-xs tnm-detail-btn';
      button.setAttribute(MARK,'1');
      button.textContent='Ver detalhes';
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const ticket=findTicket(row,index);
        if(ticket) showModal(ticket); else alert('Não foi possível localizar os detalhes deste chamado.');
      });
      action.appendChild(button);
      row.style.cursor='pointer';
      row.addEventListener('dblclick',()=>{const ticket=findTicket(row,index);if(ticket)showModal(ticket);});
    });
  }

  ensureCss();
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();});
  setInterval(enhance,1200);
  enhance();
})();