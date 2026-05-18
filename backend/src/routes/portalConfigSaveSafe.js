import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const portalConfigSaveSafeRouter = Router()
portalConfigSaveSafeRouter.use(authenticate)

const DEFAULT_FRONTEND_URL = 'https://www.tonocondominio.com.br'

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

const includePortal = {
  banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
  comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
  documentos: { select: safeDocumentoSelect, orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
}

const defaultPortal = {
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

function normalizeConfig(config = {}) {
  const current = config || {}
  const portal = current.portalMorador || {}
  return {
    ...current,
    ativo: current.ativo !== false,
    portalMorador: {
      ...defaultPortal,
      ...portal,
      ativo: portal.ativo !== false,
      permitirLink: portal.permitirLink !== false,
      permitirQrCode: portal.permitirQrCode !== false,
      token: portal.token || crypto.randomBytes(24).toString('base64url'),
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      bannerMeta: portal.bannerMeta && typeof portal.bannerMeta === 'object' ? portal.bannerMeta : {},
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      comunicadoMeta: portal.comunicadoMeta && typeof portal.comunicadoMeta === 'object' ? portal.comunicadoMeta : {},
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
      funcionalidades: { ...defaultPortal.funcionalidades, ...(portal.funcionalidades || {}) },
      informacoes: { ...defaultPortal.informacoes, ...(portal.informacoes || {}) },
    },
  }
}

function mergeConfig(currentConfig, body = {}) {
  const current = normalizeConfig(currentConfig)
  const incomingRoot = body.config || body
  const incoming = incomingRoot.portalMorador ? incomingRoot : { portalMorador: incomingRoot }
  const incomingPortal = incoming.portalMorador || {}

  return normalizeConfig({
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
      funcionalidades: { ...(current.portalMorador.funcionalidades || {}), ...(incomingPortal.funcionalidades || {}) },
      informacoes: { ...(current.portalMorador.informacoes || {}), ...(incomingPortal.informacoes || {}) },
    },
  })
}

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}

function portalLink(config) {
  const token = config?.portalMorador?.token
  if (!token) return null
  const base = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return `${base.replace(/\/$/, '')}/?portal=${token}`
}

function response(condominio) {
  const config = normalizeConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const link = portalLink(config)
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
  const documentos = (condominio.documentos || []).map(doc => {
    const meta = portal.documentoMeta?.[doc.id] || {}
    const visivelPortal = Boolean((portal.documentoIds || []).includes(doc.id) || meta.visivelPortal)
    const tipoAcesso = documentAccessType(meta.tipoAcesso || (doc.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO'))
    return {
      ...doc,
      titulo: meta.titulo || doc.nome,
      categoria: meta.categoria || doc.pasta || 'Geral',
      publicadoEm: meta.publicadoEm || doc.createdAt,
      visivelPortal,
      usarIa: Boolean(meta.usarIa),
      tipoAcesso,
      tipoDocumento: meta.tipoDocumento || doc.tipo || 'Arquivo',
      portalMeta: {
        titulo: meta.titulo || doc.nome,
        categoria: meta.categoria || doc.pasta || 'Geral',
        publicadoEm: meta.publicadoEm || doc.createdAt,
        visivelPortal,
        usarIa: Boolean(meta.usarIa),
        tipoAcesso,
        tipoDocumento: meta.tipoDocumento || doc.tipo || 'Arquivo',
      },
    }
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

async function findAccessibleCondominio(req, id, include = undefined) {
  return prisma.condominio.findFirst({
    where: {
      id,
      OR: [
        { users: { some: { id: req.user.id } } },
        { acessos: { some: { userId: req.user.id } } },
      ],
    },
    ...(include ? { include } : {}),
  })
}

portalConfigSaveSafeRouter.put('/:id/portal-config', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await findAccessibleCondominio(req, req.params.id)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })

    const nextConfig = mergeConfig(condominio.portalConfig, req.body)

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: nextConfig },
      include: includePortal,
    })

    res.json(response(updated))
  } catch (error) {
    next(error)
  }
})
