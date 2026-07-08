import { Router } from 'express'
import fs from 'fs'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateBufferMagicBytes, validateFileMagicBytes } from '../lib/validateUpload.js'
import { isS3Enabled, multerUpload, uploadFile } from '../lib/storage.js'

export const condominioLogoSafeRouter = Router()

const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function apiOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

function removeTempFile(file) {
  if (!isS3Enabled && file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path) } catch {}
  }
}

function isLogoUpload(file, validation) {
  return Boolean(
    file &&
    file.size <= LOGO_MAX_BYTES &&
    LOGO_ALLOWED_MIMES.has(file.mimetype) &&
    validation.valid &&
    validation.detectedType &&
    LOGO_ALLOWED_MIMES.has(validation.detectedType)
  )
}

function fileToDataUrl(file) {
  const buffer = file.buffer || fs.readFileSync(file.path)
  const mime = file.mimetype || 'image/png'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function normalizeConfig(config = {}) {
  return config && typeof config === 'object' ? config : {}
}

async function ensureAccess(req, id) {
  return prisma.condominio.findFirst({
    where: {
      id,
      OR: [
        { users: { some: { id: req.user.id } } },
        { acessos: { some: { userId: req.user.id } } },
      ],
    },
  })
}

function serialize(condominio) {
  return {
    ...condominio,
    logoUrl: condominio.logo || null,
    portalConfig: normalizeConfig(condominio.portalConfig),
  }
}

condominioLogoSafeRouter.post('/:id/logo', authenticate, requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('logo'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, req.params.id)
    if (!condominio) {
      removeTempFile(req.file)
      return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    }

    const file = req.file
    if (!file) return res.status(400).json({ error: 'Logomarca obrigatoria', code: 'VALIDATION_ERROR' })
    if (file.size > LOGO_MAX_BYTES) {
      removeTempFile(file)
      return res.status(400).json({ error: 'Imagem muito pesada. Envie uma logomarca de ate 2MB.', code: 'LOGO_TOO_LARGE' })
    }

    const validation = isS3Enabled ? await validateBufferMagicBytes(file.buffer) : await validateFileMagicBytes(file.path)
    if (!isLogoUpload(file, validation)) {
      removeTempFile(file)
      return res.status(400).json({ error: 'Formato de logomarca invalido. Use PNG, JPG, JPEG ou WEBP.', code: 'INVALID_LOGO_TYPE' })
    }

    let logoUrl
    let nextConfig = normalizeConfig(condominio.portalConfig)

    if (isS3Enabled) {
      const { url } = await uploadFile(file, 'condominiums/logos')
      logoUrl = url
    } else {
      const dataUrl = fileToDataUrl(file)
      removeTempFile(file)
      nextConfig = {
        ...nextConfig,
        identidadeVisual: {
          ...(nextConfig.identidadeVisual || {}),
          logoDataUrl: dataUrl,
          updatedAt: new Date().toISOString(),
        },
      }
      logoUrl = `${apiOrigin(req)}/api/logo-data/${condominio.id}`
    }

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { logo: logoUrl, portalConfig: nextConfig },
    })

    res.json(serialize(updated))
  } catch (e) {
    removeTempFile(req.file)
    next(e)
  }
})

condominioLogoSafeRouter.delete('/:id/logo', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, req.params.id)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    const current = normalizeConfig(condominio.portalConfig)
    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: {
        logo: null,
        portalConfig: {
          ...current,
          identidadeVisual: {
            ...(current.identidadeVisual || {}),
            logoDataUrl: null,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    })
    res.json(serialize(updated))
  } catch (e) { next(e) }
})