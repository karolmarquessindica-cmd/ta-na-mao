import crypto from 'crypto'
import { prisma } from './prisma.js'
import { authenticate } from '../middleware/auth.js'

let ensured = false

export async function ensureSaasTables() {
  if (ensured) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SaasConta" (
      "id" TEXT PRIMARY KEY,
      "nome" TEXT NOT NULL,
      "plano" TEXT NOT NULL DEFAULT 'BASICO',
      "limiteCondominios" INTEGER NOT NULL DEFAULT 1,
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      "donoUserId" TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  ensured = true
}

export function isAdminMaster(user) {
  const masterEmail = process.env.ADMIN_MASTER_EMAIL || 'admin@horizonte.com'
  return user?.role === 'ADMIN_MASTER' || (user?.role === 'ADMIN' && user?.email === masterEmail)
}

export async function requireAdminMaster(req, res, next) {
  try {
    if (!isAdminMaster(req.user)) {
      return res.status(403).json({
        error: 'Acesso exclusivo da administradora master do SaaS',
        code: 'SAAS_MASTER_FORBIDDEN'
      })
    }
    next()
  } catch (error) {
    next(error)
  }
}

export async function getContaSaasByUserId(userId) {
  await ensureSaasTables()
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "SaasConta" WHERE "donoUserId" = $1 LIMIT 1`,
    userId
  )
  return rows?.[0] || null
}

export async function getPlanoDoUsuario(user) {
  if (isAdminMaster(user)) {
    return {
      plano: 'MASTER',
      limiteCondominios: 999999,
      ativo: true,
      master: true
    }
  }

  const conta = await getContaSaasByUserId(user.id)

  if (conta) {
    return {
      id: conta.id,
      nome: conta.nome,
      plano: conta.plano,
      limiteCondominios: Number(conta.limiteCondominios || 1),
      ativo: Boolean(conta.ativo),
      master: false
    }
  }

  const fallback = Number.parseInt(process.env.MAX_CONDOMINIOS_PER_USER || '1', 10)

  return {
    plano: 'PADRAO',
    limiteCondominios: Number.isNaN(fallback) ? 1 : fallback,
    ativo: true,
    master: false
  }
}

export async function saasCondominioLimitMiddleware(req, res, next) {
  if (req.method !== 'POST' || req.path !== '/') return next()

  authenticate(req, res, async () => {
    try {
      const plano = await getPlanoDoUsuario(req.user)

      if (!plano.ativo) {
        return res.status(403).json({
          error: 'Conta SaaS inativa. Entre em contato com a administradora do sistema.',
          code: 'SAAS_ACCOUNT_INACTIVE'
        })
      }

      if (plano.master) return next()

      const total = await prisma.condominioAcesso.count({ where: { userId: req.user.id } })
      const limite = Number(plano.limiteCondominios || 1)

      if (total >= limite) {
        return res.status(403).json({
          error: `Limite de condominios atingido para o plano ${plano.plano}. Limite atual: ${limite}.`,
          code: 'SAAS_CONDOMINIO_LIMIT_REACHED',
          plano: plano.plano,
          limiteCondominios: limite,
          condominiosAtuais: total
        })
      }

      next()
    } catch (error) {
      next(error)
    }
  })
}

export function newSaasId() {
  return crypto.randomUUID()
}
