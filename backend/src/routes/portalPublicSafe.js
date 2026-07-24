import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'

export const portalPublicSafeRouter = Router()

const TICKET_CONFIRMATION_MESSAGE = 'Obrigada por nos ajudar a cuidar do seu patrimônio.'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_DB_IMAGE_BYTES = 8 * 1024 * 1024

const DEFAULT_EMERGENCY_CONTACTS = [
  { id: 'default-policia', nome: 'Polícia Militar', funcao: 'Emergência 24h', telefone: '190', whatsapp: '', email: '', icone: '🚓', ligar: true, usarWhatsApp: false, ativo: true, ordem: 900 },
  { id: 'default-samu', nome: 'SAMU / Ambulância', funcao: 'Atendimento móvel de urgência', telefone: '192', whatsapp: '', email: '', icone: '🚑', ligar: true, usarWhatsApp: false, ativo: true, ordem: 901 },
  { id: 'default-bombeiros', nome: 'Corpo de Bombeiros', funcao: 'Emergência e resgate', telefone: '193', whatsapp: '', email: '', icone: '🔥', ligar: true, usarWhatsApp: false, ativo: true, ordem: 902 },
]

const safeDocumentoSelect = { id: true, nome: true, descricao: true, pasta: true, tipo: true, acesso: true, url: true, tamanho: true, createdAt: true, updatedAt: true, condominioId: true }
const safeManutencaoSelect = { id: true, titulo: true, descricao: true, tipo: true, status: true, prioridade: true, responsavel: true, empresa: true, dataVencimento: true, dataConclusao: true, observacoes: true, createdAt: true, updatedAt: true, condominioId: true }

const portalMoradorDefault = {
  ativo: true, permitirLink: true, permitirQrCode: true, token: null, portalSlug: '', bannerIds: [], bannerMeta: {}, comunicadoIds: [], comunicadoMeta: {}, documentoIds: [], documentoMeta: {}, contatos: [],
  funcionalidades: { abrirChamado: true, planoManutencao: true, documentos: true, comunicados: true, vozMorador: true, denuncias: true, reservas: true, iaChat: true, contatosResponsaveis: true, relatoriosManutencao: true, valoresNotasFiscais: false },
  informacoes: { nome: true, endereco: true, responsaveis: true, telefones: true, email: true, manutencoesPrevistas: true, comunicadosRecentes: true },
}

