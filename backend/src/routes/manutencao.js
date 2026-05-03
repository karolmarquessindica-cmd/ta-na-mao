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

function addDays(value, days = 30) {
  const date = new Date(value || Date.now())
  date.setDate(date.getDate() + days)
  return date
}

function periodicidadeDias(item) {
  const checklist = checklistObject(item.checklist)
  if (Number(checklist.periodicidadeDias)) return Number(checklist.periodicidadeDias)
  const plano = item.planoItens?.[0]
  const texto = `${plano?.periodicidade || plano?.frequencia || ''}`.toLowerCase()
  if (texto.includes('semanal')) return 7
  if (texto.includes('mensal')) return 30
  if (texto.includes('trimestral')) return 90
  if (texto.includes('semestral')) return 180
  if (texto.includes('anual')) return 365
  return item.tipo === 'PREVENTIVA' ? 30 : 0
}

function executionLink(req, token) {
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')
  return `${base.replace(/\/$/, '')}/?execucao=${token}`
}

function reportLink(req, item, condominioId) {
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')
  const qs = new URLSearchParams({ maintenanceReport: item.id, condominioId })
  return `${base.replace(/\/$/, '')}/?${qs.toString()}`
}

function absoluteFileUrl(req, url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${req.protocol}://${req.get('host')}${url}`
  return url
}

function uploadMeta(item, executionId, uploaded, sourceFile, fileType) {
  return {
    maintenanceId: item.id,
    condominiumId: item.condominioId,
    executionId,
    fileUrl: uploaded.url,
    fileType,
    mimeType: sourceFile?.mimetype || null,
    fileName: sourceFile?.originalname || uploaded.url?.split('/').pop() || 'arquivo',
    uploadedAt: new Date().toISOString(),
  }
}

