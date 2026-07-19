import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const logoDataPublicRouter = Router()

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://tanamao.tonocondominio.com.br').replace(/\/$/, '')

logoDataPublicRouter.get('/google/calendar/callback', async (req, res) => {
  const { code, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}/?googleCalendar=erro&motivo=${encodeURIComponent(String(error))}`)
  }

  if (!code) {
    return res.status(400).json({
      error: 'Codigo de autorizacao do Google nao informado',
      code: 'GOOGLE_OAUTH_CODE_MISSING',
    })
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/?googleCalendar=aguardando-credenciais`)
  }

  return res.redirect(`${FRONTEND_URL}/?googleCalendar=callback-recebido`)
})

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