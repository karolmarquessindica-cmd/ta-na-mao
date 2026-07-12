(()=>{
  const DEFAULT_API='https://ta-na-mao-9bii.onrender.com/api';
  let apiBase=DEFAULT_API;
  let portalPayload=null;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const response=await nativeFetch(input,init);
    try{
      if(url.includes('/api/')) apiBase=url.split('/api/')[0]+'/api';
      if(url.includes('/api/portal')){
        const data=await response.clone().json();
        if(data?.manutencoesPrevistas) portalPayload=data;
      }
    }catch{}
    return response;
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>value==null?'—':Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const dateBR=value=>value?new Date(value).toLocaleDateString('pt-BR'):'—';

  async function providerPage(token){
    document.body.innerHTML='<main id="exec-root" style="min-height:100vh;background:#f4f7f2;padding:20px;font-family:Arial,sans-serif"><div style="max-width:760px;margin:auto">Carregando ordem de serviço...</div></main>';
    const root=document.querySelector('#exec-root>div');
    const res=await nativeFetch(`${apiBase}/manutencoes/execucao/${encodeURIComponent(token)}`);
    const item=await res.json();
    if(!res.ok){root.innerHTML='<h2>Link inválido ou expirado.</h2>';return;}
    root.innerHTML=`
      <div style="background:#063b24;color:white;padding:24px;border-radius:22px 22px 0 0">
        <div style="font-size:13px;opacity:.8">ORDEM DE SERVIÇO DIGITAL</div>
        <h1 style="margin:8px 0 4px;font-size:28px">${esc(item.titulo)}</h1>
        <div>${esc(item.condominio?.nome||'')} ${item.local?'• '+esc(item.local):''}</div>
      </div>
      <form id="exec-form" style="background:white;padding:22px;border-radius:0 0 22px 22px;box-shadow:0 14px 40px rgba(0,0,0,.08)">
        <p style="color:#667085">${esc(item.descricao||'Preencha os dados do serviço executado.')}</p>
        ${section('Responsável pelo serviço',`
          ${field('Nome do prestador','prestadorNome','text',true)}
          ${field('Empresa','prestadorEmpresa')}
          ${field('Telefone','prestadorTelefone','tel')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('Hora de início','horaInicio','time')}${field('Hora de término','horaTermino','time')}</div>`)}
        ${section('Antes da execução',`
          ${textarea('Problemas encontrados','problemasEncontrados','Descreva o que foi encontrado antes do serviço.')}
          ${file('Fotos antes','fotosAntes',true,true)}`)}
        ${section('Serviço executado',`
          ${textarea('Descrição do que foi feito','descricaoServico','Informe detalhadamente o serviço realizado.',true)}
          ${textarea('Materiais utilizados','materiaisUtilizados','Ex.: registro, conexão, cola PVC...')}
          ${file('Fotos durante o serviço','fotosDurante',true)}`)}
        ${section('Depois da execução',`
          ${file('Fotos depois','fotosDepois',true,true)}
          ${textarea('Observações finais','observacoesFinais','Testes realizados, orientações e resultado final.')}`)}
        ${section('Custos e documentos',`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('Mão de obra (R$)','custoMaoObra','number')}${field('Materiais (R$)','custoMateriais','number')}${field('Outros custos (R$)','custoOutros','number')}${field('Valor total (R$)','valorTotal','number')}</div>
          ${file('Nota fiscal','notaFiscal',false)}
          ${file('Recibo','recibo',false)}`)}
        <label style="display:flex;gap:10px;align-items:center;margin:18px 0"><input type="checkbox" name="visivelMorador" checked> Permitir que o morador visualize este relatório</label>
        <button style="width:100%;background:#08783f;color:white;border:0;border-radius:14px;padding:16px;font-size:17px;font-weight:800">Finalizar serviço</button>
        <div id="exec-msg" style="margin-top:12px;text-align:center"></div>
      </form>`;
    document.getElementById('exec-form').onsubmit=async event=>{
      event.preventDefault();
      const form=event.currentTarget, button=form.querySelector('button'), msg=document.getElementById('exec-msg');
      button.disabled=true;button.textContent='Enviando...';
      const data=new FormData(form);
      if(!form.visivelMorador.checked)data.set('visivelMorador','false');
      try{
        const r=await nativeFetch(`${apiBase}/manutencoes/execucao/${encodeURIComponent(token)}`,{method:'POST',body:data});
        const result=await r.json();
        if(!r.ok)throw new Error(result.error||'Não foi possível concluir.');
        form.innerHTML='<div style="text-align:center;padding:40px 10px"><div style="font-size:54px">✅</div><h2>Serviço finalizado</h2><p>O relatório foi enviado para a administração do condomínio.</p></div>';
      }catch(error){msg.textContent=error.message;msg.style.color='#b42318';button.disabled=false;button.textContent='Finalizar serviço';}
    };
  }

  function field(label,name,type='text',required=false){return `<label style="display:block;margin:12px 0;font-weight:700">${label}<input name="${name}" type="${type}" ${type==='number'?'step="0.01" min="0"':''} ${required?'required':''} style="display:block;width:100%;margin-top:7px;padding:13px;border:1px solid #d7e2d7;border-radius:12px"></label>`}
  function textarea(label,name,placeholder='',required=false){return `<label style="display:block;margin:12px 0;font-weight:700">${label}<textarea name="${name}" ${required?'required':''} placeholder="${placeholder}" rows="4" style="display:block;width:100%;margin-top:7px;padding:13px;border:1px solid #d7e2d7;border-radius:12px;resize:vertical"></textarea></label>`}
  function file(label,name,multiple=false,required=false){return `<label style="display:block;margin:12px 0;font-weight:700">${label}<input name="${name}" type="file" accept="image/*,.pdf" ${multiple?'multiple':''} ${required?'required':''} style="display:block;width:100%;margin-top:7px;padding:12px;border:1px dashed #9db7a2;border-radius:12px;background:#f5faf5"></label>`}
  function section(title,content){return `<section style="border-top:1px solid #e5ebe4;margin-top:22px;padding-top:16px"><h2 style="font-size:19px;color:#063b24">${title}</h2>${content}</section>`}

  function modal(report){
    const e=report.execucao||{};
    const gallery=(title,images=[])=>images.length?`<h3>${title}</h3><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${images.map(src=>`<img src="${esc(src)}" style="width:100%;height:150px;object-fit:cover;border-radius:12px">`).join('')}</div>`:'';
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;padding:16px;overflow:auto';
    overlay.innerHTML=`<div style="max-width:620px;margin:20px auto;background:white;border-radius:22px;padding:22px;font-family:Arial,sans-serif">
      <button data-close style="float:right;border:0;background:#eef3ee;border-radius:50%;width:38px;height:38px;font-size:20px">×</button>
      <div style="color:#08783f;font-size:13px;font-weight:800">RELATÓRIO DE MANUTENÇÃO</div>
      <h2>${esc(report.titulo)}</h2><p>${esc(report.local||'')} • ${dateBR(report.dataConclusao||e.dataExecucao)}</p>
      ${e.prestadorNome||e.prestadorEmpresa?`<h3>Prestador</h3><p>${esc(e.prestadorNome||'')} ${e.prestadorEmpresa?'— '+esc(e.prestadorEmpresa):''}</p>`:''}
      ${e.descricaoServico?`<h3>Serviço realizado</h3><p>${esc(e.descricaoServico)}</p>`:''}
      ${e.materiaisUtilizados?`<h3>Materiais utilizados</h3><p style="white-space:pre-wrap">${esc(e.materiaisUtilizados)}</p>`:''}
      ${e.observacoesFinais?`<h3>Observações finais</h3><p>${esc(e.observacoesFinais)}</p>`:''}
      ${gallery('Antes',e.fotosAntes)}${gallery('Durante',e.fotosDurante)}${gallery('Depois',e.fotosDepois)}
      ${e.notaFiscal?`<p><a href="${esc(e.notaFiscal)}" target="_blank" rel="noopener">📄 Ver nota fiscal</a></p>`:''}
      ${e.recibo?`<p><a href="${esc(e.recibo)}" target="_blank" rel="noopener">📎 Ver recibo</a></p>`:''}
    </div>`;
    overlay.onclick=event=>{if(event.target===overlay||event.target.closest('[data-close]'))overlay.remove()};
    document.body.appendChild(overlay);
  }

  async function residentClick(event){
    if(!location.search.includes('portal=')||!portalPayload)return;
    const target=event.target.closest('button,article,.card,[class*="maintenance"],[class*="manut"]');
    if(!target)return;
    const text=(target.innerText||'').toLowerCase();
    const item=(portalPayload.manutencoesPrevistas||[]).find(m=>text.includes(String(m.titulo||m.nome||'').toLowerCase()));
    if(!item)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const response=await nativeFetch(`${apiBase}/manutencoes/relatorio/${item.id}`);
      const report=await response.json();
      if(!response.ok)throw new Error(report.error||'Relatório ainda não disponível.');
      modal(report);
    }catch(error){alert(error.message)}
  }

  const params=new URLSearchParams(location.search);
  const execution=params.get('execucao');
  if(execution){document.addEventListener('DOMContentLoaded',()=>providerPage(execution));}
  else document.addEventListener('click',residentClick,true);
})();