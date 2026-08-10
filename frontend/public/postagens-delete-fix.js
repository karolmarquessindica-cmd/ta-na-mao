(()=>{
  if(location.search.includes('portal=')) return;
  const BASE='https://ta-na-mao-9bii.onrender.com';
  const token=()=>localStorage.getItem('tnm_token')||'';
  const norm=v=>String(v??'').trim();
  const dateBR=v=>{if(!v)return'';const [y,m,d]=String(v).slice(0,10).split('-');return d&&m&&y?`${d}/${m}/${y}`:String(v)};

  async function deleteRemote(condominioId,itemId){
    const r=await fetch(`${BASE}/api/gestao-acao/${encodeURIComponent(itemId)}?condominioId=${encodeURIComponent(condominioId)}`,{
      method:'DELETE',
      headers:token()?{Authorization:`Bearer ${token()}`}:{},
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(body?.error||`Erro ${r.status}`);
    return body;
  }

  function resolveItem(card){
    const api=window.TNMGestaoAcao;
    if(!api) return null;
    const condoId=document.querySelector('.tnm-post-page [data-condo]')?.value||api.condo?.()?.id||'';
    if(!condoId) return null;
    const title=norm(card.querySelector('h3')?.textContent);
    const caption=norm(card.querySelector('p')?.textContent);
    const head=norm(card.querySelector('.tnm-post-head span')?.textContent);
    const list=api.read?.(condoId)||[];
    let candidates=list.filter(x=>norm(x.titulo||'Registro da Gestão')===title);
    if(caption) candidates=candidates.filter(x=>norm(x.legenda)===caption);
    if(candidates.length>1){
      candidates=candidates.filter(x=>{
        const expected=`${dateBR(x.data)}${x.local?' • '+x.local:''}`;
        return norm(expected)===head;
      });
    }
    return {condoId,item:candidates[0]||null};
  }

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('.tnm-post-card [data-delete]');
    if(!btn||btn.dataset.persistentDeleteBusy==='1') return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const card=btn.closest('.tnm-post-card');
    const resolved=resolveItem(card);
    if(!resolved?.item){alert('Não foi possível identificar esta publicação. Atualize a página e tente novamente.');return;}
    if(!confirm('Excluir esta publicação definitivamente?')) return;
    btn.dataset.persistentDeleteBusy='1';
    const old=btn.textContent;
    btn.textContent='Excluindo...';
    btn.disabled=true;
    try{
      await deleteRemote(resolved.condoId,resolved.item.id||resolved.item.legacyId);
      const api=window.TNMGestaoAcao;
      const next=(api.read?.(resolved.condoId)||[]).filter(x=>x.id!==resolved.item.id&&x.legacyId!==resolved.item.id&&x.id!==resolved.item.legacyId&&x.legacyId!==resolved.item.legacyId);
      api.write?.(resolved.condoId,next);
      card.remove();
      window.dispatchEvent(new CustomEvent('tnm-postagens-updated',{detail:{condominioId:resolved.condoId,source:'delete'}}));
    }catch(err){
      alert(err.message||'Não foi possível excluir a publicação.');
      btn.disabled=false;
      btn.textContent=old;
      delete btn.dataset.persistentDeleteBusy;
    }
  },true);
})();