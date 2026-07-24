import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const gestaoAcaoRouter = Router()
gestaoAcaoRouter.use(authenticate)
gestaoAcaoRouter.use(requireRole('ADMIN', 'SINDICO'))

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
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "GestaoAcao_condominioId_legacyId_key" ON "GestaoAcao"("condominioId", "legacyId") WHERE "legacyId" IS NOT NULL`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "GestaoAcao_condominioId_data_idx" ON "GestaoAcao"("condominioId", "data" DESC)`)
}

async function accessibleCondominio(userId, condominioId) {
  return prisma.condominio.findFirst({
    where: {
      id: condominioId,
      OR: [
        { users: { some: { id: userId } } },
        { acessos: { some: { userId } } },
      ],
    },
    select: { id: true, nome: true, endereco: true, portalConfig: true },
  })
}

function legacyItems(condominio) {
  const cfg = condominio?.portalConfig || {}
  const candidates = [
    cfg?.portalMorador?.gestaoAcao,
    cfg?.gestaoAcao,
    cfg?.config?.portalMorador?.gestaoAcao,
  ]
  return candidates.find(Array.isArray) || []
}

function normalizeItem(item = {}, condominio) {
  return {
    id: String(item.id || crypto.randomUUID()),
    legacyId: item.id ? String(item.id) : null,
    condominioId: condominio.id,
    condominioNome: condominio.nome,
    titulo: String(item.titulo || 'Registro da Gestão').trim() || 'Registro da Gestão',
    legenda: String(item.legenda || item.descricao || '').trim(),
    categoria: String(item.categoria || 'Outros').trim() || 'Outros',
    status: String(item.status || 'Concluído').trim() || 'Concluído',
    local: String(item.local || '').trim(),
    data: item.data || item.createdAt || new Date().toISOString(),
    fotos: Array.isArray(item.fotos) ? item.fotos : [],
    publicadoPortal: item.publicadoPortal !== false,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }
}

async function insertItem(item) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "GestaoAcao" ("id","legacyId","condominioId","titulo","legenda","categoria","status","local","data","fotos","publicadoPortal","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamp,$10::jsonb,$11,$12::timestamp,$13::timestamp)
     ON CONFLICT ("id") DO UPDATE SET
       "titulo"=EXCLUDED."titulo", "legenda"=EXCLUDED."legenda", "categoria"=EXCLUDED."categoria",
       "status"=EXCLUDED."status", "local"=EXCLUDED."local", "data"=EXCLUDED."data",
       "fotos"=EXCLUDED."fotos", "publicadoPortal"=EXCLUDED."publicadoPortal", "updatedAt"=EXCLUDED."updatedAt"`,
    item.id, item.legacyId, item.condominioId, item.titulo, item.legenda || null, item.categoria,
    item.status, item.local || null, item.data, JSON.stringify(item.fotos), item.publicadoPortal,
    item.createdAt, item.updatedAt,
  )
}

async function migrateLegacy(condominio) {
  const old = legacyItems(condominio)
  if (!old.length) return
  for (const raw of old) {
    const item = normalizeItem(raw, condominio)
    const existing = item.legacyId
      ? await prisma.$queryRawUnsafe(`SELECT "id" FROM "GestaoAcao" WHERE "condominioId"=$1 AND "legacyId"=$2 LIMIT 1`, condominio.id, item.legacyId)
      : []
    if (!existing.length) await insertItem(item)
  }
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

gestaoAcaoRouter.get('/', async (req, res, next) => {
  try {
    const condominioId = String(req.query.condominioId || '')
    if (!condominioId) return res.status(400).json({ error: 'Condomínio obrigatório.' })
    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    await ensureTable()
    await migrateLegacy(condominio)
    const items = await listItems(condominio.id)
    res.json({ condominio: { id: condominio.id, nome: condominio.nome, endereco: condominio.endereco }, items })
  } catch (error) { next(error) }
})

gestaoAcaoRouter.put('/sync', async (req, res, next) => {
  try {
    const condominioId = String(req.body?.condominioId || '')
    const incoming = Array.isArray(req.body?.items) ? req.body.items : []
    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    await ensureTable()
    const normalized = incoming.slice(0, 500).map(item => normalizeItem(item, condominio))
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`DELETE FROM "GestaoAcao" WHERE "condominioId"=$1`, condominio.id)
      for (const item of normalized) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "GestaoAcao" ("id","legacyId","condominioId","titulo","legenda","categoria","status","local","data","fotos","publicadoPortal","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamp,$10::jsonb,$11,$12::timestamp,$13::timestamp)`,
          item.id, item.legacyId, item.condominioId, item.titulo, item.legenda || null, item.categoria,
          item.status, item.local || null, item.data, JSON.stringify(item.fotos), item.publicadoPortal,
          item.createdAt, item.updatedAt,
        )
      }
    })
    const saved = await listItems(condominio.id)
    await mirrorToPortalConfig(condominio, saved)
    res.json({ ok: true, items: saved })
  } catch (error) { next(error) }
})
