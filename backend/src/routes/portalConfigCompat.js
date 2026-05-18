import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const portalConfigCompatRouter = Router()
portalConfigCompatRouter.use(authenticate)

const DEFAULT_FRONTEND_URL = 'https://www.tonocondominio.com.br'

const portalDefault = {
  ativo: true,
  banners: true,
  comunicados: true,
  documentos: true,
  abrirChamado: true,
  planoManutencao: true,
  vozMorador: true,
  denuncias: true,
  reservas: true,
  iaChat: true,
  contatosResponsaveis: true,
  portalMorador: {
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
  },
}

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

const portalInclude = {
  banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
  comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
  documentos: { select: safeDocumentoSelect, orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
}

function normalizePortalConfig(config = {}) {
  const legacy = config || {}
  const portalMorador = legacy.portalMorador || {}
  const funcionalidades = {
    ...portalDefault.portalMorador.funcionalidades,
    ...(portalMorador.funcionalidades || {}),
  }

  ;['banners', 'comunicados', 'documentos', 'vozMorador', 'denuncias', 'reservas', 'iaChat', 'abrirChamado', 'planoManutencao', 'contatosResponsaveis'].forEach(key => {
    if (legacy[key] !== undefined && funcionalidades[key] !== undefined) funcionalidades[key] = Boolean(legacy[key])
  })

  return {
    ...portalDefault,
    ...legacy,
    portalMorador: {
      ...portalDefault.portalMorador,
      ...portalMorador,
      bannerIds: Array.isArray(portalMorador.bannerIds) ? portalMorador.bannerIds : [],
      bannerMeta: portalMorador.bannerMeta && typeof portalMorador.bannerMeta === 'object' ? portalMorador.bannerMeta : {},
      comunicadoIds: Array.isArray(portalMorador.comunicadoIds) ? portalMorador.comunicadoIds : [],
      comunicadoMeta: portalMorador.comunicadoMeta && typeof portalMorador.comunicadoMeta === 'object' ? portalMorador.comunicadoMeta : {},
      documentoIds: Array.isArray(portalMorador.documentoIds) ? portalMorador.documentoIds : [],
      documentoMeta: portalMorador.documentoMeta && typeof portalMorador.documentoMeta === 'object' ? portalMorador.documentoMeta : {},
      contatos: Array.isArray(portalMorador.contatos) ? portalMorador.contatos : [],
      funcionalidades,
      informacoes: {
        ...portalDefault.portalMorador.informacoes,
        ...(portalMorador.informacoes || {}),
      },
    },
  }
}

function ensurePortalToken(config) {
  const next = normalizePortalConfig(config)
  if (!next.portalMorador.token) next.portalMorador.token = crypto.randomBytes(24).toString('base64url')
  return next
}

function portalLink(req, config) {
  const token = config?.portalMorador?.token
  if (!token) return null
  const base = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return `${base.replace(/\/$/, '')}/?portal=${token}`
}

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}

