import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole, generateAccessToken } from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { deleteFile, multerUpload, uploadFile, isS3Enabled, storageKeyFromUrl } from '../lib/storage.js'
import { planoManutencaoBase, getPlanoItem } from '../lib/planoManutencaoBase.js'

export const condominioRouter = Router()
condominioRouter.use(authenticate)

const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_UPLOAD_DIR = path.join('uploads', 'condominiums', 'logos')
const LOGO_ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const portalDefault = {
  ativo: true,
  banners: true,
  comunicados: true,
  documentos: true,
  abrirChamado: true,
  planoManutencao: true,
  vozMorador: true,
  denuncias: true,
  reservas: true,
  iaChat: true,
  contatosResponsaveis: true,
  portalMorador: {
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
  },
}

const unidadesDefault = {
  organizacao: 'BLOCOS_APARTAMENTOS',
  unidades: [],
  moradoresMeta: {},
}

const unidadesUserSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  unidade: true,
  bloco: true,
  telefone: true,
  whatsapp: true,
  ativo: true,
  createdAt: true,
}

function intOrNull(value) {
  if (value === undefined) return undefined
  if (value === '' || value === null) return null
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function randomPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

function normalizePortalConfig(config = {}) {
  const legacy = config || {}
  const portalMorador = legacy.portalMorador || {}
  const funcionalidades = {
    ...portalDefault.portalMorador.funcionalidades,
    ...(portalMorador.funcionalidades || {}),
  }
  ;['banners', 'comunicados', 'documentos', 'vozMorador', 'denuncias', 'reservas', 'iaChat', 'abrirChamado', 'planoManutencao', 'contatosResponsaveis'].forEach(key => {
    if (legacy[key] !== undefined && funcionalidades[key] !== undefined) funcionalidades[key] = Boolean(legacy[key])
  })
  return {
    ...portalDefault,
    ...legacy,
    portalMorador: {
      ...portalDefault.portalMorador,
      ...portalMorador,
      bannerIds: Array.isArray(portalMorador.bannerIds) ? portalMorador.bannerIds : [],
      bannerMeta: portalMorador.bannerMeta && typeof portalMorador.bannerMeta === 'object' ? portalMorador.bannerMeta : {},
      comunicadoIds: Array.isArray(portalMorador.comunicadoIds) ? portalMorador.comunicadoIds : [],
      comunicadoMeta: portalMorador.comunicadoMeta && typeof portalMorador.comunicadoMeta === 'object' ? portalMorador.comunicadoMeta : {},
      documentoIds: Array.isArray(portalMorador.documentoIds) ? portalMorador.documentoIds : [],
      documentoMeta: portalMorador.documentoMeta && typeof portalMorador.documentoMeta === 'object' ? portalMorador.documentoMeta : {},
      contatos: Array.isArray(portalMorador.contatos) ? portalMorador.contatos : [],
      funcionalidades,
      informacoes: {
        ...portalDefault.portalMorador.informacoes,
        ...(portalMorador.informacoes || {}),
      },
    },
  }
}

function ensurePortalToken(config) {
  const next = normalizePortalConfig(config)
  if (!next.portalMorador.token) next.portalMorador.token = crypto.randomBytes(24).toString('base64url')
  return next
}

function portalLink(req, config) {
  const token = config?.portalMorador?.token
  if (!token) return null
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173')
  return `${base.replace(/\/$/, '')}/?portal=${token}`
}

function mergePortalConfig(currentConfig, incomingConfig = {}) {
  const current = normalizePortalConfig(currentConfig)
  const incoming = incomingConfig.portalMorador ? incomingConfig : { portalMorador: incomingConfig }
  const incomingPortal = incoming.portalMorador || {}
  return ensurePortalToken({
    ...current,
    ...incoming,
    portalMorador: {
      ...current.portalMorador,
      ...incomingPortal,
      bannerIds: Array.isArray(incomingPortal.bannerIds) ? incomingPortal.bannerIds : current.portalMorador.bannerIds,
      comunicadoIds: Array.isArray(incomingPortal.comunicadoIds) ? incomingPortal.comunicadoIds : current.portalMorador.comunicadoIds,
      documentoIds: Array.isArray(incomingPortal.documentoIds) ? incomingPortal.documentoIds : current.portalMorador.documentoIds,
      contatos: Array.isArray(incomingPortal.contatos) ? incomingPortal.contatos : current.portalMorador.contatos,
      bannerMeta: {
        ...(current.portalMorador.bannerMeta || {}),
        ...(incomingPortal.bannerMeta || {}),
      },
      comunicadoMeta: {
        ...(current.portalMorador.comunicadoMeta || {}),
        ...(incomingPortal.comunicadoMeta || {}),
      },
      documentoMeta: {
        ...(current.portalMorador.documentoMeta || {}),
        ...(incomingPortal.documentoMeta || {}),
      },
      funcionalidades: {
        ...current.portalMorador.funcionalidades,
        ...(incomingPortal.funcionalidades || {}),
      },
      informacoes: {
        ...current.portalMorador.informacoes,
        ...(incomingPortal.informacoes || {}),
      },
    },
  })
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
  return String(value || '').split(',').map(v => v.trim()).filter(Boolean)
}

function getUnidadesGestao(condominio) {
  const stored = condominio?.portalConfig?.unidadesGestao || {}
  return {
    ...unidadesDefault,
    ...stored,
    unidades: Array.isArray(stored.unidades) ? stored.unidades : [],
    moradoresMeta: stored.moradoresMeta && typeof stored.moradoresMeta === 'object' ? stored.moradoresMeta : {},
  }
}

function withUnidadesGestao(condominio, unidadesGestao) {
  return {
    ...normalizePortalConfig(condominio.portalConfig),
    unidadesGestao,
  }
}

function unidadePayload({ tipo = 'LIVRE', grupo = '', codigo, numero, prefixo = '' }) {
  const cleanCodigo = String(codigo || numero || '').trim()
  if (!cleanCodigo) return null
  return {
    id: crypto.randomUUID(),
    tipo,
    grupo: String(grupo || '').trim(),
    codigo: cleanCodigo,
    numero: String(numero || cleanCodigo).trim(),
    prefixo: String(prefixo || '').trim(),
    ativo: true,
    createdAt: new Date().toISOString(),
  }
}

function mergeUnidades(current, incoming) {
  const byKey = new Map()
  for (const item of [...current, ...incoming]) {
    if (!item?.codigo) continue
    const key = unidadeKey(item)
    if (!byKey.has(key)) byKey.set(key, item)
  }
  return [...byKey.values()].sort((a, b) => `${a.grupo || ''}${a.codigo}`.localeCompare(`${b.grupo || ''}${b.codigo}`, 'pt-BR', { numeric: true }))
}

function generateUnits(body) {
  const tipo = body.tipo || 'BLOCO'
  const prefixo = body.prefixo || ''
  const unidades = []

  if (tipo === 'CASA') {
    const quantidade = Math.max(parseInt(body.quantidade || body.quantidadeCasas || 0, 10), 0)
    for (let i = 1; i <= quantidade; i++) {
      unidades.push(unidadePayload({
        tipo: 'CASA',
        codigo: `${prefixo || 'Casa'} ${String(i).padStart(2, '0')}`,
        numero: String(i).padStart(2, '0'),
        prefixo: prefixo || 'Casa',
      }))
    }
    return unidades.filter(Boolean)
  }

  if (tipo === 'LIVRE') {
    const quantidade = Math.max(parseInt(body.quantidade || 0, 10), 0)
    const start = Math.max(parseInt(body.numeracaoInicial || 1, 10), 1)
    for (let i = 0; i < quantidade; i++) {
      const numero = String(start + i).padStart(2, '0')
      unidades.push(unidadePayload({
        tipo: 'LIVRE',
        codigo: `${prefixo || 'Unidade'} ${numero}`,
        numero,
        prefixo: prefixo || 'Unidade',
      }))
    }
    return unidades.filter(Boolean)
  }

  const grupos = parseList(body.nomes || body.grupos || body.nomeGrupos)
  const quantidadeGrupos = Math.max(parseInt(body.quantidadeGrupos || body.quantidadeBlocos || 0, 10), 0)
  const resolvedGroups = grupos.length
    ? grupos
    : Array.from({ length: quantidadeGrupos || 1 }, (_, i) => tipo === 'TORRE' ? `Torre ${i + 1}` : String.fromCharCode(65 + i))
  const andares = Math.max(parseInt(body.quantidadeAndares || body.andares || 1, 10), 1)
  const porAndar = Math.max(parseInt(body.apartamentosPorAndar || body.unidadesPorAndar || 1, 10), 1)
  const initial = Math.max(parseInt(body.numeracaoInicial || 101, 10), 1)
  const startUnit = initial % 100 || 1

  for (const grupo of resolvedGroups) {
    for (let andar = 1; andar <= andares; andar++) {
      for (let pos = 0; pos < porAndar; pos++) {
        const numero = `${andar}${String(startUnit + pos).padStart(2, '0')}`
        unidades.push(unidadePayload({
          tipo,
          grupo,
          codigo: `${grupo}-${prefixo}${numero}`,
          numero: `${prefixo}${numero}`,
          prefixo,
        }))
      }
    }
  }
  return unidades.filter(Boolean)
}

function serializeUnidadesGestao(condominio) {
  const config = getUnidadesGestao(condominio)
  const moradores = (condominio.users || []).filter(user => user.role === 'MORADOR')
  const unitsByCode = new Map(config.unidades.map(unit => [`${unit.grupo || ''}|${unit.codigo}`, { ...unit }]))

  for (const morador of moradores) {
    if (!morador.unidade) continue
    const key = `${morador.bloco || ''}|${morador.unidade}`
    if (!unitsByCode.has(key)) {
      unitsByCode.set(key, unidadePayload({
        tipo: morador.bloco ? 'BLOCO' : 'LIVRE',
        grupo: morador.bloco || '',
        codigo: morador.unidade,
        numero: morador.unidade,
      }))
    }
  }

  const unidades = [...unitsByCode.values()].map(unit => {
    const moradoresDaUnidade = moradores
      .filter(m => m.unidade === unit.codigo && (m.bloco || '') === (unit.grupo || ''))
      .map(m => ({
        ...m,
        tipoMorador: config.moradoresMeta[m.id]?.tipoMorador || 'MORADOR',
        principal: Boolean(config.moradoresMeta[m.id]?.principal),
      }))
    const principal = moradoresDaUnidade.find(m => m.principal) || moradoresDaUnidade[0] || null
    return {
      ...unit,
      moradores: moradoresDaUnidade,
      moradorPrincipal: principal,
      ocupada: moradoresDaUnidade.some(m => m.ativo),
    }
  }).sort((a, b) => `${a.grupo || ''}${a.codigo}`.localeCompare(`${b.grupo || ''}${b.codigo}`, 'pt-BR', { numeric: true }))

  return {
    organizacao: config.organizacao,
    unidades,
    moradores: moradores.map(m => ({
      ...m,
      tipoMorador: config.moradoresMeta[m.id]?.tipoMorador || 'MORADOR',
      principal: Boolean(config.moradoresMeta[m.id]?.principal),
    })),
    resumo: {
      totalUnidades: unidades.length,
      ocupadas: unidades.filter(u => u.ocupada).length,
      semMorador: unidades.filter(u => !u.ocupada).length,
      responsaveisCadastrados: moradores.length,
    },
  }
}

function unidadeKey(unit) {
  return `${unit?.grupo || ''}|${unit?.codigo || ''}`
}

function moradorUnidadeKey(user) {
  return `${user?.bloco || ''}|${user?.unidade || ''}`
}

function moradorNaUnidade(user, unit) {
  return user?.role === 'MORADOR' && user?.unidade && moradorUnidadeKey(user) === unidadeKey(unit)
}

function moradoresAfetados(users = [], unidadesAlvo = null) {
  const moradores = users.filter(user => user.role === 'MORADOR' && user.unidade)
  if (!unidadesAlvo) return moradores
  const keys = new Set(unidadesAlvo.map(unidadeKey))
  return moradores.filter(user => keys.has(moradorUnidadeKey(user)))
}

function countUnidadesEstrutura(condominio, unidadesAlvo = null) {
  if (unidadesAlvo) return unidadesAlvo.length
  const keys = new Set(getUnidadesGestao(condominio).unidades.map(unidadeKey))
  for (const user of condominio.users || []) {
    if (user.role === 'MORADOR' && user.unidade) keys.add(moradorUnidadeKey(user))
  }
  return keys.size
}

function resolveUnidadesAlvo(config, users = [], body = {}) {
  if (body.apenasVazias) {
    return config.unidades.filter(unit => !users.some(user => moradorNaUnidade(user, unit)))
  }
  if (Array.isArray(body.unidadeIds) && body.unidadeIds.length) {
    const ids = new Set(body.unidadeIds)
    return config.unidades.filter(unit => ids.has(unit.id))
  }
  return null
}

async function impactoUnidades(condominio, unidadesAlvo = null, options = {}) {
  const afetados = moradoresAfetados(condominio.users || [], unidadesAlvo)
  const moradorIds = afetados.map(user => user.id)
  const [chamados, manutencoes] = await Promise.all([
    moradorIds.length
      ? prisma.chamado.count({ where: { condominioId: condominio.id, moradorId: { in: moradorIds } } })
      : 0,
    options.contarManutencoes
      ? prisma.manutencao.count({ where: { condominioId: condominio.id } })
      : 0,
  ])
  const unidadesAfetadas = countUnidadesEstrutura(condominio, unidadesAlvo)
  return {
    unidadesAfetadas,
    moradoresVinculados: afetados.length,
    chamados,
    manutencoes,
    temDependencias: afetados.length > 0 || chamados > 0 || manutencoes > 0,
  }
}

function updateMoradoresMetaAfterUnlink(config, userIds, apagarTudo) {
  for (const userId of userIds) {
    if (apagarTudo) {
      delete config.moradoresMeta[userId]
      continue
    }
    config.moradoresMeta[userId] = {
      ...(config.moradoresMeta[userId] || {}),
      unidadeId: null,
      principal: false,
    }
  }
}

async function aplicarAcaoEstrutura(tx, condominio, config, unidadesAlvo, modo, options = {}) {
  const afetados = moradoresAfetados(condominio.users || [], unidadesAlvo)
  const ids = afetados.map(user => user.id)
  const apagarTudo = modo === 'APAGAR_TUDO'

  if (apagarTudo) {
    if (ids.length) {
      await tx.chamado.deleteMany({ where: { condominioId: condominio.id, moradorId: { in: ids } } })
      await tx.user.updateMany({
        where: { id: { in: ids }, condominioId: condominio.id, role: 'MORADOR' },
        data: { ativo: false, unidade: null, bloco: null },
      })
    }
    if (options.apagarManutencoes) {
      await tx.manutencao.deleteMany({ where: { condominioId: condominio.id } })
    }
  } else if (ids.length) {
    await tx.user.updateMany({
      where: { id: { in: ids }, condominioId: condominio.id, role: 'MORADOR' },
      data: { unidade: null, bloco: null },
    })
  }

  updateMoradoresMetaAfterUnlink(config, ids, apagarTudo)
  return ids
}

function dateOrNull(value) {
  if (value === undefined) return undefined
  if (!value) return null
  return new Date(value)
}

function daysUntil(value) {
  if (!value) return null
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
}

function expirationStatus(value, okLabel = 'ATIVO') {
  const days = daysUntil(value)
  if (days === null) return okLabel
  if (days < 0) return 'ENCERRADO'
  if (days <= 60) return 'PROXIMO_DO_VENCIMENTO'
  return okLabel
}

function insuranceStatus(condominio) {
  if (!condominio.seguroPossui) return 'SEM_SEGURO'
  const status = expirationStatus(condominio.seguroVencimento, 'REGULAR')
  if (status === 'ENCERRADO') return 'VENCIDO'
  return status
}

function serializeCondominio(condominio) {
  if (!condominio) return condominio
  return {
    ...condominio,
    logoUrl: condominio.logo || null,
    portalConfig: normalizePortalConfig(condominio.portalConfig),
    mandatoStatus: expirationStatus(condominio.mandatoFim, 'ATIVO'),
    mandatoDiasRestantes: daysUntil(condominio.mandatoFim),
    seguroStatus: insuranceStatus(condominio),
    seguroDiasRestantes: daysUntil(condominio.seguroVencimento),
  }
}

function condominioData(body) {
  const data = {}
  const strings = [
    'nome', 'cnpj', 'endereco', 'cidade', 'estado', 'cep', 'telefone', 'email',
    'tipoEdificacao', 'seguroSeguradora', 'seguroApolice', 'seguroDocumento',
  ]
  strings.forEach(key => {
    if (body[key] !== undefined) data[key] = body[key] || null
  })
  ;['blocos', 'unidades', 'pavimentos'].forEach(key => {
    const value = intOrNull(body[key])
    if (value !== undefined) data[key] = value
  })
  ;['mandatoInicio', 'mandatoFim', 'seguroInicio', 'seguroVencimento'].forEach(key => {
    const value = dateOrNull(body[key])
    if (value !== undefined) data[key] = value
  })
  if (body.seguroPossui !== undefined) data.seguroPossui = Boolean(body.seguroPossui)
  if (body.ativo !== undefined) data.ativo = Boolean(body.ativo)
  if (body.portalConfig !== undefined) data.portalConfig = normalizePortalConfig(body.portalConfig)
  return data
}

async function findAccessibleCondominio(req, id, include) {
  const where = {
    id,
    OR: [
      { users: { some: { id: req.user.id } } },
      { acessos: { some: { userId: req.user.id } } },
    ],
  }
  return prisma.condominio.findFirst({ where, include })
}

async function ensureAccess(req, res, id, include) {
  const condominio = await findAccessibleCondominio(req, id, include)
  if (!condominio) {
    res.status(404).json({ error: 'Condominio nao encontrado para este usuario', code: 'CONDOMINIO_NOT_FOUND' })
    return null
  }
  return condominio
}

function nextDueDate(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + (days || 30))
  return date
}

