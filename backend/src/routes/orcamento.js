import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const orcamentoRouter = Router()
orcamentoRouter.use(authenticate, requireRole('ADMIN', 'SINDICO'))

async function resolveCondominioId(req, res, requestedId) {
  const condominioId = String(requestedId || req.user?.condominioId || '').trim()
  if (!condominioId) {
    res.status(400).json({ error: 'Selecione uma edificação para consultar o orçamento.' })
    return null
  }
  if (req.user?.role === 'ADMIN') return condominioId
  if (req.user?.role !== 'SINDICO') {
    res.status(403).json({ error: 'Acesso negado.' })
    return null
  }
  if (String(req.user?.condominioId || '') === condominioId) return condominioId
  const acesso = await prisma.condominioAcesso.findUnique({
    where: { userId_condominioId: { userId: req.user.id, condominioId } },
    select: { id: true },
  })
  if (!acesso) {
    res.status(403).json({ error: 'Você não tem acesso financeiro a esta edificação.' })
    return null
  }
  return condominioId
}


const categoriasValidas = new Set([
  'IMPOSTO', 'MAO_DE_OBRA', 'FORNECEDOR', 'MANUTENCAO',
  'SERVICO', 'UTILIDADE', 'SEGURO', 'OUTRO',
])

function normalizarCategorias(items) {
  if (!Array.isArray(items)) throw Object.assign(new Error('Informe as categorias do orçamento.'), { status: 400 })
  const seen = new Set()
  return items.map(item => {
    const categoria = String(item?.categoria || '').trim().toUpperCase()
    const valor = Number(item?.valorMensal)
    if (!categoriasValidas.has(categoria)) throw Object.assign(new Error('Categoria financeira inválida.'), { status: 400 })
    if (seen.has(categoria)) throw Object.assign(new Error('Não repita categorias no mesmo orçamento.'), { status: 400 })
    if (!Number.isFinite(valor) || valor < 0) throw Object.assign(new Error('Os valores mensais devem ser números maiores ou iguais a zero.'), { status: 400 })
    seen.add(categoria)
    return { categoria, descricao: item?.descricao ? String(item.descricao).slice(0, 300) : null, valorMensal: valor.toFixed(2) }
  })
}

orcamentoRouter.get('/', async (req, res, next) => {
  try {
    const ano = Number(req.query.ano) || new Date().getFullYear()
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2200) return res.status(400).json({ error: 'Ano inválido.' })
    const condominioId = await resolveCondominioId(req, res, req.query.condominioId)
    if (!condominioId) return
    const orcamento = await prisma.orcamentoCondominio.findUnique({
      where: { condominioId_ano: { condominioId, ano } },
      include: { categorias: { orderBy: { categoria: 'asc' } } },
    })
    const despesas = await prisma.contaSindico.findMany({
      where: {
        condominioId,
        competenciaAno: ano,
        status: { not: 'CANCELADO' },
      },
      select: { categoria: true, competenciaMes: true, valor: true, status: true },
    })
    const resumo = {}
    for (const d of despesas) {
      const cat = d.categoria || 'OUTRO'
      const mes = Number(d.competenciaMes) || 0
      if (!resumo[cat]) resumo[cat] = { total: 0, pago: 0, aberto: 0, meses: {} }
      const valor = Number(d.valor) || 0
      resumo[cat].total += valor
      if (d.status === 'PAGO') resumo[cat].pago += valor
      else resumo[cat].aberto += valor
      if (mes >= 1 && mes <= 12) resumo[cat].meses[mes] = (resumo[cat].meses[mes] || 0) + valor
    }
    const categorias = orcamento?.categorias || []
    const totalMensal = categorias.reduce((sum, c) => sum + Number(c.valorMensal), 0)
    const realizado = Object.values(resumo).reduce((sum, c) => sum + c.total, 0)
    const pago = Object.values(resumo).reduce((sum, c) => sum + c.pago, 0)
    const aberto = Object.values(resumo).reduce((sum, c) => sum + c.aberto, 0)
    res.json({
      orcamento,
      categoriasRealizadas: resumo,
      indicadores: {
        totalMensalOrcado: totalMensal,
        totalAnualOrcado: totalMensal * 12,
        realizadoAno: realizado,
        pagoAno: pago,
        abertoAno: aberto,
        desvioAnoVsOrcamento: realizado - totalMensal * 12,
        percentualAno: totalMensal > 0 ? ((realizado - totalMensal * 12) / (totalMensal * 12)) * 100 : null,
      },
    })
  } catch (e) { next(e) }
})

