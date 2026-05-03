// src/routes/manutencao.js
import { Router } from 'express'
import fs from 'fs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'
import { criarNotificacao } from './notificacao.js'
import { enviarWhatsApp } from './whatsapp.js'
import {
  gerarNotificacoesPlanoManutencao,
  obterPlanoManutencaoOrganizado,
} from '../lib/manutencaoInteligente.js'

export const manutencaoRouter = Router()

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function statusExecucao(item) {
  if (item.status === 'CONCLUIDO') return 'CONCLUIDA'
  if (!item.dataVencimento) return 'EM_DIA'
  const diff = Math.ceil((startOfDay(item.dataVencimento).getTime() - startOfDay().getTime()) / DAY_MS)
  if (diff < 0) return 'ATRASADA'
  if (diff <= 15) return 'PROXIMA'
  return 'EM_DIA'
}

function checklistObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function executionToken(checklist) {
  return checklistObject(checklist).execucaoToken || null
}

function executionLink(req, token) {
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')
  return `${base.replace(/\/$/, '')}/?execucao=${token}`
}

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

function formatarDataBR(data) {
  if (!data) return 'sem data definida'
  return new Date(data).toLocaleDateString('pt-BR')
}

async function dispararManutencaoWhatsApp({ condominioId, item, tipoEvento = 'ALERTA' }) {
  const config = await prisma.configWhatsApp.findUnique({ where: { condominioId } })
  if (!config?.ativo || !config?.notifManutencaoVencendo) return { ok: false, motivo: 'automacao_inativa' }

  const condominio = await prisma.condominio.findUnique({
    where: { id: condominioId },
    select: { nome: true },
  })

  const admins = await prisma.user.findMany({
    where: {
      condominioId,
      role: { in: ['ADMIN', 'SINDICO'] },
      ativo: true,
      whatsapp: { not: null },
    },
    select: { whatsapp: true, nome: true },
  })

  const status = statusExecucao(item)
  const prioridade = item.prioridade || 'MEDIA'
  const mensagem = [
    '🛠️ *Alerta de Manutenção — Tá na Mão*',
    '',
    `🏢 Condomínio: *${condominio?.nome || 'Condomínio'}*`,
    `📌 Manutenção: *${item.titulo}*`,
    `📅 Vencimento: *${formatarDataBR(item.dataVencimento)}*`,
    `🚦 Status: *${status}*`,
    `⚠️ Prioridade: *${prioridade}*`,
    '',
    tipoEvento === 'CRIADA'
      ? 'Uma nova manutenção foi registrada no sistema.'
      : 'Essa manutenção exige acompanhamento para evitar atraso ou custo corretivo.',
    '',
    'Acesse o painel para verificar os detalhes.'
  ].join('\n')

  const resultados = await Promise.allSettled(
    admins.map(admin => enviarWhatsApp({ condominioId, numero: admin.whatsapp, mensagem }))
  )

  return {
    ok: true,
    total: admins.length,
    enviados: resultados.filter(r => r.status === 'fulfilled' && r.value?.ok).length,
  }
}

async function findByExecutionToken(token) {
  const items = await prisma.manutencao.findMany({ include: { condominio: true, inventario: true, planoItens: true } })
  return items.find(item => executionToken(item.checklist) === token) || null
}

async function validateUploadedFiles(files = []) {
  for (const file of files) {
    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!validation.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      const error = new Error(`Tipo de arquivo não permitido: ${validation.detectedType}`)
      error.status = 400
      error.code = 'INVALID_FILE_TYPE'
      throw error
    }
  }
}

// Link público simples para execução
manutencaoRouter.get('/execucao/:token', async (req, res, next) => {
  try {
    const item = await findByExecutionToken(req.params.token)
    if (!item) return res.status(404).json({ error: 'Link de execução não encontrado', code: 'NOT_FOUND' })

    res.json({
      id: item.id,
      condominioId: item.condominioId,
      condominio: { nome: item.condominio?.nome },
      titulo: item.titulo,
      descricao: item.descricao,
      local: item.inventario?.nome || checklistObject(item.checklist).local || item.empresa || '',
      dataPrevista: item.dataVencimento,
      responsavel: item.responsavel || item.empresa,
      status: item.status,
      token: req.params.token,
    })
  } catch (e) { next(e) }
})