function subtractDays(value, days) {
  if (!value) return null
  const date = new Date(value)
  date.setDate(date.getDate() - (days || 0))
  return date
}

function planoResponse(base, item) {
  const dataProximaExecucao = item?.manutencao?.dataVencimento || null
  return {
    ...base,
    selecionado: Boolean(item?.ativo),
    planoId: item?.id || null,
    manutencaoId: item?.manutencaoId || null,
    dataUltimaConclusao: item?.manutencao?.dataConclusao || null,
    dataProximaNotificacao: subtractDays(dataProximaExecucao, base.avisoAntecipado || 15),
    dataProximaExecucao,
  }
}

function isImageUpload(file, validation) {
  const mimeOk = file?.mimetype?.startsWith('image/')
  const detectedOk = !validation.detectedType || validation.detectedType.startsWith('image/')
  return mimeOk && validation.valid && detectedOk
}

function boolValue(value) {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on'
}

function documentFileType(file, fallback = '') {
  const fromFallback = String(fallback || '').trim()
  if (fromFallback) return fromFallback.slice(0, 40)
  const ext = path.extname(file?.originalname || '').slice(1).toUpperCase()
  return { PDF: 'PDF', XLSX: 'Excel', XLS: 'Excel', DOCX: 'Word', DOC: 'Word', PNG: 'Imagem', JPG: 'Imagem', JPEG: 'Imagem', WEBP: 'Imagem' }[ext] || ext || 'Arquivo'
}

