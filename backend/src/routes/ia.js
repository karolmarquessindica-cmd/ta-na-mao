// src/routes/ia.js
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const iaRouter = Router()
iaRouter.use(authenticate)

const chatSchema = z.object({
  message: z.string().trim().min(2).max(1200),
  canal: z.enum(['portal', 'docs', 'admin']).default('portal'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().max(1500),
  })).max(8).optional(),
})

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

function formatDate(date) {
  if (!date) return null
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(date))
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function sanitizeLine(value, fallback = 'Nao informado') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value).replace(/\s+/g, ' ').trim()
}

function listLines(items, mapper, empty) {
  if (!items?.length) return empty
  return items.map(mapper).join('\n')
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isFinancialQuestion(message = '') {
  return /(financeir|balancete|prestacao|prestação|conta|contas|despesa|receita|gasto|pagamento|valor|valores|taxa|auditoria|auditar|compar|mes|meses|mensal|fornecedor|nota fiscal|nf|boleto|comprovante|inadimpl|saldo|caixa|rateio|orcamento|orçamento)/i.test(normalizeText(message))
}

function getSearchTerms(message) {
  const stop = new Set([
    'para', 'pela', 'pelo', 'como', 'qual', 'quais', 'quanto', 'quantos', 'sobre',
    'onde', 'esse', 'essa', 'isso', 'aqui', 'condominio', 'condominio', 'morador',
    'moradores', 'voce', 'voces', 'tem', 'teve', 'foi', 'foram', 'esta', 'estao',
    'com', 'dos', 'das', 'uma', 'uns', 'por', 'que', 'de', 'da', 'do', 'em', 'no', 'na', 'os', 'as', 'um', 'o', 'a', 'e'
  ])

  const base = normalizeText(message)
    .split(/[^a-z0-9]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !stop.has(t))

  const financialBoost = isFinancialQuestion(message)
    ? ['receita', 'despesa', 'despesas', 'saldo', 'valor', 'total', 'pagamento', 'fornecedor', 'manutencao', 'limpeza', 'seguranca', 'agua', 'energia', 'elevador', 'piscina', 'folha', 'administracao']
    : []

  return Array.from(new Set([...base, ...financialBoost])).slice(0, 24)
}

function extractRelevantSnippets(texto, message, maxSnippets = 4) {
  if (!texto) return []

  const terms = getSearchTerms(message)
  const clean = String(texto).replace(/\s+/g, ' ').trim()
  const normalized = normalizeText(clean)

  if (!terms.length) return clean ? [clean.slice(0, 1600)] : []

  const positions = []
  for (const term of terms) {
    let index = normalized.indexOf(term)
    while (index >= 0 && positions.length < 80) {
      positions.push(index)
      index = normalized.indexOf(term, index + term.length)
    }
  }

  if (!positions.length) return clean ? [clean.slice(0, 1600)] : []

  const snippets = []
  const used = []

  for (const pos of positions.sort((a, b) => a - b)) {
    const start = Math.max(0, pos - 650)
    const end = Math.min(clean.length, pos + 1150)

    if (used.some(([a, b]) => Math.abs(start - a) < 500 || (start >= a && start <= b))) continue

    used.push([start, end])
    snippets.push(clean.slice(start, end))
    if (snippets.length >= maxSnippets) break
  }

  return snippets
}

function buildDocumentSourceContext(documentosFonte, message) {
  const fontes = []
  const financeiro = isFinancialQuestion(message)

  for (const doc of documentosFonte || []) {
    const snippets = extractRelevantSnippets(doc.textoExtraido, message, financeiro ? 5 : 3)
    if (!snippets.length) continue

    fontes.push([
      `Fonte: ${doc.nome} | categoria: ${sanitizeLine(doc.categoriaIA, 'DOCUMENTO')} | pasta: ${doc.pasta} | acesso: ${doc.acesso} | criado em: ${formatDate(doc.createdAt)}`,
      ...snippets.map((s, i) => `Trecho ${i + 1}: ${s}`)
    ].join('\n'))
  }

  return fontes.length
    ? fontes.join('\n\n---\n\n')
    : 'Nenhum trecho textual extraido de PDF foi encontrado como fonte da IA para esta pergunta.'
}

async function buildContext(req, message = '') {
  const condominioId = req.user.condominioId
  const isMorador = req.user.role === 'MORADOR'
  const now = new Date()
  const financeiro = isFinancialQuestion(message)

  const [
    condominio,
    user,
    documentos,
    documentosFonteIA,
    comunicados,
    chamados,
    taxas,
    reservas,
    espacos,
    vozes,
  ] = await Promise.all([
    prisma.condominio.findUnique({
      where: { id: condominioId },
      select: { nome: true, endereco: true, telefone: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: req.user.id },
      select: { nome: true, role: true, unidade: true, bloco: true },
    }),
    prisma.documento.findMany({
      where: {
        condominioId,
        ...(isMorador ? { acesso: 'PUBLICO' } : {}),
      },
      select: { nome: true, pasta: true, tipo: true, acesso: true, descricao: true, createdAt: true, usarComoFonteIA: true, categoriaIA: true },
      orderBy: { createdAt: 'desc' },
      take: financeiro ? 30 : 16,
    }),
    prisma.documento.findMany({
      where: {
        condominioId,
        usarComoFonteIA: true,
        textoExtraido: { not: null },
        ...(isMorador ? { acesso: 'PUBLICO' } : {}),
      },
      select: { nome: true, pasta: true, tipo: true, acesso: true, descricao: true, categoriaIA: true, textoExtraido: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: financeiro ? 20 : 8,
    }),
    prisma.comunicado.findMany({
      where: { condominioId },
      select: { titulo: true, conteudo: true, fixado: true, createdAt: true },
      orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    }),
    prisma.chamado.findMany({
      where: {
        condominioId,
        ...(isMorador ? { moradorId: req.user.id } : {}),
      },
      select: { titulo: true, categoria: true, status: true, prioridade: true, resposta: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.taxa.findMany({
      where: {
        condominioId,
        ...(isMorador ? { moradorId: req.user.id } : {}),
      },
      select: { descricao: true, valor: true, vencimento: true, status: true, mes: true, ano: true },
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    prisma.reserva.findMany({
      where: {
        condominioId,
        ...(isMorador ? { moradorId: req.user.id } : {}),
        data: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
      include: { espaco: { select: { nome: true } } },
      orderBy: { data: 'asc' },
      take: 6,
    }),
    prisma.espacoComum.findMany({
      where: { condominioId, ativo: true },
      select: { nome: true, capacidade: true, regras: true },
      orderBy: { nome: 'asc' },
      take: 10,
    }),
    prisma.vozMorador.findMany({
      where: { condominioId, ativo: true },
      select: {
        titulo: true,
        descricao: true,
        createdAt: true,
        _count: { select: { votos: true, comentarios: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ])

  return [
    `Modo de pergunta: ${financeiro ? 'ANALISE_FINANCEIRA_DOCUMENTAL' : 'GERAL'}`,
    `Condominio: ${sanitizeLine(condominio?.nome)} | endereco: ${sanitizeLine(condominio?.endereco)} | telefone: ${sanitizeLine(condominio?.telefone)} | email: ${sanitizeLine(condominio?.email)}`,
    `Usuario: ${sanitizeLine(user?.nome)} | perfil: ${sanitizeLine(user?.role)} | unidade: ${sanitizeLine(user?.unidade)} | bloco: ${sanitizeLine(user?.bloco)}`,
    '',
    'Fontes documentais da IA extraidas de PDFs:',
    buildDocumentSourceContext(documentosFonteIA, message),
    '',
    'Documentos disponiveis:',
    listLines(
      documentos,
      d => `- ${d.nome} (${d.tipo}, pasta ${d.pasta}, acesso ${d.acesso})${d.usarComoFonteIA ? ' [fonte IA]' : ''}${d.categoriaIA ? ` [${d.categoriaIA}]` : ''}${d.descricao ? `: ${d.descricao}` : ''}`,
      '- Nenhum documento encontrado.'
    ),
    '',
    'Comunicados recentes:',
    listLines(
      comunicados,
      c => `- ${c.titulo}${c.fixado ? ' [fixado]' : ''} em ${formatDate(c.createdAt)}: ${sanitizeLine(c.conteudo).slice(0, 180)}`,
      '- Nenhum comunicado recente.'
    ),
    '',
    isMorador ? 'Chamados do morador:' : 'Chamados recentes do condominio:',
    listLines(
      chamados,
      c => `- ${c.titulo} | ${c.categoria} | ${c.status} | prioridade ${c.prioridade}${c.resposta ? ` | resposta: ${c.resposta}` : ''}`,
      '- Nenhum chamado encontrado.'
    ),
    '',
    isMorador ? 'Taxas do morador:' : 'Taxas recentes do condominio:',
    listLines(
      taxas,
      t => `- ${t.descricao} ${t.mes}/${t.ano} | ${money(t.valor)} | vencimento ${formatDate(t.vencimento)} | ${t.status}`,
      '- Nenhuma taxa encontrada.'
    ),
    '',
    'Reservas futuras:',
    listLines(
      reservas,
      r => `- ${r.espaco?.nome || 'Espaco'} em ${formatDate(r.data)} das ${r.horaInicio} as ${r.horaFim} | ${r.status}`,
      '- Nenhuma reserva futura encontrada.'
    ),
    '',
    'Espacos comuns:',
    listLines(
      espacos,
      e => `- ${e.nome}${e.capacidade ? ` | capacidade ${e.capacidade}` : ''}${e.regras ? ` | regras: ${e.regras}` : ''}`,
      '- Nenhum espaco comum ativo encontrado.'
    ),
    '',
    'Sugestoes da Voz do Morador:',
    listLines(
      vozes,
      v => `- ${v.titulo} | ${v._count.votos} votos | ${v._count.comentarios} comentarios`,
      '- Nenhuma sugestao ativa encontrada.'
    ),
  ].join('\n')
}

function localAnswer(message, context) {
  const text = normalizeText(message)

  const section = name => {
    const marker = `${name}:`
    const start = context.indexOf(marker)
    if (start < 0) return ''
    const rest = context.slice(start + marker.length).trim()
    const end = rest.search(/\n\n[A-Z][A-Za-z ]+:/)
    return (end >= 0 ? rest.slice(0, end) : rest).trim()
  }

  const fontesIA = section('Fontes documentais da IA extraidas de PDFs')
  if (fontesIA && !fontesIA.startsWith('Nenhum trecho')) {
    if (isFinancialQuestion(message)) {
      return `Encontrei trechos financeiros nos documentos cadastrados como fonte da IA. Para uma auditoria completa e comparação entre meses, a IA avançada precisa estar ativa. Trechos encontrados:\n\n${fontesIA.slice(0, 3200)}\n\nFonte: documentos marcados como fonte da IA no condomínio.`
    }

    return `Encontrei trechos nos documentos cadastrados como fonte da IA:\n\n${fontesIA.slice(0, 2600)}\n\nFonte: documentos marcados como fonte da IA no condomínio.`
  }

  if (/(chamado|reclamacao|manutencao|ticket)/.test(text)) {
    return `Posso te ajudar com chamados. Encontrei este panorama:\n\n${section('Chamados do morador') || section('Chamados recentes do condominio')}\n\nPara abrir um novo atendimento, use a aba Chamados e informe titulo, tipo e descricao.`
  }

  if (/(taxa|boleto|pix|financeiro|pagamento|vencimento|inadimpl)/.test(text)) {
    return `Sobre financeiro, encontrei:\n\n${section('Taxas do morador') || section('Taxas recentes do condominio')}\n\nSe houver balancete ou prestação de contas em PDF marcada como fonte da IA, eu consigo responder com base nesse documento.`
  }

  if (/(documento|regulamento|ata|contrato|arquivo|norma|regimento|convencao|balancete)/.test(text)) {
    return `Sobre documentos, estes sao os principais itens disponiveis para consulta:\n\n${section('Documentos disponiveis')}\n\nPara respostas com base no conteudo do PDF, o documento precisa estar marcado como fonte da IA e ter texto extraido.`
  }

  if (/(reserva|salao|churrasqueira|quadra|espaco)/.test(text)) {
    return `Sobre reservas e espacos comuns:\n\n${section('Espacos comuns')}\n\nReservas futuras:\n${section('Reservas futuras')}\n\nPara solicitar uma reserva, use o modulo de Reservas no portal ou peça confirmacao ao sindico.`
  }

  if (/(comunicado|aviso|assembleia|reuniao|votacao|voz)/.test(text)) {
    return `Encontrei estes avisos e sugestoes:\n\nComunicados:\n${section('Comunicados recentes')}\n\nVoz do Morador:\n${section('Sugestoes da Voz do Morador')}`
  }

  return `Posso ajudar com documentos, chamados, comunicados, taxas, reservas e regras do condominio. Para eu responder com base em um PDF, o documento precisa ser enviado e marcado como fonte da IA.`
}

async function askAnthropic({ message, history, canal, context }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const system = [
    'Voce e o assistente IA do SaaS condominial Ta na Mao.',
    'Responda sempre em portugues do Brasil, com tom claro, educado e objetivo.',
    'Use somente os dados do contexto. Se nao houver dado suficiente, diga isso e oriente o proximo passo.',
    'Quando houver Fontes documentais da IA extraidas de PDFs, priorize esses trechos acima de qualquer outro dado.',
    'Sempre que responder com base em PDF, cite o nome do documento usado como fonte.',
    'Se o modo for ANALISE_FINANCEIRA_DOCUMENTAL, aja como analista financeiro condominial: compare meses, agrupe receitas/despesas, destaque aumentos relevantes, fornecedores recorrentes, valores duplicados, gastos fora da média e pontos que exigem conferência humana.',
    'Em auditoria financeira, separe a resposta em: Resumo, Comparativo, Pontos de atenção, Possíveis inconsistências, Fontes utilizadas e Limitações da análise.',
    'Nunca acuse fraude. Use expressões como indício, ponto de atenção, divergência aparente ou item que exige conferência documental.',
    'Nunca revele dados privados de outros moradores. Para moradores, trate apenas dados do proprio usuario e documentos publicos.',
    'Nao invente regras, valores, datas, status ou fontes. Se o PDF nao trouxer valor claro, diga que o documento não permite concluir com segurança.',
    `Canal atual: ${canal}.`,
    '',
    'Contexto do condominio:',
    context,
  ].join('\n')

  const messages = [
    ...(history || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: isFinancialQuestion(message) ? 1700 : 1100,
      temperature: 0.1,
      system,
      messages,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Falha na IA: ${response.status} ${body.slice(0, 180)}`)
  }

  const data = await response.json()
  return data.content?.find(part => part.type === 'text')?.text || null
}

iaRouter.post('/chat', async (req, res, next) => {
  try {
    const input = chatSchema.parse(req.body)
    const context = await buildContext(req, input.message)

    let answer = null
    let source = 'local'
    try {
      answer = await askAnthropic({ ...input, context })
      if (answer) source = 'anthropic'
    } catch (e) {
      console.warn('[ia] usando resposta local:', e.message)
    }

    if (!answer) answer = localAnswer(input.message, context)

    res.json({
      answer,
      source,
      model: source === 'anthropic' ? MODEL : 'local-context',
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Mensagem invalida', code: 'VALIDATION_ERROR', details: e.errors })
    }
    next(e)
  }
})
