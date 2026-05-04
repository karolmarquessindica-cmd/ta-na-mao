import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { criarNotificacao } from './notificacao.js'
import { enviarWhatsApp } from './whatsapp.js'

export const portariaRouter = Router()

let ensured = false

async function ensurePortariaTables() {
  if (ensured) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PortariaOcorrencia" (
      "id" TEXT PRIMARY KEY,
      "condominioId" TEXT NOT NULL,
      "qrToken" TEXT,
      "origem" TEXT NOT NULL DEFAULT 'PORTARIA',
      "tipo" TEXT NOT NULL,
      "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
      "titulo" TEXT NOT NULL,
      "descricao" TEXT NOT NULL,
      "bloco" TEXT,
      "unidade" TEXT,
      "contato" TEXT,
      "foto" TEXT,
      "latitude" DOUBLE PRECISION,
      "longitude" DOUBLE PRECISION,
      "statusLocalizacao" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ABERTA',
      "ip" TEXT,
      "navegador" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PortariaOcorrencia_condominioId_idx" ON "PortariaOcorrencia" ("condominioId")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PortariaOcorrencia_status_idx" ON "PortariaOcorrencia" ("status")`)
  ensured = true
}

async function validarTokenTemporario(token) {
  if (!token) return null
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "FuncionarioQrSessao" WHERE "token"=$1 AND "ativo"=true LIMIT 1`,
    token
  )
  const sessao = rows?.[0]
  if (!sessao) return null
  if (new Date(sessao.expiraEm).getTime() < Date.now()) return null
  return sessao
}

function normalizarTipo(tipo) {
  const permitidos = ['RECLAMACAO', 'INCIDENTE', 'SEGURANCA', 'MANUTENCAO', 'VISITANTE', 'ENTREGA', 'OUTRO']
  return permitidos.includes(String(tipo || '').toUpperCase()) ? String(tipo).toUpperCase() : 'OUTRO'
}

function normalizarPrioridade(prioridade) {
  const permitidas = ['BAIXA', 'MEDIA', 'ALTA']
  return permitidas.includes(String(prioridade || '').toUpperCase()) ? String(prioridade).toUpperCase() : 'MEDIA'
}

function montarMensagemOcorrencia(ocorrencia, condominioNome = 'Condomínio') {
  const local = [ocorrencia.bloco ? `Bloco ${ocorrencia.bloco}` : '', ocorrencia.unidade ? `Unidade ${ocorrencia.unidade}` : ''].filter(Boolean).join(' • ')
  return [
    '🚨 *Nova ocorrência registrada na portaria*',
    '',
    `🏢 *${condominioNome}*`,
    `📌 *${ocorrencia.titulo}*`,
    `🧾 Tipo: ${ocorrencia.tipo}`,
    `⚠️ Prioridade: ${ocorrencia.prioridade}`,
    local ? `📍 Local: ${local}` : null,
    ocorrencia.contato ? `☎️ Contato: ${ocorrencia.contato}` : null,
    '',
    `Descrição: ${ocorrencia.descricao}`,
    '',
    'Acesse o painel para acompanhar e tratar a ocorrência.'
  ].filter(Boolean).join('\n')
}

async function notificarAdmins({ condominioId, ocorrencia }) {
  const [admins, condominio] = await Promise.all([
    prisma.user.findMany({
      where: { condominioId, role: { in: ['ADMIN', 'SINDICO'] }, ativo: true },
      select: { id: true, whatsapp: true, nome: true },
    }),
    prisma.condominio.findUnique({ where: { id: condominioId }, select: { nome: true } })
  ])

  await Promise.allSettled(admins.map(admin => criarNotificacao({
    condominioId,
    userId: admin.id,
    tipo: 'CHAMADO_ABERTO',
    titulo: 'Nova ocorrência na portaria',
    mensagem: `${ocorrencia.tipo}: ${ocorrencia.titulo}`,
    link: '/funcionarios',
  })))

  const mensagem = montarMensagemOcorrencia(ocorrencia, condominio?.nome)
  await Promise.allSettled(
    admins
      .filter(admin => admin.whatsapp)
      .map(admin => enviarWhatsApp({
        condominioId,
        numero: admin.whatsapp,
        mensagem,
        evento: 'PORTARIA_OCORRENCIA',
      }))
  )
}

portariaRouter.post('/ocorrencias/:token', async (req, res, next) => {
  try {
    await ensurePortariaTables()
    const sessao = await validarTokenTemporario(req.params.token)
    if (!sessao) return res.status(410).json({ error: 'QR Code expirado. Gere um novo QR na portaria.', code: 'QR_EXPIRED' })

    const {
      tipo,
      prioridade,
      titulo,
      descricao,
      bloco,
      unidade,
      contato,
      foto,
      latitude,
      longitude,
      statusLocalizacao,
    } = req.body

    if (!titulo || !descricao) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios', code: 'VALIDATION_ERROR' })
    }

    const id = crypto.randomUUID()
    const tipoFinal = normalizarTipo(tipo)
    const prioridadeFinal = normalizarPrioridade(prioridade)

    await prisma.$executeRawUnsafe(
      `INSERT INTO "PortariaOcorrencia" (
        "id", "condominioId", "qrToken", "tipo", "prioridade", "titulo", "descricao", "bloco", "unidade", "contato", "foto",
        "latitude", "longitude", "statusLocalizacao", "ip", "navegador"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      id,
      sessao.condominioId,
      req.params.token,
      tipoFinal,
      prioridadeFinal,
      titulo,
      descricao,
      bloco || null,
      unidade || null,
      contato || null,
      foto || null,
      latitude === undefined ? null : Number(latitude),
      longitude === undefined ? null : Number(longitude),
      statusLocalizacao || null,
      req.ip || null,
      req.headers['user-agent'] || null
    )

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "PortariaOcorrencia" WHERE "id"=$1 LIMIT 1`, id)
    const ocorrencia = rows?.[0]
    await notificarAdmins({ condominioId: sessao.condominioId, ocorrencia })

    res.status(201).json({ ok: true, data: ocorrencia })
  } catch (e) { next(e) }
})

portariaRouter.use(authenticate)

portariaRouter.get('/ocorrencias', async (req, res, next) => {
  try {
    await ensurePortariaTables()
    const data = await prisma.$queryRawUnsafe(
      `SELECT * FROM "PortariaOcorrencia" WHERE "condominioId"=$1 ORDER BY "createdAt" DESC LIMIT 200`,
      req.user.condominioId
    )
    res.json({ data, total: data.length })
  } catch (e) { next(e) }
})

portariaRouter.patch('/ocorrencias/:id', async (req, res, next) => {
  try {
    await ensurePortariaTables()
    const status = String(req.body.status || 'EM_ANALISE').toUpperCase()
    await prisma.$executeRawUnsafe(
      `UPDATE "PortariaOcorrencia" SET "status"=$1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "condominioId"=$3`,
      status,
      req.params.id,
      req.user.condominioId
    )
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "PortariaOcorrencia" WHERE "id"=$1 AND "condominioId"=$2 LIMIT 1`, req.params.id, req.user.condominioId)
    res.json(rows?.[0] || null)
  } catch (e) { next(e) }
})
