(()=>{
  const API='https://ta-na-mao-9bii.onrender.com/api';
  const auth=()=>{const token=localStorage.getItem('tnm_token');return token?{Authorization:'Bearer '+token}:{}};
  const isPage=()=>[...document.querySelectorAll('h1')].some(h=>(h.textContent||'').toLowerCase().includes('central de chamados'));

  async function preserve(){
    if(!isPage()||sessionStorage.getItem('tnm_photo_preserve_done')==='1')return;
    sessionStorage.setItem('tnm_photo_preserve_done','1');
    try{
      const response=await fetch(API+'/chamados/preservar-fotos',{method:'POST',headers:auth()});
      const data=await response.json().catch(()=>({}));
      if(response.ok&&Number(data.preserved)>0){
        sessionStorage.setItem('tnm_photo_preserve_reloaded','1');
        location.reload();
      }
    }catch(error){console.warn('[chamados-photo-audit]',error.message)}
  }

  function markBroken(){
    document.querySelectorAll('.tnm-file').forEach(card=>{
      const preview=card.querySelector('.tnm-file-preview');
      if(!preview)return;
      const text=(preview.textContent||'').toLowerCase();
      if(!text.includes('não foi possível carregar')&&!text.includes('nao foi possivel carregar'))return;
      preview.innerHTML='<span style="font-size:28px">⚠️</span><span>Arquivo antigo não está mais disponível no servidor.</span>';
      preview.style.background='#fff7ed';
      preview.style.color='#9a3412';
      card.querySelectorAll('.tnm-file-actions button').forEach(button=>{
        button.disabled=true;
        button.style.opacity='.45';
        button.style.cursor='not-allowed';
        button.title='O arquivo original não existe mais no armazenamento do servidor.';
      });
    });
  }

  setInterval(()=>{preserve();markBroken()},700);
})();