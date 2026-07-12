import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const portalSlugSafeRouter = Router()

const OFFICIAL_PORTAL_ORIGIN = 'https://tanamao.tonocondominio.com.br'

function cleanSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function portalConfigOf(condominio) {
  const config = condominio?.portalConfig && typeof condominio.portalConfig === 'object' ? condominio.portalConfig : {}
  const portalMorador = config.portalMorador && typeof config.portalMorador === 'object' ? config.portalMorador : {}
  return { config, portalMorador }
}

async function accessible(req, id) {
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

async function slugInUse(slug, exceptId) {
  const all = await prisma.condominio.findMany({ select: { id: true, portalConfig: true } })
  return all.some(item => {
    if (item.id === exceptId) return false
    const current = portalConfigOf(item).portalMorador.portalSlug
    return current && cleanSlug(current) === slug
  })
}

portalSlugSafeRouter.get('/:id/portal-slug', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await accessible(req, req.params.id)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado', code: 'NOT_FOUND' })
    const { portalMorador } = portalConfigOf(condominio)
    const slug = cleanSlug(portalMorador.portalSlug || '')
    res.json({
      slug,
      link: slug ? `${OFFICIAL_PORTAL_ORIGIN}/${slug}` : null,
      dominio: OFFICIAL_PORTAL_ORIGIN,
    })
  } catch (e) { next(e) }
})

portalSlugSafeRouter.put('/:id/portal-slug', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await accessible(req, req.params.id)
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado', code: 'NOT_FOUND' })

    const slug = cleanSlug(req.body?.slug)
    if (slug.length < 3) return res.status(400).json({ error: 'Use pelo menos 3 caracteres no link.', code: 'INVALID_SLUG' })
    if (await slugInUse(slug, condominio.id)) return res.status(409).json({ error: 'Este link ja esta sendo usado por outro condominio.', code: 'SLUG_IN_USE' })

    const { config, portalMorador } = portalConfigOf(condominio)
    const portalConfig = {
      ...config,
      portalMorador: {
        ...portalMorador,
        portalSlug: slug,
      },
    }

    await prisma.condominio.update({ where: { id: condominio.id }, data: { portalConfig } })
    res.json({ slug, link: `${OFFICIAL_PORTAL_ORIGIN}/${slug}`, dominio: OFFICIAL_PORTAL_ORIGIN })
  } catch (e) { next(e) }
})