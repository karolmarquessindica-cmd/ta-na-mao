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

export default function PortalFuncionario() {
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [form, setForm] = useState({ funcionarioId: '', pin: '', tipo: 'ENTRADA' })

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const resp = await apiReq('GET', '/funcionarios')
      setFuncionarios((resp.data || []).filter(f => f.status === 'ATIVO'))
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function baterPonto(tipo) {
    setErro('')
    setOk('')
    if (!form.funcionarioId) return setErro('Selecione seu nome')
    if (!form.pin) return setErro('Informe seu PIN')

    const payload = { funcionarioId: form.funcionarioId, pin: form.pin, tipo }
    setEnviando(true)

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000 }))
        payload.latitude = pos.coords.latitude
        payload.longitude = pos.coords.longitude
        payload.statusLocalizacao = 'CAPTURADA'
      } catch {
        payload.statusLocalizacao = 'NAO_AUTORIZADA'
      }
    }

    try {
      await apiReq('POST', '/funcionarios/ponto', payload)
      setOk('Ponto registrado com sucesso!')
      setForm({ funcionarioId: form.funcionarioId, pin: '', tipo })
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const funcionarioSelecionado = funcionarios.find(f => f.id === form.funcionarioId)

  return (
    <div style={{minHeight:'100vh', background:'linear-gradient(145deg,#00150B,#003B24)', padding:18, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{width:'100%', maxWidth:430}}>
        <div style={{textAlign:'center', color:'#fff', marginBottom:18}}>
          <div style={{width:78,height:78,borderRadius:24,background:'#fff',margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#003B24'}}>TNM</div>
          <h1 style={{margin:0,fontSize:26,fontWeight:900}}>Portal do Funcionário</h1>
          <p style={{opacity:.78, marginTop:6}}>Registro rápido de ponto com PIN e localização.</p>
        </div>

        <div className="card" style={{padding:22, borderRadius:24}}>
          {loading ? <div className="spin" /> : (
            <>
              <label>Selecione seu nome</label>
              <select value={form.funcionarioId} onChange={e=>setForm({...form, funcionarioId:e.target.value})}>
                <option value="">Escolha seu nome</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.funcao}</option>)}
              </select>

              {funcionarioSelecionado && (
                <div style={{background:'#F0F8F1', border:'1px solid #DDE7DE', borderRadius:16, padding:14, marginTop:14}}>
                  <b>{funcionarioSelecionado.nome}</b>
                  <div style={{fontSize:13, color:'#68766D', marginTop:3}}>{funcionarioSelecionado.funcao}</div>
                </div>
              )}

              <label style={{marginTop:14}}>PIN</label>
              <input value={form.pin} onChange={e=>setForm({...form, pin:e.target.value})} placeholder="Digite seu PIN" inputMode="numeric" />

              {erro && <div style={{background:'#fff5f5', color:'#721c24', borderRadius:12, padding:12, marginTop:14, fontSize:13}}>{erro}</div>}
              {ok && <div style={{background:'#DCFCE7', color:'#166534', borderRadius:12, padding:12, marginTop:14, fontSize:13, fontWeight:800}}>{ok}</div>}

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18}}>
                <button disabled={enviando} className="btn btn-primary" style={{justifyContent:'center'}} onClick={()=>baterPonto('ENTRADA')}>Entrada</button>
                <button disabled={enviando} className="btn btn-ghost" style={{justifyContent:'center'}} onClick={()=>baterPonto('SAIDA')}>Saída</button>
                <button disabled={enviando} className="btn btn-ghost" style={{justifyContent:'center'}} onClick={()=>baterPonto('INTERVALO_INICIO')}>Início intervalo</button>
                <button disabled={enviando} className="btn btn-ghost" style={{justifyContent:'center'}} onClick={()=>baterPonto('INTERVALO_FIM')}>Fim intervalo</button>
              </div>

              <p style={{fontSize:12, color:'#68766D', marginTop:16, lineHeight:1.5}}>
                Ao registrar o ponto, o sistema poderá solicitar a localização do aparelho para auditoria operacional.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