function documentAccessType(value) {
  const normalized = String(value || '').toUpperCase()
  if (['APENAS_SINDICO', 'MORADOR', 'IA_INTERNA', 'IA_DO_PORTAL'].includes(normalized)) return normalized
  return 'APENAS_SINDICO'
}

function documentPortalMeta(documento, portal) {
  const meta = portal.documentoMeta?.[documento.id] || {}
  const tipoAcesso = documentAccessType(meta.tipoAcesso || (documento.acesso === 'PUBLICO' ? 'MORADOR' : 'APENAS_SINDICO'))
  const visivelPortal = Boolean(portal.documentoIds.includes(documento.id) || meta.visivelPortal)
  return {
    titulo: meta.titulo || documento.nome,
    categoria: meta.categoria || documento.pasta || 'Geral',
    publicadoEm: meta.publicadoEm || documento.createdAt,
    visivelPortal,
    usarIa: Boolean(meta.usarIa),
    tipoAcesso,
    tipoDocumento: meta.tipoDocumento || documento.tipo || 'Arquivo',
  }
}

function decoratePortalDocument(documento, portal) {
  const meta = documentPortalMeta(documento, portal)
  return {
    ...documento,
    ...meta,
    portalMeta: meta,
  }
}

function sanitizeDocumentMeta(meta = {}, allowedIds = new Set()) {
  return Object.fromEntries(
    Object.entries(meta || {})
      .filter(([id]) => allowedIds.has(id))
      .map(([id, value]) => {
        const item = value && typeof value === 'object' ? value : {}
        return [id, {
          titulo: String(item.titulo || '').trim(),
          categoria: String(item.categoria || 'Geral').trim() || 'Geral',
          publicadoEm: item.publicadoEm || new Date().toISOString(),
          visivelPortal: Boolean(item.visivelPortal),
          usarIa: Boolean(item.usarIa),
          tipoAcesso: documentAccessType(item.tipoAcesso),
          tipoDocumento: String(item.tipoDocumento || 'Arquivo').trim() || 'Arquivo',
        }]
      })
  )
}

function removeTempFile(file) {
  if (!isS3Enabled && file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
}

function isLogoUpload(file, validation) {
  return Boolean(
    file &&
    file.size <= LOGO_MAX_BYTES &&
    LOGO_ALLOWED_MIMES.has(file.mimetype) &&
    validation.valid &&
    validation.detectedType &&
    LOGO_ALLOWED_MIMES.has(validation.detectedType)
  )
}

function logoExtension(file, validation) {
  const fromName = path.extname(file.originalname || '').toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(fromName)) return fromName
  if (validation.detectedType === 'image/png') return '.png'
  if (validation.detectedType === 'image/webp') return '.webp'
  return '.jpg'
}

