import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { buildCondominioWhere, buildDateRange, resolveCondominioScope } from '../lib/tenantScope.js'

export const dashboardRouter = Router()
dashboardRouter.use(authenticate)

const NONE = '__none__'

const categoriaOptions = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'manutencao:PREVENTIVA', label: 'Manutencoes preventivas' },
  { value: 'manutencao:CORRETIVA', label: 'Manutencoes avulsas' },
  { value: 'chamado:MANUTENCAO', label: 'Chamados de manutencao' },
  { value: 'chamado:RECLAMACAO', label: 'Chamados de reclamacao' },
  { value: 'chamado:SUGESTAO', label: 'Chamados de sugestao' },
  { value: 'conta:MANUTENCAO', label: 'Financeiro - manutencao' },
  { value: 'conta:SERVICO', label: 'Financeiro - servicos' },
  { value: 'conta:SEGURO', label: 'Financeiro - seguros' },
  { value: 'conta:FORNECEDOR', label: 'Financeiro - fornecedores' },
]

const chamadoLabels = {
  MANUTENCAO: 'Manutencao',
  RECLAMACAO: 'Reclamacao',
  SUGESTAO: 'Sugestao',
}

const manutencaoLabels = {
  PREVENTIVA: 'Preventivas',
  CORRETIVA: 'Avulsas',
}

function categoryParts(value) {
  const raw = String(value || 'all')
  if (raw === 'all') return { area: 'all', value: 'all' }
  const [area, ...rest] = raw.split(':')
  return rest.length ? { area, value: rest.join(':') } : { area: 'legacy', value: raw }
}

function applyManutencaoCategory(where, categoria) {
  const { area, value } = categoryParts(categoria)
  if (area === 'all') return where
  if (area === 'manutencao' && ['PREVENTIVA', 'CORRETIVA'].includes(value)) {
    return { ...where, tipo: value }
  }
  if (area === 'plano' && value) {
    return {
      ...where,
      OR: [
        { inventario: { is: { categoria: value } } },
        { planoItens: { some: { categoria: value } } },
      ],
    }
  }
  if (area === 'legacy' && ['PREVENTIVA', 'CORRETIVA'].includes(value)) {
    return { ...where, tipo: value }
  }
  return { ...where, id: NONE }
}

function applyChamadoCategory(where, categoria, user) {
  const { area, value } = categoryParts(categoria)
  const scoped = user.role === 'MORADOR' ? { ...where, moradorId: user.id } : where
  if (area === 'all') return scoped
  if (area === 'chamado' && ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(value)) {
    return { ...scoped, categoria: value }
  }
  if (area === 'legacy' && ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(value)) {
    return { ...scoped, categoria: value }
  }
  return { ...scoped, id: NONE }
}

function applyContaCategory(where, categoria) {
  const { area, value } = categoryParts(categoria)
  if (area === 'all') return where
  if (area === 'conta' && value) return { ...where, categoria: value }
  return { ...where, id: NONE }
}

