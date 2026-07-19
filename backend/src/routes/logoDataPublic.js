import { Router } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const logoDataPublicRouter = Router()

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://tanamao.tonocondominio.com.br').replace(/\/$/, '')
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'https://ta-na-mao-9bii.onrender.com/api/logo-data/google/calendar/callback'
const JWT_SECRET = process.env.JWT_SECRET || 'tanamaao-secret-key-change-in-production'

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI)
}

function encryptionKey() {
  return crypto.createHash('sha256').update(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || JWT_SECRET).digest()
}

function encrypt(value) {
  if (!value) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.')
}

function decrypt(value) {
  if (!value) return null
  const [ivPart, tagPart, encryptedPart] = String(value).split('.')
  if (!ivPart || !tagPart || !encryptedPart) throw new Error('Token do Google invalido')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function integrationFrom(config = {}, userId) {
  return config?.integracoes?.googleCalendar?.[userId] || null
}

async function readGoogleIntegration(condominioId, userId) {
  const condominio = await prisma.condominio.findUnique({ where: { id: condominioId }, select: { portalConfig: true } })
  if (!condominio) throw new Error('Condominio nao encontrado')
  return { condominio, integration: integrationFrom(condominio.portalConfig || {}, userId) }
}

async function saveGoogleIntegration(condominioId, userId, integration) {
  const condominio = await prisma.condominio.findUnique({ where: { id: condominioId }, select: { portalConfig: true } })
  if (!condominio) throw new Error('Condominio nao encontrado')
  const current = condominio.portalConfig && typeof condominio.portalConfig === 'object' ? condominio.portalConfig : {}
  const integracoes = current.integracoes && typeof current.integracoes === 'object' ? current.integracoes : {}
  const googleCalendar = integracoes.googleCalendar && typeof integracoes.googleCalendar === 'object' ? integracoes.googleCalendar : {}
  const nextGoogle = { ...googleCalendar }
  if (integration) nextGoogle[userId] = integration
  else delete nextGoogle[userId]
  await prisma.condominio.update({
    where: { id: condominioId },
    data: { portalConfig: { ...current, integracoes: { ...integracoes, googleCalendar: nextGoogle } } },
  })
}

async function refreshGoogleAccessToken(condominioId, userId, integration) {
  const refreshToken = decrypt(integration?.refreshToken)
  if (!refreshToken) throw new Error('Reconecte sua conta do Google Agenda')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokens = await response.json().catch(() => ({}))
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || 'Nao foi possivel renovar o acesso ao Google Agenda')

  const updated = {
    ...integration,
    accessToken: encrypt(tokens.access_token),
    expiryDate: Date.now() + Number(tokens.expires_in || 3600) * 1000,
    scope: tokens.scope || integration.scope || null,
    tokenType: tokens.token_type || integration.tokenType || 'Bearer',
  }
  await saveGoogleIntegration(condominioId, userId, updated)
  return { integration: updated, accessToken: tokens.access_token }
}

async function getGoogleAccessToken(condominioId, userId) {
  const { integration } = await readGoogleIntegration(condominioId, userId)
  if (!integration) throw new Error('Google Agenda nao conectado')

  if (integration.accessToken && Number(integration.expiryDate || 0) > Date.now() + 60_000) {
    return { integration, accessToken: decrypt(integration.accessToken) }
  }
  return refreshGoogleAccessToken(condominioId, userId, integration)
}

