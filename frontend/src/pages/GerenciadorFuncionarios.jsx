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

export default function GerenciadorFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [qr, setQr] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', funcao: '', whatsapp: '', telefone: '', email: '', pin: '' })

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const resp = await apiReq('GET', '/funcionarios')
      setFuncionarios(resp.data || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) return setErro('Informe o nome do funcionário')
    try {
      await apiReq('POST', '/funcionarios', form)
      setForm({ nome: '', funcao: '', whatsapp: '', telefone: '', email: '', pin: '' })
      await carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  async function gerarQr() {
    setErro('')
    setQrLoading(true)
    try {
      const resp = await apiReq('GET', '/funcionarios/qr-link')
      setQr(resp)
    } catch (e) {
      setErro(e.message)
    } finally {
      setQrLoading(false)
    }
  }

  async function copiarLink() {
    if (!qr?.link) return
    await navigator.clipboard.writeText(qr.link)
    alert('Link copiado!')
  }

  function imprimirQr() {
    if (!qr?.qrCodeUrl) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Code do Funcionário</title></head>
      <body style="font-family:Arial;text-align:center;padding:40px">
        <h2>Portal do Funcionário</h2>
        <p>Escaneie o QR Code para registrar o ponto.</p>
        <img src="${qr.qrCodeUrl}" style="width:320px;height:320px" />
        <p style="font-size:12px;margin-top:20px;word-break:break-all">${qr.link}</p>
        <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  async function inativar(id) {
    if (!confirm('Inativar este funcionário?')) return
    try {
      await apiReq('DELETE', '/funcionarios/' + id)
      await carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  const ativos = funcionarios.filter(f => f.status === 'ATIVO').length
  const inativos = funcionarios.filter(f => f.status !== 'ATIVO').length

  return (
    <div className="page">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:22}}>
        <div>
          <h1 style={{fontSize:28, fontWeight:900, margin:0}}>Funcionários</h1>
          <p style={{color:'#68766D', marginTop:6}}>Cadastre colaboradores, PIN e acompanhe o painel do funcionário.</p>
        </div>
        <div style={{display:'flex', gap:10, alignItems:'stretch'}}>
          <button className="btn btn-primary" onClick={gerarQr} disabled={qrLoading}>
            {qrLoading ? 'Gerando...' : 'Gerar QR do ponto'}
          </button>
          <div className="card" style={{padding:14, minWidth:120}}><b style={{fontSize:24,color:'#16A34A'}}>{ativos}</b><div style={{fontSize:12}}>Ativos</div></div>
          <div className="card" style={{padding:14, minWidth:120}}><b style={{fontSize:24,color:'#EF4444'}}>{inativos}</b><div style={{fontSize:12}}>Inativos</div></div>
        </div>
      </div>

      {erro && <div className="card" style={{padding:12, marginBottom:14, color:'#721c24', background:'#fff5f5'}}>{erro}</div>}

      {qr && (
        <div className="card" style={{padding:20, marginBottom:18, display:'grid', gridTemplateColumns:'180px 1fr', gap:18, alignItems:'center', borderLeft:'5px solid #16A34A'}}>
          <div style={{background:'#fff', border:'1px solid #DDE7DE', borderRadius:18, padding:12, textAlign:'center'}}>
            <img src={qr.qrCodeUrl} alt="QR Code do Portal do Funcionário" style={{width:150, height:150}} />
          </div>
          <div>
            <h3 style={{margin:'0 0 6px'}}>QR Code do Portal do Funcionário</h3>
            <p style={{color:'#68766D', margin:'0 0 12px'}}>Imprima este QR e deixe na portaria/ambiente de trabalho. O funcionário escaneia, escolhe o nome, digita o PIN e registra o ponto.</p>
            <div style={{background:'#F5F8F3', border:'1px solid #DDE7DE', borderRadius:12, padding:10, fontSize:12, wordBreak:'break-all', marginBottom:12}}>{qr.link}</div>
            <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
              <button className="btn btn-sm btn-ghost" onClick={copiarLink}>Copiar link</button>
              <button className="btn btn-sm btn-primary" onClick={imprimirQr}>Imprimir QR</button>
              <a className="btn btn-sm btn-ghost" href={qr.link} target="_blank" rel="noreferrer">Abrir portal</a>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'360px 1fr', gap:18}}>
        <form onSubmit={salvar} className="card" style={{padding:20}}>
          <h3 style={{marginBottom:14}}>Novo funcionário</h3>
          <label>Nome</label>
          <input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Ex: João da Portaria" />
          <label style={{marginTop:12}}>Função</label>
          <input value={form.funcao} onChange={e=>setForm({...form,funcao:e.target.value})} placeholder="Porteiro, zelador..." />
          <label style={{marginTop:12}}>WhatsApp</label>
          <input value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} placeholder="5585999999999" />
          <label style={{marginTop:12}}>Telefone</label>
          <input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} />
          <label style={{marginTop:12}}>E-mail</label>
          <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <label style={{marginTop:12}}>PIN de acesso</label>
          <input value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})} placeholder="Opcional: 4 a 6 números" />
          <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', marginTop:18}}>Cadastrar funcionário</button>
        </form>

        <div className="card" style={{padding:20}}>
          <h3 style={{marginBottom:14}}>Equipe cadastrada</h3>
          {loading ? <div className="spin" /> : (
            <table className="table">
              <thead><tr><th>Nome</th><th>Função</th><th>WhatsApp</th><th>PIN</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {funcionarios.map(f => (
                  <tr key={f.id}>
                    <td><b>{f.nome}</b><br/><small>{f.email || ''}</small></td>
                    <td>{f.funcao}</td>
                    <td>{f.whatsapp || '-'}</td>
                    <td><b>{f.pin}</b></td>
                    <td><span className={f.status === 'ATIVO' ? 'badge bd-done' : 'badge bd-gray'}>{f.status}</span></td>
                    <td>{f.status === 'ATIVO' && <button className="btn btn-xs btn-ghost" onClick={()=>inativar(f.id)}>Inativar</button>}</td>
                  </tr>
                ))}
                {!funcionarios.length && <tr><td colSpan="6">Nenhum funcionário cadastrado ainda.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
