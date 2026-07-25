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

function text(value) {
  return String(value ?? '').trim()
}

function looksLikePost(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  const hasMainText = Boolean(item.titulo || item.legenda || item.descricao || item.texto || item.conteudo)
  const hasPostMeta = Boolean(item.categoria || item.status || item.local || item.data || item.createdAt || item.publicadoPortal !== undefined)
  const hasMedia = Array.isArray(item.fotos) || Array.isArray(item.imagens) || Boolean(item.foto || item.imagem)
  return hasMainText && (hasPostMeta || hasMedia)
}

function collectLegacyArrays(value, path = 'portalConfig', found = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return found
  seen.add(value)
  if (Array.isArray(value)) {
    const posts = value.filter(looksLikePost)
    if (posts.length) found.push({ path, items: posts })
    value.forEach((item, index) => collectLegacyArrays(item, `${path}[${index}]`, found, seen))
    return found
  }
  for (const [key, child] of Object.entries(value)) {
    collectLegacyArrays(child, `${path}.${key}`, found, seen)
  }
  return found
}

function normalizePhotos(item) {
  const values = Array.isArray(item.fotos)
    ? item.fotos
    : Array.isArray(item.imagens)
      ? item.imagens
      : [item.foto || item.imagem].filter(Boolean)
  return values.filter(Boolean).map(String)
}

function stableLegacyId(item, sourcePath, index) {
  if (item.id) return String(item.id)
  if (item.legacyId) return String(item.legacyId)
  const raw = [sourcePath, index, item.titulo, item.data, item.createdAt, item.local].map(text).join('|')
  return `legacy_${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24)}`
}

function safeDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}

function normalizeItem(item = {}, condominio, sourcePath = 'unknown', index = 0) {
  const legacyId = stableLegacyId(item, sourcePath, index)
  return {
    id: text(item.id) || crypto.randomUUID(),
    legacyId,
    condominioId: condominio.id,
    condominioNome: condominio.nome,
    titulo: text(item.titulo || item.nome) || 'Registro da Gestão',
    legenda: text(item.legenda || item.descricao || item.texto || item.conteudo),
    categoria: text(item.categoria || item.tipo) || 'Outros',
    status: text(item.status) || 'Concluído',
    local: text(item.local || item.area),
    data: safeDate(item.data || item.createdAt),
    fotos: normalizePhotos(item),
    publicadoPortal: item.publicadoPortal !== false && item.visivelPortal !== false,
    createdAt: safeDate(item.createdAt || item.data),
    updatedAt: safeDate(item.updatedAt || item.createdAt || item.data),
    sourcePath,
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
  const sources = collectLegacyArrays(condominio.portalConfig || {})
  let imported = 0
  let skipped = 0
  for (const source of sources) {
    for (let index = 0; index < source.items.length; index += 1) {
      const item = normalizeItem(source.items[index], condominio, source.path, index)
      const existing = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "GestaoAcao" WHERE "condominioId"=$1 AND ("legacyId"=$2 OR "id"=$3) LIMIT 1`,
        condominio.id, item.legacyId, item.id,
      )
      if (existing.length) {
        skipped += 1
        continue
      }
      await insertItem(item)
      imported += 1
    }
  }
  return {
    sources: sources.map(source => ({ path: source.path, count: source.items.length })),
    found: sources.reduce((sum, source) => sum + source.items.length, 0),
    imported,
    skipped,
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
    const condominioId = text(req.query.condominioId)
    if (!condominioId) return res.status(400).json({ error: 'Condomínio obrigatório.' })
    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    await ensureTable()
    const audit = await migrateLegacy(condominio)
    const items = await listItems(condominio.id)
    if (items.length && audit.imported) await mirrorToPortalConfig(condominio, items)
    res.json({
      condominio: { id: condominio.id, nome: condominio.nome, endereco: condominio.endereco },
      items,
      audit: { ...audit, databaseCount: items.length },
    })
  } catch (error) { next(error) }
})

gestaoAcaoRouter.get('/audit', async (req, res, next) => {
  try {
    const condominioId = text(req.query.condominioId)
    if (!condominioId) return res.status(400).json({ error: 'Condomínio obrigatório.' })
    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    await ensureTable()
    const before = await listItems(condominio.id)
    const migration = await migrateLegacy(condominio)
    const after = await listItems(condominio.id)
    if (after.length) await mirrorToPortalConfig(condominio, after)
    res.json({
      ok: true,
      condominio: { id: condominio.id, nome: condominio.nome, endereco: condominio.endereco },
      beforeCount: before.length,
      afterCount: after.length,
      migration,
      items: after,
    })
  } catch (error) { next(error) }
})

gestaoAcaoRouter.put('/sync', async (req, res, next) => {
  try {
    const condominioId = text(req.body?.condominioId)
    const incoming = Array.isArray(req.body?.items) ? req.body.items : []
    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    await ensureTable()
    await migrateLegacy(condominio)

    const existing = await listItems(condominio.id)
    if (!incoming.length) {
      if (existing.length) await mirrorToPortalConfig(condominio, existing)
      return res.json({ ok: true, protectedFromEmptySync: true, items: existing })
    }

    const normalized = incoming.slice(0, 500).map((item, index) => normalizeItem(item, condominio, 'sync', index))
    for (const item of normalized) await insertItem(item)

    const saved = await listItems(condominio.id)
    await mirrorToPortalConfig(condominio, saved)
    res.json({ ok: true, items: saved })
  } catch (error) { next(error) }
})