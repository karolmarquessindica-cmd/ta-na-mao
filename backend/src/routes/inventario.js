// src/routes/inventario.js
import { Router } from 'express'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'

export const inventarioRouter = Router()
inventarioRouter.use(authenticate)

inventarioRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }

    const [data, total] = await Promise.all([
      prisma.inventario.findMany({
        where,
        include: { _count: { select: { manutencoes: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventario.count({ where }),
    ])
    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) { next(e) }
})

inventarioRouter.post('/', async (req, res, next) => {
  try {
    const { nome, codigo, categoria, descricao, fabricante, modelo, dataAquisicao, garantiaAte, status } = req.body
    const item = await prisma.inventario.create({
      data: {
        nome, codigo, categoria, descricao, fabricante, modelo, status: status || 'Operacional',
        dataAquisicao: dataAquisicao ? new Date(dataAquisicao) : null,
        garantiaAte: garantiaAte ? new Date(garantiaAte) : null,
        condominioId: req.user.condominioId,
      }
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

inventarioRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.inventario.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    const item = await prisma.inventario.update({ where: { id: req.params.id }, data: req.body })
    res.json(item)
  } catch (e) { next(e) }
})

// POST /api/inventario/:id/fotos — upload de foto para um item de inventário
inventarioRouter.post('/:id/fotos', uploadLimiter, multerUpload.single('foto'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Foto obrigatória', code: 'VALIDATION_ERROR' })

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

    const item = await prisma.inventario.findFirst({
      where: { id: req.params.id, condominioId: req.user.condominioId }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const { url } = await uploadFile(file, 'inventario')
    const updated = await prisma.inventario.update({
      where: { id: req.params.id },
      data: { fotos: [...item.fotos, url] }
    })
    res.json(updated)
  } catch (e) { next(e) }
})
