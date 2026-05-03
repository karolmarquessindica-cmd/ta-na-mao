// src/routes/financeiro.js
import { Router } from 'express'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'

export const financeiroRouter = Router()
financeiroRouter.use(authenticate)

const contaSelect = {
  id: true,
  descricao: true,
  categoria: true,
  status: true,
  fornecedor: true,
  documento: true,
  competenciaMes: true,
  competenciaAno: true,
  valor: true,
  vencimento: true,
  pagamentoEm: true,
  recorrente: true,
  observacoes: true,
  createdAt: true,
  updatedAt: true,
}

function contaData(body) {
  const data = {}
  for (const campo of ['descricao', 'categoria', 'status', 'fornecedor', 'documento', 'observacoes']) {
    if (body[campo] !== undefined) data[campo] = body[campo] || null
  }
  if (body.valor !== undefined) data.valor = parseFloat(body.valor)
  if (body.vencimento !== undefined) data.vencimento = new Date(body.vencimento)
  if (body.pagamentoEm !== undefined) data.pagamentoEm = body.pagamentoEm ? new Date(body.pagamentoEm) : null
  if (body.competenciaMes !== undefined) data.competenciaMes = body.competenciaMes ? parseInt(body.competenciaMes) : null
  if (body.competenciaAno !== undefined) data.competenciaAno = body.competenciaAno ? parseInt(body.competenciaAno) : null
  if (body.recorrente !== undefined) data.recorrente = !!body.recorrente
  if (data.status === 'PAGO' && !data.pagamentoEm) data.pagamentoEm = new Date()
  if (data.status && data.status !== 'PAGO' && body.pagamentoEm === undefined) data.pagamentoEm = null
  return data
}

financeiroRouter.get('/contas', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const { status, categoria, q } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }
    if (status) where.status = status
    if (categoria) where.categoria = categoria
    if (q) {
      where.OR = [
        { descricao: { contains: q, mode: 'insensitive' } },
        { fornecedor: { contains: q, mode: 'insensitive' } },
        { documento: { contains: q, mode: 'insensitive' } },
      ]
    }

    await prisma.contaSindico.updateMany({
      where: {
        condominioId: req.user.condominioId,
        status: { in: ['A_PAGAR', 'AGENDADO'] },
        vencimento: { lt: new Date() },
      },
      data: { status: 'VENCIDO' },
    })

    const [data, total] = await Promise.all([
      prisma.contaSindico.findMany({
        where,
        select: contaSelect,
        orderBy: [{ vencimento: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.contaSindico.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

financeiroRouter.get('/contas/resumo', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const now = new Date()
    const mes = parseInt(req.query.mes) || now.getMonth() + 1
    const ano = parseInt(req.query.ano) || now.getFullYear()
    const baseWhere = { condominioId: req.user.condominioId, competenciaMes: mes, competenciaAno: ano }

    await prisma.contaSindico.updateMany({
      where: {
        condominioId: req.user.condominioId,
        status: { in: ['A_PAGAR', 'AGENDADO'] },
        vencimento: { lt: now },
      },
      data: { status: 'VENCIDO' },
    })

    const [pago, aberto, vencido, proximas] = await Promise.all([
      prisma.contaSindico.aggregate({ where: { ...baseWhere, status: 'PAGO' }, _sum: { valor: true }, _count: true }),
      prisma.contaSindico.aggregate({ where: { ...baseWhere, status: { in: ['A_PAGAR', 'AGENDADO'] } }, _sum: { valor: true }, _count: true }),
      prisma.contaSindico.aggregate({ where: { ...baseWhere, status: 'VENCIDO' }, _sum: { valor: true }, _count: true }),
      prisma.contaSindico.findMany({
        where: { condominioId: req.user.condominioId, status: { in: ['A_PAGAR', 'AGENDADO', 'VENCIDO'] } },
        select: contaSelect,
        orderBy: { vencimento: 'asc' },
        take: 5,
      }),
    ])

    res.json({
      mes,
      ano,
      pago: { total: pago._sum.valor || 0, count: pago._count },
      aberto: { total: aberto._sum.valor || 0, count: aberto._count },
      vencido: { total: vencido._sum.valor || 0, count: vencido._count },
      proximas,
    })
  } catch (e) { next(e) }
})

financeiroRouter.post('/contas', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const data = contaData(req.body)
    if (!data.descricao || !data.valor || !data.vencimento) {
      return res.status(400).json({ error: 'Descricao, valor e vencimento sao obrigatorios', code: 'VALIDATION_ERROR' })
    }
    const venc = new Date(data.vencimento)
    data.competenciaMes = data.competenciaMes || venc.getMonth() + 1
    data.competenciaAno = data.competenciaAno || venc.getFullYear()

    const conta = await prisma.contaSindico.create({
      data: { ...data, condominioId: req.user.condominioId },
      select: contaSelect,
    })
    res.status(201).json(conta)
  } catch (e) { next(e) }
})

financeiroRouter.patch('/contas/:id', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const conta = await prisma.contaSindico.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId },
    })
    if (!conta) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })

    const updated = await prisma.contaSindico.update({
      where: { id: req.params.id },
      data: contaData(req.body),
      select: contaSelect,
    })
    res.json(updated)
  } catch (e) { next(e) }
})

financeiroRouter.delete('/contas/:id', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const conta = await prisma.contaSindico.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId },
    })
    if (!conta) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })
    await prisma.contaSindico.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// GET /api/financeiro/taxas — listar taxas (admin: todas; morador: só suas), com paginação
