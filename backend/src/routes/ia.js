// src/routes/ia.js
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { askExternalAI, geminiModelName } from '../lib/aiProvider.js'

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

  return `Não encontrei essa informação nos documentos disponíveis do condomínio. Recomendo confirmar com a administração ou com o síndico.`
}

async function askGemini({ message, history, canal, context }) {
  const system = [
    'Você é a IA oficial do sistema Tô na Mão, especializada em gestão condominial.',
    'Responda sempre em português do Brasil, com tom claro, educado, objetivo e profissional.',
    'Use prioritariamente as informações presentes nos documentos do condomínio.',
    'Prioridade das fontes: Convenção do Condomínio, Regimento Interno, Atas de Assembleia, Comunicados Oficiais, dados cadastrados no sistema e legislação aplicável quando necessário.',
    'Nunca invente regras, artigos, valores, datas, decisões de assembleia ou fontes.',
    'Se a informação não existir na base de conhecimento, informe claramente que não encontrou essa informação nos documentos disponíveis do condomínio e recomende confirmar com a administração ou com o síndico.',
    'Sempre que possível, cite a fonte: Conforme o Regimento Interno, Segundo a Ata, ou Conforme o documento disponível.',
    'Quando a pergunta envolver financeiro de morador, responda apenas com dados da própria unidade e nunca exponha dados de terceiros.',
    'Quando depender de interpretação jurídica, explique o que consta nos documentos e recomende análise da administração ou orientação jurídica, sem parecer definitivo.',
    'Em reservas, informe apenas disponibilidade, horários e regras presentes no sistema. Não confirme reserva sem dado do sistema.',
    `Canal atual: ${canal}.`,
    '',
    'Contexto do condomínio:',
    context,
  ].join('\n')

  const messages = [
    ...(history || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  return askExternalAI({
    system,
    messages,
    maxTokens: isFinancialQuestion(message) ? 1700 : 1100,
  })
}

iaRouter.post('/chat', async (req, res, next) => {
  try {
    const input = chatSchema.parse(req.body)
    const context = await buildContext(req, input.message)

    let answer = null
    let source = 'local'
    try {
      answer = await askGemini({ ...input, context })
      if (answer) source = 'gemini'
    } catch (e) {
      console.warn('[ia] usando resposta local:', e.message)
    }

    if (!answer) answer = localAnswer(input.message, context)

    res.json({
      answer,
      source,
      model: source === 'gemini' ? geminiModelName() : 'local-context',
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Mensagem invalida', code: 'VALIDATION_ERROR', details: e.errors })
    }
    next(e)
  }
})
