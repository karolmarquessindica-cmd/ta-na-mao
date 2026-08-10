import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const manutencaoPlanejamentoRouter = Router()
manutencaoPlanejamentoRouter.use(authenticate)

function obj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

async function scoped(req, requestedId) {
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

function dateOnly(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function parseDate(value) {
  const only = dateOnly(value)
  if (!only) return null
  const [year, month, day] = only.split('-').map(Number)
  // Meio-dia UTC evita que datas de calendário voltem um dia no fuso do Brasil.
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  return Number.isNaN(d.getTime()) ? null : d
}

function addMonths(value, months) {
  const d = parseDate(value)
  if (!d) return null
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

function nextDate(lastDate, periodicidade = '', frequencia = '') {
  const base = parseDate(lastDate)
  if (!base) return null
  const text = `${periodicidade} ${frequencia}`.toLowerCase()
  if (text.includes('semanal')) { const d = new Date(base); d.setUTCDate(d.getUTCDate() + 7); return d }
  if (text.includes('quinzenal')) { const d = new Date(base); d.setUTCDate(d.getUTCDate() + 15); return d }
  if (text.includes('bimestral')) return addMonths(base, 2)
  if (text.includes('trimestral')) return addMonths(base, 3)
  if (text.includes('semestral')) return addMonths(base, 6)
  if (text.includes('anual')) return addMonths(base, 12)
  if (text.includes('mensal')) return addMonths(base, 1)
  return null
}

function response(item) {
  const c = obj(item.checklist)
  const p = item.planoItens?.[0] || {}
  return {
    id: item.id,
    titulo: item.titulo,
    status: item.status,
    prioridade: item.prioridade,
    periodicidade: c.periodicidade || p.periodicidade || '',
    frequencia: c.frequencia || p.frequencia || '',
    dataUltimaManutencao: dateOnly(c.dataUltimaManutencao || item.dataConclusao),
    dataProximaManutencao: dateOnly(c.dataProximaManutencao || item.dataVencimento),
    observacoesPlanejamento: c.observacoesPlanejamento || '',
    responsavel: item.responsavel || '',
    empresa: item.empresa || '',
    referenciaLegal: c.referenciaLegal || p.referenciaLegal || '',
  }
}

manutencaoPlanejamentoRouter.get('/:id/planejamento', async (req, res, next) => {
  try {
    const condominioId = await scoped(req, req.query.condominioId)
    if (!condominioId) return res.status(404).json({ error: 'Condomínio não encontrado', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId },
      include: { planoItens: true },
    })
    if (!item) return res.status(404).json({ error: 'Manutenção não encontrada', code: 'NOT_FOUND' })
    res.json(response(item))
  } catch (e) { next(e) }
})

manutencaoPlanejamentoRouter.patch('/:id/planejamento', async (req, res, next) => {
  try {
    const condominioId = await scoped(req, req.body.condominioId || req.query.condominioId)
    if (!condominioId) return res.status(404).json({ error: 'Condomínio não encontrado', code: 'CONDOMINIO_NOT_FOUND' })
    const item = await prisma.manutencao.findFirst({
      where: { id: req.params.id, condominioId },
      include: { planoItens: true },
    })
    if (!item) return res.status(404).json({ error: 'Manutenção não encontrada', code: 'NOT_FOUND' })

    const current = obj(item.checklist)
    const periodicidade = req.body.periodicidade ?? current.periodicidade ?? item.planoItens?.[0]?.periodicidade ?? ''
    const frequencia = req.body.frequencia ?? current.frequencia ?? item.planoItens?.[0]?.frequencia ?? ''
    const ultimaOnly = dateOnly(req.body.dataUltimaManutencao ?? current.dataUltimaManutencao)
    const proxima = parseDate(req.body.dataProximaManutencao || req.body.dataVencimento) || nextDate(ultimaOnly, periodicidade, frequencia)
    const proximaOnly = dateOnly(proxima)

    const checklist = {
      ...current,
      periodicidade,
      frequencia,
      // Datas de planejamento são datas de calendário, não instantes de tempo.
      dataUltimaManutencao: ultimaOnly,
      dataProximaManutencao: proximaOnly,
      observacoesPlanejamento: req.body.observacoesPlanejamento ?? current.observacoesPlanejamento ?? '',
      referenciaLegal: req.body.referenciaLegal ?? current.referenciaLegal ?? item.planoItens?.[0]?.referenciaLegal ?? '',
      atualizadoManualEm: new Date().toISOString(),
    }

    const data = { checklist }
    if (proxima) data.dataVencimento = proxima
    if (req.body.responsavel !== undefined) data.responsavel = req.body.responsavel || null
    if (req.body.empresa !== undefined) data.empresa = req.body.empresa || null
    if (req.body.prioridade && ['ALTA', 'MEDIA', 'BAIXA'].includes(String(req.body.prioridade).toUpperCase())) data.prioridade = String(req.body.prioridade).toUpperCase()
    if (req.body.status && ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(String(req.body.status).toUpperCase())) data.status = String(req.body.status).toUpperCase()

    const updated = await prisma.manutencao.update({
      where: { id: item.id },
      data,
      include: { planoItens: true, inventario: true },
    })

    if (item.planoItens?.length) {
      await prisma.planoManutencaoItem.updateMany({
        where: { manutencaoId: item.id },
        data: {
          periodicidade: String(periodicidade || item.planoItens[0].periodicidade || 'Personalizada'),
          frequencia: String(frequencia || item.planoItens[0].frequencia || 'Personalizada'),
          referenciaLegal: checklist.referenciaLegal || item.planoItens[0].referenciaLegal || null,
          prioridade: updated.prioridade,
        },
      })
    }

    res.json({ ...updated, planejamento: response(updated) })
  } catch (e) { next(e) }
})
