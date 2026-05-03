// src/routes/chamado.js  (v2 — com WhatsApp e Notificações)
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { enviarWhatsApp } from './whatsapp.js'
import { criarNotificacao } from './notificacao.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { buildCondominioWhere, buildDateRange, resolveCondominioScope } from '../lib/tenantScope.js'

export const chamadoRouter = Router()
chamadoRouter.use(authenticate)

chamadoRouter.get('/', async (req, res, next) => {
  try {
    const { status, categoria } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const selected = req.query.edificacaoId || req.query.condominioId || 'all'
    const scope = await resolveCondominioScope(req.user, selected)
    const where = {
      ...buildCondominioWhere(scope.condominioIds),
      ...buildDateRange('createdAt', req.query.de || req.query.dataInicial, req.query.ate || req.query.dataFinal),
    }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    if (status && status !== 'all')       where.status    = status
    if (categoria && categoria !== 'all') where.categoria = categoria

    const [data, total] = await Promise.all([
      prisma.chamado.findMany({
        where,
        include: {
          morador:     { select: { id: true, nome: true, unidade: true, bloco: true } },
          responsavel: { select: { id: true, nome: true } },
          condominio:  { select: { id: true, nome: true } },
          historico:   { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.chamado.count({ where }),
    ])
    res.json({
      ...paginatedResponse({ data, total, page, limit }),
      filters: {
        condominios: scope.condominios,
        selectedCondominioId: scope.selectedCondominioId,
        categoria: categoria || 'all',
        status: status || 'all',
        de: req.query.de || req.query.dataInicial || '',
        ate: req.query.ate || req.query.dataFinal || '',
      },
    })
  } catch (e) { next(e) }
})

chamadoRouter.get('/:id', async (req, res, next) => {
  try {
    const scope = await resolveCondominioScope(req.user, 'all')
    const where = { id: req.params.id, ...buildCondominioWhere(scope.condominioIds) }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    const item = await prisma.chamado.findFirst({
      where,
      include: {
        morador:     { select: { id: true, nome: true, unidade: true, bloco: true, whatsapp: true } },
        responsavel: { select: { id: true, nome: true } },
        condominio:  { select: { id: true, nome: true } },
        historico:   { orderBy: { createdAt: 'asc' } },
      }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    res.json(item)
  } catch (e) { next(e) }
})

chamadoRouter.post('/', async (req, res, next) => {
  try {
    const { titulo, descricao, categoria, prioridade, fotos } = req.body
    const item = await prisma.chamado.create({
      data: { titulo, descricao, categoria, prioridade: prioridade || 'MEDIA', fotos: fotos || [], moradorId: req.user.id, condominioId: req.user.condominioId },
      include: { morador: { select: { nome: true, whatsapp: true } } }
    })
    await prisma.historicoChamado.create({ data: { chamadoId: item.id, acao: 'Chamado aberto pelo morador' } })

    // Notificar admins
    const admins = await prisma.user.findMany({ where: { condominioId: req.user.condominioId, role: { in: ['ADMIN', 'SINDICO'] }, ativo: true } })
    const config = await prisma.configWhatsApp.findUnique({ where: { condominioId: req.user.condominioId } })
    for (const admin of admins) {
      await criarNotificacao({ condominioId: req.user.condominioId, userId: admin.id, tipo: 'CHAMADO_ABERTO', titulo: 'Novo chamado aberto', mensagem: `${item.morador?.nome}: ${titulo}`, link: '/chamados' })
      if (admin.whatsapp && config?.notifChamadoAberto) {
        await enviarWhatsApp({ condominioId: req.user.condominioId, numero: admin.whatsapp, mensagem: `🔔 *Novo Chamado — ${categoria}*\n\n*${titulo}*\nMorador: ${item.morador?.nome}` })
      }
    }
    res.status(201).json(item)
  } catch (e) { next(e) }
})

chamadoRouter.patch('/:id', async (req, res, next) => {
  try {
    const scope = await resolveCondominioScope(req.user, 'all')
    const where = { id: req.params.id, ...buildCondominioWhere(scope.condominioIds) }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    const existing = await prisma.chamado.findFirst({
      where,
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const { status, resposta, responsavelId, nota } = req.body
    const data = {}
    if (status)        data.status        = status
    if (resposta)      data.resposta      = resposta
    if (responsavelId) data.responsavelId = responsavelId
    if (status === 'CONCLUIDO') data.dataConclusao = new Date()

    const item = await prisma.chamado.update({
      where: { id: req.params.id }, data,
      include: { morador: { select: { id: true, nome: true, whatsapp: true } }, condominio: true }
    })

    const acoes = { EM_ANALISE: 'Em análise', CONCLUIDO: 'Concluído' }
    if (acoes[status]) {
      await prisma.historicoChamado.create({ data: { chamadoId: item.id, acao: `Chamado ${acoes[status]}`, nota: nota || resposta || null } })
    }

    if (status && item.morador) {
      const config = await prisma.configWhatsApp.findUnique({ where: { condominioId: item.condominioId } })
      if (status === 'CONCLUIDO') {
        await criarNotificacao({ condominioId: item.condominioId, userId: item.morador.id, tipo: 'CHAMADO_CONCLUIDO', titulo: 'Chamado concluído', mensagem: item.titulo, link: '/meus-chamados' })
        if (item.morador.whatsapp && config?.notifChamadoConcluido) {
          await enviarWhatsApp({ condominioId: item.condominioId, numero: item.morador.whatsapp, mensagem: `✅ *Chamado Concluído*\n\n*"${item.titulo}"* foi resolvido!\n${resposta ? `\n*Resposta:* ${resposta}` : ''}` })
        }
      } else if (status === 'EM_ANALISE') {
        await criarNotificacao({ condominioId: item.condominioId, userId: item.morador.id, tipo: 'CHAMADO_ATUALIZADO', titulo: 'Chamado em análise', mensagem: item.titulo, link: '/meus-chamados' })
        if (item.morador.whatsapp && config?.notifChamadoAtualizado) {
          await enviarWhatsApp({ condominioId: item.condominioId, numero: item.morador.whatsapp, mensagem: `🔍 *Chamado em Análise*\n\nSeu chamado *"${item.titulo}"* está sendo analisado.` })
        }
      }
    }
    res.json(item)
  } catch (e) { next(e) }
})