function nextDate(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

logoDataPublicRouter.get('/google/calendar/status', authenticate, async (req, res, next) => {
  try {
    const { integration } = await readGoogleIntegration(req.user.condominioId, req.user.id)
    res.json({
      configured: googleConfigured(),
      connected: Boolean(integration?.refreshToken || integration?.accessToken),
      email: integration?.email || null,
      connectedAt: integration?.connectedAt || null,
      calendarId: integration?.calendarId || 'primary',
    })
  } catch (e) { next(e) }
})

logoDataPublicRouter.get('/google/calendar/connect', authenticate, async (req, res, next) => {
  try {
    if (!googleConfigured()) return res.status(503).json({ error: 'Google Agenda ainda nao foi configurado no servidor', code: 'GOOGLE_NOT_CONFIGURED' })
    const state = jwt.sign({ userId: req.user.id, condominioId: req.user.condominioId, purpose: 'google-calendar' }, JWT_SECRET, { expiresIn: '10m' })
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: 'openid email https://www.googleapis.com/auth/calendar.events',
      state,
    })
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
  } catch (e) { next(e) }
})

logoDataPublicRouter.get('/google/calendar/callback', async (req, res) => {
  try {
    if (req.query.error) return res.redirect(`${FRONTEND_URL}/?googleCalendar=denied`)
    if (!req.query.code || !req.query.state) return res.redirect(`${FRONTEND_URL}/?googleCalendar=invalid`)
    const state = jwt.verify(String(req.query.state), JWT_SECRET)
    if (state.purpose !== 'google-calendar') throw new Error('Estado OAuth invalido')

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenResponse.json()
    if (!tokenResponse.ok) throw new Error(tokens.error_description || tokens.error || 'Falha ao conectar Google Agenda')

    let email = null
    if (tokens.access_token) {
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
      const profile = await profileResponse.json().catch(() => ({}))
      email = profile.email || null
    }

    const { integration: previous } = await readGoogleIntegration(state.condominioId, state.userId)
    await saveGoogleIntegration(state.condominioId, state.userId, {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token) || previous?.refreshToken || null,
      expiryDate: tokens.expires_in ? Date.now() + Number(tokens.expires_in) * 1000 : null,
      scope: tokens.scope || null,
      tokenType: tokens.token_type || 'Bearer',
      email,
      calendarId: previous?.calendarId || 'primary',
      connectedAt: new Date().toISOString(),
    })
    res.redirect(`${FRONTEND_URL}/?googleCalendar=connected`)
  } catch (e) {
    console.error('[google-calendar-callback]', e.message)
    res.redirect(`${FRONTEND_URL}/?googleCalendar=error`)
  }
})

logoDataPublicRouter.post('/google/calendar/events', authenticate, async (req, res, next) => {
  try {
    const { titulo, descricao, local, responsavel, condominio, dataVencimento, prioridade } = req.body || {}
    if (!titulo || !dataVencimento) return res.status(400).json({ error: 'Titulo e data da manutencao sao obrigatorios' })

    const { integration, accessToken } = await getGoogleAccessToken(req.user.condominioId, req.user.id)
    const calendarId = integration.calendarId || 'primary'
    const details = [
      condominio ? `Condominio: ${condominio}` : null,
      local ? `Local: ${local}` : null,
      responsavel ? `Responsavel: ${responsavel}` : null,
      prioridade ? `Prioridade: ${prioridade}` : null,
      descricao ? `\nObservacoes:\n${descricao}` : null,
      '\nCriado pelo Ta na Mao.',
    ].filter(Boolean).join('\n')

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: `Manutencao - ${titulo}`,
        description: details,
        location: [condominio, local].filter(Boolean).join(' - '),
        start: { date: String(dataVencimento).slice(0, 10) },
        end: { date: nextDate(String(dataVencimento).slice(0, 10)) },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 120 }] },
        extendedProperties: { private: { source: 'ta-na-mao', type: 'manutencao' } },
      }),
    })
    const event = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(event.error?.message || 'Nao foi possivel criar o evento no Google Agenda')
    res.status(201).json({ id: event.id, htmlLink: event.htmlLink, status: event.status })
  } catch (e) { next(e) }
})

logoDataPublicRouter.delete('/google/calendar/disconnect', authenticate, async (req, res, next) => {
  try {
    await saveGoogleIntegration(req.user.condominioId, req.user.id, null)
    res.json({ connected: false })
  } catch (e) { next(e) }
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
