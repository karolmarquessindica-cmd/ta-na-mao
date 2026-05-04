import { useEffect, useMemo, useState } from 'react'

const BASE = (import.meta.env.VITE_API_URL || 'https://ta-na-mao-1.onrender.com').replace(/\/$/, '')
const API_BASE = BASE + '/api'

async function apiReq(method, path, body) {
  const token = localStorage.getItem('tnm_token')
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  const cfg = { method, headers }
  if (body) {
    headers['Content-Type'] = 'application/json'
    cfg.body = JSON.stringify(body)
  }
  const res = await fetch(API_BASE + path, cfg)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro ' + res.status)
  return data
}

function prioridadeStyle(prioridade) {
  if (prioridade === 'ALTA') return { background: '#FEE2E2', color: '#991B1B' }
  if (prioridade === 'BAIXA') return { background: '#E0F2FE', color: '#075985' }
  return { background: '#FEF3C7', color: '#92400E' }
}

function statusStyle(status) {
  if (status === 'CONCLUIDA') return { background: '#DCFCE7', color: '#166534' }
  if (status === 'EM_ANALISE') return { background: '#DBEAFE', color: '#1E40AF' }
  return { background: '#F3F4F6', color: '#374151' }
}

export default function OcorrenciasPortaria() {
  const [ocorrencias, setOcorrencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('TODAS')
  const [detalhe, setDetalhe] = useState(null)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const resp = await apiReq('GET', '/portaria/ocorrencias')
      setOcorrencias(resp.data || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function atualizarStatus(id, status) {
    try {
      await apiReq('PATCH', '/portaria/ocorrencias/' + id, { status })
      await carregar()
      setDetalhe(null)
    } catch (e) {
      setErro(e.message)
    }
  }

  const lista = useMemo(() => {
    if (filtro === 'TODAS') return ocorrencias
    return ocorrencias.filter(o => o.status === filtro)
  }, [ocorrencias, filtro])

  const cards = useMemo(() => ({
    total: ocorrencias.length,
    abertas: ocorrencias.filter(o => o.status === 'ABERTA').length,
    analise: ocorrencias.filter(o => o.status === 'EM_ANALISE').length,
    concluidas: ocorrencias.filter(o => o.status === 'CONCLUIDA').length,
    alta: ocorrencias.filter(o => o.prioridade === 'ALTA').length,
  }), [ocorrencias])

  return (
    <div className="page">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:22}}>
        <div>
          <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Ocorrências da Portaria</h1>
          <p style={{color:'#68766D', marginTop:6}}>Acompanhe registros operacionais feitos pela portaria com QR temporário, foto e localização.</p>
        </div>
        <button className="btn btn-primary" onClick={carregar}>Atualizar</button>
      </div>

      {erro && <div className="card" style={{padding:14, marginBottom:16, color:'#721c24', background:'#fff5f5'}}>{erro}</div>}

      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginBottom:18}}>
        <div className="card" style={{padding:16}}><b style={{fontSize:26,color:'#003B24'}}>{cards.total}</b><div style={{fontSize:12,color:'#68766D'}}>Total</div></div>
        <div className="card" style={{padding:16}}><b style={{fontSize:26,color:'#EF4444'}}>{cards.abertas}</b><div style={{fontSize:12,color:'#68766D'}}>Abertas</div></div>
        <div className="card" style={{padding:16}}><b style={{fontSize:26,color:'#2563EB'}}>{cards.analise}</b><div style={{fontSize:12,color:'#68766D'}}>Em análise</div></div>
        <div className="card" style={{padding:16}}><b style={{fontSize:26,color:'#16A34A'}}>{cards.concluidas}</b><div style={{fontSize:12,color:'#68766D'}}>Concluídas</div></div>
        <div className="card" style={{padding:16}}><b style={{fontSize:26,color:'#991B1B'}}>{cards.alta}</b><div style={{fontSize:12,color:'#68766D'}}>Alta prioridade</div></div>
      </div>

      <div className="card" style={{padding:18, marginBottom:18, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
        <span style={{fontWeight:900, color:'#003B24'}}>Filtrar:</span>
        {['TODAS','ABERTA','EM_ANALISE','CONCLUIDA'].map(s => (
          <button key={s} className={filtro === s ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'} onClick={() => setFiltro(s)}>
            {s === 'TODAS' ? 'Todas' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="card" style={{padding:20}}>
        <h3 style={{marginBottom:14}}>Registros recentes</h3>
        {loading ? <div className="spin" /> : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Título</th>
                <th>Local</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map(o => (
                <tr key={o.id}>
                  <td>{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                  <td><b>{o.tipo}</b></td>
                  <td>{o.titulo}</td>
                  <td>{[o.bloco ? 'Bloco ' + o.bloco : '', o.unidade ? 'Unid. ' + o.unidade : ''].filter(Boolean).join(' • ') || '-'}</td>
                  <td><span style={{...prioridadeStyle(o.prioridade), padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:900}}>{o.prioridade}</span></td>
                  <td><span style={{...statusStyle(o.status), padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:900}}>{o.status}</span></td>
                  <td><button className="btn btn-xs btn-ghost" onClick={() => setDetalhe(o)}>Ver</button></td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan="7">Nenhuma ocorrência encontrada.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {detalhe && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-hd">
              <div>
                <div className="modal-title">Ocorrência da Portaria</div>
                <div style={{fontSize:12, color:'#68766D', marginTop:4}}>{new Date(detalhe.createdAt).toLocaleString('pt-BR')}</div>
              </div>
              <button className="mclose" onClick={() => setDetalhe(null)}>×</button>
            </div>
            <div className="modal-bd">
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
                <div className="card" style={{padding:14}}><small>Tipo</small><br/><b>{detalhe.tipo}</b></div>
                <div className="card" style={{padding:14}}><small>Prioridade</small><br/><b>{detalhe.prioridade}</b></div>
                <div className="card" style={{padding:14}}><small>Local</small><br/><b>{[detalhe.bloco ? 'Bloco ' + detalhe.bloco : '', detalhe.unidade ? 'Unid. ' + detalhe.unidade : ''].filter(Boolean).join(' • ') || '-'}</b></div>
                <div className="card" style={{padding:14}}><small>Contato</small><br/><b>{detalhe.contato || '-'}</b></div>
              </div>

              <h2 style={{fontSize:22, margin:'4px 0 8px'}}>{detalhe.titulo}</h2>
              <p style={{lineHeight:1.55, color:'#344054', whiteSpace:'pre-wrap'}}>{detalhe.descricao}</p>

              {detalhe.foto && (
                <div style={{marginTop:16}}>
                  <b>Foto/anexo</b>
                  <img src={detalhe.foto} alt="Foto da ocorrência" style={{width:'100%', maxHeight:320, objectFit:'contain', borderRadius:16, marginTop:8, border:'1px solid #DDE7DE'}} />
                </div>
              )}

              {detalhe.latitude && (
                <div style={{marginTop:16, padding:12, borderRadius:14, background:'#F5F8F3', border:'1px solid #DDE7DE', fontSize:13}}>
                  📍 Localização: {Number(detalhe.latitude).toFixed(6)}, {Number(detalhe.longitude).toFixed(6)}
                </div>
              )}

              <div style={{display:'flex', gap:10, marginTop:20, flexWrap:'wrap'}}>
                <button className="btn btn-ghost" onClick={() => atualizarStatus(detalhe.id, 'EM_ANALISE')}>Marcar em análise</button>
                <button className="btn btn-primary" onClick={() => atualizarStatus(detalhe.id, 'CONCLUIDA')}>Concluir ocorrência</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
