// src/routes/whatsapp.js
import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { encrypt, decrypt } from '../lib/encryption.js'

export const whatsappRouter = Router()
whatsappRouter.use(authenticate)

let premiumEnsured = false

async function ensureWhatsAppPremiumTables() {
  if (premiumEnsured) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WhatsAppTemplate" (
      "id" TEXT PRIMARY KEY,
      "condominioId" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "evento" TEXT NOT NULL,
      "conteudo" TEXT NOT NULL,
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WhatsAppTemplate_condominioId_idx" ON "WhatsAppTemplate" ("condominioId")
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppTemplate_condominio_evento_key" ON "WhatsAppTemplate" ("condominioId", "evento")
  `)

  premiumEnsured = true
}

function normalizarNumero(numero) {
  return String(numero || '').replace(/\D/g, '')
}

function renderTemplate(template, vars = {}) {
  return String(template || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const value = vars[key]
    return value === undefined || value === null || value === '' ? '' : String(value)
  })
}

function templatesPadrao(condominioId) {
  return [
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Chamado aberto',
      evento: 'CHAMADO_ABERTO',
      conteudo: '🔔 *Novo chamado aberto*\n\n🏢 {{condominio}}\n👤 Morador: {{nome}}\n📌 {{titulo}}\n\nAcesse o painel para acompanhar.',
    },
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Chamado em análise',
      evento: 'CHAMADO_EM_ANALISE',
      conteudo: '🔍 Olá, {{nome}}.\n\nSeu chamado *{{titulo}}* está em análise pela administração do condomínio {{condominio}}.',
    },
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Chamado concluído',
      evento: 'CHAMADO_CONCLUIDO',
      conteudo: '✅ Olá, {{nome}}.\n\nSeu chamado *{{titulo}}* foi concluído.\n\n{{resposta}}',
    },
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Manutenção vencendo',
      evento: 'MANUTENCAO_VENCENDO',
      conteudo: '🛠️ *Alerta de manutenção*\n\n🏢 {{condominio}}\n📌 {{titulo}}\n📅 Vencimento: {{data}}\n⚠️ Prioridade: {{prioridade}}\n\nAcompanhe pelo painel para evitar atraso ou custo corretivo.',
    },
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Comunicado geral',
      evento: 'COMUNICADO_GERAL',
      conteudo: '📢 *Comunicado — {{condominio}}*\n\n*{{titulo}}*\n\n{{mensagem}}',
    },
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Aviso funcionário com ciência',
      evento: 'FUNCIONARIO_AVISO_CIENCIA',
      conteudo: '📌 Olá, {{nome}}.\n\nVocê recebeu um aviso do condomínio {{condominio}}:\n\n*{{titulo}}*\n\nAcesse o Portal do Funcionário e confirme ciência.',
    },
    {
      id: crypto.randomUUID(),
      condominioId,
      nome: 'Treinamento/Reunião',
      evento: 'TREINAMENTO_REUNIAO',
      conteudo: '📚 *Convocação*\n\nOlá, {{nome}}.\nVocê foi convocado para: *{{titulo}}*\n📅 Data: {{data}}\n📍 Local: {{local}}\n\nA presença/ciência poderá ser registrada no sistema.',
    },
  ]
}

async function seedTemplatesPadrao(condominioId) {
  await ensureWhatsAppPremiumTables()
  const count = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS total FROM "WhatsAppTemplate" WHERE "condominioId"=$1`,
    condominioId
  )
  if (Number(count?.[0]?.total || 0) > 0) return

  for (const t of templatesPadrao(condominioId)) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WhatsAppTemplate" ("id", "condominioId", "nome", "evento", "conteudo", "ativo") VALUES ($1,$2,$3,$4,$5,true)`,
      t.id,
      t.condominioId,
      t.nome,
      t.evento,
      t.conteudo
    )
  }
}

async function obterTemplate({ condominioId, evento }) {
  await seedTemplatesPadrao(condominioId)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "WhatsAppTemplate" WHERE "condominioId"=$1 AND "evento"=$2 AND "ativo"=true LIMIT 1`,
    condominioId,
    evento
  )
  return rows?.[0] || null
}

// ─── Enviar mensagem real via Z-API (ou similar) ─────────
async function enviarMensagemZAPI({ apiUrl, apiKey, instanceId, numero, mensagem }) {
  const url = `${apiUrl}/instances/${instanceId}/token/${apiKey}/send-text`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizarNumero(numero), message: mensagem }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Z-API error: ${err}`)
  }
  return res.json()
}

