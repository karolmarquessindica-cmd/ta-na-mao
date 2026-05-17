import { Router } from 'express'
import crypto from 'crypto'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'

export const portalDocumentUploadSafeRouter = Router()
portalDocumentUploadSafeRouter.use(authenticate)

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

function boolValue(value) {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on'
}

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}

function documentFileType(file, fallback = '') {
  const typed = String(fallback || '').trim()
  if (typed) return typed.slice(0, 40)
  const ext = path.extname(file?.originalname || '').slice(1).toUpperCase()
  return { PDF: 'PDF', XLSX: 'Excel', XLS: 'Excel', DOCX: 'Word', DOC: 'Word', PNG: 'Imagem', JPG: 'Imagem', JPEG: 'Imagem', WEBP: 'Imagem' }[ext] || ext || 'Arquivo'
}

function normalizePortalConfig(config = {}) {
  const current = config || {}
  const portal = current.portalMorador || {}
  return {
    ...current,
    portalMorador: {
      ativo: true,
      permitirLink: true,
      permitirQrCode: true,
      token: portal.token || null,
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      bannerMeta: portal.bannerMeta && typeof portal.bannerMeta === 'object' ? portal.bannerMeta : {},
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      comunicadoMeta: portal.comunicadoMeta && typeof portal.comunicadoMeta === 'object' ? portal.comunicadoMeta : {},
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
      funcionalidades: { ...(portal.funcionalidades || {}) },
      informacoes: { ...(portal.informacoes || {}) },
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
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')
  return `${base.replace(/\/$/, '')}/?portal=${token}`
}

function decorateDocumento(documento, portal) {
  const meta = portal.documentoMeta?.[documento.id] || {}
  return {
    ...documento,
    titulo: meta.titulo || documento.nome,
    categoria: meta.categoria || documento.pasta || 'Geral',
    publicadoEm: meta.publicadoEm || documento.createdAt,
    visivelPortal: Boolean((portal.documentoIds || []).includes(documento.id) || meta.visivelPortal),
    usarIa: Boolean(meta.usarIa),
    tipoAcesso: documentAccessType(meta.tipoAcesso || (documento.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO')),
    tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo',
  }
}

function response(req, condominio) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const documentos = (condominio.documentos || []).map(d => decorateDocumento(d, portal))
  return {
    config,
    logoUrl: condominio.logo || null,
    link: portalLink(req, config),
    qrCodeUrl: portal.token ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(portalLink(req, config))}` : null,
    resumo: {
      ativo: Boolean(portal.ativo),
      bannersConfigurados: (condominio.banners || []).filter(b => (portal.bannerIds || []).includes(b.id) && b.ativo).length,
      documentosVisiveis: documentos.filter(d => d.visivelPortal).length,
      documentosIa: documentos.filter(d => d.usarIa).length,
      comunicadosAtivos: (condominio.comunicados || []).filter(c => (portal.comunicadoIds || []).includes(c.id)).length,
      funcionalidadesAtivas: Object.values(portal.funcionalidades || {}).filter(Boolean).length,
    },
    banners: condominio.banners || [],
    comunicados: condominio.comunicados || [],
    documentos,
  }
}

async function findCondominio(req, id, include) {
  return prisma.condominio.findFirst({
    where: { id, OR: [{ users: { some: { id: req.user.id } } }, { acessos: { some: { userId: req.user.id } } }] },
    include,
  })
}

const includeSafe = {
  banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
  comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
  documentos: { select: safeDocumentoSelect, orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
}

portalDocumentUploadSafeRouter.post('/:id/portal-documentos', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('arquivo'), async (req, res, next) => {
  try {
    const condominio = await findCondominio(req, req.params.id, {})
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario' })
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Arquivo obrigatorio' })

    const validation = isS3Enabled ? await validateBufferMagicBytes(file.buffer) : await validateFileMagicBytes(file.path)
    if (!validation.valid) return res.status(400).json({ error: `Tipo de arquivo nao permitido: ${validation.detectedType || file.mimetype}` })

    const visivelPortal = boolValue(req.body.visivelPortal)
    const usarIa = boolValue(req.body.usarIa)
    let tipoAcesso = documentAccessType(req.body.tipoAcesso || (visivelPortal ? 'MORADOR' : 'APENAS_SINDICO'))
    if (visivelPortal && tipoAcesso === 'APENAS_SINDICO') tipoAcesso = 'MORADOR'
    const titulo = String(req.body.titulo || req.body.nome || file.originalname || 'Documento').trim()
    const categoria = String(req.body.categoria || 'Geral').trim() || 'Geral'
    const tipoDocumento = documentFileType(file, req.body.tipoDocumento)
    const publicadoEm = req.body.publicadoEm || new Date().toISOString()
    const uploaded = await uploadFile(file, 'portal-docs')

    const config = ensurePortalToken(condominio.portalConfig)
    const documento = await prisma.documento.create({
      data: {
        nome: titulo,
        pasta: categoria,
        tipo: tipoDocumento,
        acesso: visivelPortal ? 'PUBLICO' : 'PRIVADO',
        descricao: req.body.descricao || 'Documento configurado no Portal do Morador',
        url: uploaded.url,
        tamanho: file.size,
        condominioId: condominio.id,
      },
      select: safeDocumentoSelect,
    })

    if (visivelPortal) config.portalMorador.documentoIds = [...new Set([...(config.portalMorador.documentoIds || []), documento.id])]
    config.portalMorador.documentoMeta[documento.id] = { titulo, categoria, publicadoEm, visivelPortal, usarIa, tipoAcesso, tipoDocumento }
    const updated = await prisma.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config }, include: includeSafe })
    res.status(201).json(response(req, updated))
  } catch (e) {
    next(e)
  }
})
