// src/routes/denuncia.js
import { Router } from 'express'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { denunciaLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile } from '../lib/storage.js'

export const denunciaRouter = Router()

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on'
}

function classifyDenuncia(categoria = '', descricao = '') {
  const text = `${categoria} ${descricao}`.toLowerCase()
  const highRisk = /(viol[eê]ncia|amea[cç]a|arma|agress[aã]o|sequestro|estupro|inc[eê]ndio|explos[oã]o|assalto|vandalismo)/
  const mediumRisk = /(roubo|furto|intrus[oã]o|ass[eé]dio|abuso|dano|risco|dan[oã]s|inseguran[cç]a)/

  if (categoria === 'VIOLENCIA_DOMESTICA' || highRisk.test(text)) {
    return {
      prioridade: 'ALTA',
      risco: 'Alto',
      acoesSugeridas: 'Priorizar a análise imediata e acionar a equipe de segurança ou apoio jurídico conforme o caso.'
    }
  }
  if (mediumRisk.test(text)) {
    return {
      prioridade: 'MEDIA',
      risco: 'Médio',
      acoesSugeridas: 'Avaliar junto à administração as providências necessárias e acompanhar o andamento.'
    }
  }
  return {
    prioridade: 'BAIXA',
    risco: 'Baixo',
    acoesSugeridas: 'Registrar a ocorrência e monitorar a resolução com o responsável pelo condomínio.'
  }
}

async function generateUniqueCodigo() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const codigo = `NSC-${randomBytes(4).toString('hex').toUpperCase()}`
    const existing = await prisma.denuncia.findUnique({ where: { codigo } })
    if (!existing) return codigo
  }
  throw new Error('Falha ao gerar código único da denúncia')
}

function optionalAnexoUpload(req, res, next) {
  if (req.is('multipart/form-data')) {
    return multerUpload.array('anexos', 5)(req, res, next)
  }
  req.files = []
  return next()
}

// POST — sem autenticação (anônimo), com rate limit
denunciaRouter.post('/', denunciaLimiter, optionalAnexoUpload, async (req, res, next) => {
  try {
    const {
      categoria,
      descricao,
      local,
      dataOcorrido,
      condominioId,
      anonimo,
      contato,
    } = req.body

    if (!condominioId) return res.status(400).json({ error: 'condominioId obrigatório', code: 'VALIDATION_ERROR' })
    if (!categoria || !descricao) return res.status(400).json({ error: 'categoria e descricao são obrigatórios', code: 'VALIDATION_ERROR' })

    const isAnonimo = normalizeBoolean(anonimo)
    const { prioridade, risco, acoesSugeridas } = classifyDenuncia(categoria, descricao)
    const files = req.files || []
    const anexos = []
    for (const file of files) {
      const result = await uploadFile(file, 'denuncias')
      anexos.push(result.url)
    }

    const codigo = await generateUniqueCodigo()
    const item = await prisma.denuncia.create({
      data: {
        codigo,
        categoria,
        descricao,
        local: local || null,
        dataOcorrido: dataOcorrido ? new Date(dataOcorrido) : null,
        anonimo: isAnonimo,
        contato: isAnonimo ? null : contato || null,
        anexos,
        prioridade,
        risco,
        acoesSugeridas,
        condominioId,
      }
    })
    res.status(201).json({ ok: true, id: item.id, codigo: item.codigo })
  } catch (e) { next(e) }
})

// GET público por código de denúncia
denunciaRouter.get('/consulta', async (req, res, next) => {
  try {
    const { codigo } = req.query
    if (!codigo) return res.status(400).json({ error: 'Código obrigatório', code: 'VALIDATION_ERROR' })
    const item = await prisma.denuncia.findUnique({
      where: { codigo: String(codigo).toUpperCase() },
      select: {
        codigo: true,
        categoria: true,
        descricao: true,
        local: true,
        dataOcorrido: true,
        status: true,
        prioridade: true,
        risco: true,
        acoesSugeridas: true,
        createdAt: true,
      }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    res.json(item)
  } catch (e) { next(e) }
})

// GET — apenas admin/sindico, com paginação
denunciaRouter.get('/', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'MORADOR') return res.status(403).json({ error: 'Acesso negado', code: 'AUTH_FORBIDDEN' })
    const { page, limit, skip } = parsePagination(req.query)
    const { categoria, status, edificacao, from, to } = req.query
    const where = {
      condominioId: req.user.condominioId,
      ...(categoria ? { categoria: String(categoria) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(String(from)) } : {}),
          ...(to ? { lte: new Date(String(to)) } : {}),
        }
      } : {}),
      ...(edificacao ? { condominio: { tipoEdificacao: String(edificacao) } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.denuncia.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.denuncia.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

// GET detalhes — apenas admin/sindico
denunciaRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'MORADOR') return res.status(403).json({ error: 'Acesso negado', code: 'AUTH_FORBIDDEN' })
    const item = await prisma.denuncia.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId },
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    res.json(item)
  } catch (e) { next(e) }
})

denunciaRouter.patch('/:id/lida', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.denuncia.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    const item = await prisma.denuncia.update({ where: { id: req.params.id }, data: { lida: true } })
    res.json(item)
  } catch (e) { next(e) }
})

denunciaRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'MORADOR') return res.status(403).json({ error: 'Acesso negado', code: 'AUTH_FORBIDDEN' })
    const { status, lida } = req.body
    const existing = await prisma.denuncia.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    const data = {}
    if (status) data.status = String(status)
    if (typeof lida === 'boolean') data.lida = lida
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nada para atualizar', code: 'VALIDATION_ERROR' })
    const item = await prisma.denuncia.update({ where: { id: req.params.id }, data })
    res.json(item)
  } catch (e) { next(e) }
})
