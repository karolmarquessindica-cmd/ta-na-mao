import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const funcionariosRouter = Router()

let ensured = false

export async function ensureFuncionarioTables() {
  if (ensured) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Funcionario" (
      "id" TEXT PRIMARY KEY,
      "nome" TEXT NOT NULL,
      "funcao" TEXT NOT NULL DEFAULT 'Colaborador',
      "telefone" TEXT,
      "whatsapp" TEXT,
      "email" TEXT,
      "pin" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ATIVO',
      "observacoes" TEXT,
      "condominioId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Funcionario_condominioId_idx" ON "Funcionario" ("condominioId")`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FuncionarioPonto" (
      "id" TEXT PRIMARY KEY,
      "funcionarioId" TEXT NOT NULL,
      "condominioId" TEXT NOT NULL,
      "tipo" TEXT NOT NULL,
      "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "latitude" DOUBLE PRECISION,
      "longitude" DOUBLE PRECISION,
      "distanciaMetros" DOUBLE PRECISION,
      "statusLocalizacao" TEXT,
      "ip" TEXT,
      "navegador" TEXT,
      "justificativa" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FuncionarioPonto_condominioId_idx" ON "FuncionarioPonto" ("condominioId")`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FuncionarioQrSessao" (
      "id" TEXT PRIMARY KEY,
      "token" TEXT NOT NULL UNIQUE,
      "condominioId" TEXT NOT NULL,
      "tipo" TEXT NOT NULL DEFAULT 'PORTARIA_TEMPORARIO',
      "expiraEm" TIMESTAMP(3) NOT NULL,
      "usos" INTEGER NOT NULL DEFAULT 0,
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FuncionarioQrSessao_token_idx" ON "FuncionarioQrSessao" ("token")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FuncionarioQrSessao_condominioId_idx" ON "FuncionarioQrSessao" ("condominioId")`)
  ensured = true
}

function pinClean(pin) {
  return String(pin || '').replace(/\D/g, '').slice(0, 6)
}

function gerarPin() {
  return String(Math.floor(1000 + Math.random() * 9000))
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

async function registrarPonto({ req, res, next, condominioId, publico = false, qrToken = null }) {
  try {
    await ensureFuncionarioTables()
    const { funcionarioId, pin, tipo, latitude, longitude, distanciaMetros, statusLocalizacao, justificativa } = req.body
    if (!funcionarioId || !tipo) return res.status(400).json({ error: 'Funcionário e tipo são obrigatórios', code: 'VALIDATION_ERROR' })

    if (qrToken) {
      const sessao = await validarTokenTemporario(qrToken)
      if (!sessao || sessao.condominioId !== condominioId) {
        return res.status(403).json({ error: 'QR Code expirado ou inválido', code: 'QR_EXPIRED' })
      }
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Funcionario" WHERE "id"=$1 AND "condominioId"=$2 AND "status"='ATIVO' LIMIT 1`,
      funcionarioId,
      condominioId
    )
    const funcionario = rows?.[0]
    if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado', code: 'NOT_FOUND' })
    if (!pin || pinClean(pin) !== String(funcionario.pin)) return res.status(403).json({ error: 'PIN inválido', code: 'INVALID_PIN' })

    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "FuncionarioPonto" ("id","funcionarioId","condominioId","tipo","latitude","longitude","distanciaMetros","statusLocalizacao","ip","navegador","justificativa")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      id,
      funcionarioId,
      condominioId,
      tipo,
      latitude === undefined ? null : Number(latitude),
      longitude === undefined ? null : Number(longitude),
      distanciaMetros === undefined ? null : Number(distanciaMetros),
      statusLocalizacao || null,
      req.ip || null,
      req.headers['user-agent'] || null,
      justificativa || (qrToken ? 'Registro via QR temporário da portaria' : publico ? 'Registro via QR Code fixo' : null)
    )

    if (qrToken) {
      await prisma.$executeRawUnsafe(
        `UPDATE "FuncionarioQrSessao" SET "usos"="usos"+1 WHERE "token"=$1`,
        qrToken
      )
    }

    const ponto = await prisma.$queryRawUnsafe(`SELECT * FROM "FuncionarioPonto" WHERE "id"=$1 LIMIT 1`, id)
    res.status(201).json(ponto?.[0])
  } catch (e) { next(e) }
}