// ─── Função interna exportada para outros módulos ─────────
export async function enviarWhatsApp({ condominioId, numero, mensagem, evento = 'MANUAL', variaveis = null }) {
  const numeroLimpo = normalizarNumero(numero)

  let mensagemFinal = mensagem
  if (evento && variaveis && !mensagem) {
    const template = await obterTemplate({ condominioId, evento })
    mensagemFinal = renderTemplate(template?.conteudo, variaveis)
  }

  const config = await prisma.configWhatsApp.findUnique({
    where: { condominioId }
  })

  const log = await prisma.whatsAppLog.create({
    data: { condominioId, destinatario: numeroLimpo, mensagem: mensagemFinal || '', status: 'PENDENTE' }
  })

  if (!numeroLimpo || numeroLimpo.length < 12) {
    await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: { status: 'FALHOU', erro: 'Número inválido' }
    })
    return { ok: false, motivo: 'numero_invalido' }
  }

  if (!config?.ativo) {
    await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: { status: 'FALHOU', erro: 'WhatsApp não configurado ou inativo' }
    })
    return { ok: false, motivo: 'inativo' }
  }

  try {
    const decryptedApiKey = process.env.WHATSAPP_ENCRYPTION_KEY ? decrypt(config.apiKey) : config.apiKey

    await enviarMensagemZAPI({
      apiUrl: config.apiUrl,
      apiKey: decryptedApiKey,
      instanceId: config.instanceId,
      numero: numeroLimpo,
      mensagem: mensagemFinal,
    })
    await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: { status: 'ENVIADO', enviadoEm: new Date() }
    })
    return { ok: true }
  } catch (e) {
    await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: { status: 'FALHOU', erro: e.message }
    })
    return { ok: false, motivo: e.message }
  }
}

// GET /api/whatsapp/config
whatsappRouter.get('/config', async (req, res, next) => {
  try {
    const config = await prisma.configWhatsApp.findUnique({
      where: { condominioId: req.user.condominioId }
    })
    if (config) {
      const { apiKey, ...safe } = config
      return res.json({ ...safe, apiKeyConfigurado: !!apiKey })
    }
    res.json(null)
  } catch (e) { next(e) }
})

// POST /api/whatsapp/config — salvar ou atualizar config
whatsappRouter.post('/config', async (req, res, next) => {
  try {
    const { apiUrl, apiKey, instanceId, ativo,
      notifChamadoAberto, notifChamadoAtualizado, notifChamadoConcluido,
      notifManutencaoVencendo, notifComunicados } = req.body

    const data = {
      apiUrl, instanceId,
      ativo: ativo ?? false,
      notifChamadoAberto: notifChamadoAberto ?? true,
      notifChamadoAtualizado: notifChamadoAtualizado ?? true,
      notifChamadoConcluido: notifChamadoConcluido ?? true,
      notifManutencaoVencendo: notifManutencaoVencendo ?? true,
      notifComunicados: notifComunicados ?? false,
      condominioId: req.user.condominioId,
    }
    if (apiKey && !apiKey.startsWith('***')) {
      data.apiKey = process.env.WHATSAPP_ENCRYPTION_KEY ? encrypt(apiKey) : apiKey
    }

    const config = await prisma.configWhatsApp.upsert({
      where: { condominioId: req.user.condominioId },
      update: data,
      create: { ...data, apiKey: data.apiKey || '' },
    })
    await seedTemplatesPadrao(req.user.condominioId)
    const { apiKey: _, ...safe } = config
    res.json({ ...safe, apiKeyConfigurado: !!config.apiKey })
  } catch (e) { next(e) }
})

// POST /api/whatsapp/testar — enviar mensagem de teste
whatsappRouter.post('/testar', async (req, res, next) => {
  try {
    const { numero } = req.body
    if (!numero) return res.status(400).json({ error: 'Número obrigatório', code: 'VALIDATION_ERROR' })
    const result = await enviarWhatsApp({
      condominioId: req.user.condominioId,
      numero,
      mensagem: '✅ *Tá na Mão* — Mensagem de teste enviada com sucesso! Sua integração WhatsApp está funcionando.',
      evento: 'TESTE',
    })
    res.json(result)
  } catch (e) { next(e) }
})

