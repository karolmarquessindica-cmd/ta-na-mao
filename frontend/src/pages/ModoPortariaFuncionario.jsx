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

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  const min = Math.floor(safe / 60)
  const sec = safe % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function ModoPortariaFuncionario() {
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [segundos, setSegundos] = useState(0)

  const expirado = !qr || segundos <= 0
  const progresso = useMemo(() => {
    if (!qr?.segundos) return 0
    return Math.max(0, Math.min(100, (segundos / qr.segundos) * 100))
  }, [qr, segundos])

  async function gerarQr() {
    setLoading(true)
    setErro('')
    try {
      const resp = await apiReq('POST', '/funcionarios/qr-temporario', { minutos: 4 })
      setQr(resp)
      setSegundos(resp.segundos || 240)
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copiarLink() {
    if (!qr?.link) return
    await navigator.clipboard.writeText(qr.link)
    alert('Link temporário copiado!')
  }

  useEffect(() => {
    if (!qr) return
    const timer = setInterval(() => {
      setSegundos(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [qr])

  useEffect(() => {
    gerarQr()
  }, [])

  return (
    <div className="page" style={{minHeight:'calc(100vh - 80px)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:22}}>
        <div>
          <h1 style={{fontSize:30, fontWeight:900, margin:0}}>Modo Portaria</h1>
          <p style={{color:'#68766D', marginTop:6}}>QR Code temporário para registro de ponto dos funcionários na portaria.</p>
        </div>
        <button className="btn btn-primary" onClick={gerarQr} disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar novo QR'}
        </button>
      </div>

      {erro && <div className="card" style={{padding:14, marginBottom:16, color:'#721c24', background:'#fff5f5'}}>{erro}</div>}

      <div style={{display:'grid', gridTemplateColumns:'minmax(360px, 520px) 1fr', gap:22, alignItems:'stretch'}}>
        <div className="card" style={{padding:28, textAlign:'center', borderRadius:28}}>
          <div style={{display:'inline-flex', alignItems:'center', gap:8, marginBottom:16, padding:'8px 13px', borderRadius:999, background: expirado ? '#FEE2E2' : '#DCFCE7', color: expirado ? '#991B1B' : '#166534', fontWeight:900, fontSize:13}}>
            <span style={{width:8, height:8, borderRadius:999, background:'currentColor', display:'inline-block'}} />
            {expirado ? 'QR expirado' : 'QR ativo'}
          </div>

          <div style={{background:'#fff', border:'1px solid #DDE7DE', borderRadius:26, padding:20, width:'100%', maxWidth:430, margin:'0 auto'}}>
            {qr?.qrCodeUrl ? (
              <img src={qr.qrCodeUrl} alt="QR temporário do ponto" style={{width:'100%', maxWidth:360, aspectRatio:'1/1', objectFit:'contain', opacity: expirado ? .35 : 1}} />
            ) : (
              <div className="spin" />
            )}
          </div>

          <div style={{fontSize:56, fontWeight:950, marginTop:20, color: expirado ? '#EF4444' : '#003B24', letterSpacing:'-.04em'}}>
            {formatTime(segundos)}
          </div>
          <div style={{fontSize:13, color:'#68766D', marginTop:4}}>expira automaticamente</div>

          <div style={{height:10, background:'#E8F0E8', borderRadius:999, overflow:'hidden', marginTop:18}}>
            <div style={{height:'100%', width:`${progresso}%`, background: expirado ? '#EF4444' : '#16A34A', borderRadius:999, transition:'width .4s linear'}} />
          </div>

          <div style={{display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginTop:18}}>
            <button className="btn btn-ghost" onClick={copiarLink} disabled={!qr?.link}>Copiar link</button>
            <a className="btn btn-ghost" href={qr?.link || '#'} target="_blank" rel="noreferrer" style={{pointerEvents: qr?.link ? 'auto' : 'none', opacity: qr?.link ? 1 : .5}}>Testar portal</a>
          </div>
        </div>

        <div className="card" style={{padding:26, borderRadius:28, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <h2 style={{fontSize:24, fontWeight:900, margin:'0 0 12px'}}>Como usar na portaria</h2>
          <div style={{display:'grid', gap:14}}>
            {[
              ['1', 'Deixe esta tela aberta no computador da portaria.'],
              ['2', 'O funcionário escaneia o QR Code com o celular.'],
              ['3', 'Ele escolhe o nome, digita o PIN e registra entrada/saída.'],
              ['4', 'O QR expira em 4 minutos para evitar fraude ou uso fora do local.'],
              ['5', 'Quando expirar, clique em Gerar novo QR.']
            ].map(item => (
              <div key={item[0]} style={{display:'flex', gap:12, alignItems:'flex-start'}}>
                <div style={{width:32, height:32, borderRadius:12, background:'#DCFCE7', color:'#166534', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, flexShrink:0}}>{item[0]}</div>
                <p style={{margin:0, color:'#344054', lineHeight:1.45}}>{item[1]}</p>
              </div>
            ))}
          </div>

          <div style={{marginTop:24, padding:16, borderRadius:18, background:'#F0F8F1', border:'1px solid #DDE7DE'}}>
            <b style={{color:'#003B24'}}>Segurança operacional</b>
            <p style={{margin:'6px 0 0', color:'#68766D', lineHeight:1.45, fontSize:14}}>
              Esta opção é ideal para evitar que o QR seja fotografado e usado depois. Para mural fixo, use o QR impresso na tela de Funcionários.
            </p>
          </div>

          {qr?.link && (
            <div style={{marginTop:16, padding:12, borderRadius:14, background:'#F5F8F3', border:'1px solid #DDE7DE', fontSize:12, color:'#68766D', wordBreak:'break-all'}}>
              {qr.link}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
