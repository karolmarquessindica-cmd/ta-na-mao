// src/routes/reserva.js
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'

export const reservaRouter = Router()
reservaRouter.use(authenticate)

// GET /api/reservas/espacos — listar espaços comuns
reservaRouter.get('/espacos', async (req, res, next) => {
  try {
    const espacos = await prisma.espacoComum.findMany({
      where: { condominioId: req.user.condominioId, ativo: true },
      include: {
        _count: { select: { reservas: true } },
      },
      orderBy: { nome: 'asc' }
    })
    res.json(espacos)
  } catch (e) { next(e) }
})

// POST /api/reservas/espacos — criar espaço (admin)
reservaRouter.post('/espacos', async (req, res, next) => {
  try {
    const { nome, descricao, capacidade, regras } = req.body
    const espaco = await prisma.espacoComum.create({
      data: { nome, descricao, capacidade: capacidade ? parseInt(capacidade) : null, regras, condominioId: req.user.condominioId }
    })
    res.status(201).json(espaco)
  } catch (e) { next(e) }
})

// GET /api/reservas — listar reservas, com paginação
reservaRouter.get('/', async (req, res, next) => {
  try {
    const { espacoId, data: dataQuery } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    if (espacoId) where.espacoId = espacoId
    if (dataQuery) {
      const d = new Date(dataQuery)
      const d2 = new Date(d); d2.setDate(d2.getDate() + 1)
      where.data = { gte: d, lt: d2 }
    }

    const [items, total] = await Promise.all([
      prisma.reserva.findMany({
        where,
        include: {
          morador: { select: { id: true, nome: true, unidade: true } },
          espaco:  { select: { id: true, nome: true } },
        },
        orderBy: { data: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reserva.count({ where }),
    ])
    res.json(paginatedResponse({ data: items, total, page, limit }))
  } catch (e) { next(e) }
})

// POST /api/reservas — criar reserva
reservaRouter.post('/', async (req, res, next) => {
  try {
    const { espacoId, data, horaInicio, horaFim, observacao } = req.body
    const espaco = await prisma.espacoComum.findFirst({
      where: { id: espacoId, condominioId: req.user.condominioId, ativo: true },
      select: { id: true },
    })
    if (!espaco) return res.status(404).json({ error: 'EspaÃ§o nÃ£o encontrado', code: 'NOT_FOUND' })

    const conflito = await prisma.reserva.findFirst({
      where: {
        condominioId: req.user.condominioId,
        espacoId,
        data: new Date(data),
        status: { not: 'CANCELADA' },
        OR: [
          { horaInicio: { lte: horaInicio }, horaFim: { gt: horaInicio } },
          { horaInicio: { lt: horaFim }, horaFim: { gte: horaFim } },
          { horaInicio: { gte: horaInicio }, horaFim: { lte: horaFim } },
        ]
      }
    })
    if (conflito) {
      return res.status(409).json({ error: `Horário já reservado (${conflito.horaInicio}–${conflito.horaFim})`, code: 'RESERVATION_CONFLICT' })
    }

    const reserva = await prisma.reserva.create({
      data: {
        espacoId, data: new Date(data), horaInicio, horaFim, observacao,
        moradorId: req.user.id,
        condominioId: req.user.condominioId,
      },
      include: { espaco: { select: { nome: true } } }
    })
    res.status(201).json(reserva)
  } catch (e) { next(e) }
})

// PATCH /api/reservas/:id — confirmar ou cancelar
reservaRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.reserva.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const { status } = req.body
    const reserva = await prisma.reserva.update({
      where: { id: req.params.id },
      data: { status }
    })
    res.json(reserva)
  } catch (e) { next(e) }
})

// GET /api/reservas/disponibilidade — slots livres de um espaço
reservaRouter.get('/disponibilidade', async (req, res, next) => {
  try {
    const { espacoId, data } = req.query
    if (!espacoId || !data) return res.status(400).json({ error: 'espacoId e data obrigatórios', code: 'VALIDATION_ERROR' })

    const espaco = await prisma.espacoComum.findFirst({
      where: { id: espacoId, condominioId: req.user.condominioId, ativo: true }
    })
    if (!espaco) return res.status(404).json({ error: 'Espaço não encontrado', code: 'NOT_FOUND' })

    const d = new Date(data)
    const d2 = new Date(d); d2.setDate(d2.getDate() + 1)

    const reservas = await prisma.reserva.findMany({
      where: {
        espacoId,
        condominioId: req.user.condominioId,
        data: { gte: d, lt: d2 },
        status: { not: 'CANCELADA' },
      },
      select: { horaInicio: true, horaFim: true, status: true },
    })
    res.json(reservas)
  } catch (e) { next(e) }
})