function percent(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function monthLabel(date) {
  return new Date(date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function buildTimeline(items) {
  const map = new Map()
  for (const item of items) {
    const key = monthLabel(item.createdAt)
    const current = map.get(key) || { label: key, total: 0, preventivas: 0, avulsas: 0 }
    current.total += 1
    if (item.tipo === 'PREVENTIVA') current.preventivas += 1
    if (item.tipo === 'CORRETIVA') current.avulsas += 1
    map.set(key, current)
  }
  return Array.from(map.values())
}

function buildCalledTypes(chamados) {
  const map = new Map()
  for (const chamado of chamados) {
    const label = chamadoLabels[chamado.categoria] || chamado.categoria
    map.set(label, (map.get(label) || 0) + 1)
  }
  return Array.from(map, ([label, total]) => ({ label, total }))
}

function buildMaintenanceCategories(manutencoes) {
  const map = new Map()
  for (const manutencao of manutencoes) {
    const label =
      manutencao.planoItens?.[0]?.categoria ||
      manutencao.inventario?.categoria ||
      manutencaoLabels[manutencao.tipo] ||
      'Sem categoria'
    map.set(label, (map.get(label) || 0) + 1)
  }
  return Array.from(map, ([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
}

function buildUserActivities(manutencoes, chamados) {
  const map = new Map()
  const add = (key, nome, type) => {
    if (!nome) return
    const current = map.get(key) || { nome, chamados: 0, manutencoes: 0, total: 0 }
    current[type] += 1
    current.total += 1
    map.set(key, current)
  }

  for (const chamado of chamados) {
    add(chamado.moradorId, chamado.morador?.nome, 'chamados')
    if (chamado.responsavelId) add(chamado.responsavelId, chamado.responsavel?.nome, 'chamados')
  }

  for (const manutencao of manutencoes) {
    if (manutencao.responsavel) add(`resp:${manutencao.responsavel}`, manutencao.responsavel, 'manutencoes')
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

function emptyPayload(scope, query) {
  return {
    filters: {
      condominios: scope.condominios,
      selectedCondominioId: scope.selectedCondominioId,
      categoria: query.categoria || 'all',
      de: query.de || '',
      ate: query.ate || '',
      categorias: categoriaOptions,
    },
    scope,
    stats: {
      totalManutencoes: 0,
      manutencoesPreventivas: 0,
      manutencoesAvulsas: 0,
      manutencoesPendentes: 0,
      manutencoesEmAndamento: 0,
      totalChamados: 0,
      chamadosAbertos: 0,
      totalMoradores: 0,
      totalDocumentos: 0,
      denunciasNaoLidas: 0,
      valoresInvestidos: 0,
      scorePreventivas: 0,
      scoreAvulsas: 0,
    },
    graficos: {
      timelineManutencoes: [],
      manutencoes6meses: [],
      chamados6meses: [],
      tiposChamados: [],
      categoriasManutencao: [],
      atividadesPorUsuario: [],
      relatorios: [],
    },
    alertas: [],
  }
}

dashboardRouter.get('/edificacoes', async (req, res, next) => {
  try {
    const scope = await resolveCondominioScope(req.user, 'all')
    res.json({ data: scope.condominios })
  } catch (e) { next(e) }
})

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const selected = req.query.edificacaoId || req.query.condominioId || 'all'
    const categoria = req.query.categoria || 'all'
    const scope = await resolveCondominioScope(req.user, selected)

    if (!scope.condominioIds.length) return res.json(emptyPayload(scope, req.query))

    const condominioWhere = buildCondominioWhere(scope.condominioIds)
    const createdRange = buildDateRange('createdAt', req.query.de, req.query.ate)
    const baseWhere = { ...condominioWhere, ...createdRange }
    const manutencaoWhere = applyManutencaoCategory(baseWhere, categoria)
    const chamadoWhere = applyChamadoCategory(baseWhere, categoria, req.user)
    const contaWhere = applyContaCategory(baseWhere, categoria)
    const documentoWhere = { ...condominioWhere, ...createdRange }
    const denunciaWhere = { ...condominioWhere, ...createdRange, lida: false }
    const moradorWhere = { ...condominioWhere, role: 'MORADOR', ativo: true }

    const [
      manutencoes,
      chamados,
      totalMoradores,
      totalDocumentos,
      denunciasNaoLidas,
      contas,
    ] = await Promise.all([
      prisma.manutencao.findMany({
        where: manutencaoWhere,
        select: {
          id: true,
          titulo: true,
          tipo: true,
          status: true,
          prioridade: true,
          responsavel: true,
          custo: true,
          dataVencimento: true,
          dataConclusao: true,
          createdAt: true,
          condominioId: true,
          condominio: { select: { id: true, nome: true } },
          inventario: { select: { id: true, nome: true, categoria: true } },
          planoItens: { select: { id: true, categoria: true, nome: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.chamado.findMany({
        where: chamadoWhere,
        select: {
          id: true,
          titulo: true,
          categoria: true,
          status: true,
          prioridade: true,
          createdAt: true,
          dataConclusao: true,
          moradorId: true,
          responsavelId: true,
          condominioId: true,
          morador: { select: { id: true, nome: true, unidade: true, bloco: true } },
          responsavel: { select: { id: true, nome: true } },
          condominio: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.count({ where: moradorWhere }),
      prisma.documento.count({ where: documentoWhere }),
      prisma.denuncia.count({ where: denunciaWhere }),
      prisma.contaSindico.aggregate({
        where: { ...contaWhere, status: { not: 'CANCELADO' } },
        _sum: { valor: true },
        _count: true,
      }),
    ])

    const preventivas = manutencoes.filter(item => item.tipo === 'PREVENTIVA')
    const avulsas = manutencoes.filter(item => item.tipo === 'CORRETIVA')
    const valoresManutencao = manutencoes.reduce((sum, item) => sum + (item.custo || 0), 0)

    const totalManutencoes = manutencoes.length
    const manutencoesPreventivas = preventivas.length
    const manutencoesAvulsas = avulsas.length
    const manutencoesPendentes = manutencoes.filter(item => item.status === 'PENDENTE').length
    const manutencoesEmAndamento = manutencoes.filter(item => item.status === 'EM_ANDAMENTO').length
    const totalChamados = chamados.length
    const chamadosAbertos = chamados.filter(item => item.status === 'ABERTO').length
    const scorePreventivas = percent(preventivas.filter(item => item.status === 'CONCLUIDO').length, manutencoesPreventivas)
    const scoreAvulsas = percent(avulsas.filter(item => item.status === 'CONCLUIDO').length, manutencoesAvulsas)

    const now = new Date()
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const alertDateRange = req.query.de || req.query.ate
      ? buildDateRange('dataVencimento', req.query.de, req.query.ate)
      : { dataVencimento: { gte: now, lte: in7days } }
    const alertas = await prisma.manutencao.findMany({
      where: applyManutencaoCategory({
        ...condominioWhere,
        ...alertDateRange,
        status: { not: 'CONCLUIDO' },
      }, categoria),
      select: {
        id: true,
        titulo: true,
        dataVencimento: true,
        prioridade: true,
        condominio: { select: { id: true, nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
      take: 8,
    })

    res.json({
      filters: {
        condominios: scope.condominios,
        selectedCondominioId: scope.selectedCondominioId,
        categoria,
        de: req.query.de || '',
        ate: req.query.ate || '',
        categorias: categoriaOptions,
      },
      scope,
      stats: {
        totalManutencoes,
        manutencoesPreventivas,
        manutencoesAvulsas,
        manutencoesPendentes,
        manutencoesEmAndamento,
        totalChamados,
        chamadosAbertos,
        totalMoradores,
        totalDocumentos,
        denunciasNaoLidas,
        valoresInvestidos: valoresManutencao + (contas._sum.valor || 0),
        scorePreventivas,
        scoreAvulsas,
      },
      graficos: {
        timelineManutencoes: buildTimeline(manutencoes),
        manutencoes6meses: buildTimeline(manutencoes),
        chamados6meses: [],
        tiposChamados: buildCalledTypes(chamados),
        categoriasManutencao: buildMaintenanceCategories(manutencoes),
        atividadesPorUsuario: buildUserActivities(manutencoes, chamados),
        relatorios: [
          { label: 'Manutencoes', total: totalManutencoes },
          { label: 'Chamados', total: totalChamados },
          { label: 'Financeiro', total: contas._count || 0 },
          { label: 'Moradores', total: totalMoradores },
        ],
      },
      alertas,
    })
  } catch (e) { next(e) }
})