manutencaoRouter.post('/execucao/:token', uploadLimiter, multerUpload.fields([
  { name: 'fotos', maxCount: 8 },
  { name: 'notaFiscal', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const item = await findByExecutionToken(req.params.token)
    if (!item) return res.status(404).json({ error: 'Link de execução não encontrado', code: 'NOT_FOUND' })

    const fotoFiles = req.files?.fotos || []
    const notaFiles = req.files?.notaFiscal || []
    await validateUploadedFiles([...fotoFiles, ...notaFiles])

    const fotos = await Promise.all(fotoFiles.map(file => uploadFile(file, 'fotos')))
    const nota = notaFiles[0] ? await uploadFile(notaFiles[0], 'notas-fiscais') : null
    const checklist = checklistObject(item.checklist)
    const execucao = {
      id: crypto.randomUUID(),
      token: req.params.token,
      status: req.body.status || 'CONCLUIDO',
      dataExecucao: new Date().toISOString(),
      valor: req.body.valor ? parseFloat(req.body.valor) : null,
      comentarios: req.body.comentarios || null,
      problemasEncontrados: req.body.problemasEncontrados || null,
      fotos: fotos.map(f => f.url),
      notaFiscal: nota?.url || null,
    }

    const historico = Array.isArray(checklist.historicoExecucoes) ? checklist.historicoExecucoes : []
    const updated = await prisma.manutencao.update({
      where: { id: item.id },
      data: {
        status: execucao.status === 'CONCLUIDO' ? 'CONCLUIDO' : 'PENDENTE',
        dataConclusao: execucao.status === 'CONCLUIDO' ? new Date() : item.dataConclusao,
        custo: req.body.valor ? parseFloat(req.body.valor) : item.custo,
        fotos: [...item.fotos, ...execucao.fotos],
        checklist: {
          ...checklist,
          ultimaExecucaoPublica: execucao,
          historicoExecucoes: [execucao, ...historico].slice(0, 50),
        },
      },
    })

    res.json(updated)
  } catch (e) { next(e) }
})

manutencaoRouter.use(authenticate)

manutencaoRouter.get('/', async (req, res, next) => {
  try {
    const { status, tipo, prioridade, condominioId, dataInicial, dataFinal } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const scopedCondominioId = await accessibleCondominioId(req, condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const where = { condominioId: scopedCondominioId }
    const normalizedTipo = String(tipo || '').toUpperCase()
    if (normalizedTipo === 'PREVENTIVA') where.tipo = 'PREVENTIVA'
    else if (normalizedTipo === 'AVULSA') where.OR = [{ tipo: 'CORRETIVA' }, { planoItens: { none: {} } }]
    else if (normalizedTipo === 'CORRETIVA') where.tipo = 'CORRETIVA'
    if (prioridade) where.prioridade = prioridade
    if (dataInicial || dataFinal) {
      where.dataVencimento = {}
      if (dataInicial) where.dataVencimento.gte = new Date(dataInicial)
      if (dataFinal) {
        const fim = new Date(dataFinal)
        fim.setHours(23, 59, 59, 999)
        where.dataVencimento.lte = fim
      }
    }

    const normalizedStatus = String(status || '').toUpperCase()
    const dbStatus = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(normalizedStatus) ? normalizedStatus : null
    if (dbStatus) where.status = dbStatus

    let items = await prisma.manutencao.findMany({
      where,
      include: {
        inventario: { select: { id: true, nome: true, codigo: true, categoria: true } },
        planoItens: { select: { id: true, codigo: true, periodicidade: true, frequencia: true } },
      },
      orderBy: [{ status: 'asc' }, { dataVencimento: 'asc' }, { createdAt: 'desc' }],
    })

    if (['EM_DIA', 'PROXIMA', 'ATRASADA', 'CONCLUIDA'].includes(normalizedStatus)) {
      items = items.filter(item => statusExecucao(item) === normalizedStatus)
    }

    const data = items.slice(skip, skip + limit).map(item => ({
      ...item,
      statusExecucao: statusExecucao(item),
      execucaoLink: executionToken(item.checklist) ? executionLink(req, executionToken(item.checklist)) : null,
    }))
    res.json(paginatedResponse({ data, total: items.length, page, limit }))
  } catch (e) { next(e) }
})

manutencaoRouter.get('/plano-organizado', async (req, res, next) => {
  try {
    const plano = await obterPlanoManutencaoOrganizado(req.user.condominioId)
    const notificacoes = await gerarNotificacoesPlanoManutencao(req.user.condominioId, plano.alertas)
    res.json({ ...plano, notificacoes })
  } catch (e) { next(e) }
})

manutencaoRouter.post('/alertas/whatsapp', async (req, res, next) => {
  try {
    const dias = Number(req.body.dias || 15)
    const hoje = startOfDay()
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + dias)

    const itens = await prisma.manutencao.findMany({
      where: {
        condominioId: req.user.condominioId,
        status: { not: 'CONCLUIDO' },
        dataVencimento: { lte: limite },
      },
      take: 20,
      orderBy: { dataVencimento: 'asc' },
    })

    const resultados = await Promise.allSettled(
      itens.map(item => dispararManutencaoWhatsApp({ condominioId: req.user.condominioId, item }))
    )

    res.json({ total: itens.length, processados: resultados.length })
  } catch (e) { next(e) }
})

manutencaoRouter.get('/:id/report', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
      include: { condominio: true, inventario: true, planoItens: true },
    })
    if (!item) return res.status(404).json({ error: 'Manutenção não encontrada', code: 'NOT_FOUND' })

    const checklist = checklistObject(item.checklist)
    const execucao = checklist.ultimaExecucaoPublica || checklist.historicoExecucoes?.[0]
    if (!execucao) return res.status(404).json({ error: 'Nenhum relatório foi enviado para esta manutenção.', code: 'REPORT_NOT_FOUND' })

    res.json({
      id: item.id,
      maintenanceId: item.id,
      condominioId: item.condominioId,
      condominio: { id: item.condominioId, nome: item.condominio?.nome, logoUrl: item.condominio?.logo || null },
      titulo: item.titulo,
      descricao: item.descricao,
      local: item.inventario?.nome || checklist.local || item.empresa || '',
      status: item.status,
      dataPrevista: item.dataVencimento,
      dataExecutada: execucao.dataExecucao || item.dataConclusao,
      prestador: item.responsavel || item.empresa || '',
      valorInformado: execucao.valor ?? item.custo ?? null,
      execucao,
      fotos: (execucao.fotos || []).map(url => ({ url, fileUrl: url, fileType: 'FOTO' })),
      notaFiscal: execucao.notaFiscal ? { url: execucao.notaFiscal, fileUrl: execucao.notaFiscal, fileType: 'NOTA_FISCAL' } : null,
    })
  } catch (e) { next(e) }
})