function documentPortalMeta(documento, portal) {
  const meta = portal.documentoMeta?.[documento.id] || {}
  const tipoAcesso = documentAccessType(meta.tipoAcesso || (documento.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO'))
  const visivelPortal = Boolean((portal.documentoIds || []).includes(documento.id) || meta.visivelPortal)
  return {
    titulo: meta.titulo || documento.nome,
    categoria: meta.categoria || documento.pasta || 'Geral',
    publicadoEm: meta.publicadoEm || documento.createdAt,
    visivelPortal,
    usarIa: Boolean(meta.usarIa),
    tipoAcesso,
    tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo',
  }
}

function sanitizeDocumentMeta(meta = {}, allowedIds = new Set()) {
  return Object.fromEntries(
    Object.entries(meta || {})
      .filter(([id]) => allowedIds.has(id))
      .map(([id, value]) => {
        const item = value && typeof value === 'object' ? value : {}
        return [id, {
          titulo: String(item.titulo || '').trim(),
          categoria: String(item.categoria || 'Geral').trim() || 'Geral',
          publicadoEm: item.publicadoEm || new Date().toISOString(),
          visivelPortal: Boolean(item.visivelPortal),
          usarIa: Boolean(item.usarIa),
          tipoAcesso: documentAccessType(item.tipoAcesso),
          tipoDocumento: String(item.tipoDocumento || 'Arquivo').trim() || 'Arquivo',
        }]
      })
  )
}

function mergePortalConfig(currentConfig, incomingConfig = {}) {
  const current = normalizePortalConfig(currentConfig)
  const incoming = incomingConfig.portalMorador ? incomingConfig : { portalMorador: incomingConfig }
  const incomingPortal = incoming.portalMorador || {}
  return ensurePortalToken({
    ...current,
    ...incoming,
    portalMorador: {
      ...current.portalMorador,
      ...incomingPortal,
      bannerIds: Array.isArray(incomingPortal.bannerIds) ? incomingPortal.bannerIds : current.portalMorador.bannerIds,
      comunicadoIds: Array.isArray(incomingPortal.comunicadoIds) ? incomingPortal.comunicadoIds : current.portalMorador.comunicadoIds,
      documentoIds: Array.isArray(incomingPortal.documentoIds) ? incomingPortal.documentoIds : current.portalMorador.documentoIds,
      contatos: Array.isArray(incomingPortal.contatos) ? incomingPortal.contatos : current.portalMorador.contatos,
      bannerMeta: { ...(current.portalMorador.bannerMeta || {}), ...(incomingPortal.bannerMeta || {}) },
      comunicadoMeta: { ...(current.portalMorador.comunicadoMeta || {}), ...(incomingPortal.comunicadoMeta || {}) },
      documentoMeta: { ...(current.portalMorador.documentoMeta || {}), ...(incomingPortal.documentoMeta || {}) },
      funcionalidades: { ...current.portalMorador.funcionalidades, ...(incomingPortal.funcionalidades || {}) },
      informacoes: { ...current.portalMorador.informacoes, ...(incomingPortal.informacoes || {}) },
    },
  })
}

function portalConfigResponse(req, condominio) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const link = portalLink(req, config)
  const banners = (condominio.banners || []).map(banner => ({
    ...banner,
    descricao: portal.bannerMeta?.[banner.id]?.descricao || '',
    visivelPortal: (portal.bannerIds || []).includes(banner.id),
  }))
  const comunicados = (condominio.comunicados || []).map(comunicado => ({
    ...comunicado,
    portalMeta: portal.comunicadoMeta?.[comunicado.id] || {},
    visivelPortal: (portal.comunicadoIds || []).includes(comunicado.id),
  }))
  const documentos = (condominio.documentos || []).map(documento => {
    const meta = documentPortalMeta(documento, portal)
    return { ...documento, ...meta, portalMeta: meta }
  })
  return {
    config,
    logoUrl: condominio.logo || null,
    link,
    qrCodeUrl: link ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}` : null,
    resumo: {
      ativo: Boolean(portal.ativo),
      bannersConfigurados: banners.filter(b => b.visivelPortal && b.ativo).length,
      documentosVisiveis: documentos.filter(d => d.visivelPortal).length,
      documentosIa: documentos.filter(d => d.usarIa).length,
      comunicadosAtivos: comunicados.filter(c => c.visivelPortal).length,
      funcionalidadesAtivas: Object.values(portal.funcionalidades || {}).filter(Boolean).length,
    },
    banners,
    comunicados,
    documentos,
  }
}

async function findAccessibleCondominio(req, id, include) {
  return prisma.condominio.findFirst({
    where: {
      id,
      OR: [
        { users: { some: { id: req.user.id } } },
        { acessos: { some: { userId: req.user.id } } },
      ],
    },
    include,
  })
}

async function ensureAccess(req, res, id, include) {
  const condominio = await findAccessibleCondominio(req, id, include)
  if (!condominio) {
    res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    return null
  }
  return condominio
}

portalConfigCompatRouter.get('/:id/portal-config', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, portalInclude)
    if (!condominio) return
    res.json(portalConfigResponse(req, condominio))
  } catch (e) { next(e) }
})

portalConfigCompatRouter.put('/:id/portal-config', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, {
      banners: { select: { id: true } },
      comunicados: { select: { id: true } },
      documentos: { select: { id: true, acesso: true } },
    })
    if (!condominio) return

    const nextConfig = mergePortalConfig(condominio.portalConfig, req.body.config || req.body)
    const bannerIds = new Set((condominio.banners || []).map(item => item.id))
    const comunicadoIds = new Set((condominio.comunicados || []).map(item => item.id))
    const documentoIds = new Set((condominio.documentos || []).map(item => item.id))
    nextConfig.portalMorador.bannerIds = (nextConfig.portalMorador.bannerIds || []).filter(id => bannerIds.has(id))
    nextConfig.portalMorador.comunicadoIds = (nextConfig.portalMorador.comunicadoIds || []).filter(id => comunicadoIds.has(id))
    nextConfig.portalMorador.documentoIds = (nextConfig.portalMorador.documentoIds || []).filter(id => documentoIds.has(id))
    nextConfig.portalMorador.documentoMeta = sanitizeDocumentMeta(nextConfig.portalMorador.documentoMeta, documentoIds)

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: nextConfig },
      include: portalInclude,
    })
    res.json(portalConfigResponse(req, updated))
  } catch (e) { next(e) }
})
