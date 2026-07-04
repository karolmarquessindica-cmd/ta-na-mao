import { Router } from 'express'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import pdf from 'pdf-parse'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile, isS3Enabled, storageKeyFromUrl } from '../lib/storage.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'

export const portalDocumentosSafeRouter = Router()
portalDocumentosSafeRouter.use(authenticate)

const DEFAULT_FRONTEND_URL = 'https://www.tonocondominio.com.br'
const UPLOAD_DIR = 'uploads'
const MIN_AI_TEXT_LENGTH = 80

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

function textoValidoParaIa(texto) {
  return String(texto || '').replace(/\s+/g, ' ').trim().length >= MIN_AI_TEXT_LENGTH
}

async function extrairTextoPdf(file) {
  try {
    const isPdf = file?.mimetype === 'application/pdf' || path.extname(file?.originalname || '').toLowerCase() === '.pdf'
    if (!isPdf) return null
    const buffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null)
    if (!buffer) return null
    const parsed = await pdf(buffer)
    return parsed?.text?.slice(0, 120000) || null
  } catch (error) {
    console.warn('[portal-documentos] erro ao extrair texto do PDF:', error.message)
    return null
  }
}

function portalConfig(config = {}) {
  const base = config || {}
  const portal = base.portalMorador || {}
  return {
    ...base,
    portalMorador: {
      ...portal,
      ativo: portal.ativo !== false,
      permitirLink: portal.permitirLink !== false,
      permitirQrCode: portal.permitirQrCode !== false,
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

function portalLink(config) {
  const token = config?.portalMorador?.token
  if (!token) return null
  const base = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return `${base.replace(/\/$/, '')}/?portal=${token}`
}

function apiOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

function publicArquivoUrl(req, url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  const key = storageKeyFromUrl(url)
  if (isS3Enabled && !url.startsWith('/uploads/')) return `${apiOrigin(req)}/api/arquivos/${key}`
  if (url.startsWith('/uploads/')) return `${apiOrigin(req)}${url}`
  return `${apiOrigin(req)}/uploads/${String(url).replace(/^uploads\//, '')}`
}

function montarResposta(req, condominio) {
  const config = portalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const documentos = (condominio.documentos || []).map(doc => {
    const meta = portal.documentoMeta?.[doc.id] || {}
    const visivelPortal = Boolean((portal.documentoIds || []).includes(doc.id) || meta.visivelPortal)
    const previewUrl = publicArquivoUrl(req, doc.url)
    return {
      ...doc,
      url: previewUrl || doc.url,
      previewUrl: previewUrl || doc.url,
      downloadUrl: previewUrl || doc.url,
      titulo: meta.titulo || doc.nome,
      categoria: meta.categoria || doc.pasta || 'Geral',
      publicadoEm: meta.publicadoEm || doc.createdAt,
      visivelPortal,
      usarIa: Boolean(meta.usarIa),
      tipoAcesso: tipoAcesso(meta.tipoAcesso || (doc.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO')),
      tipoDocumento: meta.tipoDocumento || doc.tipo || 'Arquivo',
      portalMeta: {
        titulo: meta.titulo || doc.nome,
        categoria: meta.categoria || doc.pasta || 'Geral',
        publicadoEm: meta.publicadoEm || doc.createdAt,
        visivelPortal,
        usarIa: Boolean(meta.usarIa),
        tipoAcesso: tipoAcesso(meta.tipoAcesso || (doc.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO')),
        tipoDocumento: meta.tipoDocumento || doc.tipo || 'Arquivo',
      },
    }
  })
  const link = portalLink(config)
  return {
    config,
    logoUrl: condominio.logo || null,
    link,
    qrCodeUrl: link ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}` : null,
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

async function buscarCondominio(req, id, include = undefined) {
  return prisma.condominio.findFirst({
    where: { id, OR: [{ users: { some: { id: req.user.id } } }, { acessos: { some: { userId: req.user.id } } }] },
    ...(include ? { include } : {}),
  })
}

async function validarArquivo(file) {
  const validation = isS3Enabled ? await validateBufferMagicBytes(file.buffer) : await validateFileMagicBytes(file.path)
  if (!validation.valid) {
    if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
    const err = new Error(`Tipo de arquivo nao permitido: ${validation.detectedType || file.mimetype}`)
    err.status = 400
    throw err
  }
}

async function uploadFileResilient(file, folder = 'portal-docs') {
  try {
    return await uploadFile(file, folder)
  } catch (error) {
    console.warn('[portal-documentos] Storage principal falhou. Usando fallback local:', error.message)
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    const ext = path.extname(file.originalname || '') || '.bin'
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    const target = path.join(UPLOAD_DIR, filename)
    if (file.buffer) fs.writeFileSync(target, file.buffer)
    else if (file.path && fs.existsSync(file.path)) fs.copyFileSync(file.path, target)
    else throw error
    return { key: `${UPLOAD_DIR}/${filename}`, url: `/uploads/${filename}` }
  }
}

portalDocumentosSafeRouter.post('/:id/portal-documentos', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('arquivo'), async (req, res, next) => {
  try {
    const condominio = await buscarCondominio(req, req.params.id)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario' })
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio' })

    await validarArquivo(req.file)

    const visivelPortal = boolValue(req.body.visivelPortal)
    const usarIa = boolValue(req.body.usarIa)
    let acesso = tipoAcesso(req.body.tipoAcesso || (visivelPortal ? 'MORADOR' : 'APENAS_SINDICO'))
    if (visivelPortal && acesso === 'APENAS_SINDICO') acesso = 'MORADOR'

    const titulo = String(req.body.titulo || req.body.nome || req.file.originalname || 'Documento').trim()
    const categoria = String(req.body.categoria || 'Geral').trim() || 'Geral'
    const tipoDocumento = tipoArquivo(req.file, req.body.tipoDocumento)
    const publicadoEm = req.body.publicadoEm || new Date().toISOString()
    const textoExtraido = usarIa ? await extrairTextoPdf(req.file) : null

    if (usarIa && !textoValidoParaIa(textoExtraido)) {
      return res.status(400).json({
        error: 'Nao foi possivel extrair texto util deste PDF. Envie um PDF com texto selecionavel ou desmarque Usar na IA.',
        code: 'PDF_TEXT_EXTRACTION_FAILED',
      })
    }

    const uploaded = await uploadFileResilient(req.file, 'portal-docs')
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
        textoExtraido,
        usarComoFonteIA: Boolean(usarIa && textoValidoParaIa(textoExtraido)),
        categoriaIA: usarIa ? categoria : null,
        condominioId: condominio.id,
      },
      select: safeDocumentoSelect,
    })

    if (visivelPortal) config.portalMorador.documentoIds = [...new Set([...(config.portalMorador.documentoIds || []), documento.id])]
    config.portalMorador.documentoMeta[documento.id] = { titulo, categoria, publicadoEm, visivelPortal, usarIa: Boolean(usarIa && textoValidoParaIa(textoExtraido)), tipoAcesso: acesso, tipoDocumento }

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

portalDocumentosSafeRouter.patch('/:id/portal-documentos/:documentoId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await buscarCondominio(req, req.params.id, includePortal)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario' })
    const documento = (condominio.documentos || []).find(doc => doc.id === req.params.documentoId)
    if (!documento) return res.status(404).json({ error: 'Documento nao encontrado neste condominio' })

    const config = portalConfig(condominio.portalConfig)
    const portal = config.portalMorador
    const existing = portal.documentoMeta?.[documento.id] || {}
    const visivelPortal = req.body.visivelPortal === undefined ? Boolean((portal.documentoIds || []).includes(documento.id) || existing.visivelPortal) : boolValue(req.body.visivelPortal)
    const usarIa = req.body.usarIa === undefined ? Boolean(existing.usarIa) : boolValue(req.body.usarIa)
    let acesso = tipoAcesso(req.body.tipoAcesso || existing.tipoAcesso || (visivelPortal ? 'MORADOR' : 'APENAS_SINDICO'))
    if (visivelPortal && acesso === 'APENAS_SINDICO') acesso = 'MORADOR'

    if (usarIa) {
      const stored = await prisma.documento.findUnique({ where: { id: documento.id }, select: { textoExtraido: true } }).catch(() => null)
      if (!textoValidoParaIa(stored?.textoExtraido)) {
        return res.status(400).json({
          error: 'Este documento nao possui texto extraido para alimentar a IA. Remova e envie novamente o PDF com Usar na IA marcado.',
          code: 'DOCUMENT_WITHOUT_AI_TEXT',
        })
      }
    }

    if (visivelPortal) portal.documentoIds = [...new Set([...(portal.documentoIds || []), documento.id])]
    else portal.documentoIds = (portal.documentoIds || []).filter(id => id !== documento.id)

    portal.documentoMeta[documento.id] = {
      ...existing,
      titulo: req.body.titulo || existing.titulo || documento.nome,
      categoria: req.body.categoria || existing.categoria || documento.pasta || 'Geral',
      publicadoEm: req.body.publicadoEm || existing.publicadoEm || documento.createdAt,
      visivelPortal,
      usarIa,
      tipoAcesso: acesso,
      tipoDocumento: req.body.tipoDocumento || existing.tipoDocumento || documento.tipo || 'Arquivo',
    }

    await prisma.documento.update({
      where: { id: documento.id },
      data: {
        acesso: visivelPortal ? 'PUBLICO' : 'PRIVADO',
        usarComoFonteIA: usarIa,
        categoriaIA: usarIa ? (portal.documentoMeta[documento.id].categoria || documento.pasta || 'Geral') : null,
      },
    }).catch(() => null)

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: config },
      include: includePortal,
    })

    res.json(montarResposta(req, updated))
  } catch (e) {
    next(e)
  }
})

portalDocumentosSafeRouter.delete('/:id/portal-documentos/:documentoId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await buscarCondominio(req, req.params.id, includePortal)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario' })
    const documento = (condominio.documentos || []).find(doc => doc.id === req.params.documentoId)
    if (!documento) return res.status(404).json({ error: 'Documento nao encontrado neste condominio' })

    const config = portalConfig(condominio.portalConfig)
    config.portalMorador.documentoIds = (config.portalMorador.documentoIds || []).filter(id => id !== documento.id)
    if (config.portalMorador.documentoMeta?.[documento.id]) delete config.portalMorador.documentoMeta[documento.id]

    await prisma.documento.delete({ where: { id: documento.id } }).catch(async () => {
      await prisma.documento.update({ where: { id: documento.id }, data: { acesso: 'PRIVADO', usarComoFonteIA: false, categoriaIA: null } }).catch(() => null)
      await prisma.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } })
    })

    const updated = await prisma.condominio.findUnique({ where: { id: condominio.id }, include: includePortal })
    res.json(montarResposta(req, updated))
  } catch (e) {
    next(e)
  }
})
