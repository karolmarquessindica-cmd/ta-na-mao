// src/routes/checklists.js
import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'

export const checklistsRouter = Router()

async function accessibleCondominioId(req, requestedId) {
  const condominioId = requestedId || req.user.condominioId
  if (!condominioId) return null
  if (condominioId === req.user.condominioId) return condominioId
  const acesso = await prisma.condominio.findFirst({
    where: {
      id: condominioId,
      OR: [
        { users: { some: { id: req.user.id } } },
        { acessos: { some: { userId: req.user.id } } },
      ],
    },
    select: { id: true },
  })
  return acesso?.id || null
}

function frontendUrl(req) {
  return (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')).replace(/\/$/, '')
}

checklistsRouter.get('/execucao/:token', async (req, res, next) => {
  try {
    const execucao = await prisma.checklistExecution.findFirst({
      where: { publicoToken: req.params.token, allowPublic: true },
      include: { template: true, condominio: true },
    })
    if (!execucao) return res.status(404).json({ error: 'Link de execução não encontrado', code: 'NOT_FOUND' })

    res.json({
      id: execucao.id,
      nome: execucao.nome,
      responsavel: execucao.responsavel,
      status: execucao.status,
      dataPrevista: execucao.dataPrevista,
      prazoConclusao: execucao.prazoConclusao,
      condominio: { id: execucao.condominioId, nome: execucao.condominio?.nome },
      template: {
        id: execucao.template?.id || null,
        nome: execucao.template?.nome || null,
        campos: execucao.template?.campos || [],
      },
      respostas: execucao.respostas || {},
      observacoes: execucao.observacoes || null,
    })
  } catch (e) { next(e) }
})

checklistsRouter.post('/execucao/:token', async (req, res, next) => {
  try {
    const execucao = await prisma.checklistExecution.findFirst({
      where: { publicoToken: req.params.token, allowPublic: true },
    })
    if (!execucao) return res.status(404).json({ error: 'Link de execução não encontrado', code: 'NOT_FOUND' })

    const status = String(req.body.status || 'EM_ANDAMENTO').toUpperCase()
    const concluido = status === 'CONCLUIDO'
    const now = new Date()
    const historico = Array.isArray(execucao.historico) ? execucao.historico : []
    const novoRegistro = {
      id: crypto.randomUUID(),
      action: 'PUBLIC_SUBMIT',
      status,
      responsavel: req.body.responsavel || execucao.responsavel || null,
      observacoes: req.body.observacoes || null,
      respostas: req.body.respostas || null,
      assinatura: req.body.assinatura || null,
      createdAt: now.toISOString(),
    }

    const updated = await prisma.checklistExecution.update({
      where: { id: execucao.id },
      data: {
        status,
        dataConclusao: concluido ? now : execucao.dataConclusao,
        respostas: req.body.respostas || execucao.respostas,
        observacoes: req.body.observacoes ?? execucao.observacoes,
        assinatura: req.body.assinatura ?? execucao.assinatura,
        historico: [novoRegistro, ...historico].slice(0, 50),
      },
    })

    res.json(updated)
  } catch (e) { next(e) }
})

checklistsRouter.use(authenticate)

checklistsRouter.get('/templates', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const where = { condominioId: scopedCondominioId }
    if (req.query.ativo) where.ativo = req.query.ativo === 'true'

    const [items, total] = await Promise.all([
      prisma.checklistTemplate.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take: limit }),
      prisma.checklistTemplate.count({ where }),
    ])

    res.json(paginatedResponse({ data: items, total, page, limit }))
  } catch (e) { next(e) }
})

checklistsRouter.post('/templates', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const template = await prisma.checklistTemplate.create({
      data: {
        nome: req.body.nome,
        descricao: req.body.descricao || null,
        categoria: req.body.categoria || null,
        recorrencia: req.body.recorrencia || 'MANUAL',
        responsavelPadrao: req.body.responsavelPadrao || null,
        ativo: req.body.ativo !== false,
        campos: req.body.campos || [],
        condominioId: scopedCondominioId,
      },
    })

    res.status(201).json(template)
  } catch (e) { next(e) }
})

