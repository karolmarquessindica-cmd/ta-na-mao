// src/routes/notificacao.js
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'

export const notificacaoRouter = Router()
notificacaoRouter.use(authenticate)

// GET /api/notificacoes — notificações do usuário logado, com paginação
notificacaoRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { userId: req.user.id, condominioId: req.user.condominioId }

    const [data, total, naoLidas] = await Promise.all([
      prisma.notificacao.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notificacao.count({ where }),
      prisma.notificacao.count({ where: { userId: req.user.id, condominioId: req.user.condominioId, lida: false } }),
    ])
    res.json({ ...paginatedResponse({ data, total, page, limit }), naoLidas })
  } catch (e) { next(e) }
})

// PATCH /api/notificacoes/:id/lida
notificacaoRouter.patch('/:id/lida', async (req, res, next) => {
  try {
    const n = await prisma.notificacao.findFirst({
      where: { id: req.params.id, userId: req.user.id, condominioId: req.user.condominioId }
    })
    if (!n) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    const updated = await prisma.notificacao.update({
      where: { id: req.params.id },
      data: { lida: true }
    })
    res.json(updated)
  } catch (e) { next(e) }
})

// PATCH /api/notificacoes/marcar-todas-lidas
notificacaoRouter.patch('/marcar-todas-lidas', async (req, res, next) => {
  try {
    await prisma.notificacao.updateMany({
      where: { userId: req.user.id, condominioId: req.user.condominioId, lida: false },
      data: { lida: true }
    })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// ─── Helper exportado para criar notificações internamente ───
export async function criarNotificacao({ condominioId, userId, tipo, titulo, mensagem, link }) {
  try {
    return await prisma.notificacao.create({
      data: { condominioId, userId, tipo, titulo, mensagem, link: link || null }
    })
  } catch (e) {
    console.error('Erro ao criar notificação:', e.message)
  }
}

// Notificar todos os moradores de um condomínio
export async function notificarTodos({ condominioId, tipo, titulo, mensagem, link }) {
  try {
    const users = await prisma.user.findMany({
      where: { condominioId, ativo: true },
      select: { id: true }
    })
    await prisma.notificacao.createMany({
      data: users.map(u => ({ userId: u.id, condominioId, tipo, titulo, mensagem, link: link || null }))
    })
  } catch (e) {
    console.error('Erro ao notificar todos:', e.message)
  }
}