// Rotas públicas do portal via QR Code. Não dão acesso administrativo.
funcionariosRouter.get('/portal/:condominioId', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const condominio = await prisma.condominio.findUnique({
      where: { id: req.params.condominioId },
      select: { id: true, nome: true, logo: true }
    })
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado', code: 'CONDOMINIO_NOT_FOUND' })

    const data = await prisma.$queryRawUnsafe(
      `SELECT "id", "nome", "funcao" FROM "Funcionario" WHERE "condominioId"=$1 AND "status"='ATIVO' ORDER BY "nome" ASC`,
      req.params.condominioId
    )
    res.json({ condominio, data, total: data.length, modo: 'FIXO' })
  } catch (e) { next(e) }
})

funcionariosRouter.post('/portal/:condominioId/ponto', async (req, res, next) => {
  return registrarPonto({ req, res, next, condominioId: req.params.condominioId, publico: true })
})

funcionariosRouter.get('/portal-temporario/:token', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const sessao = await validarTokenTemporario(req.params.token)
    if (!sessao) return res.status(410).json({ error: 'QR Code expirado. Solicite novo QR na portaria.', code: 'QR_EXPIRED' })

    const condominio = await prisma.condominio.findUnique({
      where: { id: sessao.condominioId },
      select: { id: true, nome: true, logo: true }
    })
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado', code: 'CONDOMINIO_NOT_FOUND' })

    const data = await prisma.$queryRawUnsafe(
      `SELECT "id", "nome", "funcao" FROM "Funcionario" WHERE "condominioId"=$1 AND "status"='ATIVO' ORDER BY "nome" ASC`,
      sessao.condominioId
    )

    res.json({
      condominio,
      data,
      total: data.length,
      modo: 'TEMPORARIO',
      token: req.params.token,
      expiraEm: sessao.expiraEm,
      segundosRestantes: Math.max(0, Math.floor((new Date(sessao.expiraEm).getTime() - Date.now()) / 1000)),
    })
  } catch (e) { next(e) }
})

funcionariosRouter.post('/portal-temporario/:token/ponto', async (req, res, next) => {
  const sessao = await validarTokenTemporario(req.params.token)
  if (!sessao) return res.status(410).json({ error: 'QR Code expirado. Solicite novo QR na portaria.', code: 'QR_EXPIRED' })
  return registrarPonto({ req, res, next, condominioId: sessao.condominioId, publico: true, qrToken: req.params.token })
})

funcionariosRouter.use(authenticate)

funcionariosRouter.get('/qr-link', async (req, res) => {
  const base = process.env.FRONTEND_URL || 'https://ta-na-mao-xeim.vercel.app'
  const link = `${base.replace(/\/$/, '')}/?portalFuncionario=${req.user.condominioId}`
  res.json({
    tipo: 'FIXO_IMPRESSO',
    condominioId: req.user.condominioId,
    link,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`,
  })
})

funcionariosRouter.post('/qr-temporario', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const minutos = Number(req.body?.minutos || 4)
    const validadeMinutos = Math.min(Math.max(minutos, 1), 15)
    const token = crypto.randomBytes(24).toString('base64url')
    const expiraEm = new Date(Date.now() + validadeMinutos * 60 * 1000)

    await prisma.$executeRawUnsafe(
      `INSERT INTO "FuncionarioQrSessao" ("id", "token", "condominioId", "tipo", "expiraEm") VALUES ($1,$2,$3,$4,$5)`,
      crypto.randomUUID(),
      token,
      req.user.condominioId,
      'PORTARIA_TEMPORARIO',
      expiraEm
    )

    const base = process.env.FRONTEND_URL || 'https://ta-na-mao-xeim.vercel.app'
    const link = `${base.replace(/\/$/, '')}/?portalFuncionarioToken=${token}`
    res.status(201).json({
      tipo: 'PORTARIA_TEMPORARIO',
      token,
      condominioId: req.user.condominioId,
      expiraEm,
      segundos: validadeMinutos * 60,
      link,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`,
    })
  } catch (e) { next(e) }
})

funcionariosRouter.get('/', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const { status, q } = req.query
    const params = [req.user.condominioId]
    let where = 'WHERE "condominioId"=$1'

    if (status && status !== 'TODOS') {
      params.push(String(status).toUpperCase())
      where += ` AND "status"=$${params.length}`
    }

    if (q) {
      params.push(`%${String(q).trim()}%`)
      where += ` AND ("nome" ILIKE $${params.length} OR "funcao" ILIKE $${params.length})`
    }

    const data = await prisma.$queryRawUnsafe(`SELECT * FROM "Funcionario" ${where} ORDER BY "createdAt" DESC`, ...params)
    res.json({ data, total: data.length })
  } catch (e) { next(e) }
})

