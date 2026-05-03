// src/routes/comunicado.js
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'

export const comunicadoRouter = Router()
comunicadoRouter.use(authenticate)

comunicadoRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }

    const [data, total] = await Promise.all([
      prisma.comunicado.findMany({
        where,
        orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.comunicado.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

comunicadoRouter.post('/', async (req, res, next) => {
  try {
    const { titulo, conteudo, emoji, fixado } = req.body
    const item = await prisma.comunicado.create({
      data: { titulo, conteudo, emoji, fixado: fixado || false, condominioId: req.user.condominioId }
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

comunicadoRouter.delete('/:id', async (req, res, next) => {
  try {
    const item = await prisma.comunicado.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    await prisma.comunicado.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})