async function saveLogoFile(file, condominioId, validation) {
  if (isS3Enabled) {
    const { url } = await uploadFile(file, 'condominiums/logos')
    return url
  }

  fs.mkdirSync(LOGO_UPLOAD_DIR, { recursive: true })
  const filename = `${condominioId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${logoExtension(file, validation)}`
  const target = path.join(LOGO_UPLOAD_DIR, filename)
  fs.renameSync(file.path, target)
  return `/uploads/condominiums/logos/${filename}`
}

async function removeStoredLogo(logoUrl) {
  if (!logoUrl) return
  try {
    await deleteFile(storageKeyFromUrl(logoUrl))
  } catch {
    // Removing the file is best-effort; the database state is the source of truth.
  }
}

function sortBySelection(items, selectedIds = [], fallback = []) {
  const selected = new Set(selectedIds)
  return items
    .filter(item => !selectedIds.length || selected.has(item.id))
    .sort((a, b) => {
      if (a.fixado !== b.fixado) return a.fixado ? -1 : 1
      if (a.ordem !== undefined && b.ordem !== undefined) return (a.ordem || 0) - (b.ordem || 0)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
}

function portalConfigResponse(req, condominio) {
  const config = normalizePortalConfig(condominio.portalConfig)
  const portal = config.portalMorador
  const banners = (condominio.banners || []).map(banner => ({
    ...banner,
    descricao: portal.bannerMeta?.[banner.id]?.descricao || '',
    visivelPortal: portal.bannerIds.includes(banner.id),
  }))
  const comunicados = (condominio.comunicados || []).map(comunicado => ({
    ...comunicado,
    portalMeta: portal.comunicadoMeta?.[comunicado.id] || {},
    visivelPortal: portal.comunicadoIds.includes(comunicado.id),
  }))
  const documentos = (condominio.documentos || []).map(documento => decoratePortalDocument(documento, portal))
  return {
    config,
    logoUrl: condominio.logo || null,
    link: portalLink(req, config),
    qrCodeUrl: portal.token
      ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(portalLink(req, config))}`
      : null,
    resumo: {
      ativo: Boolean(portal.ativo),
      bannersConfigurados: banners.filter(b => b.visivelPortal && b.ativo).length,
      documentosVisiveis: documentos.filter(d => d.visivelPortal).length,
      documentosIa: documentos.filter(d => d.usarIa).length,
      comunicadosAtivos: comunicados.filter(c => c.visivelPortal).length,
      funcionalidadesAtivas: Object.values(portal.funcionalidades || {}).filter(Boolean).length,
    },
    banners,
    comunicados,
    documentos,
  }
}

const MAX_CONDOMINIOS_PER_USER = Number.isNaN(parseInt(process.env.MAX_CONDOMINIOS_PER_USER, 10))
  ? 20
  : parseInt(process.env.MAX_CONDOMINIOS_PER_USER, 10)

// GET /api/condominios
condominioRouter.get('/', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const data = await prisma.condominio.findMany({
      where: {
        OR: [
          { users: { some: { id: req.user.id } } },
          { acessos: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        _count: { select: { users: true, manutencoes: true, documentos: true, banners: true, planoManutencao: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(data.map(serializeCondominio))
  } catch (e) { next(e) }
})

// GET /api/condominios/plano/base
condominioRouter.get('/plano/base', requireRole('ADMIN', 'SINDICO'), async (req, res) => {
  res.json(planoManutencaoBase)
})

// POST /api/condominios
condominioRouter.post('/', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const total = await prisma.condominioAcesso.count({ where: { userId: req.user.id } })
    if (total >= MAX_CONDOMINIOS_PER_USER) {
      return res.status(400).json({
        error: `Limite de ${MAX_CONDOMINIOS_PER_USER} edificacoes atingido`,
        code: 'LIMIT_REACHED',
      })
    }

    const payload = condominioData(req.body)
    if (!payload.nome || !payload.endereco) {
      return res.status(400).json({ error: 'Nome e endereco sao obrigatorios', code: 'VALIDATION_ERROR' })
    }

    const condominio = await prisma.$transaction(async tx => {
      const created = await tx.condominio.create({
        data: {
          ...payload,
          portalConfig: payload.portalConfig || portalDefault,
        },
      })
      await tx.condominioAcesso.create({
        data: { userId: req.user.id, condominioId: created.id, role: req.user.role },
      })
      await tx.configWhatsApp.create({
        data: { condominioId: created.id, apiUrl: 'https://api.z-api.io', apiKey: '', instanceId: '', ativo: false },
      })
      return created
    })

    res.status(201).json(serializeCondominio(condominio))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/logo
condominioRouter.post('/:id/logo', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('logo'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) {
      removeTempFile(req.file)
      return
    }

    const file = req.file
    if (!file) return res.status(400).json({ error: 'Logomarca obrigatoria', code: 'VALIDATION_ERROR' })
    if (file.size > LOGO_MAX_BYTES) {
      removeTempFile(file)
      return res.status(400).json({ error: 'Imagem muito pesada. Envie uma logomarca de ate 2MB.', code: 'LOGO_TOO_LARGE' })
    }

    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!isLogoUpload(file, validation)) {
      removeTempFile(file)
      return res.status(400).json({
        error: 'Formato de logomarca invalido. Use PNG, JPG, JPEG ou WEBP.',
        code: 'INVALID_LOGO_TYPE',
      })
    }

    const logoUrl = await saveLogoFile(file, condominio.id, validation)
    if (condominio.logo && condominio.logo !== logoUrl) await removeStoredLogo(condominio.logo)

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { logo: logoUrl },
      include: {
        users: {
          select: { id: true, nome: true, email: true, role: true, unidade: true, bloco: true, telefone: true, whatsapp: true, ativo: true },
          orderBy: [{ role: 'asc' }, { nome: 'asc' }],
        },
        planoManutencao: { where: { ativo: true }, orderBy: { nome: 'asc' } },
        _count: { select: { users: true, manutencoes: true, documentos: true, banners: true, chamados: true } },
      },
    })

    res.json(serializeCondominio(updated))
  } catch (e) {
    removeTempFile(req.file)
    next(e)
  }
})

// DELETE /api/condominios/:id/logo
condominioRouter.delete('/:id/logo', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    if (condominio.logo) await removeStoredLogo(condominio.logo)

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { logo: null },
      include: {
        users: {
          select: { id: true, nome: true, email: true, role: true, unidade: true, bloco: true, telefone: true, whatsapp: true, ativo: true },
          orderBy: [{ role: 'asc' }, { nome: 'asc' }],
        },
        planoManutencao: { where: { ativo: true }, orderBy: { nome: 'asc' } },
        _count: { select: { users: true, manutencoes: true, documentos: true, banners: true, chamados: true } },
      },
    })

    res.json(serializeCondominio(updated))
  } catch (e) { next(e) }
})

// GET /api/condominios/:id
condominioRouter.get('/:id', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, {
      users: {
        select: { id: true, nome: true, email: true, role: true, unidade: true, bloco: true, telefone: true, whatsapp: true, ativo: true },
        orderBy: [{ role: 'asc' }, { nome: 'asc' }],
      },
      planoManutencao: { where: { ativo: true }, orderBy: { nome: 'asc' } },
      _count: { select: { users: true, manutencoes: true, documentos: true, banners: true, chamados: true } },
    })
    if (!condominio) return
    res.json(serializeCondominio(condominio))
  } catch (e) { next(e) }
})

// GET /api/condominios/:id/portal-config
condominioRouter.get('/:id/portal-config', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, {
      banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
      comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
      documentos: { orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
    })
    if (!condominio) return
    res.json(portalConfigResponse(req, condominio))
  } catch (e) { next(e) }
})

// PUT /api/condominios/:id/portal-config
condominioRouter.put('/:id/portal-config', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, {
      banners: { select: { id: true } },
      comunicados: { select: { id: true } },
      documentos: { select: { id: true, acesso: true } },
    })
    if (!condominio) return

    const nextConfig = mergePortalConfig(condominio.portalConfig, req.body.config || req.body)
    const bannerIds = new Set((condominio.banners || []).map(item => item.id))
    const comunicadoIds = new Set((condominio.comunicados || []).map(item => item.id))
    const documentoIds = new Set((condominio.documentos || []).map(item => item.id))
    nextConfig.portalMorador.bannerIds = nextConfig.portalMorador.bannerIds.filter(id => bannerIds.has(id))
    nextConfig.portalMorador.comunicadoIds = nextConfig.portalMorador.comunicadoIds.filter(id => comunicadoIds.has(id))
    nextConfig.portalMorador.documentoIds = nextConfig.portalMorador.documentoIds.filter(id => documentoIds.has(id))
    nextConfig.portalMorador.documentoMeta = sanitizeDocumentMeta(nextConfig.portalMorador.documentoMeta, documentoIds)

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: nextConfig },
      include: {
        banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
        comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
        documentos: { orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
      },
    })
    res.json(portalConfigResponse(req, updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/portal-banners/imagem
condominioRouter.post('/:id/portal-banners/imagem', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('imagem'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Imagem obrigatoria', code: 'VALIDATION_ERROR' })

    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!isImageUpload(file, validation)) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({ error: `Tipo de imagem nao permitido: ${validation.detectedType || file.mimetype}`, code: 'INVALID_FILE_TYPE' })
    }

    const { url } = await uploadFile(file, 'banners')
    res.status(201).json({ url })
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/portal-banners
condominioRouter.post('/:id/portal-banners', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const { titulo, descricao, imagem, link, ordem, ativo } = req.body
    if (!titulo || !imagem) return res.status(400).json({ error: 'Titulo e imagem sao obrigatorios', code: 'VALIDATION_ERROR' })

    const result = await prisma.$transaction(async tx => {
      const item = await tx.banner.create({
        data: { titulo, imagem, link, ordem: ordem || 1, ativo: ativo ?? true, condominioId: condominio.id },
      })
      const config = ensurePortalToken(condominio.portalConfig)
      config.portalMorador.bannerIds = [...new Set([...(config.portalMorador.bannerIds || []), item.id])]
      config.portalMorador.bannerMeta[item.id] = {
        ...(config.portalMorador.bannerMeta[item.id] || {}),
        descricao: descricao || '',
      }
      await tx.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } })
      return item
    })
    res.status(201).json(result)
  } catch (e) { next(e) }
})

// PATCH /api/condominios/:id/portal-banners/:bannerId
condominioRouter.patch('/:id/portal-banners/:bannerId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const existing = await prisma.banner.findFirst({ where: { id: req.params.bannerId, condominioId: condominio.id } })
    if (!existing) return res.status(404).json({ error: 'Banner nao encontrado', code: 'NOT_FOUND' })
    if (req.body.imagem && req.body.imagem !== existing.imagem && existing.imagem?.startsWith('/uploads/')) {
      await deleteFile(storageKeyFromUrl(existing.imagem))
    }

    const allowed = {}
    ;['titulo', 'imagem', 'link'].forEach(key => {
      if (req.body[key] !== undefined) allowed[key] = req.body[key] || null
    })
    if (req.body.ordem !== undefined) allowed.ordem = parseInt(req.body.ordem, 10) || 1
    if (req.body.ativo !== undefined) allowed.ativo = Boolean(req.body.ativo)

    const updated = await prisma.$transaction(async tx => {
      const item = Object.keys(allowed).length
        ? await tx.banner.update({ where: { id: existing.id }, data: allowed })
        : existing
      if (req.body.descricao !== undefined) {
        const config = ensurePortalToken(condominio.portalConfig)
        config.portalMorador.bannerMeta[item.id] = {
          ...(config.portalMorador.bannerMeta[item.id] || {}),
          descricao: req.body.descricao || '',
        }
        await tx.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } })
      }
      return item
    })
    res.json(updated)
  } catch (e) { next(e) }
})

// DELETE /api/condominios/:id/portal-banners/:bannerId
condominioRouter.delete('/:id/portal-banners/:bannerId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const item = await prisma.banner.findFirst({ where: { id: req.params.bannerId, condominioId: condominio.id } })
    if (!item) return res.status(404).json({ error: 'Banner nao encontrado', code: 'NOT_FOUND' })
    if (item.imagem?.startsWith('/uploads/')) await deleteFile(storageKeyFromUrl(item.imagem))
    const config = ensurePortalToken(condominio.portalConfig)
    config.portalMorador.bannerIds = config.portalMorador.bannerIds.filter(id => id !== item.id)
    delete config.portalMorador.bannerMeta[item.id]
    await prisma.$transaction([
      prisma.banner.delete({ where: { id: item.id } }),
      prisma.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } }),
    ])
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/portal-documentos
condominioRouter.post('/:id/portal-documentos', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('arquivo'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) {
      removeTempFile(req.file)
      return
    }

    const file = req.file
    if (!file) return res.status(400).json({ error: 'Arquivo obrigatorio', code: 'VALIDATION_ERROR' })

    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!validation.valid) {
      removeTempFile(file)
      return res.status(400).json({ error: `Tipo de arquivo nao permitido: ${validation.detectedType || file.mimetype}`, code: 'INVALID_FILE_TYPE' })
    }

    const titulo = String(req.body.titulo || req.body.nome || file.originalname).trim()
    const categoria = String(req.body.categoria || 'Geral').trim() || 'Geral'
    const visivelPortal = boolValue(req.body.visivelPortal)
    const usarIa = boolValue(req.body.usarIa)
    let tipoAcesso = documentAccessType(req.body.tipoAcesso || (visivelPortal ? 'MORADOR' : 'APENAS_SINDICO'))
    if (visivelPortal && tipoAcesso === 'APENAS_SINDICO') tipoAcesso = 'MORADOR'
    const tipoDocumento = documentFileType(file, req.body.tipoDocumento)
    const publicadoEm = req.body.publicadoEm || new Date().toISOString()
    const { url } = await uploadFile(file, 'portal-docs')

    await prisma.$transaction(async tx => {
      const documento = await tx.documento.create({
        data: {
          nome: titulo,
          pasta: categoria,
          tipo: tipoDocumento,
          acesso: visivelPortal ? 'PUBLICO' : 'PRIVADO',
          descricao: req.body.descricao || 'Documento configurado no Portal do Morador',
          url,
          tamanho: file.size,
          condominioId: condominio.id,
        },
      })
      const config = ensurePortalToken(condominio.portalConfig)
      if (visivelPortal) config.portalMorador.documentoIds = [...new Set([...(config.portalMorador.documentoIds || []), documento.id])]
      config.portalMorador.documentoMeta[documento.id] = {
        titulo,
        categoria,
        publicadoEm,
        visivelPortal,
        usarIa,
        tipoAcesso,
        tipoDocumento,
      }
      await tx.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } })
    })

    const updated = await prisma.condominio.findUnique({
      where: { id: condominio.id },
      include: {
        banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
        comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
        documentos: { orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
      },
    })
    res.status(201).json(portalConfigResponse(req, updated))
  } catch (e) {
    removeTempFile(req.file)
    next(e)
  }
})

// PATCH /api/condominios/:id/portal-documentos/:documentoId
condominioRouter.patch('/:id/portal-documentos/:documentoId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const documento = await prisma.documento.findFirst({ where: { id: req.params.documentoId, condominioId: condominio.id } })
    if (!documento) return res.status(404).json({ error: 'Documento nao encontrado nesta edificacao', code: 'NOT_FOUND' })

    const config = ensurePortalToken(condominio.portalConfig)
    const current = documentPortalMeta(documento, config.portalMorador)
    const visivelPortal = req.body.visivelPortal !== undefined ? boolValue(req.body.visivelPortal) : current.visivelPortal
    const usarIa = req.body.usarIa !== undefined ? boolValue(req.body.usarIa) : current.usarIa
    let tipoAcesso = documentAccessType(req.body.tipoAcesso || current.tipoAcesso)
    if (visivelPortal && tipoAcesso === 'APENAS_SINDICO') tipoAcesso = 'MORADOR'
    const titulo = String(req.body.titulo ?? current.titulo ?? documento.nome).trim()
    const categoria = String(req.body.categoria ?? current.categoria ?? documento.pasta ?? 'Geral').trim() || 'Geral'
    const tipoDocumento = String(req.body.tipoDocumento ?? current.tipoDocumento ?? documento.tipo ?? 'Arquivo').trim() || 'Arquivo'
    const publicadoEm = req.body.publicadoEm || current.publicadoEm || documento.createdAt?.toISOString?.() || new Date().toISOString()

    config.portalMorador.documentoIds = visivelPortal
      ? [...new Set([...(config.portalMorador.documentoIds || []), documento.id])]
      : (config.portalMorador.documentoIds || []).filter(id => id !== documento.id)
    config.portalMorador.documentoMeta[documento.id] = {
      titulo,
      categoria,
      publicadoEm,
      visivelPortal,
      usarIa,
      tipoAcesso,
      tipoDocumento,
    }

    await prisma.$transaction([
      prisma.documento.update({
        where: { id: documento.id },
        data: {
          nome: titulo,
          pasta: categoria,
          tipo: tipoDocumento,
          acesso: visivelPortal ? 'PUBLICO' : 'PRIVADO',
        },
      }),
      prisma.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } }),
    ])

    const updated = await prisma.condominio.findUnique({
      where: { id: condominio.id },
      include: {
        banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
        comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
        documentos: { orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
      },
    })
    res.json(portalConfigResponse(req, updated))
  } catch (e) { next(e) }
})

// DELETE /api/condominios/:id/portal-documentos/:documentoId
condominioRouter.delete('/:id/portal-documentos/:documentoId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const documento = await prisma.documento.findFirst({ where: { id: req.params.documentoId, condominioId: condominio.id } })
    if (!documento) return res.status(404).json({ error: 'Documento nao encontrado nesta edificacao', code: 'NOT_FOUND' })

    const config = ensurePortalToken(condominio.portalConfig)
    config.portalMorador.documentoIds = (config.portalMorador.documentoIds || []).filter(id => id !== documento.id)
    delete config.portalMorador.documentoMeta[documento.id]
    if (documento.url) await deleteFile(storageKeyFromUrl(documento.url))

    await prisma.$transaction([
      prisma.documento.delete({ where: { id: documento.id } }),
      prisma.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } }),
    ])

    const updated = await prisma.condominio.findUnique({
      where: { id: condominio.id },
      include: {
        banners: { orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }] },
        comunicados: { orderBy: [{ fixado: 'desc' }, { createdAt: 'desc' }] },
        documentos: { orderBy: [{ pasta: 'asc' }, { nome: 'asc' }] },
      },
    })
    res.json(portalConfigResponse(req, updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/portal-comunicados
condominioRouter.post('/:id/portal-comunicados', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const { titulo, conteudo, emoji, fixado, agendadoPara } = req.body
    if (!titulo || !conteudo) return res.status(400).json({ error: 'Titulo e conteudo sao obrigatorios', code: 'VALIDATION_ERROR' })
    const item = await prisma.$transaction(async tx => {
      const comunicado = await tx.comunicado.create({
        data: { titulo, conteudo, emoji, fixado: Boolean(fixado), condominioId: condominio.id },
      })
      const config = ensurePortalToken(condominio.portalConfig)
      config.portalMorador.comunicadoIds = [...new Set([...(config.portalMorador.comunicadoIds || []), comunicado.id])]
      config.portalMorador.comunicadoMeta[comunicado.id] = {
        fixado: Boolean(fixado),
        agendadoPara: agendadoPara || null,
      }
      await tx.condominio.update({ where: { id: condominio.id }, data: { portalConfig: config } })
      return comunicado
    })
    res.status(201).json(item)
  } catch (e) { next(e) }
})

// PATCH /api/condominios/:id
condominioRouter.patch('/:id', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const current = await ensureAccess(req, res, req.params.id)
    if (!current) return
    const item = await prisma.condominio.update({
      where: { id: req.params.id },
      data: condominioData(req.body),
    })
    res.json(serializeCondominio(item))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/selecionar
condominioRouter.post('/:id/selecionar', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { condominio: { select: { id: true, nome: true } } },
    })
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuario inativo', code: 'AUTH_USER_INACTIVE' })
    const token = generateAccessToken(user, condominio.id)
    const { senha: _, ...safe } = user
    safe.condominioId = condominio.id
    safe.condominio = { id: condominio.id, nome: condominio.nome }
    res.json({ token, user: safe, condominio: serializeCondominio(condominio) })
  } catch (e) { next(e) }
})

// GET /api/condominios/:id/plano-manutencao
condominioRouter.get('/:id/plano-manutencao', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const selecionados = await prisma.planoManutencaoItem.findMany({
      where: { condominioId: req.params.id },
      include: {
        manutencao: {
          select: { id: true, dataConclusao: true, dataVencimento: true },
        },
      },
    })
    const porCodigo = new Map(selecionados.map(item => [item.codigo, item]))
    res.json(planoManutencaoBase.map(base => planoResponse(base, porCodigo.get(base.codigo))))
  } catch (e) { next(e) }
})

// PUT /api/condominios/:id/plano-manutencao
condominioRouter.put('/:id/plano-manutencao', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const codigos = Array.isArray(req.body.codigos) ? [...new Set(req.body.codigos)] : []
    const invalidos = codigos.filter(codigo => !getPlanoItem(codigo))
    if (invalidos.length) {
      return res.status(400).json({ error: `Itens invalidos: ${invalidos.join(', ')}`, code: 'VALIDATION_ERROR' })
    }

    const result = await prisma.$transaction(async tx => {
      const existentes = await tx.planoManutencaoItem.findMany({
        where: { condominioId: condominio.id },
        include: { manutencao: { select: { id: true, status: true } } },
      })
      const porCodigo = new Map(existentes.map(item => [item.codigo, item]))
      const desmarcados = existentes.filter(item => item.ativo && !codigos.includes(item.codigo))

      await tx.planoManutencaoItem.updateMany({
        where: { condominioId: condominio.id, codigo: { notIn: codigos } },
        data: { ativo: false, manutencaoId: null },
      })

      const manutencoesPendentesDesmarcadas = desmarcados
        .filter(item => item.manutencaoId && item.manutencao?.status !== 'CONCLUIDO')
        .map(item => item.manutencaoId)
      if (manutencoesPendentesDesmarcadas.length) {
        await tx.manutencao.deleteMany({
          where: { id: { in: manutencoesPendentesDesmarcadas }, condominioId: condominio.id },
        })
      }

      const salvos = []

      for (const codigo of codigos) {
        const base = getPlanoItem(codigo)
        const atual = porCodigo.get(codigo)
        let manutencaoId = atual?.manutencaoId && atual?.manutencao ? atual.manutencaoId : null
        if (!manutencaoId) {
          const manutencao = await tx.manutencao.create({
            data: {
              titulo: base.nome,
              descricao: `${base.atividade}\n\nCriada pelo plano de manutencao da edificacao. Frequencia recomendada: ${base.frequencia}. Referencia: ${base.referenciaLegal || 'Nao informada'}.`,
              tipo: 'PREVENTIVA',
              status: 'PENDENTE',
              prioridade: base.prioridade,
              responsavel: base.responsavelSugerido || null,
              dataVencimento: nextDueDate(base.dias),
              checklist: [
                { item: base.atividade, feito: false },
                { item: 'Anexar comprovantes, fotos ou laudo quando aplicavel', feito: false },
              ],
              fotos: [],
              condominioId: condominio.id,
            },
          })
          manutencaoId = manutencao.id
        }

        const data = {
          nome: base.nome,
          categoria: base.categoria,
          frequencia: base.frequencia,
          periodicidade: base.periodicidade,
          referenciaLegal: base.referenciaLegal,
          prioridade: base.prioridade,
          ativo: true,
          manutencaoId,
        }

        const salvo = atual
          ? await tx.planoManutencaoItem.update({ where: { id: atual.id }, data })
          : await tx.planoManutencaoItem.create({ data: { ...data, codigo, condominioId: condominio.id } })

        salvos.push(salvo)
      }

      return salvos
    })

    res.json({ ok: true, total: result.length, data: result })
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/usuarios
condominioRouter.post('/:id/usuarios', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const { nome, email, senha, role, unidade, bloco, telefone, whatsapp } = req.body
    if (!nome || !email) return res.status(400).json({ error: 'Nome e email sao obrigatorios', code: 'VALIDATION_ERROR' })
    const hash = await bcrypt.hash(senha || randomPassword(), 10)
    const user = await prisma.user.create({
      data: { nome, email, senha: hash, role: role || 'MORADOR', unidade, bloco, telefone, whatsapp, condominioId: condominio.id },
    })
    if (['ADMIN', 'SINDICO'].includes(user.role)) {
      await prisma.condominioAcesso.create({
        data: { userId: user.id, condominioId: condominio.id, role: user.role },
      })
    }
    const { senha: _, ...safe } = user
    res.status(201).json(safe)
  } catch (e) { next(e) }
})

// GET /api/condominios/:id/unidades-gestao
condominioRouter.get('/:id/unidades-gestao', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, {
      users: {
        select: unidadesUserSelect,
        orderBy: [{ bloco: 'asc' }, { unidade: 'asc' }, { nome: 'asc' }],
      },
    })
    if (!condominio) return
    res.json(serializeUnidadesGestao(condominio))
  } catch (e) { next(e) }
})

// PUT /api/condominios/:id/unidades-gestao
condominioRouter.put('/:id/unidades-gestao', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const config = getUnidadesGestao(condominio)
    if (req.body.organizacao) config.organizacao = req.body.organizacao
    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: withUnidadesGestao(condominio, config) },
      include: {
        users: {
          select: unidadesUserSelect,
        },
      },
    })
    res.json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/unidades-gestao/unidades
condominioRouter.post('/:id/unidades-gestao/unidades', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const config = getUnidadesGestao(condominio)
    const unidade = unidadePayload(req.body)
    if (!unidade) return res.status(400).json({ error: 'Unidade obrigatoria', code: 'VALIDATION_ERROR' })
    config.unidades = mergeUnidades(config.unidades, [unidade])
    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: withUnidadesGestao(condominio, config) },
      include: {
        users: {
          select: unidadesUserSelect,
        },
      },
    })
    res.status(201).json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/unidades-gestao/gerar
condominioRouter.post('/:id/unidades-gestao/gerar', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const config = getUnidadesGestao(condominio)
    const unidades = generateUnits(req.body)
    if (!unidades.length) return res.status(400).json({ error: 'Nenhuma unidade gerada', code: 'VALIDATION_ERROR' })
    config.organizacao = req.body.organizacao || config.organizacao
    config.unidades = mergeUnidades(config.unidades, unidades)
    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: withUnidadesGestao(condominio, config) },
      include: {
        users: {
          select: unidadesUserSelect,
        },
      },
    })
    res.status(201).json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/unidades-gestao/impacto
condominioRouter.post('/:id/unidades-gestao/impacto', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const config = getUnidadesGestao(condominio)
    const unidadesAlvo = resolveUnidadesAlvo(config, condominio.users, req.body)
    const impacto = await impactoUnidades(condominio, unidadesAlvo, { contarManutencoes: !req.body.apenasVazias })
    res.json({
      ...impacto,
      unidadesAlvo: unidadesAlvo ? unidadesAlvo.map(unit => ({ id: unit.id, codigo: unit.codigo, grupo: unit.grupo || '' })) : null,
    })
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/unidades-gestao/limpar
condominioRouter.post('/:id/unidades-gestao/limpar', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const modo = req.body.modo || 'MANTER_MORADORES_SEM_UNIDADE'
    if (!['APAGAR_TUDO', 'MANTER_MORADORES_SEM_UNIDADE'].includes(modo)) {
      return res.status(400).json({ error: 'Modo de limpeza invalido', code: 'VALIDATION_ERROR' })
    }

    const updated = await prisma.$transaction(async tx => {
      const config = getUnidadesGestao(condominio)
      const unidadesAlvo = resolveUnidadesAlvo(config, condominio.users, req.body)
      const idsAlvo = unidadesAlvo ? new Set(unidadesAlvo.map(unit => unit.id)) : null

      if (!req.body.apenasVazias) {
        await aplicarAcaoEstrutura(tx, condominio, config, unidadesAlvo, modo, { apagarManutencoes: modo === 'APAGAR_TUDO' })
      }

      config.unidades = idsAlvo
        ? config.unidades.filter(unit => !idsAlvo.has(unit.id))
        : []

      return tx.condominio.update({
        where: { id: condominio.id },
        data: { portalConfig: withUnidadesGestao(condominio, config) },
        include: { users: { select: unidadesUserSelect } },
      })
    })
    res.json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// PATCH /api/condominios/:id/unidades-gestao/unidades/:unidadeId
condominioRouter.patch('/:id/unidades-gestao/unidades/:unidadeId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const config = getUnidadesGestao(condominio)
    const index = config.unidades.findIndex(unit => unit.id === req.params.unidadeId)
    if (index < 0) return res.status(404).json({ error: 'Unidade nao encontrada', code: 'NOT_FOUND' })

    const current = config.unidades[index]
    const payload = unidadePayload({
      ...current,
      ...req.body,
      codigo: req.body.codigo ?? current.codigo,
      numero: req.body.numero ?? req.body.codigo ?? current.numero,
    })
    if (!payload) return res.status(400).json({ error: 'Unidade obrigatoria', code: 'VALIDATION_ERROR' })

    const nextUnit = {
      ...current,
      ...payload,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    }
    const duplicate = config.unidades.find((unit, i) => i !== index && unidadeKey(unit) === unidadeKey(nextUnit))
    if (duplicate) return res.status(409).json({ error: 'Ja existe uma unidade com este numero neste bloco/torre', code: 'DUPLICATE_UNIT' })

    const afetados = moradoresAfetados(condominio.users || [], [current])
    const updated = await prisma.$transaction(async tx => {
      if (afetados.length) {
        await tx.user.updateMany({
          where: { id: { in: afetados.map(user => user.id) }, condominioId: condominio.id, role: 'MORADOR' },
          data: { unidade: nextUnit.codigo, bloco: nextUnit.grupo || null },
        })
      }
      for (const user of afetados) {
        config.moradoresMeta[user.id] = {
          ...(config.moradoresMeta[user.id] || {}),
          unidadeId: nextUnit.id,
        }
      }
      config.unidades[index] = nextUnit
      return tx.condominio.update({
        where: { id: condominio.id },
        data: { portalConfig: withUnidadesGestao(condominio, config) },
        include: { users: { select: unidadesUserSelect } },
      })
    })

    res.json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/unidades-gestao/reconfigurar
condominioRouter.post('/:id/unidades-gestao/reconfigurar', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const unidades = generateUnits(req.body)
    if (!unidades.length) return res.status(400).json({ error: 'Nenhuma unidade gerada', code: 'VALIDATION_ERROR' })

    const modo = req.body.modo
    const impacto = await impactoUnidades(condominio, null, { contarManutencoes: true })
    if (impacto.temDependencias && !['APAGAR_TUDO', 'MANTER_MORADORES_SEM_UNIDADE'].includes(modo)) {
      return res.status(409).json({
        error: 'A estrutura atual possui vinculos. Escolha apagar tudo, manter moradores sem unidade ou cancelar.',
        code: 'STRUCTURE_HAS_DEPENDENCIES',
        impacto,
      })
    }

    const updated = await prisma.$transaction(async tx => {
      const config = getUnidadesGestao(condominio)
      if (modo) {
        await aplicarAcaoEstrutura(tx, condominio, config, null, modo, { apagarManutencoes: modo === 'APAGAR_TUDO' })
      }
      config.organizacao = req.body.organizacao || config.organizacao
      config.unidades = mergeUnidades([], unidades)
      return tx.condominio.update({
        where: { id: condominio.id },
        data: { portalConfig: withUnidadesGestao(condominio, config) },
        include: { users: { select: unidadesUserSelect } },
      })
    })

    res.status(201).json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/unidades-gestao/moradores
condominioRouter.post('/:id/unidades-gestao/moradores', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const { nome, email, telefone, whatsapp, unidadeId, unidadeCodigo, grupo, tipoMorador, principal = false, ativo = true } = req.body
    if (!nome || !email) return res.status(400).json({ error: 'Nome e email sao obrigatorios', code: 'VALIDATION_ERROR' })
    const config = getUnidadesGestao(condominio)
    let unidade = config.unidades.find(u => u.id === unidadeId || (u.codigo === unidadeCodigo && (u.grupo || '') === (grupo || u.grupo || '')))
    if (!unidade && unidadeCodigo) {
      unidade = unidadePayload({ tipo: grupo ? 'BLOCO' : 'LIVRE', grupo, codigo: unidadeCodigo, numero: unidadeCodigo })
      config.unidades = mergeUnidades(config.unidades, [unidade])
    }
    if (!unidade) return res.status(400).json({ error: 'Unidade obrigatoria', code: 'VALIDATION_ERROR' })

    const hash = await bcrypt.hash(randomPassword(), 10)
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hash,
        role: 'MORADOR',
        unidade: unidade.codigo,
        bloco: unidade.grupo || null,
        telefone,
        whatsapp,
        ativo: Boolean(ativo),
        condominioId: condominio.id,
      },
    })

    if (principal) {
      for (const morador of condominio.users.filter(u => u.unidade === unidade.codigo && (u.bloco || '') === (unidade.grupo || ''))) {
        if (config.moradoresMeta[morador.id]) config.moradoresMeta[morador.id].principal = false
      }
    }
    config.moradoresMeta[user.id] = {
      tipoMorador: tipoMorador || 'MORADOR',
      principal: Boolean(principal),
      unidadeId: unidade.id,
    }

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: withUnidadesGestao(condominio, config) },
      include: {
        users: {
          select: unidadesUserSelect,
        },
      },
    })
    res.status(201).json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// PATCH /api/condominios/:id/unidades-gestao/moradores/:userId
condominioRouter.patch('/:id/unidades-gestao/moradores/:userId', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id, { users: { select: unidadesUserSelect } })
    if (!condominio) return
    const existing = condominio.users.find(u => u.id === req.params.userId && u.role === 'MORADOR')
    if (!existing) return res.status(404).json({ error: 'Morador nao encontrado', code: 'NOT_FOUND' })
    const config = getUnidadesGestao(condominio)
    const update = {}
    ;['nome', 'email', 'telefone', 'whatsapp'].forEach(key => {
      if (req.body[key] !== undefined) update[key] = req.body[key]
    })
    if (req.body.ativo !== undefined) update.ativo = Boolean(req.body.ativo)
    if (Object.keys(update).length) await prisma.user.update({ where: { id: existing.id }, data: update })

    if (!config.moradoresMeta[existing.id]) config.moradoresMeta[existing.id] = {}
    if (req.body.tipoMorador) config.moradoresMeta[existing.id].tipoMorador = req.body.tipoMorador
    if (req.body.principal !== undefined) {
      if (req.body.principal) {
        for (const morador of condominio.users.filter(u => u.unidade === existing.unidade && (u.bloco || '') === (existing.bloco || ''))) {
          if (config.moradoresMeta[morador.id]) config.moradoresMeta[morador.id].principal = false
        }
      }
      config.moradoresMeta[existing.id].principal = Boolean(req.body.principal)
    }

    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { portalConfig: withUnidadesGestao(condominio, config) },
      include: {
        users: {
          select: unidadesUserSelect,
        },
      },
    })
    res.json(serializeUnidadesGestao(updated))
  } catch (e) { next(e) }
})

// POST /api/condominios/:id/seguro-documento
condominioRouter.post('/:id/seguro-documento', requireRole('ADMIN', 'SINDICO'), uploadLimiter, multerUpload.single('documento'), async (req, res, next) => {
  try {
    const condominio = await ensureAccess(req, res, req.params.id)
    if (!condominio) return
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Documento obrigatorio', code: 'VALIDATION_ERROR' })

    const validation = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)

    if (!validation.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({ error: `Tipo de arquivo nao permitido: ${validation.detectedType}`, code: 'INVALID_FILE_TYPE' })
    }

    const { url } = await uploadFile(file, 'seguros')
    const updated = await prisma.condominio.update({
      where: { id: condominio.id },
      data: { seguroDocumento: url },
    })
    res.json(serializeCondominio(updated))
  } catch (e) { next(e) }
})
