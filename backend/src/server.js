// src/server.js
import './lib/loadEnv.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import net from 'net'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { authRouter }        from './routes/auth.js'
import { manutencaoRouter }  from './routes/manutencao.js'
import { manutencaoPlanejamentoRouter } from './routes/manutencaoPlanejamento.js'
import { manutencaoExecucaoPublicaRouter } from './routes/manutencaoExecucaoPublica.js'
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
import { gestaoAcaoRouter }  from './routes/gestaoAcao.js'
import { gestaoAcaoRecoveryRouter } from './routes/gestaoAcaoRecovery.js'
import { condominioRouter }  from './routes/condominio.js'
import { condominioDeleteSafeRouter } from './routes/condominioDeleteSafe.js'
import { condominioLogoSafeRouter } from './routes/condominioLogoSafe.js'
import { logoDataPublicRouter } from './routes/logoDataPublic.js'
import { portalConfigSaveSafeRouter } from './routes/portalConfigSaveSafe.js'
import { portalConfigCompatRouter } from './routes/portalConfigCompat.js'
import { portalDocumentosSafeRouter } from './routes/portalDocumentosSafe.js'
import { portalSlugSafeRouter } from './routes/portalSlugSafe.js'
import { portalSlugResolveRouter } from './routes/portalSlugResolve.js'
import { portalTicketConfirmSafeRouter } from './routes/portalTicketConfirmSafe.js'
import { portalPublicSafeRouter } from './routes/portalPublicSafe.js'
import { portalRouter }      from './routes/portal.js'
import { arquivosPublicosRouter } from './routes/arquivosPublicos.js'
import { checklistPresetsSafeRouter } from './routes/checklistPresetsSafe.js'
import { checklistsRouter }  from './routes/checklists.js'
import { agendadorRouter }   from './jobs/agendador.js'
import { errorHandler, requestId } from './middleware/errorHandler.js'
import { apiLimiter }        from './middleware/rateLimiter.js'
import { ensureBootstrapData } from './lib/bootstrap.js'

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsPath = path.resolve(__dirname, '../uploads')
fs.mkdirSync(uploadsPath, { recursive: true })

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
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d',
  etag: true,
  fallthrough: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  }
}))

app.use(requestId)
app.use('/api', apiLimiter)

app.use('/api/auth',          authRouter)
app.use('/api/logo-data',     logoDataPublicRouter)
app.use('/api/manutencoes',   manutencaoExecucaoPublicaRouter)
app.use('/api/manutencoes',   manutencaoPlanejamentoRouter)
app.use('/api/manutencoes',   manutencaoRouter)
app.use('/api/maintenance',   manutencaoExecucaoPublicaRouter)
app.use('/api/maintenance',   manutencaoPlanejamentoRouter)
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
app.use('/api/gestao-acao',   gestaoAcaoRouter)
app.use('/api/gestao-acao-recovery', gestaoAcaoRecoveryRouter)
app.use('/api/condominios',   portalSlugSafeRouter)
app.use('/api/condominios',   portalConfigSaveSafeRouter)
app.use('/api/condominios',   portalConfigCompatRouter)
app.use('/api/condominios',   portalDocumentosSafeRouter)
app.use('/api/condominios',   condominioLogoSafeRouter)
app.use('/api/condominios',   condominioDeleteSafeRouter)
app.use('/api/condominios',   condominioRouter)

// Chamados públicos devem ser avaliados antes de qualquer middleware genérico de portal.
app.use('/api/portal-public', portalTicketConfirmSafeRouter)
app.use('/api/public/portal', portalTicketConfirmSafeRouter)
app.use('/api/portal',        portalTicketConfirmSafeRouter)

// Demais rotas públicas do portal.
app.use('/api/portal-public', portalSlugResolveRouter)
app.use('/api/public/portal', portalSlugResolveRouter)
app.use('/api/portal',        portalSlugResolveRouter)
app.use('/api/portal-public', portalPublicSafeRouter)
app.use('/api/public/portal', portalPublicSafeRouter)
app.use('/api/portal',        portalPublicSafeRouter)
app.use('/api/portal',        portalRouter)

app.use('/api/arquivos',      arquivosPublicosRouter)
app.use('/api/checklists',    checklistPresetsSafeRouter)
app.use('/api/checklists',    checklistsRouter)
app.use('/api/jobs',          agendadorRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '2.0.5', portalTickets: 'direct-first', ts: new Date().toISOString() }))
app.use(errorHandler)

app.listen(PORT, async () => {
  console.log(`\n🏢 Tá na Mão API v2.0 → http://localhost:${PORT}`)
  await ensureBootstrapData()
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