funcionariosRouter.post('/', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const { nome, funcao, telefone, whatsapp, email, pin, status, observacoes } = req.body
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório', code: 'VALIDATION_ERROR' })

    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Funcionario" ("id","nome","funcao","telefone","whatsapp","email","pin","status","observacoes","condominioId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      id,
      nome,
      funcao || 'Colaborador',
      telefone || null,
      whatsapp || null,
      email || null,
      pinClean(pin) || gerarPin(),
      status || 'ATIVO',
      observacoes || null,
      req.user.condominioId
    )

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "Funcionario" WHERE "id"=$1 LIMIT 1`, id)
    res.status(201).json(rows?.[0])
  } catch (e) { next(e) }
})

funcionariosRouter.post('/:id/redefinir-pin', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Funcionario" WHERE "id"=$1 AND "condominioId"=$2 LIMIT 1`,
      req.params.id,
      req.user.condominioId
    )
    const funcionario = rows?.[0]
    if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado', code: 'NOT_FOUND' })

    const novoPin = gerarPin()
    const obsAnterior = funcionario.observacoes || ''
    const registro = `PIN redefinido em ${new Date().toLocaleString('pt-BR')} por usuário ${req.user?.nome || req.user?.email || req.user?.id || 'admin'}`
    const observacoes = [obsAnterior, registro].filter(Boolean).join('\n')

    await prisma.$executeRawUnsafe(
      `UPDATE "Funcionario" SET "pin"=$1, "observacoes"=$2, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$3 AND "condominioId"=$4`,
      novoPin,
      observacoes,
      req.params.id,
      req.user.condominioId
    )

    res.json({ ok: true, funcionarioId: req.params.id, nome: funcionario.nome, novoPin })
  } catch (e) { next(e) }
})

funcionariosRouter.patch('/:id', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Funcionario" WHERE "id"=$1 AND "condominioId"=$2 LIMIT 1`,
      req.params.id,
      req.user.condominioId
    )
    const atual = rows?.[0]
    if (!atual) return res.status(404).json({ error: 'Funcionário não encontrado', code: 'NOT_FOUND' })

    await prisma.$executeRawUnsafe(
      `UPDATE "Funcionario" SET "nome"=$1,"funcao"=$2,"telefone"=$3,"whatsapp"=$4,"email"=$5,"pin"=$6,"status"=$7,"observacoes"=$8,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$9 AND "condominioId"=$10`,
      req.body.nome ?? atual.nome,
      req.body.funcao ?? atual.funcao,
      req.body.telefone ?? atual.telefone,
      req.body.whatsapp ?? atual.whatsapp,
      req.body.email ?? atual.email,
      req.body.pin ? pinClean(req.body.pin) : atual.pin,
      req.body.status ?? atual.status,
      req.body.observacoes ?? atual.observacoes,
      req.params.id,
      req.user.condominioId
    )

    const updated = await prisma.$queryRawUnsafe(`SELECT * FROM "Funcionario" WHERE "id"=$1 LIMIT 1`, req.params.id)
    res.json(updated?.[0])
  } catch (e) { next(e) }
})

funcionariosRouter.delete('/:id', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    await prisma.$executeRawUnsafe(
      `UPDATE "Funcionario" SET "status"='INATIVO', "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "condominioId"=$2`,
      req.params.id,
      req.user.condominioId
    )
    res.json({ ok: true })
  } catch (e) { next(e) }
})

funcionariosRouter.post('/ponto', async (req, res, next) => {
  return registrarPonto({ req, res, next, condominioId: req.user.condominioId })
})

funcionariosRouter.get('/pontos', async (req, res, next) => {
  try {
    await ensureFuncionarioTables()
    const data = await prisma.$queryRawUnsafe(
      `SELECT p.*, f."nome" AS "funcionarioNome", f."funcao" AS "funcionarioFuncao"
       FROM "FuncionarioPonto" p
       LEFT JOIN "Funcionario" f ON f."id"=p."funcionarioId"
       WHERE p."condominioId"=$1
       ORDER BY p."dataHora" DESC
       LIMIT 300`,
      req.user.condominioId
    )
    res.json({ data, total: data.length })
  } catch (e) { next(e) }
})
