import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const cotacaoRouter = Router()

const publicView = item => {
  const r = item.respostas || {}
  return {
    id: item.id,
    token: item.publicoToken,
    condominioId: item.condominioId,
    condominio: item.condominio?.nome || r.condominioNome || '',
    servico: r.servico || item.nome.replace(/^COTACAO\|/,'') || '',
    descricao: r.descricao || '',
    prazoEnvio: r.prazoEnvio || null,
    criadaEm: item.createdAt,
    respondidaEm: r.respondidaEm || null,
    status: r.fornecedor ? 'RECEBIDA' : 'AGUARDANDO',
    fornecedor: r.fornecedor ? {
      empresa: r.fornecedor.empresa || '',
      cnpj: r.fornecedor.cnpj || '',
      responsavel: r.fornecedor.responsavel || '',
      whatsapp: r.fornecedor.whatsapp || '',
      valor: r.fornecedor.valor ?? null,
      prazoExecucao: r.fornecedor.prazoExecucao || '',
      validade: r.fornecedor.validade || '',
      pagamento: r.fornecedor.pagamento || '',
      garantia: r.fornecedor.garantia || '',
      observacoes: r.fornecedor.observacoes || '',
      anexoNome: r.fornecedor.anexoNome || null,
    } : null,
  }
}

async function scope(req, requestedId) {
  const id = requestedId || req.user.condominioId
  if (!id) return null
  if (id === req.user.condominioId) return id
  const ok = await prisma.condominio.findFirst({
    where: { id, OR: [{ users: { some: { id: req.user.id } } }, { acessos: { some: { userId: req.user.id } } }] },
    select: { id: true },
  })
  return ok?.id || null
}

// Public supplier form: no login required.
cotacaoRouter.get('/public/:token', async (req, res, next) => {
  try {
    const item = await prisma.checklistExecution.findFirst({
      where: { publicoToken: req.params.token, allowPublic: true },
      include: { condominio: { select: { id: true, nome: true } } },
    })
    if (!item) return res.status(404).json({ error: 'Solicitação de cotação não encontrada ou link inválido.' })
    const data = publicView(item)
    if (data.status === 'RECEBIDA') return res.json({ ...data, bloqueada: true })
    res.json({ ...data, bloqueada: false })
  } catch (e) { next(e) }
})

cotacaoRouter.post('/public/:token', async (req, res, next) => {
  try {
    const item = await prisma.checklistExecution.findFirst({
      where: { publicoToken: req.params.token, allowPublic: true },
    })
    if (!item) return res.status(404).json({ error: 'Solicitação de cotação não encontrada ou link inválido.' })
    const current = item.respostas || {}
    if (current.fornecedor) return res.status(409).json({ error: 'Esta cotação já foi preenchida.' })

    const b = req.body || {}
    const required = ['empresa', 'cnpj', 'responsavel', 'whatsapp', 'valor']
    const missing = required.filter(k => b[k] === undefined || b[k] === null || String(b[k]).trim() === '')
    if (missing.length) return res.status(400).json({ error: `Preencha os campos obrigatórios: ${missing.join(', ')}` })
    const valor = Number(String(b.valor).replace(',', '.'))
    if (!Number.isFinite(valor) || valor < 0) return res.status(400).json({ error: 'Informe um valor de orçamento válido.' })

    let anexo = null
    if (b.anexoData) {
      const raw = String(b.anexoData)
      const bytes = Buffer.byteLength(raw, 'utf8')
      if (bytes > 7 * 1024 * 1024) return res.status(413).json({ error: 'O PDF anexado é muito grande. Limite de 5 MB.' })
      if (!/^data:application\/pdf;base64,/i.test(raw)) return res.status(400).json({ error: 'O anexo deve ser um PDF.' })
      anexo = { nome: String(b.anexoNome || 'orcamento.pdf').slice(0, 180), data: raw }
    }

    const now = new Date()
    const fornecedor = {
      empresa: String(b.empresa).trim(), cnpj: String(b.cnpj).trim(), responsavel: String(b.responsavel).trim(),
      whatsapp: String(b.whatsapp).trim(), valor, prazoExecucao: String(b.prazoExecucao || '').trim(),
      validade: String(b.validade || '').trim(), pagamento: String(b.pagamento || '').trim(),
      garantia: String(b.garantia || '').trim(), observacoes: String(b.observacoes || '').trim(),
      anexoNome: anexo?.nome || null, anexoData: anexo?.data || null,
    }
    const updated = await prisma.checklistExecution.update({
      where: { id: item.id },
      data: {
        status: 'EM_ANDAMENTO',
        respostas: { ...current, fornecedor, respondidaEm: now.toISOString() },
        observacoes: `Cotação recebida de ${fornecedor.empresa}`,
        historico: [...(Array.isArray(item.historico) ? item.historico : []), { action: 'COTACAO_RECEBIDA', createdAt: now.toISOString(), fornecedor: fornecedor.empresa }],
      },
    })
    res.json({ ok: true, mensagem: 'Orçamento enviado com sucesso. Obrigado!', data: publicView(updated) })
  } catch (e) { next(e) }
})

