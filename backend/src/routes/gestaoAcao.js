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

function looksLikePost(item) {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item) && (
    item.titulo || item.legenda || item.descricao || item.categoria || item.local ||
    Array.isArray(item.fotos) || item.publicadoPortal !== undefined
  ))
}

function collectPostArrays(value, depth = 0, seen = new Set()) {
  if (depth > 8 || value === null || value === undefined) return []
  if (typeof value === 'object') {
    if (seen.has(value)) return []
    seen.add(value)
  }
  if (Array.isArray(value)) {
    if (value.some(looksLikePost)) return value.filter(looksLikePost)
    return value.flatMap(item => collectPostArrays(item, depth + 1, seen))
  }
  if (typeof value !== 'object') return []
  const priorityKeys = ['gestaoAcao', 'gestao_em_acao', 'gestaoEmAcao', 'publicacoes', 'postagens', 'feedGestao', 'acoesGestao']
  const priority = priorityKeys.flatMap(key => collectPostArrays(value[key], depth + 1, seen))
  if (priority.length) return priority
  return Object.values(value).flatMap(item => collectPostArrays(item, depth + 1, seen))
}

function legacyItems(condominio) {
  const cfg = condominio?.portalConfig || {}
  const found = collectPostArrays(cfg)
  const unique = []
  for (const item of found) {
    const identity = String(item.id || item.createdAt || `${item.titulo || ''}|${item.data || ''}|${item.local || ''}`)
    if (!unique.some(current => String(current.id || current.createdAt || `${current.titulo || ''}|${current.data || ''}|${current.local || ''}`) === identity)) unique.push(item)
  }
  return unique
}

function safeDate(value) {
  const parsed = value ? new Date(value) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeItem(item = {}, condominio) {
  return {
    id: String(item.id || crypto.randomUUID()),
    legacyId: item.id ? String(item.id) : null,
    condominioId: condominio.id,
    condominioNome: condominio.nome,
    titulo: String(item.titulo || item.nome || 'Registro da Gestão').trim() || 'Registro da Gestão',
    legenda: String(item.legenda || item.descricao || item.texto || item.conteudo || '').trim(),
    categoria: String(item.categoria || item.tipo || 'Outros').trim() || 'Outros',
    status: String(item.status || 'Concluído').trim() || 'Concluído',
    local: String(item.local || item.area || '').trim(),
    data: safeDate(item.data || item.dataAcao || item.createdAt),
    fotos: Array.isArray(item.fotos) ? item.fotos : Array.isArray(item.imagens) ? item.imagens : item.foto ? [item.foto] : [],
    publicadoPortal: item.publicadoPortal !== false && item.visivelPortal !== false && item.publicado !== false,
    createdAt: safeDate(item.createdAt || item.data),
    updatedAt: safeDate(item.updatedAt || item.createdAt || item.data),
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
  for (const raw of old) {
    const item = normalizeItem(raw, condominio)
    const existing = item.legacyId
      ? await prisma.$queryRawUnsafe(`SELECT "id" FROM "GestaoAcao" WHERE "condominioId"=$1 AND "legacyId"=$2 LIMIT 1`, condominio.id, item.legacyId)
      : await prisma.$queryRawUnsafe(`SELECT "id" FROM "GestaoAcao" WHERE "condominioId"=$1 AND "titulo"=$2 AND COALESCE("data","createdAt")::date=$3::timestamp::date LIMIT 1`, condominio.id, item.titulo, item.data)
    if (!existing.length) await insertItem(item)
  }
  return old.length
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
    const migrated = await migrateLegacy(condominio)
    const items = await listItems(condominio.id)
    res.json({ condominio: { id: condominio.id, nome: condominio.nome, endereco: condominio.endereco }, items, migrated })
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