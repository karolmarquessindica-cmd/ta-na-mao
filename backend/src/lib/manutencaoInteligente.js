import { prisma } from './prisma.js'
import { getPlanoItem } from './planoManutencaoBase.js'

const DAY_MS = 24 * 60 * 60 * 1000

const TERMOS_CRITICOS = [
  'seguranca',
  'incendio',
  'bombeiros',
  'abnt',
  'lei',
  'legal',
  'obrigatorio',
  'seguro',
  'elevador',
  'gas',
  'spda',
  'potabilidade',
  'extintor',
  'avcb',
  'clcb',
  'mangueira',
  'emergencia',
]

const TERMOS_IMPORTANTES = [
  'bomba',
  'portao',
  'hidraulica',
  'eletrica',
  'gerador',
  'equipamento',
  'funcionamento',
  'piscina',
  'dedetizacao',
  'controle de pragas',
]

function normalizar(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function startOfDay(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function validDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(value, days) {
  const date = validDate(value)
  if (!date || !days) return null
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function inferirDias(periodicidade) {
  const texto = normalizar(periodicidade)
  if (texto.includes('semanal')) return 7
  if (texto.includes('mensal')) return 30
  if (texto.includes('trimestral')) return 90
  if (texto.includes('semestral')) return 180
  if (texto.includes('anual')) return 365
  return null
}

export function classificarManutencao({ nome, categoria, referenciaLegal, prioridade }) {
  const texto = normalizar(`${nome} ${categoria} ${referenciaLegal}`)
  if (prioridade === 'ALTA' || TERMOS_CRITICOS.some(termo => texto.includes(termo))) return 'Critica'
  if (prioridade === 'MEDIA' || TERMOS_IMPORTANTES.some(termo => texto.includes(termo))) return 'Importante'
  return 'Operacional'
}

export function avisoAntecipadoDias({ prioridade, classificacao, periodicidade, dias, avisoAntecipado }) {
  if (avisoAntecipado) return avisoAntecipado
  if (classificacao === 'Critica' || prioridade === 'ALTA') return 30
  if (classificacao === 'Importante' || prioridade === 'MEDIA') return 15
  const periodo = typeof dias === 'number' ? dias : inferirDias(periodicidade)
  if (periodo && periodo <= 30) return 7
  return 10
}

export function statusManutencaoAutomatico(proximaExecucao, avisoAntecipado) {
  const proxima = validDate(proximaExecucao)
  if (!proxima) return 'Em dia'

  const diasRestantes = Math.ceil((startOfDay(proxima).getTime() - startOfDay().getTime()) / DAY_MS)
  if (diasRestantes < 0) return 'Atrasada'
  if (diasRestantes <= avisoAntecipado) return 'Proxima'
  return 'Em dia'
}

function corPorStatus(statusAutomatico) {
  if (statusAutomatico === 'Atrasada') return 'vermelho'
  if (statusAutomatico === 'Proxima') return 'amarelo'
  return 'verde'
}

function diasRestantes(proximaExecucao) {
  const proxima = validDate(proximaExecucao)
  if (!proxima) return null
  return Math.ceil((startOfDay(proxima).getTime() - startOfDay().getTime()) / DAY_MS)
}

function montarItemPlano(item) {
  const base = getPlanoItem(item.codigo) || {}
  const manutencao = item.manutencao
  const dias = base.dias || inferirDias(item.periodicidade)
  const ultimaExecucao = validDate(manutencao?.dataConclusao)
  const proximaExecucao =
    addDays(ultimaExecucao, dias) ||
    validDate(manutencao?.dataVencimento) ||
    addDays(item.createdAt, dias)

  const referenciaLegal = item.referenciaLegal || base.referenciaLegal || 'Nao informada'
  const classificacao = classificarManutencao({
    nome: item.nome,
    categoria: item.categoria,
    referenciaLegal,
    prioridade: item.prioridade,
  })
  const avisoAntecipado = avisoAntecipadoDias({
    prioridade: item.prioridade,
    classificacao,
    periodicidade: item.periodicidade,
    dias,
    avisoAntecipado: base.avisoAntecipado,
  })
  const statusAutomatico = statusManutencaoAutomatico(proximaExecucao, avisoAntecipado)

  return {
    id: item.id,
    origem: 'PLANO',
    codigo: item.codigo,
    manutencaoId: item.manutencaoId,
    nome: item.nome,
    elemento: base.elemento || item.nome,
    atividade: base.atividade || manutencao?.descricao || `Executar conforme plano preventivo. Frequencia recomendada: ${item.frequencia || base.frequencia || 'Rotina'}.`,
    categoria: item.categoria || 'Geral',
    frequencia: item.frequencia || base.frequencia || 'Rotina',
    periodicidade: item.periodicidade || base.periodicidade || 'Rotina',
    responsavel: manutencao?.responsavel || base.responsavelSugerido || 'Sindico / administracao',
    fonteNormativa: referenciaLegal,
    dataUltimaExecucao: ultimaExecucao,
    dataProximaExecucao: proximaExecucao,
    avisoAntecipado,
    classificacao,
    statusAutomatico,
    cor: corPorStatus(statusAutomatico),
    diasRestantes: diasRestantes(proximaExecucao),
    prioridade: item.prioridade,
    status: manutencao?.status || 'PENDENTE',
    custo: manutencao?.custo || 0,
  }
}

function montarItemAvulso(manutencao) {
  const categoria = manutencao.inventario?.categoria || (manutencao.tipo === 'PREVENTIVA' ? 'Preventivas avulsas' : 'Corretivas avulsas')
  const classificacao = classificarManutencao({
    nome: manutencao.titulo,
    categoria,
    referenciaLegal: manutencao.descricao || 'Registro operacional interno',
    prioridade: manutencao.prioridade,
  })
  const avisoAntecipado = avisoAntecipadoDias({
    prioridade: manutencao.prioridade,
    classificacao,
    periodicidade: 'Avulsa',
  })
  const proximaExecucao = validDate(manutencao.dataVencimento)
  const statusAutomatico = manutencao.status === 'CONCLUIDO'
    ? 'Em dia'
    : statusManutencaoAutomatico(proximaExecucao, avisoAntecipado)

  return {
    id: `avulsa-${manutencao.id}`,
    origem: 'AVULSA',
    codigo: null,
    manutencaoId: manutencao.id,
    nome: manutencao.titulo,
    atividade: manutencao.descricao || 'Manutencao registrada fora do plano preventivo.',
    categoria,
    frequencia: 'Avulsa',
    periodicidade: 'Avulsa',
    responsavel: manutencao.responsavel || manutencao.empresa || 'A definir',
    fonteNormativa: 'Registro operacional interno',
    dataUltimaExecucao: validDate(manutencao.dataConclusao),
    dataProximaExecucao: proximaExecucao,
    avisoAntecipado,
    classificacao,
    statusAutomatico,
    cor: corPorStatus(statusAutomatico),
    diasRestantes: diasRestantes(proximaExecucao),
    prioridade: manutencao.prioridade,
    status: manutencao.status,
    custo: manutencao.custo || 0,
  }
}

function ordenarItens(a, b) {
  const statusPeso = { Atrasada: 0, Proxima: 1, 'Em dia': 2 }
  const classePeso = { Critica: 0, Importante: 1, Operacional: 2 }
  return (statusPeso[a.statusAutomatico] ?? 9) - (statusPeso[b.statusAutomatico] ?? 9)
    || (classePeso[a.classificacao] ?? 9) - (classePeso[b.classificacao] ?? 9)
    || String(a.dataProximaExecucao || '').localeCompare(String(b.dataProximaExecucao || ''))
    || a.nome.localeCompare(b.nome)
}

function agruparPorCategoria(itens) {
  const porCategoria = new Map()
  for (const item of itens) {
    if (!porCategoria.has(item.categoria)) {
      porCategoria.set(item.categoria, {
        nome: item.categoria,
        total: 0,
        criticas: 0,
        proximas: 0,
        atrasadas: 0,
        emDia: 0,
        itens: [],
      })
    }
    const categoria = porCategoria.get(item.categoria)
    categoria.total += 1
    if (item.classificacao === 'Critica') categoria.criticas += 1
    if (item.statusAutomatico === 'Atrasada') categoria.atrasadas += 1
    if (item.statusAutomatico === 'Proxima') categoria.proximas += 1
    if (item.statusAutomatico === 'Em dia') categoria.emDia += 1
    categoria.itens.push(item)
  }

  return [...porCategoria.values()]
    .map(categoria => ({ ...categoria, itens: categoria.itens.sort(ordenarItens) }))
    .sort((a, b) => b.atrasadas - a.atrasadas || b.proximas - a.proximas || a.nome.localeCompare(b.nome))
}

export async function obterPlanoManutencaoOrganizado(condominioId) {
  const [plano, avulsas] = await Promise.all([
    prisma.planoManutencaoItem.findMany({
      where: { condominioId, ativo: true },
      include: {
        manutencao: {
          select: {
            id: true,
            titulo: true,
            descricao: true,
            status: true,
            prioridade: true,
            responsavel: true,
            empresa: true,
            custo: true,
            dataVencimento: true,
            dataConclusao: true,
          },
        },
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    }),
    prisma.manutencao.findMany({
      where: {
        condominioId,
        planoItens: { none: {} },
      },
      include: { inventario: { select: { id: true, nome: true, codigo: true, categoria: true } } },
      orderBy: [{ status: 'asc' }, { dataVencimento: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

  const itens = [
    ...plano.map(montarItemPlano),
    ...avulsas.map(montarItemAvulso),
  ].sort(ordenarItens)

  const dashboard = {
    total: itens.length,
    emDia: itens.filter(item => item.statusAutomatico === 'Em dia').length,
    proximas: itens.filter(item => item.statusAutomatico === 'Proxima').length,
    atrasadas: itens.filter(item => item.statusAutomatico === 'Atrasada').length,
    criticas: itens.filter(item => item.classificacao === 'Critica').length,
    valorInvestido: itens.reduce((sum, item) => sum + (item.custo || 0), 0),
  }

  return {
    dashboard,
    categorias: agruparPorCategoria(itens),
    alertas: itens.filter(item => item.statusAutomatico === 'Proxima' || item.statusAutomatico === 'Atrasada'),
    geradoEm: new Date(),
  }
}

export async function gerarNotificacoesPlanoManutencao(condominioId, alertas) {
  const itens = Array.isArray(alertas) ? alertas.slice(0, 50) : []
  if (!itens.length) return { avaliadas: 0, geradas: 0 }

  const usuarios = await prisma.user.findMany({
    where: { condominioId, role: { in: ['ADMIN', 'SINDICO'] }, ativo: true },
    select: { id: true },
  })
  if (!usuarios.length) return { avaliadas: itens.length, geradas: 0 }

  const hoje = startOfDay()
  let geradas = 0

  for (const item of itens) {
    const titulo = item.statusAutomatico === 'Atrasada'
      ? `Manutencao atrasada: ${item.nome}`
      : `Manutencao proxima: ${item.nome}`
    const vencimento = item.dataProximaExecucao
      ? new Date(item.dataProximaExecucao).toLocaleDateString('pt-BR')
      : 'sem data'
    const mensagem = `${item.categoria} - ${item.classificacao}. Proxima execucao: ${vencimento}.`

    for (const usuario of usuarios) {
      const existente = await prisma.notificacao.findFirst({
        where: {
          condominioId,
          userId: usuario.id,
          tipo: 'MANUTENCAO_VENCENDO',
          titulo,
          createdAt: { gte: hoje },
        },
      })
      if (existente) continue

      await prisma.notificacao.create({
        data: {
          condominioId,
          userId: usuario.id,
          tipo: 'MANUTENCAO_VENCENDO',
          titulo,
          mensagem,
          link: '/manutencoes',
        },
      })
      geradas += 1
    }
  }

  return { avaliadas: itens.length, geradas }
}
