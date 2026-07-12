import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const portalSlugResolveRouter = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TOKEN_RE = /^[A-Za-z0-9_-]{24,}$/

function cleanSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

portalSlugResolveRouter.use('/:identifier', async (req, res, next) => {
  try {
    const identifier = String(req.params.identifier || '').trim()
    if (!identifier || UUID_RE.test(identifier) || TOKEN_RE.test(identifier)) return next()

    const slug = cleanSlug(identifier)
    const condominios = await prisma.condominio.findMany({ select: { portalConfig: true } })
    const match = condominios.find(item => cleanSlug(item?.portalConfig?.portalMorador?.portalSlug || '') === slug)
    const token = match?.portalConfig?.portalMorador?.token
    if (!token) return next()

    req.url = req.url.replace(/^\/[^/]+/, `/${token}`)
    next()
  } catch (e) { next(e) }
})