orcamentoRouter.put('/', async (req, res, next) => {
  try {
    const ano = Number(req.body?.ano)
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2200) return res.status(400).json({ error: 'Informe um ano válido.' })
    const categorias = normalizarCategorias(req.body?.categorias)
    const condominioId = await resolveCondominioId(req, res, req.body?.condominioId)
    if (!condominioId) return
    const dataAssembleia = req.body?.dataAssembleia ? new Date(req.body.dataAssembleia) : null
    if (dataAssembleia && Number.isNaN(dataAssembleia.getTime())) return res.status(400).json({ error: 'Data da assembleia inválida.' })
    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.orcamentoCondominio.findUnique({
        where: { condominioId_ano: { condominioId, ano } },
        include: { categorias: true },
      })
      const snapshot = existente ? {
        dataAssembleia: existente.dataAssembleia,
        referenciaAta: existente.referenciaAta,
        observacoes: existente.observacoes,
        categorias: existente.categorias.map(c => ({ categoria: c.categoria, descricao: c.descricao, valorMensal: String(c.valorMensal) })),
      } : { inexistente: true }
      const payload = {
        dataAssembleia,
        referenciaAta: req.body?.referenciaAta ? String(req.body.referenciaAta).slice(0, 500) : null,
        observacoes: req.body?.observacoes ? String(req.body.observacoes).slice(0, 3000) : null,
      }
      const orcamento = await tx.orcamentoCondominio.upsert({
        where: { condominioId_ano: { condominioId, ano } },
        create: { condominioId, ano, ...payload, criadoPor: req.user.id || null },
        update: payload,
      })
      await tx.orcamentoRevisao.create({
        data: {
          orcamentoId: orcamento.id,
          acao: existente ? 'ATUALIZACAO' : 'CRIACAO',
          snapshot,
          motivo: req.body?.motivoRevisao ? String(req.body.motivoRevisao).slice(0, 1000) : null,
          usuarioId: req.user.id || null,
        },
      })
      await tx.orcamentoCategoria.deleteMany({ where: { orcamentoId: orcamento.id } })
      if (categorias.length) await tx.orcamentoCategoria.createMany({
        data: categorias.map(c => ({ ...c, orcamentoId: orcamento.id })),
      })
      return tx.orcamentoCondominio.findUnique({
        where: { id: orcamento.id },
        include: { categorias: { orderBy: { categoria: 'asc' } } },
      })
    })
    res.json({ orcamento: resultado })
  } catch (e) { next(e) }
})


const categoriasItemValidas = new Set(['IMPOSTO','MAO_DE_OBRA','FORNECEDOR','MANUTENCAO','SERVICO','UTILIDADE','SEGURO','OUTRO'])

orcamentoRouter.get('/itens', async (req, res, next) => {
  try {
    const ano = Number(req.query.ano) || new Date().getFullYear()
    const condominioId = await resolveCondominioId(req, res, req.query.condominioId)
    if (!condominioId) return
    const itens = await prisma.$queryRaw`
      SELECT "id", "nome", "categoria", "valorPrevisto", "valorGasto", "createdAt", "updatedAt"
      FROM "DespesaPrevista"
      WHERE "condominioId" = ${condominioId} AND "ano" = ${ano}
      ORDER BY "createdAt" DESC
    `
    res.json({ itens })
  } catch (e) { next(e) }
})