// GET /api/whatsapp/templates
whatsappRouter.get('/templates', async (req, res, next) => {
  try {
    await seedTemplatesPadrao(req.user.condominioId)
    const data = await prisma.$queryRawUnsafe(
      `SELECT * FROM "WhatsAppTemplate" WHERE "condominioId"=$1 ORDER BY "createdAt" ASC`,
      req.user.condominioId
    )
    res.json({ data, total: data.length })
  } catch (e) { next(e) }
})

// POST /api/whatsapp/templates
whatsappRouter.post('/templates', async (req, res, next) => {
  try {
    await ensureWhatsAppPremiumTables()
    const { nome, evento, conteudo, ativo } = req.body
    if (!nome || !evento || !conteudo) return res.status(400).json({ error: 'Nome, evento e conteúdo são obrigatórios', code: 'VALIDATION_ERROR' })

    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WhatsAppTemplate" ("id", "condominioId", "nome", "evento", "conteudo", "ativo") VALUES ($1,$2,$3,$4,$5,$6)`,
      id,
      req.user.condominioId,
      nome,
      evento,
      conteudo,
      ativo ?? true
    )
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "WhatsAppTemplate" WHERE "id"=$1 LIMIT 1`, id)
    res.status(201).json(rows?.[0])
  } catch (e) { next(e) }
})

// PATCH /api/whatsapp/templates/:id
whatsappRouter.patch('/templates/:id', async (req, res, next) => {
  try {
    await ensureWhatsAppPremiumTables()
    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM "WhatsAppTemplate" WHERE "id"=$1 AND "condominioId"=$2 LIMIT 1`,
      req.params.id,
      req.user.condominioId
    )
    if (!existing?.[0]) return res.status(404).json({ error: 'Template não encontrado', code: 'NOT_FOUND' })

    const atual = existing[0]
    await prisma.$executeRawUnsafe(
      `UPDATE "WhatsAppTemplate" SET "nome"=$1, "evento"=$2, "conteudo"=$3, "ativo"=$4, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$5 AND "condominioId"=$6`,
      req.body.nome ?? atual.nome,
      req.body.evento ?? atual.evento,
      req.body.conteudo ?? atual.conteudo,
      req.body.ativo ?? atual.ativo,
      req.params.id,
      req.user.condominioId
    )
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "WhatsAppTemplate" WHERE "id"=$1 LIMIT 1`, req.params.id)
    res.json(rows?.[0])
  } catch (e) { next(e) }
})

// DELETE /api/whatsapp/templates/:id
whatsappRouter.delete('/templates/:id', async (req, res, next) => {
  try {
    await ensureWhatsAppPremiumTables()
    await prisma.$executeRawUnsafe(
      `DELETE FROM "WhatsAppTemplate" WHERE "id"=$1 AND "condominioId"=$2`,
      req.params.id,
      req.user.condominioId
    )
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// POST /api/whatsapp/preview — pré-visualizar template
whatsappRouter.post('/preview', async (req, res, next) => {
  try {
    const { evento, conteudo, variaveis } = req.body
    let base = conteudo
    if (!base && evento) {
      const template = await obterTemplate({ condominioId: req.user.condominioId, evento })
      base = template?.conteudo
    }
    res.json({ mensagem: renderTemplate(base, variaveis || {}) })
  } catch (e) { next(e) }
})

// POST /api/whatsapp/enviar-template
whatsappRouter.post('/enviar-template', async (req, res, next) => {
  try {
    const { evento, numero, variaveis } = req.body
    if (!evento || !numero) return res.status(400).json({ error: 'Evento e número são obrigatórios', code: 'VALIDATION_ERROR' })
    const template = await obterTemplate({ condominioId: req.user.condominioId, evento })
    if (!template) return res.status(404).json({ error: 'Template não encontrado', code: 'NOT_FOUND' })

    const mensagem = renderTemplate(template.conteudo, variaveis || {})
    const result = await enviarWhatsApp({ condominioId: req.user.condominioId, numero, mensagem, evento })
    res.json({ ...result, mensagem })
  } catch (e) { next(e) }
})

// POST /api/whatsapp/enviar — envio manual (broadcast ou individual)
whatsappRouter.post('/enviar', async (req, res, next) => {
  try {
    const { mensagem, destinatario } = req.body
    if (!mensagem) return res.status(400).json({ error: 'Mensagem obrigatória', code: 'VALIDATION_ERROR' })

    let numeros = []
    if (destinatario === 'todos' || !destinatario) {
      const users = await prisma.user.findMany({
        where: { condominioId: req.user.condominioId, ativo: true, whatsapp: { not: null } },
        select: { whatsapp: true }
      })
      numeros = users.map(u => u.whatsapp).filter(Boolean)
    } else if (String(destinatario).startsWith('bloco:')) {
      const bloco = String(destinatario).split(':')[1]
      const users = await prisma.user.findMany({
        where: { condominioId: req.user.condominioId, ativo: true, bloco, whatsapp: { not: null } },
        select: { whatsapp: true }
      })
      numeros = users.map(u => u.whatsapp).filter(Boolean)
    } else {
      numeros = [destinatario]
    }

    const resultados = await Promise.allSettled(
      numeros.map(n => enviarWhatsApp({ condominioId: req.user.condominioId, numero: n, mensagem, evento: 'MANUAL' }))
    )
    const enviados = resultados.filter(r => r.status === 'fulfilled' && r.value.ok).length
    res.json({ total: numeros.length, enviados, falhas: numeros.length - enviados })
  } catch (e) { next(e) }
})

// GET /api/whatsapp/logs — histórico de mensagens, com paginação
whatsappRouter.get('/logs', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }

    const [data, total] = await Promise.all([
      prisma.whatsAppLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.whatsAppLog.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

// GET /api/whatsapp/stats — estatísticas
whatsappRouter.get('/stats', async (req, res, next) => {
  try {
    const [enviados, falhas, pendentes] = await Promise.all([
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'ENVIADO' } }),
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'FALHOU' } }),
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'PENDENTE' } }),
    ])
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const hojeEnviados = await prisma.whatsAppLog.count({
      where: { condominioId: req.user.condominioId, status: 'ENVIADO', createdAt: { gte: hoje } }
    })
    const total = enviados + falhas + pendentes
    const taxaSucesso = total ? Math.round((enviados / total) * 100) : 0
    res.json({ enviados, falhas, pendentes, hoje: hojeEnviados, total, taxaSucesso })
  } catch (e) { next(e) }
})

// GET /api/whatsapp/dashboard — visão premium
whatsappRouter.get('/dashboard', async (req, res, next) => {
  try {
    await seedTemplatesPadrao(req.user.condominioId)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const seteDias = new Date(); seteDias.setDate(seteDias.getDate() - 7)

    const [enviados, falhas, pendentes, hojeEnviados, ultimos, templates] = await Promise.all([
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'ENVIADO' } }),
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'FALHOU' } }),
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'PENDENTE' } }),
      prisma.whatsAppLog.count({ where: { condominioId: req.user.condominioId, status: 'ENVIADO', createdAt: { gte: hoje } } }),
      prisma.whatsAppLog.findMany({ where: { condominioId: req.user.condominioId }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.$queryRawUnsafe(`SELECT * FROM "WhatsAppTemplate" WHERE "condominioId"=$1 ORDER BY "createdAt" ASC`, req.user.condominioId),
    ])

    const recentes7d = await prisma.whatsAppLog.count({
      where: { condominioId: req.user.condominioId, createdAt: { gte: seteDias } }
    })

    const total = enviados + falhas + pendentes
    res.json({
      cards: {
        total,
        enviados,
        falhas,
        pendentes,
        hoje: hojeEnviados,
        recentes7d,
        taxaSucesso: total ? Math.round((enviados / total) * 100) : 0,
      },
      templates,
      ultimos,
      recomendacoes: [
        'Revise falhas de envio antes de disparos em massa.',
        'Use templates com variáveis para mensagens mais profissionais.',
        'Ative comunicados gerais apenas quando houver necessidade real para evitar excesso de mensagens.',
      ]
    })
  } catch (e) { next(e) }
})
