import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile } from '../lib/storage.js'

export const portalTicketConfirmSafeRouter = Router()

const CONFIRMATION = 'Obrigada por nos ajudar a cuidar do seu patrimônio.'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IGNORED_WORDS = new Set(['condominio', 'residencial', 'residence', 'rf', 'edificio', 'empreendimento', 'do', 'da', 'de'])
const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' }

function cleanSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function canonicalTokens(value = '') {
  return cleanSlug(value)
    .split('-')
    .filter(Boolean)
    .map(token => ROMAN[token] || token)
    .filter(token => !IGNORED_WORDS.has(token))
}

function samePortalName(a, b) {
  const left = canonicalTokens(a)
  const right = canonicalTokens(b)
  if (!left.length || !right.length) return false
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const leftInsideRight = left.every(token => rightSet.has(token))
  const rightInsideLeft = right.every(token => leftSet.has(token))
  return leftInsideRight || rightInsideLeft
}

function normalizePortalConfig(config = {}) {
  const portal = config?.portalMorador || {}
  return {
    ...(config || {}),
    portalMorador: {
      ...portal,
      ativo: portal.ativo !== false,
      permitirLink: portal.permitirLink !== false,
      portalSlug: cleanSlug(portal.portalSlug || ''),
      funcionalidades: portal.funcionalidades || {},
    },
  }
}

async function findCondominioByPortalIdentifier(identifier) {
  const value = String(identifier || '').trim()
  if (!value) return null

  if (UUID_RE.test(value)) {
    const byId = await prisma.condominio.findUnique({ where: { id: value } }).catch(() => null)
    if (byId) return byId
  }

  const byToken = await prisma.condominio.findFirst({
    where: { portalConfig: { path: ['portalMorador', 'token'], equals: value } },
  }).catch(() => null)

  if (byToken) return byToken

  const condominios = await prisma.condominio.findMany()
  return condominios.find(item => {
    const portal = normalizePortalConfig(item.portalConfig).portalMorador
    return portal.token === value
      || samePortalName(item.nome, value)
      || samePortalName(portal.portalSlug, value)
  }) || null
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
      senha: hash,
      role: 'MORADOR',
      ativo: true,
      condominioId,
    },
  })
}

portalTicketConfirmSafeRouter.post('/:identifier/chamados', uploadLimiter, multerUpload.array('fotos', 5), async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalIdentifier(req.params.identifier)
    if (!condominio) {
      return res.status(404).json({
        error: 'Portal nao encontrado',
        code: 'PORTAL_NOT_FOUND',
        identifier: req.params.identifier,
        routeVersion: 'chamados-2.0.4',
      })
    }

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
      routeVersion: 'chamados-2.0.4',
    })
  } catch (error) {
    next(error)
  }
})
