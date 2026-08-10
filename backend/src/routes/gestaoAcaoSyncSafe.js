import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const gestaoAcaoSyncSafeRouter = Router()
gestaoAcaoSyncSafeRouter.use(authenticate)
gestaoAcaoSyncSafeRouter.use(requireRole('ADMIN', 'SINDICO'))

const text = value => String(value ?? '').trim()

async function accessibleCondominio(userId, condominioId) {
  return prisma.condominio.findFirst({
    where: {
      id: condominioId,
      OR: [
        { users: { some: { id: userId } } },
        { acessos: { some: { userId } } },
      ],
    },
    select: { id: true, nome: true, portalConfig: true },
  })
}

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
}

function safeDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}

function normalizePhotos(item) {
  const values = Array.isArray(item?.fotos)
    ? item.fotos
    : Array.isArray(item?.imagens)
      ? item.imagens
      : [item?.foto || item?.imagem].filter(Boolean)
  return values.filter(Boolean).map(String).slice(0, 10)
}

function normalizeItem(item, condominio, index) {
  const id = text(item?.id) || `ga_${Date.now()}_${index}_${crypto.randomBytes(4).toString('hex')}`
  return {
    id,
    legacyId: text(item?.legacyId) || id,
    condominioId: condominio.id,
    titulo: text(item?.titulo || item?.nome) || 'Registro da Gestão',
    legenda: text(item?.legenda || item?.descricao || item?.texto || item?.conteudo),
    categoria: text(item?.categoria || item?.tipo) || 'Outros',
    status: text(item?.status) || 'Concluído',
    local: text(item?.local || item?.area),
    data: safeDate(item?.data || item?.createdAt),
    fotos: normalizePhotos(item),
    publicadoPortal: item?.publicadoPortal !== false && item?.visivelPortal !== false,
    createdAt: safeDate(item?.createdAt || item?.data),
    updatedAt: new Date().toISOString(),
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
        portalMorador: { ...portalMorador, gestaoAcao: items },
      },
    },
  })
}

gestaoAcaoSyncSafeRouter.put('/sync-safe', async (req, res, next) => {
  try {
    const condominioId = text(req.body?.condominioId)
    const incoming = Array.isArray(req.body?.items) ? req.body.items : []
    if (!condominioId) return res.status(400).json({ error: 'Condomínio obrigatório.' })
    if (!incoming.length) return res.status(400).json({ error: 'Nenhuma publicação recebida para salvar.' })

    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })

    await ensureTable()
    const normalized = incoming.slice(0, 500).map((item, index) => normalizeItem(item, condominio, index))

    await prisma.$transaction(async tx => {
      for (const item of normalized) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "GestaoAcao" ("id","legacyId","condominioId","titulo","legenda","categoria","status","local","data","fotos","publicadoPortal","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamp,$10::jsonb,$11,$12::timestamp,$13::timestamp)
           ON CONFLICT ("id") DO UPDATE SET
             "titulo"=EXCLUDED."titulo",
             "legenda"=EXCLUDED."legenda",
             "categoria"=EXCLUDED."categoria",
             "status"=EXCLUDED."status",
             "local"=EXCLUDED."local",
             "data"=EXCLUDED."data",
             "fotos"=EXCLUDED."fotos",
             "publicadoPortal"=EXCLUDED."publicadoPortal",
             "updatedAt"=EXCLUDED."updatedAt"`,
          item.id,
          item.legacyId,
          item.condominioId,
          item.titulo,
          item.legenda || null,
          item.categoria,
          item.status,
          item.local || null,
          item.data,
          JSON.stringify(item.fotos),
          item.publicadoPortal,
          item.createdAt,
          item.updatedAt,
        )
      }
    })

    const saved = await listItems(condominio.id)
    await mirrorToPortalConfig(condominio, saved)
    return res.json({ ok: true, savedCount: normalized.length, items: saved })
  } catch (error) {
    next(error)
  }
})