// src/routes/documento.js
import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import {
  multerUpload,
  uploadFile,
  getSignedUrl,
  deleteFile,
  storageKeyFromUrl,
  isS3Enabled,
} from '../lib/storage.js'

export const documentoRouter = Router()
documentoRouter.use(authenticate)

// GET /api/documentos
documentoRouter.get('/', async (req, res, next) => {
  try {
    const { pasta, acesso, q } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }
    if (pasta)  where.pasta = pasta
    if (acesso) where.acesso = acesso
    if (q)      where.nome = { contains: q, mode: 'insensitive' }

    // Moradores só veem públicos
    if (req.user.role === 'MORADOR') where.acesso = 'PUBLICO'

    const [data, total] = await Promise.all([
      prisma.documento.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.documento.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

// GET /api/documentos/pastas — listar pastas únicas
// (deve vir antes de /:id para não ser capturado como id)
documentoRouter.get('/pastas', async (req, res, next) => {
  try {
    const result = await prisma.documento.groupBy({
      by: ['pasta'],
      where: { condominioId: req.user.condominioId }
    })
    res.json(result.map(r => r.pasta))
  } catch (e) { next(e) }
})

// GET /api/documentos/:id/download — URL pré-assinada (S3) ou redirect local
documentoRouter.get('/:id/download', async (req, res, next) => {
  try {
    const doc = await prisma.documento.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!doc) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    if (isS3Enabled) {
      // doc.url armazena a chave S3 quando S3 está ativo
      const signedUrl = await getSignedUrl(doc.url)
      return res.redirect(signedUrl)
    }

    // Modo local: redirecionar para /uploads/arquivo
    return res.redirect(doc.url)
  } catch (e) { next(e) }
})

// POST /api/documentos — upload de arquivo (S3 ou local)
documentoRouter.post('/', uploadLimiter, multerUpload.single('arquivo'), async (req, res, next) => {
  try {
    const { nome, pasta, acesso, descricao } = req.body
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Arquivo obrigatório', code: 'VALIDATION_ERROR' })

    // Validar magic bytes — buffer (S3) ou path (local)
    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!validation.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({
        error: `Tipo de arquivo não permitido: ${validation.detectedType}`,
        code: 'INVALID_FILE_TYPE',
      })
    }

    const { url } = await uploadFile(file, 'docs')

    const ext = path.extname(file.originalname).slice(1).toUpperCase()
    const tipo = { PDF: 'PDF', XLSX: 'Excel', XLS: 'Excel', DOCX: 'Word', PNG: 'Imagem', JPG: 'Imagem', JPEG: 'Imagem' }[ext] || ext

    const item = await prisma.documento.create({
      data: {
        nome: nome || file.originalname,
        pasta: pasta || 'Geral',
        tipo,
        acesso: acesso || 'PUBLICO',
        descricao,
        url,
        tamanho: file.size,
        condominioId: req.user.condominioId,
      }
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

// DELETE /api/documentos/:id
documentoRouter.delete('/:id', async (req, res, next) => {
  try {
    const doc = await prisma.documento.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!doc) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    if (doc.url) {
      await deleteFile(storageKeyFromUrl(doc.url))
    }
    await prisma.documento.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})
