import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const manutencaoControleRouter = Router()

function normalizeConfig(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeItems(value) {
  return Array.isArray(value) ? value : []
}

async function getCondominio(req, id) {
  const requestedId = id || req.user.condominioId
  if (!requestedId) return null
  if (requestedId === req.user.condominioId) {
    return prisma.condominio.findUnique({ where: { id: requestedId } })
  }
  return prisma.condominio.findFirst({
    where: {
      id: requestedId,
      OR: [
        { users: { some: { id: req.user.id } } },
        { acessos: { some: { userId: req.user.id } } },
      ],
    },
  })
}

function cleanItem(body, previous = {}) {
  return {
    id: previous.id || crypto.randomUUID(),
    nome: String(body.nome ?? previous.nome ?? '').trim(),
    ultima: body.ultima || previous.ultima || '',
    proxima: body.proxima || previous.proxima || '',
    status: body.status || previous.status || 'EM_DIA',
    observacao: String(body.observacao ?? previous.observacao ?? '').trim(),
    updatedAt: new Date().toISOString(),
  }
}

async function saveItems(condominio, items) {
  const config = normalizeConfig(condominio.portalConfig)
  const nextConfig = { ...config, manutencoesControle: items }
  return prisma.condominio.update({
    where: { id: condominio.id },
    data: { portalConfig: nextConfig },
  })
}

manutencaoControleRouter.use(authenticate)

manutencaoControleRouter.get('/:condominioId/manutencoes-controle', async (req, res, next) => {
  try {
    const condominio = await getCondominio(req, req.params.condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })
    const config = normalizeConfig(condominio.portalConfig)
    const items = normalizeItems(config.manutencoesControle)
    res.json({ condominioId: condominio.id, items })
  } catch (e) { next(e) }
})

manutencaoControleRouter.post('/:condominioId/manutencoes-controle', async (req, res, next) => {
  try {
    const condominio = await getCondominio(req, req.params.condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })
    const item = cleanItem(req.body || {})
    if (!item.nome) return res.status(400).json({ error: 'Informe o nome da manutenção', code: 'NAME_REQUIRED' })
    const config = normalizeConfig(condominio.portalConfig)
    const items = normalizeItems(config.manutencoesControle)
    items.push(item)
    await saveItems(condominio, items)
    res.status(201).json({ item })
  } catch (e) { next(e) }
})

manutencaoControleRouter.patch('/:condominioId/manutencoes-controle/:itemId', async (req, res, next) => {
  try {
    const condominio = await getCondominio(req, req.params.condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })
    const config = normalizeConfig(condominio.portalConfig)
    const items = normalizeItems(config.manutencoesControle)
    const index = items.findIndex(item => item?.id === req.params.itemId)
    if (index < 0) return res.status(404).json({ error: 'Manutenção não encontrada na tabela', code: 'ITEM_NOT_FOUND' })
    const item = cleanItem(req.body || {}, items[index])
    if (!item.nome) return res.status(400).json({ error: 'Informe o nome da manutenção', code: 'NAME_REQUIRED' })
    items[index] = item
    await saveItems(condominio, items)
    res.json({ item })
  } catch (e) { next(e) }
})

manutencaoControleRouter.delete('/:condominioId/manutencoes-controle/:itemId', async (req, res, next) => {
  try {
    const condominio = await getCondominio(req, req.params.condominioId)
    if (!condominio) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })
    const config = normalizeConfig(condominio.portalConfig)
    const items = normalizeItems(config.manutencoesControle)
    const nextItems = items.filter(item => item?.id !== req.params.itemId)
    if (nextItems.length === items.length) return res.status(404).json({ error: 'Manutenção não encontrada na tabela', code: 'ITEM_NOT_FOUND' })
    await saveItems(condominio, nextItems)
    res.json({ ok: true })
  } catch (e) { next(e) }
})