checklistsRouter.patch('/templates/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId || req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })
    const template = await prisma.checklistTemplate.findFirst({ where: { id: req.params.id, condominioId: scopedCondominioId } })
    if (!template) return res.status(404).json({ error: 'Template não encontrado', code: 'NOT_FOUND' })

    const updated = await prisma.checklistTemplate.update({
      where: { id: template.id },
      data: {
        nome: req.body.nome || template.nome,
        descricao: req.body.descricao ?? template.descricao,
        categoria: req.body.categoria ?? template.categoria,
        recorrencia: req.body.recorrencia ?? template.recorrencia,
        responsavelPadrao: req.body.responsavelPadrao ?? template.responsavelPadrao,
        ativo: req.body.ativo !== undefined ? req.body.ativo : template.ativo,
        campos: req.body.campos ?? template.campos,
      },
    })

    res.json(updated)
  } catch (e) { next(e) }
})

checklistsRouter.get('/executions', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const where = { condominioId: scopedCondominioId }
    if (req.query.status) where.status = String(req.query.status).toUpperCase()

    const [items, total] = await Promise.all([
      prisma.checklistExecution.findMany({
        where,
        include: { template: true },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.checklistExecution.count({ where }),
    ])

    const data = items.map(item => ({
      ...item,
      templateName: item.template?.nome || null,
    }))

    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

checklistsRouter.get('/executions/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const execution = await prisma.checklistExecution.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
      include: { template: true },
    })
    if (!execution) return res.status(404).json({ error: 'Execução não encontrada', code: 'NOT_FOUND' })

    res.json(execution)
  } catch (e) { next(e) }
})

checklistsRouter.post('/executions', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const template = await prisma.checklistTemplate.findFirst({
      where: { id: req.body.templateId, condominioId: scopedCondominioId },
    })
    if (!template) return res.status(404).json({ error: 'Template não encontrado', code: 'NOT_FOUND' })

    const execution = await prisma.checklistExecution.create({
      data: {
        templateId: template.id,
        nome: req.body.nome || template.nome,
        responsavel: req.body.responsavel || template.responsavelPadrao || null,
        responsavelTipo: req.body.responsavelTipo || null,
        status: 'PENDENTE',
        dataPrevista: req.body.dataPrevista ? new Date(req.body.dataPrevista) : null,
        prazoConclusao: req.body.prazoConclusao || null,
        respostas: {},
        observacoes: req.body.observacoes || null,
        fotos: [],
        anexos: [],
        historico: [],
        condominioId: scopedCondominioId,
      },
    })

    res.status(201).json(execution)
  } catch (e) { next(e) }
})

checklistsRouter.patch('/executions/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId || req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const execution = await prisma.checklistExecution.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
    })
    if (!execution) return res.status(404).json({ error: 'Execução não encontrada', code: 'NOT_FOUND' })

    const status = req.body.status ? String(req.body.status).toUpperCase() : execution.status
    const concluido = status === 'CONCLUIDO'
    const dataConclusao = req.body.dataConclusao ? new Date(req.body.dataConclusao) : (concluido ? new Date() : execution.dataConclusao)

    const updated = await prisma.checklistExecution.update({
      where: { id: execution.id },
      data: {
        nome: req.body.nome ?? execution.nome,
        responsavel: req.body.responsavel ?? execution.responsavel,
        responsavelTipo: req.body.responsavelTipo ?? execution.responsavelTipo,
        status,
        dataPrevista: req.body.dataPrevista ? new Date(req.body.dataPrevista) : execution.dataPrevista,
        prazoConclusao: req.body.prazoConclusao ?? execution.prazoConclusao,
        dataConclusao,
        respostas: req.body.respostas ?? execution.respostas,
        observacoes: req.body.observacoes ?? execution.observacoes,
        assinatura: req.body.assinatura ?? execution.assinatura,
      },
    })

    res.json(updated)
  } catch (e) { next(e) }
})

checklistsRouter.post('/executions/:id/public-link', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId || req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const execution = await prisma.checklistExecution.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
    })
    if (!execution) return res.status(404).json({ error: 'Execução não encontrada', code: 'NOT_FOUND' })

    const token = execution.publicoToken || crypto.randomBytes(24).toString('base64url')
    const updated = await prisma.checklistExecution.update({
      where: { id: execution.id },
      data: {
        allowPublic: true,
        publicoToken: token,
        publicoTokenCriadoAt: execution.publicoTokenCriadoAt || new Date(),
      },
    })

    res.json({
      token,
      link: `${frontendUrl(req)}/?execucao=${encodeURIComponent(token)}`,
    })
  } catch (e) { next(e) }
})
