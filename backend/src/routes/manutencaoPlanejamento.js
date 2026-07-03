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

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function addMonths(value, months) {
  const d = new Date(value)
  d.setMonth(d.getMonth() + months)
  return d
}

function nextDate(lastDate, periodicidade = '', frequencia = '') {
  const base = parseDate(lastDate)
  if (!base) return null
  const text = `${periodicidade} ${frequencia}`.toLowerCase()
  if (text.includes('semanal')) { const d = new Date(base); d.setDate(d.getDate() + 7); return d }
  if (text.includes('quinzenal')) { const d = new Date(base); d.setDate(d.getDate() + 15); return d }
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
    dataUltimaManutencao: c.dataUltimaManutencao || item.dataConclusao || null,
    dataProximaManutencao: c.dataProximaManutencao || item.dataVencimento || null,
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
    const ultima = req.body.dataUltimaManutencao || current.dataUltimaManutencao || null
    const proxima = parseDate(req.body.dataProximaManutencao || req.body.dataVencimento) || nextDate(ultima, periodicidade, frequencia)

    const checklist = {
      ...current,
      periodicidade,
      frequencia,
      dataUltimaManutencao: ultima,
      dataProximaManutencao: proxima ? proxima.toISOString() : null,
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