function cleanSlug(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizePortalConfig(config = {}) {
  const portal = config?.portalMorador || {}
  return {
    ...(config || {}),
    portalMorador: {
      ...portalMoradorDefault,
      ...portal,
      ativo: portal.ativo !== false,
      permitirLink: portal.permitirLink !== false,
      permitirQrCode: portal.permitirQrCode !== false,
      portalSlug: cleanSlug(portal.portalSlug || ''),
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      bannerMeta: portal.bannerMeta && typeof portal.bannerMeta === 'object' ? portal.bannerMeta : {},
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      comunicadoMeta: portal.comunicadoMeta && typeof portal.comunicadoMeta === 'object' ? portal.comunicadoMeta : {},
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta && typeof portal.documentoMeta === 'object' ? portal.documentoMeta : {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
      funcionalidades: { ...portalMoradorDefault.funcionalidades, ...(portal.funcionalidades || {}) },
      informacoes: { ...portalMoradorDefault.informacoes, ...(portal.informacoes || {}) },
    },
  }
}

const includeSafe = {
  banners: { where: { ativo: true }, orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
  comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
  documentos: { select: safeDocumentoSelect, orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
  manutencoes: { select: safeManutencaoSelect, where: { status: { not: 'CONCLUIDO' } }, orderBy: [{ dataVencimento: 'asc' }, { createdAt: 'desc' }], take: 60 },
  users: { where: { ativo: true, role: { in: ['ADMIN', 'SINDICO'] } }, select: { id: true, nome: true, role: true, telefone: true, whatsapp: true, email: true }, orderBy: { nome: 'asc' } },
}

async function findCondominioByPortalToken(token) {
  const cleanToken = String(token || '').trim()
  if (UUID_RE.test(cleanToken)) {
    const byId = await prisma.condominio.findUnique({ where: { id: cleanToken }, include: includeSafe }).catch(() => null)
    if (byId) return byId
  }
  const byJson = await prisma.condominio.findFirst({ where: { portalConfig: { path: ['portalMorador', 'token'], equals: cleanToken } }, include: includeSafe }).catch(() => null)
  if (byJson) return byJson
  const condominios = await prisma.condominio.findMany({ include: includeSafe })
  const slug = cleanSlug(cleanToken)
  return condominios.find(item => {
    const portal = normalizePortalConfig(item.portalConfig).portalMorador
    return portal.token === cleanToken || (portal.portalSlug && portal.portalSlug === slug)
  }) || null
}

function apiOrigin(req) { return `${req.protocol}://${req.get('host')}` }
function stableFileUrl(req, value) {
  if (!value) return value
  const raw = String(value)
  if (/^data:image\//i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/uploads/')) return `${apiOrigin(req)}${raw}`
  const key = raw.replace(/^\/+/, '')
  return `${apiOrigin(req)}/api/arquivos/${key}`
}
async function publicFileUrl(req, value) { return stableFileUrl(req, value) }

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}
function portalDocument(documento, portal) {
  const meta = portal.documentoMeta?.[documento.id] || {}
  const tipoAcesso = documentAccessType(meta.tipoAcesso || (documento.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO'))
  const visivelPortal = Boolean((portal.documentoIds || []).includes(documento.id) || meta.visivelPortal)
  return { ...documento, titulo: meta.titulo || documento.nome, categoria: meta.categoria || documento.pasta || 'Geral', publicadoEm: meta.publicadoEm || documento.createdAt, visivelPortal, usarIa: Boolean(meta.usarIa), tipoAcesso, tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo', portalMeta: { titulo: meta.titulo || documento.nome, categoria: meta.categoria || documento.pasta || 'Geral', publicadoEm: meta.publicadoEm || documento.createdAt, visivelPortal, usarIa: Boolean(meta.usarIa), tipoAcesso, tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo' } }
}
function publicContacts(condominio, portal) {
  const configured = (portal.contatos || []).filter(item => item?.ativo !== false)
  const fromUsers = (condominio.users || []).map(user => ({ id: user.id, nome: user.nome, funcao: user.role === 'SINDICO' ? 'Sindico' : user.role === 'ADMIN' ? 'Administracao' : 'Responsavel', telefone: user.telefone || '', whatsapp: user.whatsapp || '', email: user.email || '', ativo: true, ligar: true, usarWhatsApp: Boolean(user.whatsapp || user.telefone) }))
  const all = [...configured, ...fromUsers, ...DEFAULT_EMERGENCY_CONTACTS]
  const seen = new Set()
  return all.filter(item => { const k = String(item.telefone || item.nome || item.id || '').replace(/\D/g, '') || String(item.nome || item.id || '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).sort((a, b) => Number(a.ordem ?? 100) - Number(b.ordem ?? 100))
}
function publicMaintenance(item) {
  const date = item.dataVencimento || item.createdAt
  return { id: item.id, titulo: item.titulo, nome: item.titulo, descricao: item.descricao || item.observacoes || '', tipo: item.tipo, status: item.status, prioridade: item.prioridade, responsavel: item.responsavel || item.empresa || 'Responsável a definir', data: date, dataPrevista: date, dataVencimento: item.dataVencimento, dataConclusao: item.dataConclusao, publicadoEm: item.createdAt }
}

async function buildPayload(condominio, req) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const bannerIds = new Set(portal.bannerIds || [])
  const comunicadoIds = new Set(portal.comunicadoIds || [])
  const allDocumentos = await Promise.all((condominio.documentos || []).map(async item => { const doc = portalDocument(item, portal); const url = await publicFileUrl(req, doc.url); return { ...doc, url, previewUrl: url, downloadUrl: url } }))
  const documentos = allDocumentos.filter(doc => doc.visivelPortal && (doc.acesso === 'PUBLICO' || doc.tipoAcesso === 'MORADOR' || doc.tipoAcesso === 'IA_DO_PORTAL'))
  const documentosIa = allDocumentos.filter(doc => doc.usarIa && ['MORADOR', 'IA_DO_PORTAL'].includes(doc.tipoAcesso))
  const banners = await Promise.all((condominio.banners || []).filter(item => bannerIds.has(item.id)).map(async item => { const imagem = await publicFileUrl(req, item.imagem); return { ...item, imagem, imagemUrl: imagem, descricao: portal.bannerMeta?.[item.id]?.descricao || '' } }))
  const manutencoesPrevistas = portal.funcionalidades?.planoManutencao === false || portal.informacoes?.manutencoesPrevistas === false ? [] : (condominio.manutencoes || []).map(publicMaintenance)
  const logoUrl = await publicFileUrl(req, condominio.logo || null)
  return { condominio: { id: condominio.id, nome: condominio.nome, logoUrl, logo: logoUrl, endereco: condominio.endereco, cidade: condominio.cidade, estado: condominio.estado, telefone: condominio.telefone, email: condominio.email }, config: portal, banners, comunicados: (condominio.comunicados || []).filter(item => comunicadoIds.has(item.id)).map(item => ({ ...item, portalMeta: portal.comunicadoMeta?.[item.id] || {} })), documentos, documentosIa, responsaveis: publicContacts(condominio, portal), manutencoesPrevistas, vozes: [] }
}

function normalizeAiText(value = '') { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function getAiSnippet(text = '', message = '') { const clean = String(text || '').replace(/\s+/g, ' ').trim(); if (!clean) return ''; const words = normalizeAiText(message).split(/[^a-z0-9]+/).filter(w => w.length > 3); const n = normalizeAiText(clean); const pos = words.map(w => n.indexOf(w)).find(i => i >= 0); const start = pos >= 0 ? Math.max(0, pos - 650) : 0; return clean.slice(start, start + 1800) }
function portalAnonymousEmail(condominioId) { return `portal-${condominioId}@tanamao.local` }
async function portalAnonymousUser(condominioId) { const email = portalAnonymousEmail(condominioId); const existing = await prisma.user.findUnique({ where: { email } }); if (existing) return existing; const senha = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 10); return prisma.user.create({ data: { nome: 'Portal do Morador', email, senha, role: 'MORADOR', ativo: true, condominioId } }) }
async function validatePortalFiles(files = []) {
  for (const file of files) {
    const validation = isS3Enabled ? await validateBufferMagicBytes(file.buffer) : await validateFileMagicBytes(file.path)
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
function mimeFromFile(file) {
  if (file.mimetype && file.mimetype.startsWith('image/')) return file.mimetype
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase()
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' })[ext] || 'image/jpeg'
}
async function persistTicketPhoto(file) {
  if (isS3Enabled) {
    const { url } = await uploadFile(file, 'portal-chamados')
    return url
  }
  if (!file.path || !fs.existsSync(file.path)) throw new Error('Arquivo temporario da foto nao encontrado.')
  const stat = fs.statSync(file.path)
  if (stat.size > MAX_DB_IMAGE_BYTES) {
    fs.unlinkSync(file.path)
    const error = new Error('Cada imagem deve ter no maximo 8 MB para ser preservada com seguranca.')
    error.status = 400
    error.code = 'IMAGE_TOO_LARGE'
    throw error
  }
  const buffer = fs.readFileSync(file.path)
  fs.unlinkSync(file.path)
  return `data:${mimeFromFile(file)};base64,${buffer.toString('base64')}`
}

portalPublicSafeRouter.get('/:token', async (req, res, next) => { try { const condominio = await findCondominioByPortalToken(req.params.token); if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' }); const portal = normalizePortalConfig(condominio.portalConfig).portalMorador; if (portal.ativo === false || portal.permitirLink === false) return res.status(403).json({ error: 'Portal indisponivel', code: 'PORTAL_UNAVAILABLE' }); res.json(await buildPayload(condominio, req)) } catch (e) { next(e) } })
portalPublicSafeRouter.post('/:token/ia', async (req, res, next) => { try { const condominio = await findCondominioByPortalToken(req.params.token); if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' }); const portal = normalizePortalConfig(condominio.portalConfig).portalMorador; if (portal.ativo === false || portal.permitirLink === false || portal.funcionalidades?.iaChat === false) return res.status(403).json({ error: 'Assistente indisponivel neste portal', code: 'AI_DISABLED' }); const message = String(req.body?.message || '').trim(); if (!message) return res.status(400).json({ error: 'Mensagem invalida', code: 'VALIDATION_ERROR' }); const docs = await prisma.documento.findMany({ where: { condominioId: condominio.id, acesso: 'PUBLICO', usarComoFonteIA: true, textoExtraido: { not: null } }, select: { id: true, nome: true, pasta: true, categoriaIA: true, textoExtraido: true }, orderBy: { createdAt: 'desc' }, take: 16 }); const fontes = docs.map(doc => { const meta = portal.documentoMeta?.[doc.id] || {}; const tipoAcesso = documentAccessType(meta.tipoAcesso || 'MORADOR'); if (meta.usarIa === false || !['MORADOR', 'IA_DO_PORTAL'].includes(tipoAcesso)) return null; const snippet = getAiSnippet(doc.textoExtraido, message); return snippet ? { nome: meta.titulo || doc.nome, categoria: meta.categoria || doc.pasta || doc.categoriaIA || 'Documento', trecho: snippet } : null }).filter(Boolean).slice(0, 5); if (!fontes.length) return res.json({ resposta: 'Ainda não encontrei um documento público configurado para responder essa dúvida. Procure a administração do condomínio para confirmar essa informação.', fontes: [] }); const resposta = fontes.map(f => `${f.nome}: ${f.trecho}`).join('\n\n').slice(0, 1800); res.json({ resposta, fontes: fontes.map(f => ({ nome: f.nome, categoria: f.categoria })) }) } catch (e) { next(e) } })
portalPublicSafeRouter.post('/:token/chamados', uploadLimiter, multerUpload.array('fotos', 5), async (req, res, next) => {
  try {
    const condominio = await findCondominioByPortalToken(req.params.token)
    if (!condominio) return res.status(404).json({ error: 'Portal nao encontrado', code: 'PORTAL_NOT_FOUND' })
    const portal = normalizePortalConfig(condominio.portalConfig).portalMorador
    if (portal.ativo === false || portal.permitirLink === false || portal.funcionalidades?.abrirChamado === false) return res.status(403).json({ error: 'Abertura de chamados indisponivel neste portal', code: 'PORTAL_TICKET_DISABLED' })
    const { categoria, descricao, local, nome, bloco, apartamento, whatsapp } = req.body
    if (!descricao || !String(descricao).trim()) return res.status(400).json({ error: 'Descricao do chamado e obrigatoria', code: 'VALIDATION_ERROR' })
    const files = req.files || []
    await validatePortalFiles(files)
    const uploads = []
    for (const file of files) uploads.push(await persistTicketPhoto(file))
    const morador = await portalAnonymousUser(condominio.id)
    const dadosMorador = { nome: String(nome || '').trim(), bloco: String(bloco || '').trim(), apartamento: String(apartamento || '').trim(), whatsapp: String(whatsapp || '').trim(), condominioId: condominio.id, condominioNome: condominio.nome }
    const chamado = await prisma.chamado.create({ data: { titulo: `Chamado pelo portal - ${condominio.nome}${local ? ` - ${local}` : ''}`, descricao, categoria: ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(categoria) ? categoria : 'MANUTENCAO', prioridade: 'MEDIA', fotos: uploads, moradorId: morador.id, condominioId: condominio.id, historico: { create: { acao: 'Chamado aberto pelo Portal do Morador', nota: JSON.stringify({ local: local || null, dadosMorador }) } } } })
    res.status(201).json({ id: chamado.id, protocolo: chamado.id.slice(0, 8).toUpperCase(), status: chamado.status, createdAt: chamado.createdAt, mensagem: TICKET_CONFIRMATION_MESSAGE })
  } catch (e) { next(e) }
})
