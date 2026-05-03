// src/routes/comunicado.js
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { enviarWhatsApp } from './whatsapp.js'

export const comunicadoRouter = Router()
comunicadoRouter.use(authenticate)

function formatarMensagemComunicado({ titulo, conteudo, emoji, condominioNome }) {
  const icon = emoji || '📢'
  return `${icon} *Comunicado do condomínio ${condominioNome || ''}*\n\n*${titulo}*\n\n${conteudo || ''}`.trim()
}

async function dispararComunicadoWhatsApp({ condominioId, comunicado }) {
  const config = await prisma.configWhatsApp.findUnique({ where: { condominioId } })
  if (!config?.ativo || !config?.notifComunicados) return { ok: false, motivo: 'automacao_inativa' }

  const condominio = await prisma.condominio.findUnique({ where: { id: condominioId }, select: { nome: true } })
  const moradores = await prisma.user.findMany({
    where: { condominioId, ativo: true, whatsapp: { not: null } },
    select: { id: true, nome: true, whatsapp: true, role: true }
  })

  const mensagem = formatarMensagemComunicado({
    titulo: comunicado.titulo,
    conteudo: comunicado.conteudo,
    emoji: comunicado.emoji,
    condominioNome: condominio?.nome,
  })

  const resultados = await Promise.allSettled(
    moradores.map(morador => enviarWhatsApp({
      condominioId,
      numero: morador.whatsapp,
      mensagem: mensagem.replace('{{nome}}', morador.nome || 'morador'),
    }))
  )

  return {
    ok: true,
    total: moradores.length,
    enviados: resultados.filter(r => r.status === 'fulfilled' && r.value?.ok).length,
  }
}

comunicadoRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }

    const [data, total] = await Promise.all([
      prisma.comunicado.findMany({
        where,
        orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.comunicado.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

comunicadoRouter.post('/', async (req, res, next) => {
  try {
    const { titulo, conteudo, emoji, fixado, enviarWhatsApp: deveEnviarWhatsApp } = req.body
    const item = await prisma.comunicado.create({
      data: { titulo, conteudo, emoji, fixado: fixado || false, condominioId: req.user.condominioId }
    })

    let whatsapp = null
    if (deveEnviarWhatsApp !== false) {
      whatsapp = await dispararComunicadoWhatsApp({ condominioId: req.user.condominioId, comunicado: item })
    }

    res.status(201).json({ ...item, whatsapp })
  } catch (e) { next(e) }
})

// POST /api/comunicados/:id/whatsapp — reenviar comunicado pelo WhatsApp
comunicadoRouter.post('/:id/whatsapp', async (req, res, next) => {
  try {
    const item = await prisma.comunicado.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const whatsapp = await dispararComunicadoWhatsApp({ condominioId: req.user.condominioId, comunicado: item })
    res.json(whatsapp)
  } catch (e) { next(e) }
})

comunicadoRouter.delete('/:id', async (req, res, next) => {
  try {
    const item = await prisma.comunicado.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    await prisma.comunicado.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})
