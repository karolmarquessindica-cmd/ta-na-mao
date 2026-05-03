// src/routes/whatsapp.js
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { encrypt, decrypt } from '../lib/encryption.js'

export const whatsappRouter = Router()
whatsappRouter.use(authenticate)

// ─── Enviar mensagem real via Z-API (ou similar) ─────────
async function enviarMensagemZAPI({ apiUrl, apiKey, instanceId, numero, mensagem }) {
  const url = `${apiUrl}/instances/${instanceId}/token/${apiKey}/send-text`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: numero, message: mensagem }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Z-API error: ${err}`)
  }
  return res.json()
}

// ─── Função interna exportada para outros módulos ─────────
export async function enviarWhatsApp({ condominioId, numero, mensagem }) {
  const config = await prisma.configWhatsApp.findUnique({
    where: { condominioId }
  })

  const log = await prisma.whatsAppLog.create({
    data: { condominioId, destinatario: numero, mensagem, status: 'PENDENTE' }
  })

  if (!config?.ativo) {
    await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: { status: 'FALHOU', erro: 'WhatsApp não configurado ou inativo' }
    })
    return { ok: false, motivo: 'inativo' }
  }

  try {
    // Descriptografar apiKey antes de usar
    const decryptedApiKey = process.env.WHATSAPP_ENCRYPTION_KEY ? decrypt(config.apiKey) : config.apiKey

    await enviarMensagemZAPI({
      apiUrl: config.apiUrl,
      apiKey: decryptedApiKey,
      instanceId: config.instanceId,
      numero,
      mensagem,
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

// ─── ENDPOINTS ────────────────────────────────────────────

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
    // Criptografar apiKey se fornecida
    if (apiKey && !apiKey.startsWith('***')) {
      data.apiKey = process.env.WHATSAPP_ENCRYPTION_KEY ? encrypt(apiKey) : apiKey
    }

    const config = await prisma.configWhatsApp.upsert({
      where: { condominioId: req.user.condominioId },
      update: data,
      create: { ...data, apiKey: data.apiKey || '' },
    })
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
    })
    res.json(result)
  } catch (e) { next(e) }
})

// POST /api/whatsapp/enviar — envio manual (broadcast ou individual)
whatsappRouter.post('/enviar', async (req, res, next) => {
  try {
    const { mensagem, destinatario } = req.body

    let numeros = []
    if (destinatario === 'todos' || !destinatario) {
      const users = await prisma.user.findMany({
        where: { condominioId: req.user.condominioId, ativo: true, whatsapp: { not: null } },
        select: { whatsapp: true }
      })
      numeros = users.map(u => u.whatsapp).filter(Boolean)
    } else if (destinatario.startsWith('bloco:')) {
      const bloco = destinatario.split(':')[1]
      const users = await prisma.user.findMany({
        where: { condominioId: req.user.condominioId, ativo: true, bloco, whatsapp: { not: null } },
        select: { whatsapp: true }
      })
      numeros = users.map(u => u.whatsapp).filter(Boolean)
    } else {
      numeros = [destinatario]
    }

    const resultados = await Promise.allSettled(
      numeros.map(n => enviarWhatsApp({ condominioId: req.user.condominioId, numero: n, mensagem }))
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
    const hoje_enviados = await prisma.whatsAppLog.count({
      where: { condominioId: req.user.condominioId, status: 'ENVIADO', createdAt: { gte: hoje } }
    })
    res.json({ enviados, falhas, pendentes, hoje: hoje_enviados })
  } catch (e) { next(e) }
})
