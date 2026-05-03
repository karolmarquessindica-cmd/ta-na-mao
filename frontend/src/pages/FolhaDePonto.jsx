import { useEffect, useState } from 'react'

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

export default function FolhaDePonto() {
  const [pontos, setPontos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ funcionarioId: '', pin: '', tipo: 'ENTRADA', justificativa: '' })

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const [f, p] = await Promise.all([
        apiReq('GET', '/funcionarios'),
        apiReq('GET', '/funcionarios/pontos')
      ])
      setFuncionarios((f.data || []).filter(x => x.status === 'ATIVO'))
      setPontos(p.data || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function registrar(e) {
    e.preventDefault()
    if (!form.funcionarioId) return setErro('Selecione o funcionário')
    if (!form.pin) return setErro('Informe o PIN')

    const payload = { ...form }

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 }))
        payload.latitude = pos.coords.latitude
        payload.longitude = pos.coords.longitude
        payload.statusLocalizacao = 'CAPTURADA'
      } catch {
        payload.statusLocalizacao = 'NAO_AUTORIZADA'
      }
    }

    try {
      await apiReq('POST', '/funcionarios/ponto', payload)
      setForm({ funcionarioId: '', pin: '', tipo: 'ENTRADA', justificativa: '' })
      await carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  const hoje = new Date().toISOString().slice(0,10)
  const pontosHoje = pontos.filter(p => String(p.dataHora || '').slice(0,10) === hoje).length
  const entradas = pontos.filter(p => p.tipo === 'ENTRADA').length
  const saidas = pontos.filter(p => p.tipo === 'SAIDA').length

  return (
    <div className="page">
      <div style={{display:'flex', justifyContent:'space-between', gap:16, marginBottom:22}}>
        <div>
          <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Folha de Ponto</h1>
          <p style={{color:'#68766D', marginTop:6}}>Registro de entrada, saída e histórico operacional dos funcionários.</p>
        </div>
        <div style={{display:'flex', gap:10}}>
          <div className="card" style={{padding:14, minWidth:120}}><b style={{fontSize:24,color:'#16A34A'}}>{pontosHoje}</b><div style={{fontSize:12}}>Hoje</div></div>
          <div className="card" style={{padding:14, minWidth:120}}><b style={{fontSize:24,color:'#003B24'}}>{entradas}</b><div style={{fontSize:12}}>Entradas</div></div>
          <div className="card" style={{padding:14, minWidth:120}}><b style={{fontSize:24,color:'#F59E0B'}}>{saidas}</b><div style={{fontSize:12}}>Saídas</div></div>
        </div>
      </div>

      {erro && <div className="card" style={{padding:12, marginBottom:14, color:'#721c24', background:'#fff5f5'}}>{erro}</div>}

      <div style={{display:'grid', gridTemplateColumns:'360px 1fr', gap:18}}>
        <form onSubmit={registrar} className="card" style={{padding:20}}>
          <h3 style={{marginBottom:14}}>Registrar ponto manual</h3>
          <label>Funcionário</label>
          <select value={form.funcionarioId} onChange={e=>setForm({...form, funcionarioId:e.target.value})}>
            <option value="">Selecione</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.funcao}</option>)}
          </select>
          <label style={{marginTop:12}}>PIN</label>
          <input value={form.pin} onChange={e=>setForm({...form, pin:e.target.value})} placeholder="PIN do funcionário" />
          <label style={{marginTop:12}}>Tipo</label>
          <select value={form.tipo} onChange={e=>setForm({...form, tipo:e.target.value})}>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="INTERVALO_INICIO">Início do intervalo</option>
            <option value="INTERVALO_FIM">Fim do intervalo</option>
          </select>
          <label style={{marginTop:12}}>Justificativa/observação</label>
          <textarea value={form.justificativa} onChange={e=>setForm({...form, justificativa:e.target.value})} rows={3} placeholder="Opcional" />
          <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', marginTop:18}}>Registrar ponto</button>
        </form>

        <div className="card" style={{padding:20}}>
          <h3 style={{marginBottom:14}}>Histórico de ponto</h3>
          {loading ? <div className="spin" /> : (
            <table className="table">
              <thead><tr><th>Data/Hora</th><th>Funcionário</th><th>Tipo</th><th>Localização</th><th>Observação</th></tr></thead>
              <tbody>
                {pontos.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.dataHora).toLocaleString('pt-BR')}</td>
                    <td><b>{p.funcionarioNome || '-'}</b><br/><small>{p.funcionarioFuncao || ''}</small></td>
                    <td><span className="badge bd-info">{p.tipo}</span></td>
                    <td>{p.statusLocalizacao || '-'}{p.latitude ? <><br/><small>{Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}</small></> : null}</td>
                    <td>{p.justificativa || '-'}</td>
                  </tr>
                ))}
                {!pontos.length && <tr><td colSpan="5">Nenhum ponto registrado ainda.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
