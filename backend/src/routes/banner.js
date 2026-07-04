// src/routes/banner.js
import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateBufferMagicBytes, validateFileMagicBytes } from '../lib/validateUpload.js'
import { deleteFile, isS3Enabled, multerUpload, storageKeyFromUrl, uploadFile } from '../lib/storage.js'

export const bannerRouter = Router()
bannerRouter.use(authenticate)

const UPLOAD_DIR = 'uploads'
const MAX_BANNER_SIZE = 8 * 1024 * 1024

function apiOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

function publicFileUrl(req, value) {
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${apiOrigin(req)}${value}`
  const key = String(value).replace(/^\/+/, '')
  return `${apiOrigin(req)}/api/arquivos/${key}`
}

function withPublicImage(req, item) {
  if (!item) return item
  const imagemUrl = publicFileUrl(req, item.imagem)
  return { ...item, imagem: imagemUrl, imagemOriginal: item.imagem, imagemUrl }
}

function isImageUpload(file, validation) {
  const mimeOk = file?.mimetype?.startsWith('image/')
  const detectedOk = !validation.detectedType || validation.detectedType.startsWith('image/')
  const ext = path.extname(file?.originalname || '').toLowerCase()
  const extOk = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
  return Boolean(file) && validation.valid && detectedOk && (mimeOk || extOk)
}

function unlinkTmp(file) {
  if (!isS3Enabled && file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path) } catch {}
  }
}

async function uploadBannerFile(file) {
  try {
    return await uploadFile(file, 'banners')
  } catch (error) {
    console.warn('[banners] upload principal falhou. Usando fallback local:', error.message)
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    const ext = path.extname(file.originalname || '') || '.img'
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    const target = path.join(UPLOAD_DIR, filename)
    if (file.buffer) fs.writeFileSync(target, file.buffer)
    else if (file.path && fs.existsSync(file.path)) fs.copyFileSync(file.path, target)
    else throw error
    return { key: `${UPLOAD_DIR}/${filename}`, url: `/uploads/${filename}` }
  }
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
    res.json(paginatedResponse({ data: data.map(item => withPublicImage(req, item)), total, page, limit }))
  } catch (e) { next(e) }
})

bannerRouter.post('/', async (req, res, next) => {
  try {
    const { titulo, imagem, imagemOriginal, link, ordem, ativo } = req.body
    const savedImage = imagemOriginal || imagem
    if (!titulo || !savedImage) return res.status(400).json({ error: 'Titulo e imagem sao obrigatorios', code: 'VALIDATION_ERROR' })
    const item = await prisma.banner.create({ data: { titulo, imagem: savedImage, link, ordem: ordem || 1, ativo: ativo ?? true, condominioId: req.user.condominioId } })
    res.status(201).json(withPublicImage(req, item))
  } catch (e) { next(e) }
})

bannerRouter.post('/imagem', uploadLimiter, multerUpload.single('imagem'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Imagem obrigatoria', code: 'VALIDATION_ERROR' })
    if (file.size > MAX_BANNER_SIZE) {
      unlinkTmp(file)
      return res.status(400).json({ error: 'Imagem muito grande. Envie um banner com ate 8 MB.', code: 'FILE_TOO_LARGE' })
    }

    const validation = isS3Enabled ? await validateBufferMagicBytes(file.buffer) : await validateFileMagicBytes(file.path)
    if (!isImageUpload(file, validation)) {
      unlinkTmp(file)
      return res.status(400).json({ error: `Tipo de imagem nao permitido: ${validation.detectedType || file.mimetype}. Use JPG, PNG ou WEBP.`, code: 'INVALID_FILE_TYPE' })
    }

    const { url } = await uploadBannerFile(file)
    const imagemUrl = publicFileUrl(req, url)
    res.status(201).json({ url, imagem: imagemUrl, imagemUrl, imagemOriginal: url })
  } catch (e) {
    console.error('[banners] erro no upload:', e)
    next(e)
  }
})

bannerRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.banner.findFirst({ where: { id: req.params.id, condominioId: req.user.condominioId } })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    const data = { ...req.body }
    if (data.imagemOriginal) data.imagem = data.imagemOriginal
    delete data.imagemOriginal
    delete data.imagemUrl
    if (data.imagem && data.imagem !== existing.imagem && existing.imagem?.startsWith('/uploads/')) await deleteFile(storageKeyFromUrl(existing.imagem)).catch(() => null)
    const item = await prisma.banner.update({ where: { id: req.params.id }, data })
    res.json(withPublicImage(req, item))
  } catch (e) { next(e) }
})

bannerRouter.delete('/:id', async (req, res, next) => {
  try {
    const item = await prisma.banner.findFirst({ where: { id: req.params.id, condominioId: req.user.condominioId } })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    if (item.imagem?.startsWith('/uploads/')) await deleteFile(storageKeyFromUrl(item.imagem)).catch(() => null)
    await prisma.banner.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})
