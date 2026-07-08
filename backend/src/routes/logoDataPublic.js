import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const logoDataPublicRouter = Router()

logoDataPublicRouter.get('/:id', async (req, res, next) => {
  try {
    const condominio = await prisma.condominio.findUnique({ where: { id: req.params.id }, select: { portalConfig: true } })
    const dataUrl = condominio?.portalConfig?.identidadeVisual?.logoDataUrl
    if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return res.status(404).send('Logo nao encontrada')

    const match = String(dataUrl).match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/)
    if (!match) return res.status(404).send('Logo invalida')

    const buffer = Buffer.from(match[3], 'base64')
    res.setHeader('Content-Type', match[1])
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(buffer)
  } catch (e) { next(e) }
})