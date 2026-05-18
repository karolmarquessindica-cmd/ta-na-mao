import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile, isS3Enabled, getSignedUrl } from '../lib/storage.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'

export const portalPublicSafeRouter = Router()

const safeDocumentoSelect = {
  id: true,
  nome: true,
  descricao: true,
  pasta: true,
  tipo: true,
  acesso: true,
  url: true,
  tamanho: true,
  createdAt: true,
  updatedAt: true,
  condominioId: true,
}

const portalMoradorDefault = {
  ativo: true,
  permitirLink: true,
  permitirQrCode: true,
  token: null,
  bannerIds: [],
  bannerMeta: {},
  comunicadoIds: [],
  comunicadoMeta: {},
  documentoIds: [],
  documentoMeta: {},
  contatos: [],
  funcionalidades: {
    abrirChamado: true,
    planoManutencao: true,
    documentos: true,
    comunicados: true,
    vozMorador: true,
    denuncias: true,
    reservas: true,
    iaChat: true,
    contatosResponsaveis: true,
    relatoriosManutencao: true,
    valoresNotasFiscais: false,
  },
  informacoes: {
    nome: true,
    endereco: true,
    responsaveis: true,
    telefones: true,
    email: true,
    manutencoesPrevistas: true,
    comunicadosRecentes: true,
  },
}

function normalizePortalConfig(config = {}) {
  const portal = config?.portalMorador || {}
  return {
    ...(config || {}),
    portalMorador: {
      ...portalMoradorDefault,
      ...portal,
      ativo: portal.ativo !== false,
      permitirLink: portal.permitirLink !== false,
      permitirQrCode: portal.permitirQrCode !== false,
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      bannerMeta: portal.bannerMeta && typeof portal.bannerMeta === 'object' ? portal.bannerMeta : {},
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      comunicadoMeta: portal.comunicadoMeta && typeof portal.comunicadoMeta === 'object' ? portal.comunicadoMeta : {},
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
      funcionalidades: {
        ...portalMoradorDefault.funcionalidades,
        ...(portal.funcionalidades || {}),
      },
      informacoes: {
        ...portalMoradorDefault.informacoes,
        ...(portal.informacoes || {}),
      },
    },
  }
}

