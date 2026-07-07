import { Router } from 'express'
import fs from 'fs'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'

export const portalRouter = Router()

const portalMoradorDefault = {
  ativo: true,
  permitirLink: true,
  permitirQrCode: true,
  token: null,
  bannerIds: [],
  bannerMeta: {},
  comunicadoIds: [],
  comunicadoMeta: {},
  documentoIds: [],
  documentoMeta: {},
  contatos: [],
  funcionalidades: {
    abrirChamado: true,
    planoManutencao: true,
    documentos: true,
    comunicados: true,
    vozMorador: true,
    denuncias: true,
    reservas: true,
    iaChat: true,
    contatosResponsaveis: true,
    relatoriosManutencao: true,
    valoresNotasFiscais: false,
  },
  informacoes: {
    nome: true,
    endereco: true,
    responsaveis: true,
    telefones: true,
    email: true,
    manutencoesPrevistas: true,
    comunicadosRecentes: true,
  },
}

function apiOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

function publicImageUrl(req, value) {
  if (!value) return value
  if (/^data:image\//i.test(value)) return value
  if (/^https?:\/\//i.test(value)) return value
  if (String(value).startsWith('/uploads/')) return `${apiOrigin(req)}${value}`
  const key = String(value).replace(/^\/+/, '')
  return `${apiOrigin(req)}/api/arquivos/${key}`
}

function normalizePortalConfig(config = {}) {
  const portal = config?.portalMorador || {}
  return {
    ...(config || {}),
    portalMorador: {
      ...portalMoradorDefault,
      ...portal,
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      bannerMeta: portal.bannerMeta && typeof portal.bannerMeta === 'object' ? portal.bannerMeta : {},
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      comunicadoMeta: portal.comunicadoMeta && typeof portal.comunicadoMeta === 'object' ? portal.comunicadoMeta : {},
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
      funcionalidades: {
        ...portalMoradorDefault.funcionalidades,
        ...(portal.funcionalidades || {}),
      },
      informacoes: {
        ...portalMoradorDefault.informacoes,
        ...(portal.informacoes || {}),
      },
    },
  }
}

const portalInclude = {
  banners: { where: { ativo: true }, orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
  comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
  documentos: { orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
  users: {
    where: { ativo: true, role: { in: ['ADMIN', 'SINDICO'] } },
    select: { id: true, nome: true, role: true, telefone: true, whatsapp: true, email: true },
    orderBy: { nome: 'asc' },
  },
  manutencoes: {
    include: { inventario: { select: { id: true, nome: true, categoria: true } } },
    orderBy: [{ dataVencimento: 'asc' }, { createdAt: 'desc' }],
    take: 120,
  },
  vozes: {
    where: { ativo: true, visivelPortal: true, tipo: { in: ['SUGESTAO_MELHORIA', 'PAUTA_ASSEMBLEIA', 'PARCEIRO'] } },
    include: {
      comentarios: {
        include: { autor: { select: { id: true, nome: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      _count: { select: { votos: true, comentarios: true } },
    },
    orderBy: [{ destaqueSemana: 'desc' }, { fixado: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  },
}

async function findCondominioByPortalToken(token) {
  try {
    return await prisma.condominio.findFirst({
      where: { portalConfig: { path: ['portalMorador', 'token'], equals: token } },
      include: portalInclude,
    })
  } catch {
    const condominios = await prisma.condominio.findMany({ include: portalInclude })
    return condominios.find(item => normalizePortalConfig(item.portalConfig).portalMorador.token === token) || null
  }
}

function scheduledVisible(meta = {}) {
  if (!meta.agendadoPara) return true
  return new Date(meta.agendadoPara).getTime() <= Date.now()
}

function currentYearStart() {
  const date = new Date()
  date.setMonth(0, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function maintenanceExecution(item) {
  const checklist = item?.checklist && typeof item.checklist === 'object' ? item.checklist : {}
  const execucoes = Array.isArray(checklist.execucoes) ? checklist.execucoes : []
  return execucoes[execucoes.length - 1] || null
}

function maintenanceStatus(item) {
  if (item.status === 'CONCLUIDO') return 'CONCLUIDA'
  if (item.status === 'EM_ANDAMENTO') return 'EM_ANDAMENTO'
  if (item.dataVencimento && new Date(item.dataVencimento).getTime() < Date.now()) return 'ATRASADA'
  return 'PROXIMA'
}

function portalMaintenance(item, portal) {
  const checklist = item?.checklist && typeof item.checklist === 'object' ? item.checklist : {}
  const execucao = maintenanceExecution(item)
  return {
    id: item.id,
    nome: item.titulo,
    titulo: item.titulo,
    descricao: item.descricao,
    local: item.inventario?.nome || checklist.local || item.empresa || '',
    data: item.dataConclusao || execucao?.dataExecucao || item.dataVencimento || item.createdAt,
    dataPrevista: item.dataVencimento,
    dataExecutada: item.dataConclusao || execucao?.dataExecucao || null,
    status: maintenanceStatus(item),
    responsavel: item.responsavel || item.empresa || '',
    relatorioDisponivel: Boolean(portal.funcionalidades?.relatoriosManutencao && item.status === 'CONCLUIDO' && execucao),
  }
}

function publicReportPayload(item, portal) {
  const checklist = item?.checklist && typeof item.checklist === 'object' ? item.checklist : {}
  const execucao = maintenanceExecution(item)
  if (!execucao) return null

  const arquivos = Array.isArray(execucao.anexos) ? execucao.anexos : []
  const fotosExecucao = Array.isArray(execucao.fotos) ? execucao.fotos.map(url => ({ fileUrl: url, url, fileType: 'FOTO', fileName: String(url).split('/').pop() || 'foto' })) : []
  const nota = execucao.notaFiscal ? [{ fileUrl: execucao.notaFiscal, url: execucao.notaFiscal, fileType: 'NOTA_FISCAL', fileName: String(execucao.notaFiscal).split('/').pop() || 'nota-fiscal' }] : []
  const anexos = [...arquivos, ...fotosExecucao, ...nota]
  const fotos = anexos.filter(file => file.fileType === 'FOTO' || String(file.mimeType || '').startsWith('image/'))
  const notaFiscal = portal.funcionalidades?.valoresNotasFiscais
    ? anexos.find(file => file.fileType === 'NOTA_FISCAL' || String(file.mimeType || '').includes('pdf')) || null
    : null

  return {
    id: item.id,
    titulo: item.titulo,
    local: item.inventario?.nome || checklist.local || item.empresa || '',
    dataExecutada: execucao.dataExecucao || item.dataConclusao,
    prestador: item.responsavel || item.empresa || '',
    comentarios: execucao.comentarios || '',
    fotos,
    notaFiscal,
    valor: portal.funcionalidades?.valoresNotasFiscais ? (execucao.valor ?? item.custo ?? null) : null,
    anexos: portal.funcionalidades?.valoresNotasFiscais ? anexos : fotos,
  }
}

function publicContacts(condominio, portal) {
  const configured = (portal.contatos || []).filter(item => item?.ativo !== false)
  const fromUsers = (condominio.users || []).map(user => ({
    id: user.id,
    nome: user.nome,
    funcao: user.role === 'SINDICO' ? 'Sindico' : user.role === 'ADMIN' ? 'Administracao' : 'Responsavel',
    telefone: user.telefone || '',
    whatsapp: user.whatsapp || '',
    email: user.email || '',
    ativo: true,
  }))
  return [...configured, ...fromUsers]
}

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}

function portalDocument(documento, portal) {
  const meta = portal.documentoMeta?.[documento.id] || {}
  const tipoAcesso = documentAccessType(meta.tipoAcesso || (documento.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO'))
  const visivelPortal = Boolean((portal.documentoIds || []).includes(documento.id) || meta.visivelPortal)
  const item = {
    ...documento,
    titulo: meta.titulo || documento.nome,
    categoria: meta.categoria || documento.pasta || 'Geral',
    publicadoEm: meta.publicadoEm || documento.createdAt,
    visivelPortal,
    usarIa: Boolean(meta.usarIa),
    tipoAcesso,
    tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo',
  }
  item.portalMeta = {
    titulo: item.titulo,
    categoria: item.categoria,
    publicadoEm: item.publicadoEm,
    visivelPortal: item.visivelPortal,
    usarIa: item.usarIa,
    tipoAcesso: item.tipoAcesso,
    tipoDocumento: item.tipoDocumento,
  }
  return item
}

function canShowDocumentInPortal(documento) {
  return Boolean(documento.visivelPortal && (documento.acesso === 'PUBLICO' || documento.tipoAcesso === 'MORADOR' || documento.tipoAcesso === 'IA_DO_PORTAL'))
}

function canUseDocumentInPortalAi(documento) {
  return Boolean(documento.usarIa && ['MORADOR', 'IA_DO_PORTAL'].includes(documento.tipoAcesso))
}

function portalAnonymousEmail(condominioId) {
  return `portal-${condominioId}@tanamao.local`
}

async function portalAnonymousUser(condominioId) {
  const email = portalAnonymousEmail(condominioId)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing
  const senha = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 10)
  return prisma.user.create({
    data: {
      nome: 'Portal do Morador',
      email,
      senha,
      role: 'MORADOR',
      ativo: true,
      condominioId,
    },
  })
}

function portalParticipantEmail(condominioId, visitorId) {
  const safe = String(visitorId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'anon'
  return `portal-${condominioId}-${safe}@tanamao.local`
}

async function portalParticipantUser(condominioId, visitorId) {
  const email = portalParticipantEmail(condominioId, visitorId)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing
  const senha = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 10)
  return prisma.user.create({
    data: {
      nome: 'Morador do portal',
      email,
      senha,
      role: 'MORADOR',
      ativo: true,
      condominioId,
    },
  })
}

async function validatePortalFiles(files = []) {
  for (const file of files) {
    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)
    const ok = validation.valid && (!validation.detectedType || validation.detectedType.startsWith('image/'))
    if (!ok) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      const error = new Error('Envie apenas imagens validas no chamado.')
      error.status = 400
      error.code = 'INVALID_FILE_TYPE'
      throw error
    }
  }
}

function buildPortalPayload(condominio, req) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const bannerIds = new Set(portal.bannerIds || [])
  const comunicadoIds = new Set(portal.comunicadoIds || [])

  const banners = (condominio.banners || [])
    .filter(item => bannerIds.has(item.id))
    .map(item => {
      const imagemUrl = publicImageUrl(req, item.imagem)
      return { ...item, imagem: imagemUrl, imagemOriginal: item.imagem, imagemUrl, descricao: portal.bannerMeta?.[item.id]?.descricao || '' }
    })
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  const comunicados = (condominio.comunicados || [])
    .filter(item => comunicadoIds.has(item.id))
    .map(item => ({ ...item, portalMeta: portal.comunicadoMeta?.[item.id] || {} }))
    .filter(item => scheduledVisible(item.portalMeta))
    .sort((a, b) => {
      const fixA = Boolean(a.portalMeta?.fixado ?? a.fixado)
      const fixB = Boolean(b.portalMeta?.fixado ?? b.fixado)
      if (fixA !== fixB) return fixA ? -1 : 1
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })

  const allDocumentos = (condominio.documentos || []).map(item => portalDocument(item, portal))
  const documentos = allDocumentos.filter(canShowDocumentInPortal)
  const documentosIa = allDocumentos.filter(canUseDocumentInPortalAi)
  const yearStart = currentYearStart()
  const manutencoes = (condominio.manutencoes || [])
    .filter(item => {
      const date = item.dataConclusao || item.dataVencimento || item.createdAt
      return date && new Date(date).getTime() >= yearStart.getTime()
    })
    .map(item => portalMaintenance(item, portal))

  const vozes = (condominio.vozes || []).map(item => ({
    ...item,
    totalVotos: item._count?.votos || 0,
    totalComentarios: item._count?.comentarios || 0,
  }))

  return {
    condominio: {
      id: condominio.id,
      nome: condominio.nome,
      logoUrl: condominio.logo || null,
      endereco: condominio.endereco,
      cidade: condominio.cidade,
      estado: condominio.estado,
      telefone: condominio.telefone,
      email: condominio.email,
    },
    config: portal,
    banners,
    comunicados,
    documentos,
    documentosIa,
    responsaveis: publicContacts(condominio, portal),
    manutencoesPrevistas: manutencoes,
    vozes,
  }
}

portalRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const condominio = await prisma.condominio.findUnique({
      where: { id: req.user.condominioId },
      include: portalInclude,
    })
    if (!condominio) return res.status(404).json({ error: 'Condominio nao encontrado', code: 'NOT_FOUND' })
    const config = normalizePortalConfig(condominio.portalConfig).portalMorador
    if (!config.ativo) return res.status(403).json({ error: 'Portal inativo', code: 'PORTAL_INACTIVE' })
    res.json(buildPortalPayload(condominio, req))
  } catch (e) { next(e) }
})

portalRouter.get('/:token', async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalToken(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })
    const config = normalizePortalConfig(condominio.portalConfig).portalMorador
    if (config.ativo === false || config.permitirLink === false) return res.status(403).json({ error: 'Portal indisponivel', code: 'PORTAL_UNAVAILABLE' })
    res.json(buildPortalPayload(condominio, req))
  } catch (e) { next(e) }
})

portalRouter.post('/:token/chamados', uploadLimiter, multerUpload.array('fotos', 5), async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalToken(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })
    const portal = normalizePortalConfig(condominio.portalConfig).portalMorador
    if (portal.ativo === false || portal.permitirLink === false || !portal.funcionalidades?.abrirChamado) {
      return res.status(403).json({ error: 'Abertura de chamados indisponivel neste portal', code: 'PORTAL_TICKET_DISABLED' })
    }

    const { categoria, descricao, local } = req.body
    if (!descricao || !String(descricao).trim()) {
      return res.status(400).json({ error: 'Descricao do chamado e obrigatoria', code: 'VALIDATION_ERROR' })
    }

    const files = req.files || []
    await validatePortalFiles(files)
    const uploads = []
    for (const file of files) {
      const { url } = await uploadFile(file, 'portal-chamados')
      uploads.push(url)
    }

    const morador = await portalAnonymousUser(condominio.id)
    const chamado = await prisma.chamado.create({
      data: {
        titulo: `Chamado pelo portal${local ? ` - ${local}` : ''}`,
        descricao,
        categoria: ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(categoria) ? categoria : 'MANUTENCAO',
        prioridade: 'MEDIA',
        fotos: uploads,
        moradorId: morador.id,
        condominioId: condominio.id,
        historico: { create: { acao: 'Chamado aberto pelo Portal do Morador', nota: local || null } },
      },
    })

    res.status(201).json({
      id: chamado.id,
      protocolo: chamado.id.slice(0, 8).toUpperCase(),
      status: chamado.status,
      createdAt: chamado.createdAt,
      mensagem: 'Chamado enviado para a administracao do condominio.',
    })
  } catch (e) { next(e) }
})

portalRouter.get('/:token/chamados/:id', async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalToken(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })
    const chamado = await prisma.chamado.findFirst({ where: { id: req.params.id, condominioId: condominio.id } })
    if (!chamado) return res.status(404).json({ error: 'Chamado nao encontrado', code: 'NOT_FOUND' })
    res.json(chamado)
  } catch (e) { next(e) }
})