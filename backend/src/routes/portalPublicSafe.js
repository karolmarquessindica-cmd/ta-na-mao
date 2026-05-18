import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

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

function buildPayload(condominio) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const bannerIds = new Set(portal.bannerIds || [])
  const comunicadoIds = new Set(portal.comunicadoIds || [])
  const allDocumentos = (condominio.documentos || []).map(item => portalDocument(item, portal))

  const documentos = allDocumentos.filter(doc => doc.visivelPortal && (doc.acesso === 'PUBLICO' || doc.tipoAcesso === 'MORADOR' || doc.tipoAcesso === 'IA_DO_PORTAL'))
  const documentosIa = allDocumentos.filter(doc => doc.usarIa && ['MORADOR', 'IA_DO_PORTAL'].includes(doc.tipoAcesso))

  return {
    condominio: {
      id: condominio.id,
      nome: condominio.nome,
      logoUrl: condominio.logo || null,
      endereco: condominio.endereco,
      cidade: condominio.cidade,
      estado: condominio.estado,
      telefone: condominio.telefone,
      email: condominio.email,
    },
    config: portal,
    banners: (condominio.banners || []).filter(item => bannerIds.has(item.id)).map(item => ({ ...item, descricao: portal.bannerMeta?.[item.id]?.descricao || '' })),
    comunicados: (condominio.comunicados || []).filter(item => comunicadoIds.has(item.id)).map(item => ({ ...item, portalMeta: portal.comunicadoMeta?.[item.id] || {} })),
    documentos,
    documentosIa,
    responsaveis: publicContacts(condominio, portal),
    manutencoesPrevistas: [],
    vozes: [],
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

    res.json(buildPayload(condominio))
  } catch (e) {
    next(e)
  }
})
