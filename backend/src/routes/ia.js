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

async function buildContext(req) {
  const condominioId = req.user.condominioId
  const isMorador = req.user.role === 'MORADOR'
  const now = new Date()

  const [
    condominio,
    user,
    documentos,
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
      select: { nome: true, pasta: true, tipo: true, acesso: true, descricao: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
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
    `Condominio: ${sanitizeLine(condominio?.nome)} | endereco: ${sanitizeLine(condominio?.endereco)} | telefone: ${sanitizeLine(condominio?.telefone)} | email: ${sanitizeLine(condominio?.email)}`,
    `Usuario: ${sanitizeLine(user?.nome)} | perfil: ${sanitizeLine(user?.role)} | unidade: ${sanitizeLine(user?.unidade)} | bloco: ${sanitizeLine(user?.bloco)}`,
    '',
    'Documentos disponiveis:',
    listLines(
      documentos,
      d => `- ${d.nome} (${d.tipo}, pasta ${d.pasta}, acesso ${d.acesso})${d.descricao ? `: ${d.descricao}` : ''}`,
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
  const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const section = name => {
    const marker = `${name}:`
    const start = context.indexOf(marker)
    if (start < 0) return ''
    const rest = context.slice(start + marker.length).trim()
    const end = rest.search(/\n\n[A-Z][A-Za-z ]+:/)
    return (end >= 0 ? rest.slice(0, end) : rest).trim()
  }

  if (/(chamado|reclamacao|manutencao|ticket)/.test(text)) {
    return `Posso te ajudar com chamados. Encontrei este panorama:\n\n${section('Chamados do morador') || section('Chamados recentes do condominio')}\n\nPara abrir um novo atendimento, use a aba Chamados e informe titulo, tipo e descricao.`
  }

  if (/(taxa|boleto|pix|financeiro|pagamento|vencimento|inadimpl)/.test(text)) {
    return `Sobre financeiro, encontrei:\n\n${section('Taxas do morador') || section('Taxas recentes do condominio')}\n\nSe precisar de boleto, PIX ou baixa de pagamento, o sindico pode confirmar pelo modulo Financeiro.`
  }

  if (/(documento|regulamento|ata|contrato|arquivo|norma)/.test(text)) {
    return `Sobre documentos, estes sao os principais itens disponiveis para consulta:\n\n${section('Documentos disponiveis')}\n\nSe o documento desejado nao aparecer, solicite ao sindico que publique na Central de Documentos.`
  }

  if (/(reserva|salao|churrasqueira|quadra|espaco)/.test(text)) {
    return `Sobre reservas e espacos comuns:\n\n${section('Espacos comuns')}\n\nReservas futuras:\n${section('Reservas futuras')}\n\nPara solicitar uma reserva, use o modulo de Reservas no portal ou peça confirmacao ao sindico.`
  }

  if (/(comunicado|aviso|assembleia|reuniao|votacao|voz)/.test(text)) {
    return `Encontrei estes avisos e sugestoes:\n\nComunicados:\n${section('Comunicados recentes')}\n\nVoz do Morador:\n${section('Sugestoes da Voz do Morador')}`
  }

  return `Posso ajudar com documentos, chamados, comunicados, taxas, reservas e regras do condominio. Pergunte, por exemplo: "qual o status do meu chamado?", "tenho taxa em atraso?", "quais documentos estao disponiveis?" ou "como reservar o salao?".`
}

async function askAnthropic({ message, history, canal, context }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const system = [
    'Voce e o assistente IA do SaaS condominial Ta na Mao.',
    'Responda sempre em portugues do Brasil, com tom claro, educado e objetivo.',
    'Use somente os dados do contexto. Se nao houver dado suficiente, diga isso e oriente o proximo passo.',
    'Nunca revele dados privados de outros moradores. Para moradores, trate apenas dados do proprio usuario e documentos publicos.',
    'Nao invente regras, valores, datas ou status.',
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
      max_tokens: 900,
      temperature: 0.2,
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
    const context = await buildContext(req)

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
