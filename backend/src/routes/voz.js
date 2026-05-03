// src/routes/voz.js
import { Router } from 'express'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'
import { buildCondominioWhere, buildDateRange, resolveCondominioScope } from '../lib/tenantScope.js'

export const vozRouter = Router()
vozRouter.use(authenticate)

const TIPOS = new Set(['SUGESTAO_MELHORIA', 'PAUTA_ASSEMBLEIA', 'PARCEIRO', 'AVALIACAO_GESTAO'])
const STATUS = new Set(['ABERTA', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'TRANSFORMADA_PAUTA', 'TRANSFORMADA_CHAMADO', 'ENCERRADA'])
const PORTAL_TYPES = ['SUGESTAO_MELHORIA', 'PAUTA_ASSEMBLEIA', 'PARCEIRO']

function boolParam(value) {
  if (value === undefined || value === null || value === '' || value === 'all') return undefined
  return ['1', 'true', 'sim', 'yes'].includes(String(value).toLowerCase())
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function safeTipo(value) {
  const tipo = String(value || '').toUpperCase()
  return TIPOS.has(tipo) ? tipo : 'SUGESTAO_MELHORIA'
}

function safeStatus(value) {
  const status = String(value || '').toUpperCase()
  return STATUS.has(status) ? status : 'ABERTA'
}

function orderBy(sort) {
  const normalized = String(sort || '').toLowerCase()
  if (['mais_votadas', 'votos'].includes(normalized)) return [{ votos: { _count: 'desc' } }, { createdAt: 'desc' }]
  if (['mais_comentadas', 'comentarios'].includes(normalized)) return [{ comentarios: { _count: 'desc' } }, { createdAt: 'desc' }]
  if (['destaques', 'em_alta'].includes(normalized)) return [{ destaqueSemana: 'desc' }, { votos: { _count: 'desc' } }, { comentarios: { _count: 'desc' } }, { createdAt: 'desc' }]
  return [{ fixado: 'desc' }, { destaqueSemana: 'desc' }, { createdAt: 'desc' }]
}

function withCounters(item, userId) {
  return {
    ...item,
    totalVotos: item._count?.votos || 0,
    totalComentarios: item._count?.comentarios || 0,
    jaVotou: Array.isArray(item.votos) ? item.votos.some(v => v.userId === userId || v.id) : false,
  }
}

async function validateFiles(files = []) {
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

async function uploadsFromRequest(req) {
  const files = req.files || []
  await validateFiles(files)
  const uploaded = []
  for (const file of files) {
    const { url } = await uploadFile(file, 'voz-morador')
    uploaded.push(url)
  }
  const bodyAnexos = Array.isArray(req.body?.anexos) ? req.body.anexos : []
  return [...bodyAnexos, ...uploaded]
}

async function scopedWhere(req, selectedValue) {
  const selected = selectedValue || req.query.edificacaoId || req.query.condominioId || 'all'
  const scope = await resolveCondominioScope(req.user, selected)
  const where = {
    ...buildCondominioWhere(scope.condominioIds),
    ...buildDateRange('createdAt', req.query.de || req.query.dataInicial, req.query.ate || req.query.dataFinal),
  }

  if (req.user.role === 'MORADOR') {
    where.condominioId = req.user.condominioId
    where.ativo = true
    where.visivelPortal = true
    where.tipo = { in: PORTAL_TYPES }
  }

  return { where, scope }
}

function applyFilters(where, req) {
  const { tipo, status, q } = req.query
  const destaque = boolParam(req.query.destaque || req.query.destaques)
  const visivelPortal = boolParam(req.query.visivelPortal)
  const fixado = boolParam(req.query.fixado)

  if (tipo && tipo !== 'all') where.tipo = safeTipo(tipo)
  if (status && status !== 'all') where.status = safeStatus(status)
  if (destaque !== undefined) where.destaqueSemana = destaque
  if (visivelPortal !== undefined) where.visivelPortal = visivelPortal
  if (fixado !== undefined) where.fixado = fixado
  if (q) {
    where.OR = [
      { titulo: { contains: String(q), mode: 'insensitive' } },
      { descricao: { contains: String(q), mode: 'insensitive' } },
      { categoria: { contains: String(q), mode: 'insensitive' } },
    ]
  }
}

async function findScopedVoz(req, id) {
  const { where } = await scopedWhere(req, 'all')
  const item = await prisma.vozMorador.findFirst({
    where: { id, ...where },
    include: {
      autor: { select: { id: true, nome: true, unidade: true, bloco: true } },
      condominio: { select: { id: true, nome: true } },
      _count: { select: { votos: true, comentarios: true } },
    },
  })
  return item
}

async function buildRankings(baseWhere, userId) {
  const now = new Date()
  const week = new Date(now)
  week.setDate(now.getDate() - 7)
  const month = new Date(now)
  month.setDate(now.getDate() - 30)

  const rows = await prisma.vozMorador.findMany({
    where: baseWhere,
    include: {
      autor: { select: { id: true, nome: true } },
      votos: { select: { id: true, userId: true, createdAt: true } },
      comentarios: { select: { id: true, createdAt: true } },
      _count: { select: { votos: true, comentarios: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 160,
  })

  const shaped = rows.map(item => withCounters(item, userId))
  const byRecent = [...shaped].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
  const byComments = [...shaped].sort((a, b) => b.totalComentarios - a.totalComentarios).slice(0, 6)
  const byTrending = [...shaped].sort((a, b) => ((b.totalVotos * 2) + b.totalComentarios + (b.destaqueSemana ? 8 : 0)) - ((a.totalVotos * 2) + a.totalComentarios + (a.destaqueSemana ? 8 : 0))).slice(0, 6)
  const byWeek = [...shaped].sort((a, b) => b.votos.filter(v => new Date(v.createdAt) >= week).length - a.votos.filter(v => new Date(v.createdAt) >= week).length).slice(0, 6)
  const byMonth = [...shaped].sort((a, b) => b.votos.filter(v => new Date(v.createdAt) >= month).length - a.votos.filter(v => new Date(v.createdAt) >= month).length).slice(0, 6)

  const slim = item => ({
    id: item.id,
    titulo: item.titulo,
    tipo: item.tipo,
    status: item.status,
    totalVotos: item.totalVotos,
    totalComentarios: item.totalComentarios,
    destaqueSemana: item.destaqueSemana,
    visivelPortal: item.visivelPortal,
  })

  return {
    semana: byWeek.map(slim),
    mes: byMonth.map(slim),
    comentadas: byComments.map(slim),
    recentes: byRecent.map(slim),
    emAlta: byTrending.map(slim),
  }
}

function summarizeThemes(items) {
  const themes = [
    ['segurança', /seguran|portaria|camera|acesso|risco/i],
    ['lazer e áreas comuns', /piscina|salao|churrasqueira|quadra|playground|academia|area comum|lazer/i],
    ['manutenção e estrutura', /manut|obra|elevador|hidraul|eletric|fachada|garagem|estrutura/i],
    ['organização e convivência', /barulho|limpeza|lixo|regra|conviv|organiza/i],
    ['fornecedores e parceiros', /empresa|servico|fornecedor|parceiro|orcamento/i],
    ['financeiro e transparência', /taxa|custo|despesa|receita|balanc|finance/i],
  ]

  return themes.map(([label, regex]) => ({
    tema: label,
    total: items.filter(item => regex.test(`${item.titulo} ${item.descricao || ''} ${item.categoria || ''}`)).length,
  })).filter(item => item.total > 0).sort((a, b) => b.total - a.total)
}

vozRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const { where, scope } = await scopedWhere(req)
    applyFilters(where, req)

    const include = {
      autor: { select: { id: true, nome: true, unidade: true, bloco: true } },
      condominio: { select: { id: true, nome: true } },
      comentarios: {
        include: { autor: { select: { id: true, nome: true } } },
        orderBy: { createdAt: 'desc' },
        take: 4,
      },
      _count: { select: { votos: true, comentarios: true } },
      votos: { where: { userId: req.user.id }, select: { id: true, userId: true } },
    }

    const [items, total, rankings] = await Promise.all([
      prisma.vozMorador.findMany({ where, include, orderBy: orderBy(req.query.sort || req.query.ranking), skip, take: limit }),
      prisma.vozMorador.count({ where }),
      buildRankings(where, req.user.id),
    ])

    const data = items.map(item => withCounters(item, req.user.id))
    const resumo = {
      total,
      abertas: data.filter(item => item.status === 'ABERTA').length,
      emAnalise: data.filter(item => item.status === 'EM_ANALISE').length,
      destaques: data.filter(item => item.destaqueSemana).length,
      visiveisPortal: data.filter(item => item.visivelPortal).length,
    }

    res.json({
      ...paginatedResponse({ data, total, page, limit }),
      resumo,
      rankings,
      filters: {
        condominios: scope.condominios,
        selectedCondominioId: scope.selectedCondominioId,
        tipos: [
          { value: 'all', label: 'Todos os tipos' },
          { value: 'SUGESTAO_MELHORIA', label: 'Sugestões de melhoria' },
          { value: 'PAUTA_ASSEMBLEIA', label: 'Pautas para assembleia' },
          { value: 'PARCEIRO', label: 'Parceiros' },
          { value: 'AVALIACAO_GESTAO', label: 'Avaliações da gestão' },
        ],
        status: [
          { value: 'all', label: 'Todos os status' },
          ...[...STATUS].map(value => ({ value, label: value.replace(/_/g, ' ') })),
        ],
      },
    })
  } catch (e) { next(e) }
})

vozRouter.post('/ia', async (req, res, next) => {
  try {
    const selected = req.body?.condominioId || req.query.condominioId || req.query.edificacaoId || 'all'
    const { where, scope } = await scopedWhere(req, selected)
    if (req.body?.tipo && req.body.tipo !== 'all') where.tipo = safeTipo(req.body.tipo)
    const items = await prisma.vozMorador.findMany({
      where,
      include: { _count: { select: { votos: true, comentarios: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: 120,
    })
    const temas = summarizeThemes(items)
    const destaques = items.filter(item => item.destaqueSemana).slice(0, 5)
    const aprovadas = items.filter(item => ['APROVADA', 'TRANSFORMADA_PAUTA'].includes(item.status)).slice(0, 8)
    const totalVotos = items.reduce((sum, item) => sum + (item._count?.votos || 0), 0)
    const totalComentarios = items.reduce((sum, item) => sum + (item._count?.comentarios || 0), 0)
    const satisfacao = items.length
      ? Math.min(98, Math.round(62 + (items.filter(i => ['APROVADA', 'EM_ANALISE', 'TRANSFORMADA_PAUTA'].includes(i.status)).length / items.length) * 25 + Math.min(10, totalVotos / 10)))
      : 0

    const prompt = String(req.body?.message || req.body?.pergunta || '').toLowerCase()
    let answer = `Resumo da participação em ${scope.label}: ${items.length} publicações, ${totalVotos} votos e ${totalComentarios} comentários.`
    if (/tema|pediram|recorrente|grupo/.test(prompt)) {
      answer = temas.length
        ? `Temas mais recorrentes: ${temas.map(t => `${t.tema} (${t.total})`).join(', ')}.`
        : 'Ainda não há volume suficiente para identificar temas recorrentes.'
    } else if (/pauta|assembleia/.test(prompt)) {
      answer = aprovadas.length
        ? `Sugestão de pauta para assembleia: ${aprovadas.map(i => i.titulo).join('; ')}. Priorize os itens com mais votos e comentários.`
        : 'Ainda não há sugestões aprovadas suficientes para montar uma pauta formal.'
    } else if (/resposta/.test(prompt)) {
      answer = 'Resposta sugerida: Agradecemos sua contribuição. A sugestão foi recebida, será avaliada conforme impacto, urgência e orçamento, e o retorno será registrado neste canal para manter a transparência.'
    } else if (/relat|mensal/.test(prompt)) {
      answer = `Relatório mensal: ${items.length} participações registradas, satisfação estimada em ${satisfacao}%, principais temas: ${temas.slice(0, 3).map(t => t.tema).join(', ') || 'sem recorrência definida'}. Recomenda-se transformar sugestões aprovadas em pauta e comunicar os encaminhamentos.`
    } else if (/prior/.test(prompt)) {
      const top = [...items].sort((a, b) => ((b._count?.votos || 0) * 2 + (b._count?.comentarios || 0)) - ((a._count?.votos || 0) * 2 + (a._count?.comentarios || 0))).slice(0, 5)
      answer = top.length ? `Prioridades sugeridas: ${top.map(i => `${i.titulo} (${i._count?.votos || 0} votos)`).join('; ')}.` : 'Sem dados suficientes para priorização.'
    }

    res.json({
      answer,
      insights: {
        totalPublicacoes: items.length,
        totalVotos,
        totalComentarios,
        satisfacao,
        temas,
        destaques: destaques.map(i => ({ id: i.id, titulo: i.titulo })),
      },
    })
  } catch (e) { next(e) }
})

vozRouter.post('/', uploadLimiter, multerUpload.array('anexos', 5), async (req, res, next) => {
  try {
    const selected = req.body?.condominioId || req.body?.edificacaoId || req.user.condominioId
    const scope = await resolveCondominioScope(req.user, selected)
    const condominioId = req.user.role === 'MORADOR' ? req.user.condominioId : scope.condominioIds[0]
    const tipo = safeTipo(req.body.tipo)
    if (req.user.role === 'MORADOR' && tipo === 'AVALIACAO_GESTAO') {
      return res.status(403).json({ error: 'Avaliacao da gestao e uma area interna.', code: 'FORBIDDEN_TYPE' })
    }
    const titulo = cleanText(req.body.titulo)
    if (!titulo) return res.status(400).json({ error: 'Titulo obrigatorio', code: 'VALIDATION_ERROR' })

    const anexos = await uploadsFromRequest(req)
    const item = await prisma.vozMorador.create({
      data: {
        titulo,
        descricao: cleanText(req.body.descricao, null),
        tipo,
        categoria: cleanText(req.body.categoria, null),
        status: safeStatus(req.body.status),
        visivelPortal: tipo === 'AVALIACAO_GESTAO' ? false : (boolParam(req.body.visivelPortal) ?? true),
        destaqueSemana: boolParam(req.body.destaqueSemana) ?? false,
        fixado: boolParam(req.body.fixado) ?? false,
        anexos,
        autorId: req.user.id,
        condominioId,
      },
      include: { condominio: { select: { id: true, nome: true } } },
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

vozRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await findScopedVoz(req, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })
    if (req.user.role === 'MORADOR' && existing.autorId !== req.user.id) return res.status(403).json({ error: 'Sem permissao', code: 'FORBIDDEN' })

    const data = {}
    if (req.body.titulo !== undefined) data.titulo = cleanText(req.body.titulo, existing.titulo)
    if (req.body.descricao !== undefined) data.descricao = cleanText(req.body.descricao, null)
    if (req.body.categoria !== undefined) data.categoria = cleanText(req.body.categoria, null)
    if (req.body.tipo !== undefined && req.user.role !== 'MORADOR') data.tipo = safeTipo(req.body.tipo)
    if (req.body.status !== undefined && req.user.role !== 'MORADOR') {
      data.status = safeStatus(req.body.status)
      data.encerradoEm = data.status === 'ENCERRADA' ? new Date() : null
    }
    if (req.body.visivelPortal !== undefined && req.user.role !== 'MORADOR') data.visivelPortal = Boolean(req.body.visivelPortal)
    if (req.body.destaqueSemana !== undefined && req.user.role !== 'MORADOR') data.destaqueSemana = Boolean(req.body.destaqueSemana)
    if (req.body.fixado !== undefined && req.user.role !== 'MORADOR') data.fixado = Boolean(req.body.fixado)
    if (req.body.respostaSindico !== undefined && req.user.role !== 'MORADOR') data.respostaSindico = cleanText(req.body.respostaSindico, null)

    const item = await prisma.vozMorador.update({
      where: { id: req.params.id },
      data,
      include: {
        autor: { select: { id: true, nome: true, unidade: true } },
        condominio: { select: { id: true, nome: true } },
        _count: { select: { votos: true, comentarios: true } },
      },
    })
    res.json(withCounters(item, req.user.id))
  } catch (e) { next(e) }
})

vozRouter.post('/:id/votar', async (req, res, next) => {
  try {
    const voz = await findScopedVoz(req, req.params.id)
    if (!voz || !voz.ativo || !voz.visivelPortal || voz.tipo === 'AVALIACAO_GESTAO') return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })

    const existing = await prisma.voto.findUnique({
      where: { userId_vozId: { userId: req.user.id, vozId: req.params.id } },
    })
    if (existing) {
      await prisma.voto.delete({ where: { id: existing.id } })
      return res.json({ action: 'removed' })
    }
    await prisma.voto.create({ data: { userId: req.user.id, vozId: req.params.id } })
    res.json({ action: 'added' })
  } catch (e) { next(e) }
})

vozRouter.post('/:id/comentar', async (req, res, next) => {
  try {
    const voz = await findScopedVoz(req, req.params.id)
    if (!voz || !voz.ativo || (req.user.role === 'MORADOR' && !voz.visivelPortal)) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })
    const texto = cleanText(req.body.texto)
    if (!texto) return res.status(400).json({ error: 'Comentario obrigatorio', code: 'VALIDATION_ERROR' })

    const item = await prisma.comentario.create({
      data: { texto, autorId: req.user.id, vozId: req.params.id },
      include: { autor: { select: { id: true, nome: true } } },
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

vozRouter.post('/:id/transformar-pauta', async (req, res, next) => {
  try {
    const voz = await findScopedVoz(req, req.params.id)
    if (!voz) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })
    if (req.user.role === 'MORADOR') return res.status(403).json({ error: 'Sem permissao', code: 'FORBIDDEN' })
    const item = await prisma.vozMorador.update({
      where: { id: req.params.id },
      data: { tipo: 'PAUTA_ASSEMBLEIA', status: 'TRANSFORMADA_PAUTA', visivelPortal: true, fixado: true },
      include: { _count: { select: { votos: true, comentarios: true } } },
    })
    res.json(withCounters(item, req.user.id))
  } catch (e) { next(e) }
})

vozRouter.post('/:id/transformar-chamado', async (req, res, next) => {
  try {
    const voz = await findScopedVoz(req, req.params.id)
    if (!voz) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })
    if (req.user.role === 'MORADOR') return res.status(403).json({ error: 'Sem permissao', code: 'FORBIDDEN' })
    const chamado = await prisma.chamado.create({
      data: {
        titulo: `Encaminhamento: ${voz.titulo}`,
        descricao: voz.descricao || 'Sugestao convertida em chamado pela Voz do Morador.',
        categoria: 'SUGESTAO',
        prioridade: 'MEDIA',
        fotos: voz.anexos || [],
        moradorId: voz.autorId,
        condominioId: voz.condominioId,
        historico: { create: { acao: 'Criado a partir da Voz do Morador', nota: voz.id } },
      },
    })
    const item = await prisma.vozMorador.update({
      where: { id: req.params.id },
      data: { status: 'TRANSFORMADA_CHAMADO', transformadoChamadoId: chamado.id },
      include: { _count: { select: { votos: true, comentarios: true } } },
    })
    res.json({ chamado, voz: withCounters(item, req.user.id) })
  } catch (e) { next(e) }
})
