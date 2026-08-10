(()=>{
  const EXTRA=[
    {value:'ASSEMBLEIA',label:'Assembleia'},
    {value:'MANUTENCAO',label:'Acompanhamento de manutenção'}
  ];
  function fix(){
    const modal=[...document.querySelectorAll('.modal')].find(m=>/novo compromisso na agenda/i.test(m.textContent||''));
    if(!modal)return;
    const labels=[...modal.querySelectorAll('label')];
    const tipoLabel=labels.find(l=>/^tipo$/i.test((l.textContent||'').trim()));
    const select=tipoLabel?.parentElement?.querySelector('select');
    if(!select)return;
    EXTRA.forEach(item=>{
      if([...select.options].some(o=>o.value===item.value))return;
      const opt=document.createElement('option');
      opt.value=item.value;
      opt.textContent=item.label;
      select.appendChild(opt);
    });
  }
  new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true});
  fix();
})();