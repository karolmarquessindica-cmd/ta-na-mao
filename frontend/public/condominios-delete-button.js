(()=>{
  if(location.search.includes('portal=')) return;

  const BASE='https://ta-na-mao-9bii.onrender.com';
  const token=()=>localStorage.getItem('tnm_token')||'';
  let condominios=[];
  let loading=false;

  function normalize(value){
    return String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  async function loadCondominios(){
    if(loading) return condominios;
    loading=true;
    try{
      const r=await fetch(`${BASE}/api/condominios`,{
        headers:token()?{Authorization:`Bearer ${token()}`}:{},
      });
      const body=await r.json().catch(()=>[]);
      if(!r.ok) throw new Error(body?.error||`Erro ${r.status}`);
      condominios=Array.isArray(body)?body:(body?.data||body?.items||[]);
      return condominios;
    }catch(e){
      console.warn('[edificacoes] Não foi possível carregar as edificações.',e);
      return [];
    }finally{
      loading=false;
    }
  }

  function isEdificacoesPage(){
    const h1=[...document.querySelectorAll('h1')].find(el=>normalize(el.textContent)==='edificações');
    return Boolean(h1);
  }

  function findCard(condominio){
    const nome=normalize(condominio?.nome);
    if(!nome) return null;
    return [...document.querySelectorAll('.card')].find(card=>{
      const text=normalize(card.textContent);
      if(!text.includes(nome)) return false;
      return [...card.querySelectorAll('button')].some(btn=>normalize(btn.textContent).includes('detalhes'));
    })||null;
  }

  async function excluir(condominio,button){
    const nome=condominio?.nome||'esta edificação';
    const ok=window.confirm(
      `Excluir definitivamente “${nome}”?\n\nTodos os dados vinculados a esta edificação serão removidos. Esta ação não poderá ser desfeita.`
    );
    if(!ok) return;

    const previous=button.textContent;
    button.disabled=true;
    button.textContent='Excluindo...';

    try{
      const r=await fetch(`${BASE}/api/condominios/${encodeURIComponent(condominio.id)}`,{
        method:'DELETE',
        headers:token()?{Authorization:`Bearer ${token()}`}:{},
      });
      const body=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(body?.error||`Erro ${r.status}`);
      alert(`Edificação “${nome}” excluída com sucesso.`);
      location.reload();
    }catch(e){
      alert(e?.message||'Não foi possível excluir a edificação.');
      button.disabled=false;
      button.textContent=previous;
    }
  }

  function addButton(condominio,card){
    if(!card||card.querySelector('[data-tnm-delete-condominio]')) return;
    const detalhes=[...card.querySelectorAll('button')].find(btn=>normalize(btn.textContent).includes('detalhes'));
    if(!detalhes) return;

    const button=document.createElement('button');
    button.type='button';
    button.dataset.tnmDeleteCondominio=condominio.id;
    button.className='btn btn-sm';
    button.textContent='Excluir edificação';
    Object.assign(button.style,{
      background:'#fff',
      color:'#b42318',
      border:'1.5px solid #f2b8b5',
      boxShadow:'none',
      marginLeft:'8px',
    });
    button.addEventListener('mouseenter',()=>{button.style.background='#fff1f0';});
    button.addEventListener('mouseleave',()=>{button.style.background='#fff';});
    button.addEventListener('click',()=>excluir(condominio,button));

    detalhes.insertAdjacentElement('afterend',button);
  }

  async function enhance(){
    if(!isEdificacoesPage()) return;
    const list=condominios.length?condominios:await loadCondominios();
    list.forEach(condominio=>addButton(condominio,findCard(condominio)));
  }

  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',enhance);
  setTimeout(enhance,500);
  setTimeout(enhance,1500);
})();
