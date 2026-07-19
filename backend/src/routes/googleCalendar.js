import { Router } from 'express'

export const googleCalendarRouter = Router()

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://tanamao.tonocondominio.com.br').replace(/\/$/, '')

// Callback oficial do OAuth do Google Calendar.
// Esta rota existe desde já para que a URI possa ser cadastrada no Google Cloud.
googleCalendarRouter.get('/calendar/callback', async (req, res) => {
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

  // A troca do codigo por tokens sera ativada na proxima etapa,
  // depois que GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET forem cadastrados no Render.
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/?googleCalendar=aguardando-credenciais`)
  }

  return res.redirect(`${FRONTEND_URL}/?googleCalendar=callback-recebido`)
})
