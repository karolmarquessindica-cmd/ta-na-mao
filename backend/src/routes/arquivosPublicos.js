import { Router } from 'express'
import { getSignedUrl, isS3Enabled } from '../lib/storage.js'

export const arquivosPublicosRouter = Router()

arquivosPublicosRouter.get('/:key(*)', async (req, res, next) => {
  try {
    const key = req.params.key
    if (!key) return res.status(400).json({ error: 'Arquivo invalido', code: 'INVALID_FILE' })

    if (isS3Enabled) {
      const signed = await getSignedUrl(key)
      return res.redirect(signed)
    }

    return res.redirect(`/uploads/${key.replace(/^uploads\//, '')}`)
  } catch (e) {
    next(e)
  }
})
