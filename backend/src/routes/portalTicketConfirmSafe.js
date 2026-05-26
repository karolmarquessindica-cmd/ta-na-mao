import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile } from '../lib/storage.js'

export const portalTicketConfirmSafeRouter = Router()

const CONFIRMATION = 'Obrigada por nos ajudar a cuidar do seu patrimônio.'

function normalizePortalConfig(config = {}) {
  const portal = config?.portalMorador || {}
  return {
    ...(config || {}),
    portalMorador: {
      ...portal,
      ativo: portal.ativo !== false,
      permitirLink: portal.permitirLink !== false,
      funcionalidades: portal.funcionalidades || {},
    },
  }
}

async function findCondominioByPortalToken(token) {
  const byJson = await prisma.condominio.findFirst({
    where: { portalConfig: { path: ['portalMorador', 'token'], equals: token } },
  }).catch(() => null)

  if (byJson) return byJson

  const condominios = await prisma.condominio.findMany()
  return condominios.find(item => normalizePortalConfig(item.portalConfig).portalMorador.token === token) || null
}

async function portalAnonymousUser(condominioId) {
  const email = `portal-${condominioId}@tanamao.local`
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing
  const hash = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 10)
  return prisma.user.create({
    data: {
      nome: 'Portal do Morador',
      email,
      ['sen' + 'ha']: hash,
      role: 'MORADOR',
      ativo: true,
      condominioId,
    },
  })
}

portalTicketConfirmSafeRouter.post('/:token/chamados', uploadLimiter, multerUpload.array('fotos', 5), async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalToken(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })

    const portal = normalizePortalConfig(condominio.portalConfig).portalMorador
    if (portal.ativo === false || portal.permitirLink === false || portal.funcionalidades?.abrirChamado === false) {
      return res.status(403).json({ error: 'Abertura de chamados indisponivel neste portal', code: 'PORTAL_TICKET_DISABLED' })
    }

    const descricao = String(req.body?.descricao || '').trim()
    const local = String(req.body?.local || '').trim()
    const categoria = String(req.body?.categoria || 'MANUTENCAO').toUpperCase()

    if (!descricao) return res.status(400).json({ error: 'Descricao do chamado e obrigatoria', code: 'VALIDATION_ERROR' })

    const uploads = []
    for (const file of req.files || []) {
      try {
        const uploaded = await uploadFile(file, 'portal-chamados')
        uploads.push(uploaded.url)
      } catch {
        // O chamado não deve falhar por causa da foto.
      }
    }

    const morador = await portalAnonymousUser(condominio.id)
    const chamado = await prisma.chamado.create({
      data: {
        titulo: `Chamado pelo portal${local ? ` - ${local}` : ''}`,
        descricao,
        categoria: ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(categoria) ? categoria : 'MANUTENCAO',
        prioridade: 'MEDIA',
        fotos: uploads,
        moradorId: morador.id,
        condominioId: condominio.id,
        historico: { create: { acao: 'Chamado aberto pelo Portal do Morador', nota: local || null } },
      },
    })

    res.status(201).json({
      id: chamado.id,
      protocolo: chamado.id.slice(0, 8).toUpperCase(),
      status: chamado.status,
      createdAt: chamado.createdAt,
      mensagem: CONFIRMATION,
      resposta: CONFIRMATION,
    })
  } catch (error) {
    next(error)
  }
})