cotacaoRouter.use(authenticate)

cotacaoRouter.get('/', async (req, res, next) => {
  try {
    const condominioId = await scope(req, req.query.condominioId)
    if (!condominioId) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    const items = await prisma.checklistExecution.findMany({
      where: { condominioId, respostas: { path: ['tipo'], equals: 'COTACAO' } },
      include: { condominio: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ items: items.map(publicView) })
  } catch (e) { next(e) }
})

cotacaoRouter.post('/', async (req, res, next) => {
  try {
    const condominioId = await scope(req, req.body.condominioId)
    if (!condominioId) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    const condominio = await prisma.condominio.findUnique({ where: { id: condominioId }, select: { id: true, nome: true } })
    const servico = String(req.body.servico || '').trim()
    if (!servico) return res.status(400).json({ error: 'Informe o serviço ou compra.' })
    const token = crypto.randomBytes(24).toString('base64url')
    const execution = await prisma.checklistExecution.create({
      data: {
        nome: `COTACAO|${servico}`,
        status: 'PENDENTE',
        respostas: { tipo: 'COTACAO', servico, descricao: String(req.body.descricao || '').trim(), prazoEnvio: req.body.prazoEnvio || null, condominioNome: condominio.nome },
        observacoes: String(req.body.descricao || '').trim() || null,
        historico: [{ action: 'COTACAO_SOLICITADA', createdAt: new Date().toISOString() }],
        allowPublic: true,
        publicoToken: token,
        publicoTokenCriadoAt: new Date(),
        condominioId,
      },
    })
    const base = String(process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
    res.status(201).json({ ...publicView({ ...execution, condominio }), link: `${base}/cotacao-fornecedor.html?token=${encodeURIComponent(token)}` })
  } catch (e) { next(e) }
})

cotacaoRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const condominioId = await scope(req, req.body.condominioId)
    if (!condominioId) return res.status(404).json({ error: 'Condomínio não encontrado.' })
    const item = await prisma.checklistExecution.findFirst({ where: { id: req.params.id, condominioId, respostas: { path: ['tipo'], equals: 'COTACAO' } } })
    if (!item) return res.status(404).json({ error: 'Cotação não encontrada.' })
    const r = item.respostas || {}
    const status = String(req.body.status || '').toUpperCase()
    if (!['APROVADA','RECUSADA','VENCIDA','PENDENTE'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
    const updated = await prisma.checklistExecution.update({ where: { id: item.id }, data: { respostas: { ...r, status }, status: status === 'APROVADA' ? 'CONCLUIDO' : item.status } })
    res.json(publicView(updated))
  } catch (e) { next(e) }
})
