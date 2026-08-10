import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const gestaoAcaoDeleteSafeRouter = Router()
gestaoAcaoDeleteSafeRouter.use(authenticate)
gestaoAcaoDeleteSafeRouter.use(requireRole('ADMIN', 'SINDICO'))

async function accessibleCondominio(userId, condominioId) {
  return prisma.condominio.findFirst({
    where: {
      id: condominioId,
      OR: [
        { users: { some: { id: userId } } },
        { acessos: { some: { userId } } },
      ],
    },
    select: { id: true, portalConfig: true },
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

gestaoAcaoDeleteSafeRouter.delete('/:id', async (req, res, next) => {
  try {
    const condominioId = String(req.query.condominioId || '').trim()
    const postId = String(req.params.id || '').trim()
    if (!condominioId || !postId) return res.status(400).json({ error: 'Publicação e condomínio são obrigatórios.' })

    const condominio = await accessibleCondominio(req.user.id, condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado.' })

    await ensureTable()
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "GestaoAcao" WHERE "condominioId"=$1 AND ("id"=$2 OR "legacyId"=$2)`,
      condominioId,
      postId,
    )

    const items = await listItems(condominioId)
    await mirrorToPortalConfig(condominio, items)

    res.json({ ok: true, deleted: Number(deleted || 0), id: postId, items })
  } catch (error) {
    next(error)
  }
})