orcamentoRouter.post('/itens', async (req, res, next) => {
  try {
    const condominioId = await resolveCondominioId(req, res, req.body?.condominioId)
    if (!condominioId) return
    const ano = Number(req.body?.ano) || new Date().getFullYear()
    const nome = String(req.body?.nome || '').trim().slice(0, 200)
    const categoria = String(req.body?.categoria || '').trim().toUpperCase()
    const valorPrevisto = Number(req.body?.valorPrevisto)
    if (!nome) return res.status(400).json({ error: 'Informe o nome da despesa.' })
    if (!categoriasItemValidas.has(categoria)) return res.status(400).json({ error: 'Selecione uma categoria válida.' })
    if (!Number.isFinite(valorPrevisto) || valorPrevisto < 0) return res.status(400).json({ error: 'Informe um valor previsto válido.' })
    const id = crypto.randomUUID()
    const itens = await prisma.$queryRaw`
      INSERT INTO "DespesaPrevista" ("id","condominioId","ano","nome","categoria","valorPrevisto","valorGasto","createdAt","updatedAt")
      VALUES (${id},${condominioId},${ano},${nome},${categoria},${valorPrevisto},0,NOW(),NOW())
      RETURNING "id","nome","categoria","valorPrevisto","valorGasto","createdAt","updatedAt"
    `
    res.status(201).json({ item: itens[0] })
  } catch (e) { next(e) }
})

orcamentoRouter.put('/itens/:id', async (req, res, next) => {
  try {
    const condominioId = await resolveCondominioId(req, res, req.body?.condominioId)
    if (!condominioId) return
    const ano = Number(req.body?.ano) || new Date().getFullYear()
    const nome = String(req.body?.nome || '').trim().slice(0, 200)
    const categoria = String(req.body?.categoria || '').trim().toUpperCase()
    const valorPrevisto = Number(req.body?.valorPrevisto)
    const valorGasto = Number(req.body?.valorGasto ?? 0)
    if (!nome) return res.status(400).json({ error: 'Informe o nome da despesa.' })
    if (!categoriasItemValidas.has(categoria)) return res.status(400).json({ error: 'Selecione uma categoria válida.' })
    if (!Number.isFinite(valorPrevisto) || valorPrevisto < 0 || !Number.isFinite(valorGasto) || valorGasto < 0) return res.status(400).json({ error: 'Informe valores válidos.' })
    const itens = await prisma.$queryRaw`
      UPDATE "DespesaPrevista"
      SET "nome"=${nome},"categoria"=${categoria},"valorPrevisto"=${valorPrevisto},"valorGasto"=${valorGasto},"updatedAt"=NOW()
      WHERE "id"=${req.params.id} AND "condominioId"=${condominioId} AND "ano"=${ano}
      RETURNING "id","nome","categoria","valorPrevisto","valorGasto","createdAt","updatedAt"
    `
    if (!itens.length) return res.status(404).json({ error: 'Despesa não encontrada nesta edificação.' })
    res.json({ item: itens[0] })
  } catch (e) { next(e) }
})

orcamentoRouter.delete('/itens/:id', async (req, res, next) => {
  try {
    const condominioId = await resolveCondominioId(req, res, req.query.condominioId)
    if (!condominioId) return
    const ano = Number(req.query.ano) || new Date().getFullYear()
    const result = await prisma.$executeRaw`
      DELETE FROM "DespesaPrevista" WHERE "id"=${req.params.id} AND "condominioId"=${condominioId} AND "ano"=${ano}
    `
    if (!result) return res.status(404).json({ error: 'Despesa não encontrada nesta edificação.' })
    res.json({ success: true })
  } catch (e) { next(e) }
})

orcamentoRouter.get('/historico', async (req, res, next) => {
  try {
    const ano = Number(req.query.ano) || new Date().getFullYear()
    const condominioId = await resolveCondominioId(req, res, req.query.condominioId)
    if (!condominioId) return
    const item = await prisma.orcamentoCondominio.findUnique({
      where: { condominioId_ano: { condominioId, ano } },
      select: { id: true },
    })
    if (!item) return res.json({ historico: [] })
    const historico = await prisma.orcamentoRevisao.findMany({
      where: { orcamentoId: item.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ historico })
  } catch (e) { next(e) }
})
