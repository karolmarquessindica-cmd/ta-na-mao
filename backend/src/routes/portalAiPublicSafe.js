import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const portalAiPublicSafeRouter = Router()

function portalConfig(config = {}) {
  const portal = config?.portalMorador || {}
  return {
    ...portal,
    documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
    funcionalidades: portal.funcionalidades || {},
  }
}

async function findPortal(token) {
  const clean = String(token || '').trim()
  const byJson = await prisma.condominio.findFirst({ where: { portalConfig: { path: ['portalMorador', 'token'], equals: clean } } }).catch(() => null)
  if (byJson) return byJson
  const all = await prisma.condominio.findMany()
  return all.find(item => portalConfig(item.portalConfig).token === clean || item.id === clean) || null
}

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function snippet(text = '', message = '') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const words = normalize(message).split(/[^a-z0-9]+/).filter(w => w.length > 3)
  const n = normalize(clean)
  const p = words.map(w => n.indexOf(w)).find(i => i >= 0)
  const start = p >= 0 ? Math.max(0, p - 600) : 0
  return clean.slice(start, start + 1600)
}

portalAiPublicSafeRouter.post('/:token/ia', async (req, res, next) => {
  try {
    const condominio = await findPortal(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })
    const portal = portalConfig(condominio.portalConfig)
    if (portal.ativo === false || portal.permitirLink === false || portal.funcionalidades?.iaChat === false) return res.status(403).json({ error: 'Assistente indisponivel neste portal', code: 'AI_DISABLED' })
    const message = String(req.body?.message || '').trim()
    if (!message) return res.status(400).json({ error: 'Mensagem invalida', code: 'VALIDATION_ERROR' })

    const docs = await prisma.documento.findMany({
      where: { condominioId: condominio.id, acesso: 'PUBLICO', usarComoFonteIA: true, textoExtraido: { not: null } },
      select: { id: true, nome: true, textoExtraido: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })

    const fontes = docs.map(doc => {
      const meta = portal.documentoMeta?.[doc.id] || {}
      if (meta.usarIa === false) return null
      const trecho = snippet(doc.textoExtraido, message)
      if (!trecho) return null
      return `Fonte: ${meta.titulo || doc.nome}\n${trecho}`
    }).filter(Boolean)

    const answer = fontes.length
      ? `Encontrei nos documentos liberados para a IA do portal:\n\n${fontes.join('\n\n---\n\n').slice(0, 2400)}`
      : 'Não encontrei essa informação nos documentos disponíveis do condomínio. Recomendo confirmar com a administração ou com o síndico.'

    res.json({ answer, source: 'local-context', model: 'portal-documents' })
  } catch (e) { next(e) }
})
