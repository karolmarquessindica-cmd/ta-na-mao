// src/server.js
import './lib/loadEnv.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import net from 'net'
import { authRouter }        from './routes/auth.js'
import { manutencaoRouter }  from './routes/manutencao.js'
import { chamadoRouter }     from './routes/chamado.js'
import { documentoRouter }   from './routes/documento.js'
import { vozRouter }         from './routes/voz.js'
import { bannerRouter }      from './routes/banner.js'
import { inventarioRouter }  from './routes/inventario.js'
import { denunciaRouter }    from './routes/denuncia.js'
import { comunicadoRouter }  from './routes/comunicado.js'
import { dashboardRouter }   from './routes/dashboard.js'
import { notificacaoRouter } from './routes/notificacao.js'
import { whatsappRouter }    from './routes/whatsapp.js'
import { financeiroRouter }  from './routes/financeiro.js'
import { reservaRouter }     from './routes/reserva.js'
import { relatorioRouter }   from './routes/relatorio.js'
import { iaRouter }          from './routes/ia.js'
import { condominioRouter }  from './routes/condominio.js'
import { checklistsRouter }  from './routes/checklists.js'
import { agendadorRouter }   from './jobs/agendador.js'
import { errorHandler, requestId } from './middleware/errorHandler.js'
import { apiLimiter }        from './middleware/rateLimiter.js'

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001

function getRedisTarget() {
  try {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379')
    return { host: url.hostname || 'localhost', port: parseInt(url.port) || 6379 }
  } catch {
    return { host: 'localhost', port: 6379 }
  }
}

function canReachRedis(timeoutMs = 700) {
  const { host, port } = getRedisTarget()
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port })
    const done = ok => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (!process.env.S3_BUCKET) {
  app.use('/uploads', express.static('uploads'))
}

app.use(requestId)
app.use('/api', apiLimiter)

app.use('/api/auth',          authRouter)
app.use('/api/manutencoes',   manutencaoRouter)
app.use('/api/maintenance',   manutencaoRouter)
app.use('/api/chamados',      chamadoRouter)
app.use('/api/documentos',    documentoRouter)
app.use('/api/voz',           vozRouter)
app.use('/api/banners',       bannerRouter)
app.use('/api/inventario',    inventarioRouter)
app.use('/api/denuncias',     denunciaRouter)
app.use('/api/comunicados',   comunicadoRouter)
app.use('/api/dashboard',     dashboardRouter)
app.use('/api/notificacoes',  notificacaoRouter)
app.use('/api/whatsapp',      whatsappRouter)
app.use('/api/financeiro',    financeiroRouter)
app.use('/api/reservas',      reservaRouter)
app.use('/api/relatorios',    relatorioRouter)
app.use('/api/ia',            iaRouter)
app.use('/api/condominios',   condominioRouter)
app.use('/api/checklists',    checklistsRouter)
app.use('/api/jobs',          agendadorRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() }))
app.use(errorHandler)

app.listen(PORT, async () => {
  console.log(`\n🏢 Tá na Mão API v2.0 → http://localhost:${PORT}`)
  if (process.env.DISABLE_JOBS === 'true') {
    process.env.JOBS_BACKEND = 'disabled'
    console.log('[boot] Jobs desativados por DISABLE_JOBS=true')
    return
  }
  if (await canReachRedis()) {
    process.env.JOBS_BACKEND = 'bullmq'
    const [{ iniciarWorkers }, { iniciarScheduler }] = await Promise.all([
      import('./jobs/workers/index.js'),
      import('./jobs/scheduler.js'),
    ])
    iniciarWorkers()
    iniciarScheduler().catch(e => console.error('[boot] Falha ao iniciar scheduler:', e.message))
  } else {
    process.env.JOBS_BACKEND = 'native'
    const { iniciarNativeScheduler } = await import('./jobs/nativeScheduler.js')
    iniciarNativeScheduler()
  }
})

export default app
