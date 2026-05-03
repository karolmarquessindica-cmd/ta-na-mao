// src/routes/banner.js
import { Router } from 'express'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateBufferMagicBytes, validateFileMagicBytes } from '../lib/validateUpload.js'
import { deleteFile, isS3Enabled, multerUpload, storageKeyFromUrl, uploadFile } from '../lib/storage.js'

export const bannerRouter = Router()
bannerRouter.use(authenticate)

function isImageUpload(file, validation) {
  const mimeOk = file?.mimetype?.startsWith('image/')
  const detectedOk = !validation.detectedType || validation.detectedType.startsWith('image/')
  return mimeOk && validation.valid && detectedOk
}

bannerRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }
    if (req.user.role === 'MORADOR') where.ativo = true

    const [data, total] = await Promise.all([
      prisma.banner.findMany({ where, orderBy: { ordem: 'asc' }, skip, take: limit }),
      prisma.banner.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

bannerRouter.post('/', async (req, res, next) => {
  try {
    const { titulo, imagem, link, ordem, ativo } = req.body
    if (!titulo || !imagem) {
      return res.status(400).json({ error: 'Titulo e imagem sao obrigatorios', code: 'VALIDATION_ERROR' })
    }
    const item = await prisma.banner.create({
      data: { titulo, imagem, link, ordem: ordem || 1, ativo: ativo ?? true, condominioId: req.user.condominioId }
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

bannerRouter.post('/imagem', uploadLimiter, multerUpload.single('imagem'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Imagem obrigatoria', code: 'VALIDATION_ERROR' })

    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!isImageUpload(file, validation)) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({
        error: `Tipo de imagem nao permitido: ${validation.detectedType || file.mimetype}`,
        code: 'INVALID_FILE_TYPE',
      })
    }

    const { url } = await uploadFile(file, 'banners')
    res.status(201).json({ url })
  } catch (e) { next(e) }
})

bannerRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.banner.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    if (req.body.imagem && req.body.imagem !== existing.imagem && existing.imagem?.startsWith('/uploads/')) {
      await deleteFile(storageKeyFromUrl(existing.imagem))
    }
    const item = await prisma.banner.update({ where: { id: req.params.id }, data: req.body })
    res.json(item)
  } catch (e) { next(e) }
})

bannerRouter.delete('/:id', async (req, res, next) => {
  try {
    const item = await prisma.banner.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    if (item.imagem?.startsWith('/uploads/')) {
      await deleteFile(storageKeyFromUrl(item.imagem))
    }
    await prisma.banner.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})