financeiroRouter.get('/taxas', async (req, res, next) => {
  try {
    const { mes, ano, status, moradorId } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }

    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    else if (moradorId) where.moradorId = moradorId

    if (mes)    where.mes    = parseInt(mes)
    if (ano)    where.ano    = parseInt(ano)
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.taxa.findMany({
        where,
        include: { morador: { select: { id: true, nome: true, unidade: true, bloco: true } } },
        orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.taxa.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

// POST /api/financeiro/taxas — gerar cobrança (admin/síndico)
financeiroRouter.post('/taxas', async (req, res, next) => {
  try {
    const { descricao, valor, vencimento, mes, ano, moradorId } = req.body

    if (moradorId === 'todos') {
      const moradores = await prisma.user.findMany({
        where: { condominioId: req.user.condominioId, role: 'MORADOR', ativo: true },
        select: { id: true }
      })
      const criadas = await prisma.taxa.createMany({
        data: moradores.map(m => ({
          descricao, valor: parseFloat(valor),
          vencimento: new Date(vencimento),
          mes: parseInt(mes), ano: parseInt(ano),
          moradorId: m.id,
          condominioId: req.user.condominioId,
        })),
        skipDuplicates: true,
      })
      return res.status(201).json({ criadas: criadas.count })
    }

    const morador = await prisma.user.findFirst({
      where: { id: moradorId, condominioId: req.user.condominioId, role: 'MORADOR', ativo: true },
      select: { id: true },
    })
    if (!morador) return res.status(404).json({ error: 'Morador nao encontrado neste condominio', code: 'NOT_FOUND' })

    const taxa = await prisma.taxa.create({
      data: {
        descricao, valor: parseFloat(valor),
        vencimento: new Date(vencimento),
        mes: parseInt(mes), ano: parseInt(ano),
        moradorId, condominioId: req.user.condominioId,
      }
    })
    res.status(201).json(taxa)
  } catch (e) { next(e) }
})

// PATCH /api/financeiro/taxas/:id — atualizar status
financeiroRouter.patch('/taxas/:id', async (req, res, next) => {
  try {
    const existing = await prisma.taxa.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Nao encontrado', code: 'NOT_FOUND' })

    const { status, comprovante } = req.body
    const data = { status }
    if (status === 'PAGO') data.pagamentoEm = new Date()
    if (comprovante) data.comprovante = comprovante

    const taxa = await prisma.taxa.update({ where: { id: req.params.id }, data })
    res.json(taxa)
  } catch (e) { next(e) }
})

// GET /api/financeiro/resumo — totais e inadimplência
financeiroRouter.get('/resumo', async (req, res, next) => {
  try {
    const now = new Date()
    const mes = now.getMonth() + 1
    const ano = now.getFullYear()

    const [totalPago, totalPendente, totalAtrasado, inadimplentes] = await Promise.all([
      prisma.taxa.aggregate({
        where: { condominioId: req.user.condominioId, status: 'PAGO', mes, ano },
        _sum: { valor: true }, _count: true,
      }),
      prisma.taxa.aggregate({
        where: { condominioId: req.user.condominioId, status: 'PENDENTE', mes, ano },
        _sum: { valor: true }, _count: true,
      }),
      prisma.taxa.aggregate({
        where: { condominioId: req.user.condominioId, status: 'ATRASADO' },
        _sum: { valor: true }, _count: true,
      }),
      prisma.taxa.findMany({
        where: { condominioId: req.user.condominioId, status: { in: ['PENDENTE', 'ATRASADO'] }, vencimento: { lt: now } },
        include: { morador: { select: { nome: true, unidade: true, whatsapp: true } } },
        distinct: ['moradorId'],
      }),
    ])

    await prisma.taxa.updateMany({
      where: {
        condominioId: req.user.condominioId,
        status: 'PENDENTE',
        vencimento: { lt: now }
      },
      data: { status: 'ATRASADO' }
    })

    res.json({
      mes, ano,
      pago:     { total: totalPago._sum.valor || 0,     count: totalPago._count },
      pendente: { total: totalPendente._sum.valor || 0, count: totalPendente._count },
      atrasado: { total: totalAtrasado._sum.valor || 0, count: totalAtrasado._count },
      inadimplentes: inadimplentes.map(t => t.morador),
    })
  } catch (e) { next(e) }
})

// GET /api/financeiro/historico — últimos 12 meses
financeiroRouter.get('/historico', async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT mes, ano,
        SUM(CASE WHEN status = 'PAGO' THEN valor ELSE 0 END)::float AS pago,
        SUM(CASE WHEN status != 'PAGO' THEN valor ELSE 0 END)::float AS pendente
      FROM "Taxa"
      WHERE "condominioId" = ${req.user.condominioId}
        AND "createdAt" > NOW() - INTERVAL '12 months'
      GROUP BY mes, ano
      ORDER BY ano, mes
    `
    res.json(rows)
  } catch (e) { next(e) }
})

// POST /api/financeiro/taxas/:id/comprovante — upload de comprovante de pagamento
financeiroRouter.post('/taxas/:id/comprovante', uploadLimiter, multerUpload.single('comprovante'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Comprovante obrigatório', code: 'VALIDATION_ERROR' })

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

    const { url } = await uploadFile(file, 'comprovantes')

    const existing = await prisma.taxa.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Taxa não encontrada', code: 'NOT_FOUND' })

    const taxa = await prisma.taxa.update({
      where: { id: req.params.id },
      data: { comprovante: url }
    })
    res.json(taxa)
  } catch (e) { next(e) }
})
