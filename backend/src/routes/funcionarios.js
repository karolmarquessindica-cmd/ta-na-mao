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
  ensured = true
}

function pinClean(pin) {
  return String(pin || '').replace(/\D/g, '').slice(0, 6)
}

function gerarPin() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

funcionariosRouter.use(authenticate)

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
  try {
    await ensureFuncionarioTables()
    const { funcionarioId, pin, tipo, latitude, longitude, distanciaMetros, statusLocalizacao, justificativa } = req.body
    if (!funcionarioId || !tipo) return res.status(400).json({ error: 'Funcionário e tipo são obrigatórios', code: 'VALIDATION_ERROR' })

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Funcionario" WHERE "id"=$1 AND "condominioId"=$2 AND "status"='ATIVO' LIMIT 1`,
      funcionarioId,
      req.user.condominioId
    )
    const funcionario = rows?.[0]
    if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado', code: 'NOT_FOUND' })
    if (pin && pinClean(pin) !== String(funcionario.pin)) return res.status(403).json({ error: 'PIN inválido', code: 'INVALID_PIN' })

    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "FuncionarioPonto" ("id","funcionarioId","condominioId","tipo","latitude","longitude","distanciaMetros","statusLocalizacao","ip","navegador","justificativa")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      id,
      funcionarioId,
      req.user.condominioId,
      tipo,
      latitude === undefined ? null : Number(latitude),
      longitude === undefined ? null : Number(longitude),
      distanciaMetros === undefined ? null : Number(distanciaMetros),
      statusLocalizacao || null,
      req.ip || null,
      req.headers['user-agent'] || null,
      justificativa || null
    )

    const ponto = await prisma.$queryRawUnsafe(`SELECT * FROM "FuncionarioPonto" WHERE "id"=$1 LIMIT 1`, id)
    res.status(201).json(ponto?.[0])
  } catch (e) { next(e) }
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