function uniqueByUrl(files = []) {
  const seen = new Set()
  return files.filter(file => {
    const key = file?.fileUrl || file?.url
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function executionReportPayload(req, item, scopedCondominioId) {
  const checklist = checklistObject(item.checklist)
  const historico = Array.isArray(checklist.historicoExecucoes) ? checklist.historicoExecucoes : []
  const execucao = checklist.ultimaExecucaoPublica || historico[0]
  if (!execucao) return null

  const rawAnexos = Array.isArray(execucao.anexos) ? execucao.anexos : []
  const fotoUrls = Array.isArray(execucao.fotos) ? execucao.fotos : []
  const fotoAnexos = fotoUrls.map(url => ({
    maintenanceId: item.id,
    condominiumId: item.condominioId,
    executionId: execucao.id,
    fileUrl: url,
    fileType: 'FOTO',
    fileName: url?.split('/').pop() || 'foto',
    uploadedAt: execucao.createdAt || execucao.dataExecucao || item.updatedAt,
  }))
  const notaAnexo = execucao.notaFiscal ? [{
    maintenanceId: item.id,
    condominiumId: item.condominioId,
    executionId: execucao.id,
    fileUrl: execucao.notaFiscal,
    fileType: 'NOTA_FISCAL',
    fileName: execucao.notaFiscal.split('/').pop() || 'nota-fiscal',
    uploadedAt: execucao.createdAt || execucao.dataExecucao || item.updatedAt,
  }] : []

  const anexos = uniqueByUrl([...rawAnexos, ...fotoAnexos, ...notaAnexo]).map(file => ({
    ...file,
    url: absoluteFileUrl(req, file.fileUrl || file.url),
    fileUrl: absoluteFileUrl(req, file.fileUrl || file.url),
  }))
  const fotosDepois = anexos.filter(file => file.fileType === 'FOTO' || String(file.mimeType || '').startsWith('image/'))
  const fotosExecucao = new Set(fotosDepois.map(file => file.fileUrl))
  const fotosAntes = (item.fotos || [])
    .filter(url => !fotosExecucao.has(absoluteFileUrl(req, url)))
    .map(url => ({ fileUrl: absoluteFileUrl(req, url), url: absoluteFileUrl(req, url), fileType: 'FOTO_ANTES', fileName: url.split('/').pop() || 'foto' }))
  const notaFiscal = anexos.find(file => file.fileType === 'NOTA_FISCAL' || String(file.mimeType || '').includes('pdf')) || null

  return {
    id: item.id,
    maintenanceId: item.id,
    condominioId: item.condominioId,
    condominio: { id: item.condominioId, nome: item.condominio?.nome, logoUrl: item.condominio?.logo || null },
    logoUrl: item.condominio?.logo || null,
    titulo: item.titulo,
    descricao: item.descricao,
    local: item.inventario?.nome || checklist.local || item.empresa || '',
    status: item.status,
    dataPrevista: item.dataVencimento,
    dataExecutada: execucao.dataExecucao || item.dataConclusao,
    prestador: item.responsavel || item.empresa || '',
    responsavel: item.responsavel || item.empresa || '',
    comentariosPrestador: execucao.comentarios || null,
    problemasEncontrados: execucao.problemasEncontrados || null,
    valorInformado: execucao.valor ?? item.custo ?? null,
    execucao,
    historicoExecucao: historico,
    fotosAntes,
    fotosDepois,
    fotos: [...fotosAntes, ...fotosDepois],
    notaFiscal,
    anexos,
    fileUrl: notaFiscal?.fileUrl || fotosDepois[0]?.fileUrl || null,
    reportUrl: reportLink(req, item, scopedCondominioId),
  }
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

async function findByExecutionToken(token) {
  const items = await prisma.manutencao.findMany({
    include: { condominio: true, inventario: true, planoItens: true },
  })
  return items.find(item => executionToken(item.checklist) === token) || null
}

async function validateUploadedFiles(files = []) {
  for (const file of files) {
    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)
    if (!validation.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      const error = new Error(`Tipo de arquivo nao permitido: ${validation.detectedType}`)
      error.status = 400
      error.code = 'INVALID_FILE_TYPE'
      throw error
    }
  }
}

// GET /api/manutencoes/execucao/:token
manutencaoRouter.get('/execucao/:token', async (req, res, next) => {
  try {
    const item = await findByExecutionToken(req.params.token)
    if (!item) return res.status(404).json({ error: 'Link de execucao nao encontrado', code: 'NOT_FOUND' })
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

// POST /api/manutencoes/execucao/:token
manutencaoRouter.post('/execucao/:token', uploadLimiter, multerUpload.fields([
  { name: 'fotos', maxCount: 8 },
  { name: 'notaFiscal', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const item = await findByExecutionToken(req.params.token)
    if (!item) return res.status(404).json({ error: 'Link de execucao nao encontrado', code: 'NOT_FOUND' })

    const fotoFiles = req.files?.fotos || []
    const notaFiles = req.files?.notaFiscal || []
    await validateUploadedFiles([...fotoFiles, ...notaFiles])

    const [fotos, notas] = await Promise.all([
      Promise.all(fotoFiles.map(file => uploadFile(file, 'fotos'))),
      Promise.all(notaFiles.map(file => uploadFile(file, 'notas-fiscais'))),
    ])

    const concluido = req.body.status === 'CONCLUIDO' || req.body.status === 'CONCLUIDO_EXECUTADO'
    const dataExecucao = req.body.dataExecucao ? new Date(req.body.dataExecucao) : new Date()
    const dias = periodicidadeDias(item)
    const checklist = checklistObject(item.checklist)
    const executionId = crypto.randomUUID()
    const fotoAnexos = fotos.map((file, index) => uploadMeta(item, executionId, file, fotoFiles[index], 'FOTO'))
    const notaAnexos = notas.map((file, index) => uploadMeta(item, executionId, file, notaFiles[index], 'NOTA_FISCAL'))
    const execucao = {
      id: executionId,
      token: req.params.token,
      status: concluido ? 'CONCLUIDO' : 'NAO_REALIZADO',
      dataExecucao: dataExecucao.toISOString(),
      valor: req.body.valor ? parseFloat(req.body.valor) : null,
      comentarios: req.body.comentarios || null,
      problemasEncontrados: req.body.problemasEncontrados || null,
      fotos: fotoAnexos.map(file => file.fileUrl),
      notaFiscal: notaAnexos[0]?.fileUrl || null,
      anexos: [...fotoAnexos, ...notaAnexos],
      createdAt: new Date().toISOString(),
    }
    const historico = Array.isArray(checklist.historicoExecucoes) ? checklist.historicoExecucoes : []
    const executionFiles = Array.isArray(checklist.executionFiles) ? checklist.executionFiles : []
    const nextChecklist = {
      ...checklist,
      local: checklist.local || item.inventario?.nome || item.empresa || '',
      ultimaExecucaoPublica: execucao,
      historicoExecucoes: [execucao, ...historico].slice(0, 50),
      executionFiles: [...execucao.anexos, ...executionFiles].slice(0, 100),
    }
    const proxima = concluido && dias ? addDays(dataExecucao, dias) : item.dataVencimento

    const updated = await prisma.manutencao.update({
      where: { id: item.id },
      data: {
        status: concluido ? 'CONCLUIDO' : 'PENDENTE',
        dataConclusao: concluido ? dataExecucao : item.dataConclusao,
        dataVencimento: proxima,
        custo: req.body.valor ? parseFloat(req.body.valor) : item.custo,
        observacoes: [item.observacoes, req.body.comentarios, req.body.problemasEncontrados].filter(Boolean).join('\n\n'),
        fotos: [...item.fotos, ...execucao.fotos],
        checklist: nextChecklist,
      },
    })

    const admins = await prisma.user.findMany({
      where: { condominioId: item.condominioId, role: { in: ['ADMIN', 'SINDICO'] }, ativo: true },
      select: { id: true },
    })
    await Promise.all(admins.map(user => criarNotificacao({
      condominioId: item.condominioId,
      userId: user.id,
      tipo: 'MANUTENCAO_VENCENDO',
      titulo: concluido ? 'Manutencao executada' : 'Manutencao nao realizada',
      mensagem: `${item.titulo} - ${execucao.status}`,
      link: '/manutencoes',
    })))

    res.json(updated)
  } catch (e) { next(e) }
})

manutencaoRouter.use(authenticate)

// GET /api/manutencoes
manutencaoRouter.get('/', async (req, res, next) => {
  try {
    const { status, tipo, prioridade, condominioId, dataInicial, dataFinal } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const scopedCondominioId = await accessibleCondominioId(req, condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })

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

// GET /api/manutencoes/plano-organizado
manutencaoRouter.get('/plano-organizado', async (req, res, next) => {
  try {
    const plano = await obterPlanoManutencaoOrganizado(req.user.condominioId)
    const notificacoes = await gerarNotificacoesPlanoManutencao(req.user.condominioId, plano.alertas)
    res.json({ ...plano, notificacoes })
  } catch (e) { next(e) }
})

// GET /api/maintenance/:id/report ou /api/manutencoes/:id/report
manutencaoRouter.get('/:id/report', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
      include: { condominio: true, inventario: true, planoItens: true },
    })
    if (!item) return res.status(404).json({ error: 'Manutencao nao encontrada', code: 'NOT_FOUND' })

    const report = executionReportPayload(req, item, scopedCondominioId)
    if (!report) {
      return res.status(404).json({
        error: 'Nenhum relatorio foi enviado para esta manutencao.',
        code: 'REPORT_NOT_FOUND',
      })
    }

    res.json(report)
  } catch (e) { next(e) }
})

// POST /api/manutencoes/:id/execution-link
manutencaoRouter.post('/:id/execution-link', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId || req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
      include: { inventario: true },
    })
    if (!item) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })

    const checklist = checklistObject(item.checklist)
    const token = checklist.execucaoToken || crypto.randomBytes(24).toString('base64url')
    const nextChecklist = {
      ...checklist,
      execucaoToken: token,
      execucaoTokenCriadoEm: checklist.execucaoTokenCriadoEm || new Date().toISOString(),
      local: req.body.local || checklist.local || item.inventario?.nome || item.empresa || '',
    }
    await prisma.manutencao.update({
      where: { id: item.id },
      data: { checklist: nextChecklist },
    })

    const link = executionLink(req, token)
    res.json({
      token,
      link,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`,
    })
  } catch (e) { next(e) }
})

// GET /api/manutencoes/:id
manutencaoRouter.get('/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId },
      include: { inventario: true }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    res.json(item)
  } catch (e) { next(e) }
})

// POST /api/manutencoes
manutencaoRouter.post('/', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const { titulo, descricao, tipo, prioridade, responsavel, empresa, custo, dataVencimento, inventarioId, checklist, fotos, local } = req.body
    const item = await prisma.manutencao.create({
      data: {
        titulo, descricao, tipo, prioridade, responsavel, empresa,
        custo: custo ? parseFloat(custo) : null,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
        inventarioId: inventarioId || null,
        checklist: { ...checklistObject(checklist), local: local || checklistObject(checklist).local || empresa || '' },
        fotos: fotos || [],
        condominioId: scopedCondominioId,
      }
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

// PATCH /api/manutencoes/:id
manutencaoRouter.patch('/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId || req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const existing = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const data = { ...req.body }
    delete data.condominioId
    if (data.custo) data.custo = parseFloat(data.custo)
    if (data.dataVencimento) data.dataVencimento = new Date(data.dataVencimento)
    if (data.status === 'CONCLUIDO') data.dataConclusao = new Date()

    const item = await prisma.manutencao.update({
      where: { id: req.params.id },
      data
    })
    res.json(item)
  } catch (e) { next(e) }
})

// DELETE /api/manutencoes/:id
manutencaoRouter.delete('/:id', async (req, res, next) => {
  try {
    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    await prisma.manutencao.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// POST /api/manutencoes/:id/fotos — upload de foto para uma manutenção
manutencaoRouter.post('/:id/fotos', uploadLimiter, multerUpload.single('foto'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Foto obrigatória', code: 'VALIDATION_ERROR' })

    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!validation.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({
        error: `Tipo de arquivo não permitido: ${validation.detectedType}`,
        code: 'INVALID_FILE_TYPE',
      })
    }

    const scopedCondominioId = await accessibleCondominioId(req, req.query.condominioId || req.body.condominioId)
    if (!scopedCondominioId) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId: scopedCondominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const { url } = await uploadFile(file, 'fotos')
    const updated = await prisma.manutencao.update({
      where: { id: req.params.id },
      data: { fotos: [...item.fotos, url] }
    })
    res.json(updated)
  } catch (e) { next(e) }
})
