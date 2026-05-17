import { Router } from 'express'
import crypto from 'crypto'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'

export const portalDocumentosSafeRouter = Router()
portalDocumentosSafeRouter.use(authenticate)

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

function boolValue(value) {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on'
}

function tipoArquivo(file, fallback = '') {
  if (fallback) return String(fallback).slice(0, 40)
  const ext = path.extname(file?.originalname || '').slice(1).toUpperCase()
  return { PDF: 'PDF', PNG: 'Imagem', JPG: 'Imagem', JPEG: 'Imagem', WEBP: 'Imagem', DOC: 'Word', DOCX: 'Word', XLS: 'Excel', XLSX: 'Excel' }[ext] || ext || 'Arquivo'
}

function tipoAcesso(value) {
  const v = String(value || '').toUpperCase()
  return ['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(v) ? v : 'APENAS_SINDICO'
}

function portalConfig(config = {}) {
  const base = config || {}
  const portal = base.portalMorador || {}
  return {
    ...base,
    portalMorador: {
      ...portal,
      token: portal.token || crypto.randomBytes(24).toString('base64url'),
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
      bannerMeta: portal.bannerMeta && typeof portal.bannerMeta === 'object' ? portal.bannerMeta : {},
      comunicadoMeta: portal.comunicadoMeta && typeof portal.comunicadoMeta === 'object' ? portal.comunicadoMeta : {},
      funcionalidades: portal.funcionalidades || {},
      informacoes: portal.informacoes || {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
    },
  }
}

function portalLink(req, config) {
  const token = config?.portalMorador?.token
  if (!token) return null
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')
  return `${base.replace(/\/$/, '')}/?portal=${token}`
}

function montarResposta(req, condominio) {
  const config = portalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const documentos = (condominio.documentos || []).map(doc => {
    const meta = portal.documentoMeta?.[doc.id] || {}
    const visivelPortal = Boolean((portal.documentoIds || []).includes(doc.id) || meta.visivelPortal)
    return {
      ...doc,
      titulo: meta.titulo || doc.nome,
      categoria: meta.categoria || doc.pasta || 'Geral',
      publicadoEm: meta.publicadoEm || doc.createdAt,
      visivelPortal,
      usarIa: Boolean(meta.usarIa),
      tipoAcesso: tipoAcesso(meta.tipoAcesso || (doc.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO')),
      tipoDocumento: meta.tipoDocumento || doc.tipo || 'Arquivo',
    }
  })
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

async function buscarCondominio(req, id, include = {}) {
  return prisma.condominio.findFirst({
    where: { id, OR: [{ users: { some: { id: req.user.id } } }, { acessos: { some: { userId: req.user.id } } }] },
    include,
  })
}

portalDocumentosSafeRouter.post('/:id/portal-documentos', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('arquivo'), async (req, res, next) => {
  try {
    const condominio = await buscarCondominio(req, req.params.id)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario' })
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio' })

    const validation = isS3Enabled ? await validateBufferMagicBytes(req.file.buffer) : await validateFileMagicBytes(req.file.path)
    if (!validation.valid) return res.status(400).json({ error: `Tipo de arquivo nao permitido: ${validation.detectedType || req.file.mimetype}` })

    const visivelPortal = boolValue(req.body.visivelPortal)
    const usarIa = boolValue(req.body.usarIa)
    let acesso = tipoAcesso(req.body.tipoAcesso || (visivelPortal ? 'MORADOR' : 'APENAS_SINDICO'))
    if (visivelPortal && acesso === 'APENAS_SINDICO') acesso = 'MORADOR'

    const titulo = String(req.body.titulo || req.body.nome || req.file.originalname || 'Documento').trim()
    const categoria = String(req.body.categoria || 'Geral').trim() || 'Geral'
    const tipoDocumento = tipoArquivo(req.file, req.body.tipoDocumento)
    const publicadoEm = req.body.publicadoEm || new Date().toISOString()
    const uploaded = await uploadFile(req.file, 'portal-docs')
    const config = portalConfig(condominio.portalConfig)

    const documento = await prisma.documento.create({
      data: {
        nome: titulo,
        pasta: categoria,
        tipo: tipoDocumento,
        acesso: visivelPortal ? 'PUBLICO' : 'PRIVADO',
        descricao: req.body.descricao || 'Documento configurado no Portal do Morador',
        url: uploaded.url,
        tamanho: req.file.size,
        condominioId: condominio.id,
      },
      select: safeDocumentoSelect,
    })

    if (visivelPortal) config.portalMorador.documentoIds = [...new Set([...(config.portalMorador.documentoIds || []), documento.id])]
    config.portalMorador.documentoMeta[documento.id] = { titulo, categoria, publicadoEm, visivelPortal, usarIa, tipoAcesso: acesso, tipoDocumento }

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: config },
      include: includePortal,
    })

    res.status(201).json(montarResposta(req, updated))
  } catch (e) {
    next(e)
  }
})