manutencaoRouter.post('/:id/execution-link', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId || req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
      include: { inventario: true },
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const checklist = checklistObject(item.checklist)
    const token = checklist.execucaoToken || crypto.randomBytes(24).toString('base64url')
    const nextChecklist = {
      ...checklist,
      execucaoToken: token,
      execucaoTokenCriadoEm: checklist.execucaoTokenCriadoEm || new Date().toISOString(),
      local: req.body.local || checklist.local || item.inventario?.nome || item.empresa || '',
    }
    await prisma.manutencao.update({ where: { id: item.id }, data: { checklist: nextChecklist } })

    const link = executionLink(req, token)
    res.json({
      token,
      link,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`,
    })
  } catch (e) { next(e) }
})

manutencaoRouter.get('/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const item = await prisma.manutencao.findFirst({ where: { id: req.params.id, condominioId: scopedCondominioId }, include: { inventario: true } })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    res.json(item)
  } catch (e) { next(e) }
})

manutencaoRouter.post('/', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const { titulo, descricao, tipo, prioridade, responsavel, empresa, custo, dataVencimento, inventarioId, checklist, fotos, local } = req.body
    const item = await prisma.manutencao.create({
      data: {
        titulo,
        descricao,
        tipo,
        prioridade,
        responsavel,
        empresa,
        custo: custo ? parseFloat(custo) : null,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
        inventarioId: inventarioId || null,
        checklist: { ...checklistObject(checklist), local: local || checklistObject(checklist).local || empresa || '' },
        fotos: fotos || [],
        condominioId: scopedCondominioId,
      }
    })

    if (item.dataVencimento && statusExecucao(item) !== 'EM_DIA') {
      await dispararManutencaoWhatsApp({ condominioId: scopedCondominioId, item, tipoEvento: 'CRIADA' })
    }

    res.status(201).json(item)
  } catch (e) { next(e) }
})

manutencaoRouter.patch('/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId || req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const existing = await prisma.manutencao.findFirst({ where: { id: req.params.id, condominioId: scopedCondominioId } })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const data = { ...req.body }
    delete data.condominioId
    if (data.custo) data.custo = parseFloat(data.custo)
    if (data.dataVencimento) data.dataVencimento = new Date(data.dataVencimento)
    if (data.status === 'CONCLUIDO') data.dataConclusao = new Date()

    const item = await prisma.manutencao.update({ where: { id: req.params.id }, data })

    if (item.dataVencimento && statusExecucao(item) !== 'EM_DIA' && item.status !== 'CONCLUIDO') {
      await dispararManutencaoWhatsApp({ condominioId: scopedCondominioId, item, tipoEvento: 'ATUALIZADA' })
    }

    res.json(item)
  } catch (e) { next(e) }
})

manutencaoRouter.delete('/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const item = await prisma.manutencao.findFirst({ where: { id: req.params.id, condominioId: scopedCondominioId } })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    await prisma.manutencao.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

manutencaoRouter.post('/:id/fotos', uploadLimiter, multerUpload.single('foto'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Foto obrigatória', code: 'VALIDATION_ERROR' })

    const validation = isS3Enabled ? await validateBufferMagicBytes(file.buffer) : await validateFileMagicBytes(file.path)
    if (!validation.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({ error: `Tipo de arquivo não permitido: ${validation.detectedType}`, code: 'INVALID_FILE_TYPE' })
    }

    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId || req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condomínio não encontrado para este usuário', code: 'CONDOMINIO_NOT_FOUND' })

    const item = await prisma.manutencao.findFirst({ where: { id: req.params.id, condominioId: scopedCondominioId } })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const { url } = await uploadFile(file, 'fotos')
    const updated = await prisma.manutencao.update({ where: { id: req.params.id }, data: { fotos: [...item.fotos, url] } })
    res.json(updated)
  } catch (e) { next(e) }
})
