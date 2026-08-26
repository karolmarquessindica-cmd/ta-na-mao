(()=>{
'use strict';
if(window.__TNM_COT_DB__)return;window.__TNM_COT_DB__=true;
const KEY='tnm_cotacoes_v1',API='https://ta-na-mao-9bii.onrender.com/api';
const token=()=>localStorage.getItem('tnm_token');
function condoId(){try{return JSON.parse(atob(token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).condominioId}catch{return null}}
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
async function req(path,opt={}){const t=token();if(!t)return null;const r=await fetch(API+path,{...opt,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',...(opt.headers||{})}});if(!r.ok)throw new Error('Falha na sincronização');return r.json()}
function parse(row){try{const x=JSON.parse(row.legenda||'{}');return x&&x.__cotacao===true?{...x,id:row.id}:null}catch{return null}}
async function pull(){const id=condoId();if(!id)return;try{const data=await req(`/gestao-acao?condominioId=${encodeURIComponent(id)}`);const rows=(data?.items||[]).filter(x=>x.categoria==='Cotação').map(parse).filter(Boolean);if(rows.length&&!read().length){save(rows);window.dispatchEvent(new Event('tnm-cotacoes-updated'))}}catch{}}
let last='';
async function push(){const id=condoId(),rows=read();if(!id||!rows.length)return;const sig=JSON.stringify(rows);if(sig===last)return;last=sig;const items=rows.map(x=>({id:x.id,titulo:x.servico||'Cotação',legenda:JSON.stringify({...x,__cotacao:true}),categoria:'Cotação',status:x.status||'PENDENTE',local:x.fornecedor||'',data:x.data,createdAt:x.data,updatedAt:new Date().toISOString(),fotos:[],publicadoPortal:false}));try{await req('/gestao-acao/sync',{method:'PUT',body:JSON.stringify({condominioId:id,items})})}catch{}}
setTimeout(pull,1500);setInterval(push,4000);setInterval(pull,12000);window.addEventListener('tnm-cotacoes-updated',()=>setTimeout(()=>window.location.reload(),100));
})();
