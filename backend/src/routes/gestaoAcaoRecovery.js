import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { esmeraldaGestaoAcaoRecovery } from '../data/esmeraldaGestaoAcaoRecovery.js'

export const gestaoAcaoRecoveryRouter = Router()
gestaoAcaoRecoveryRouter.use(authenticate)
gestaoAcaoRecoveryRouter.use(requireRole('ADMIN', 'SINDICO'))

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GestaoAcao" (
      "id" TEXT PRIMARY KEY,
      "legacyId" TEXT,
      "condominioId" TEXT NOT NULL,
      "titulo" TEXT NOT NULL,
      "legenda" TEXT,
      "categoria" TEXT NOT NULL DEFAULT 'Outros',
      "status" TEXT NOT NULL DEFAULT 'Concluído',
      "local" TEXT,
      "data" TIMESTAMP(3),
      "fotos" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "publicadoPortal" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "GestaoAcao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE CASCADE
    )
  `)
}

function normalizeName(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

async function listItems(condominioId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id","legacyId","condominioId","titulo","legenda","categoria","status","local","data","fotos","publicadoPortal","createdAt","updatedAt"
     FROM "GestaoAcao" WHERE "condominioId"=$1 ORDER BY COALESCE("data","createdAt") DESC, "createdAt" DESC`,
    condominioId,
  )
  return rows.map(row => ({
    ...row,
    data: row.data?.toISOString?.().slice(0, 10) || row.data,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
    fotos: Array.isArray(row.fotos) ? row.fotos : [],
  }))
}

async function mirrorToPortalConfig(condominio, items) {
  const current = condominio.portalConfig || {}
  const portalMorador = current.portalMorador || {}
  await prisma.condominio.update({
    where: { id: condominio.id },
    data: {
      portalConfig: {
        ...current,
        portalMorador: {
          ...portalMorador,
          gestaoAcao: items,
        },
      },
    },
  })
}

gestaoAcaoRecoveryRouter.post('/', async (req, res, next) => {
  try {
    const condominioId = String(req.body?.condominioId || '')
    if (!condominioId) return res.status(400).json({ error: 'Condomínio obrigatório.' })

    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        OR: [
          { users: { some: { id: req.user.id } } },
          { acessos: { some: { userId: req.user.id } } },
        ],
      },
      select: { id: true, nome: true, endereco: true, portalConfig: true },
    })
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    if (!normalizeName(condominio.nome).includes('esmeralda')) {
      return res.status(400).json({ error: 'A recuperação é exclusiva do Condomínio Esmeralda IV.' })
    }

    await ensureTable()
    let imported = 0
    let skipped = 0

    for (const item of esmeraldaGestaoAcaoRecovery) {
      const existing = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "GestaoAcao" WHERE "condominioId"=$1 AND ("id"=$2 OR "legacyId"=$2 OR ("titulo"=$3 AND COALESCE("data","createdAt")::date=$4::timestamp::date)) LIMIT 1`,
        condominio.id,
        item.id,
        item.titulo,
        item.data,
      )
      if (existing.length) {
        skipped += 1
        continue
      }
      const createdAt = `${item.data}T12:00:00.000Z`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "GestaoAcao" ("id","legacyId","condominioId","titulo","legenda","categoria","status","local","data","fotos","publicadoPortal","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamp,$10::jsonb,$11,$12::timestamp,$12::timestamp)`,
        item.id,
        item.id,
        condominio.id,
        item.titulo,
        item.legenda || null,
        item.categoria || 'Outros',
        item.status || 'Concluído',
        item.local || null,
        item.data,
        JSON.stringify(item.fotos || []),
        item.publicadoPortal !== false,
        createdAt,
      )
      imported += 1
    }

    const items = await listItems(condominio.id)
    await mirrorToPortalConfig(condominio, items)

    res.json({
      ok: true,
      condominio: { id: condominio.id, nome: condominio.nome, endereco: condominio.endereco },
      imported,
      skipped,
      total: items.length,
      items,
    })
  } catch (error) {
    next(error)
  }
})