const includeSafe = {
  banners: { where: { ativo: true }, orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
  comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
  documentos: { select: safeDocumentoSelect, orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
  users: {
    where: { ativo: true, role: { in: ['ADMIN', 'SINDICO'] } },
    select: { id: true, nome: true, role: true, telefone: true, whatsapp: true, email: true },
    orderBy: { nome: 'asc' },
  },
}

async function findCondominioByPortalToken(token) {
  const byJson = await prisma.condominio.findFirst({
    where: { portalConfig: { path: ['portalMorador', 'token'], equals: token } },
    include: includeSafe,
  }).catch(() => null)

  if (byJson) return byJson

  const condominios = await prisma.condominio.findMany({ include: includeSafe })
  return condominios.find(item => normalizePortalConfig(item.portalConfig).portalMorador.token === token) || null
}

function apiOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

async function publicFileUrl(req, value) {
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${apiOrigin(req)}${value}`
  if (isS3Enabled) {
    const signed = await getSignedUrl(value).catch(() => null)
    if (signed) return signed
  }
  return `${apiOrigin(req)}${value.startsWith('/') ? value : `/${value}`}`
}

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}

function portalDocument(documento, portal) {
  const meta = portal.documentoMeta?.[documento.id] || {}
  const tipoAcesso = documentAccessType(meta.tipoAcesso || (documento.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO'))
  const visivelPortal = Boolean((portal.documentoIds || []).includes(documento.id) || meta.visivelPortal)
  return {
    ...documento,
    titulo: meta.titulo || documento.nome,
    categoria: meta.categoria || documento.pasta || 'Geral',
    publicadoEm: meta.publicadoEm || documento.createdAt,
    visivelPortal,
    usarIa: Boolean(meta.usarIa),
    tipoAcesso,
    tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo',
    portalMeta: {
      titulo: meta.titulo || documento.nome,
      categoria: meta.categoria || documento.pasta || 'Geral',
      publicadoEm: meta.publicadoEm || documento.createdAt,
      visivelPortal,
      usarIa: Boolean(meta.usarIa),
      tipoAcesso,
      tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo',
    },
  }
}

function publicContacts(condominio, portal) {
  const configured = (portal.contatos || []).filter(item => item?.ativo !== false)
  const fromUsers = (condominio.users || []).map(user => ({
    id: user.id,
    nome: user.nome,
    funcao: user.role === 'SINDICO' ? 'Sindico' : user.role === 'ADMIN' ? 'Administracao' : 'Responsavel',
    telefone: user.telefone || '',
    whatsapp: user.whatsapp || '',
    email: user.email || '',
    ativo: true,
  }))
  return [...configured, ...fromUsers]
}

async function buildPayload(condominio, req) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const bannerIds = new Set(portal.bannerIds || [])
  const comunicadoIds = new Set(portal.comunicadoIds || [])
  const allDocumentos = await Promise.all((condominio.documentos || []).map(async item => {
    const doc = portalDocument(item, portal)
    const url = await publicFileUrl(req, doc.url)
    return { ...doc, url, previewUrl: url, downloadUrl: url }
  }))

  const documentos = allDocumentos.filter(doc => doc.visivelPortal && (doc.acesso === 'PUBLICO' || doc.tipoAcesso === 'MORADOR' || doc.tipoAcesso === 'IA_DO_PORTAL'))
  const documentosIa = allDocumentos.filter(doc => doc.usarIa && ['MORADOR', 'IA_DO_PORTAL'].includes(doc.tipoAcesso))
  const banners = await Promise.all((condominio.banners || [])
    .filter(item => bannerIds.has(item.id))
    .map(async item => ({
      ...item,
      imagem: await publicFileUrl(req, item.imagem),
      descricao: portal.bannerMeta?.[item.id]?.descricao || '',
    })))

  return {
    condominio: {
      id: condominio.id,
      nome: condominio.nome,
      logoUrl: await publicFileUrl(req, condominio.logo || null),
      endereco: condominio.endereco,
      cidade: condominio.cidade,
      estado: condominio.estado,
      telefone: condominio.telefone,
      email: condominio.email,
    },
    config: portal,
    banners,
    comunicados: (condominio.comunicados || []).filter(item => comunicadoIds.has(item.id)).map(item => ({ ...item, portalMeta: portal.comunicadoMeta?.[item.id] || {} })),
    documentos,
    documentosIa,
    responsaveis: publicContacts(condominio, portal),
    manutencoesPrevistas: [],
    vozes: [],
  }
}

function portalAnonymousEmail(condominioId) {
  return `portal-${condominioId}@tanamao.local`
}

async function portalAnonymousUser(condominioId) {
  const email = portalAnonymousEmail(condominioId)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing
  const senha = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 10)
  return prisma.user.create({
    data: {
      nome: 'Portal do Morador',
      email,
      senha,
      role: 'MORADOR',
      ativo: true,
      condominioId,
    },
  })
}

async function validatePortalFiles(files = []) {
  for (const file of files) {
    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)
    const ok = validation.valid && (!validation.detectedType || validation.detectedType.startsWith('image/'))
    if (!ok) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      const error = new Error('Envie apenas imagens validas no chamado.')
      error.status = 400
      error.code = 'INVALID_FILE_TYPE'
      throw error
    }
  }
}

portalPublicSafeRouter.get('/:token', async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalToken(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })

    const portal = normalizePortalConfig(condominio.portalConfig).portalMorador
    if (portal.ativo === false || portal.permitirLink === false) {
      return res.status(403).json({ error: 'Portal indisponivel', code: 'PORTAL_UNAVAILABLE' })
    }

    res.json(await buildPayload(condominio, req))
  } catch (e) {
    next(e)
  }
})

portalPublicSafeRouter.post('/:token/chamados', uploadLimiter, multerUpload.array('fotos', 5), async (req, res, next) => {
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

    const files = req.files || []
    let uploads = []
    try {
      await validatePortalFiles(files)
      for (const file of files) {
        const { url } = await uploadFile(file, 'portal-chamados')
        uploads.push(url)
      }
    } catch (uploadError) {
      console.warn('[portal] Falha ao salvar fotos do chamado; criando chamado sem fotos:', uploadError.message)
      uploads = []
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
      mensagem: uploads.length ? 'Chamado enviado para a administracao do condominio.' : 'Chamado enviado. As fotos nao puderam ser anexadas neste momento.',
    })
  } catch (e) {
    next(e)
  }
})
