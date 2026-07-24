// src/routes/chamado.js — chamados, anexos e preservação de fotos
import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { enviarWhatsApp } from './whatsapp.js'
import { criarNotificacao } from './notificacao.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { buildCondominioWhere, buildDateRange, resolveCondominioScope } from '../lib/tenantScope.js'

export const chamadoRouter = Router()
chamadoRouter.use(authenticate)

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' })[ext] || 'image/jpeg'
}

function localUploadPath(value) {
  const raw = String(value || '')
  if (!raw.startsWith('/uploads/') && !raw.startsWith('uploads/')) return null
  return path.resolve(process.cwd(), raw.replace(/^\/+/, ''))
}

async function preserveLegacyPhotos(item) {
  if (!item || !Array.isArray(item.fotos)) return { item, preserved: 0, missing: 0 }
  let changed = false
  let preserved = 0
  let missing = 0
  const nextFotos = item.fotos.map(value => {
    const localPath = localUploadPath(value)
    if (!localPath) return value
    if (!fs.existsSync(localPath)) {
      missing += 1
      return value
    }
    try {
      const buffer = fs.readFileSync(localPath)
      changed = true
      preserved += 1
      return `data:${mimeFromPath(localPath)};base64,${buffer.toString('base64')}`
    } catch {
      missing += 1
      return value
    }
  })
  if (changed) await prisma.chamado.update({ where: { id: item.id }, data: { fotos: nextFotos } })
  return { item: changed ? { ...item, fotos: nextFotos } : item, preserved, missing }
}

chamadoRouter.post('/preservar-fotos', async (req, res, next) => {
  try {
    const scope = await resolveCondominioScope(req.user, 'all')
    const where = { ...buildCondominioWhere(scope.condominioIds) }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    const chamados = await prisma.chamado.findMany({ where, select: { id: true, fotos: true } })
    let preserved = 0
    let missing = 0
    let affectedTickets = 0
    for (const chamado of chamados) {
      if (!Array.isArray(chamado.fotos) || !chamado.fotos.some(value => localUploadPath(value))) continue
      const result = await preserveLegacyPhotos(chamado)
      preserved += result.preserved
      missing += result.missing
      if (result.preserved) affectedTickets += 1
    }
    res.json({ checkedTickets: chamados.length, affectedTickets, preserved, missing })
  } catch (e) { next(e) }
})

chamadoRouter.get('/', async (req, res, next) => {
  try {
    const { status, categoria } = req.query
    const { page, limit, skip } = parsePagination(req.query)
    const selected = req.query.edificacaoId || req.query.condominioId || 'all'
    const scope = await resolveCondominioScope(req.user, selected)
    const where = {
      ...buildCondominioWhere(scope.condominioIds),
      ...buildDateRange('createdAt', req.query.de || req.query.dataInicial, req.query.ate || req.query.dataFinal),
    }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    if (status && status !== 'all') where.status = status
    if (categoria && categoria !== 'all') where.categoria = categoria

    const [rawData, total] = await Promise.all([
      prisma.chamado.findMany({
        where,
        include: {
          morador: { select: { id: true, nome: true, unidade: true, bloco: true } },
          responsavel: { select: { id: true, nome: true } },
          condominio: { select: { id: true, nome: true } },
          historico: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.chamado.count({ where }),
    ])
    const migrated = await Promise.all(rawData.map(preserveLegacyPhotos))
    const data = migrated.map(result => result.item)
    res.json({
      ...paginatedResponse({ data, total, page, limit }),
      photoAudit: {
        preserved: migrated.reduce((sum, result) => sum + result.preserved, 0),
        missing: migrated.reduce((sum, result) => sum + result.missing, 0),
      },
      filters: {
        condominios: scope.condominios,
        selectedCondominioId: scope.selectedCondominioId,
        categoria: categoria || 'all',
        status: status || 'all',
        de: req.query.de || req.query.dataInicial || '',
        ate: req.query.ate || req.query.dataFinal || '',
      },
    })
  } catch (e) { next(e) }
})

chamadoRouter.get('/:id', async (req, res, next) => {
  try {
    const scope = await resolveCondominioScope(req.user, 'all')
    const where = { id: req.params.id, ...buildCondominioWhere(scope.condominioIds) }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    const found = await prisma.chamado.findFirst({
      where,
      include: {
        morador: { select: { id: true, nome: true, unidade: true, bloco: true, whatsapp: true } },
        responsavel: { select: { id: true, nome: true } },
        condominio: { select: { id: true, nome: true } },
        historico: { orderBy: { createdAt: 'asc' } },
      }
    })
    if (!found) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })
    const result = await preserveLegacyPhotos(found)
    res.json(result.item)
  } catch (e) { next(e) }
})

chamadoRouter.post('/', async (req, res, next) => {
  try {
    const { titulo, descricao, categoria, prioridade, fotos } = req.body
    const item = await prisma.chamado.create({
      data: { titulo, descricao, categoria, prioridade: prioridade || 'MEDIA', fotos: fotos || [], moradorId: req.user.id, condominioId: req.user.condominioId },
      include: { morador: { select: { nome: true, whatsapp: true } } }
    })
    await prisma.historicoChamado.create({ data: { chamadoId: item.id, acao: 'Chamado aberto pelo morador' } })

    const admins = await prisma.user.findMany({ where: { condominioId: req.user.condominioId, role: { in: ['ADMIN', 'SINDICO'] }, ativo: true } })
    const config = await prisma.configWhatsApp.findUnique({ where: { condominioId: req.user.condominioId } })
    for (const admin of admins) {
      await criarNotificacao({ condominioId: req.user.condominioId, userId: admin.id, tipo: 'CHAMADO_ABERTO', titulo: 'Novo chamado aberto', mensagem: `${item.morador?.nome}: ${titulo}`, link: '/chamados' })
      if (admin.whatsapp && config?.notifChamadoAberto) {
        await enviarWhatsApp({ condominioId: req.user.condominioId, numero: admin.whatsapp, mensagem: `🔔 *Novo Chamado — ${categoria}*\n\n*${titulo}*\nMorador: ${item.morador?.nome}` })
      }
    }
    res.status(201).json(item)
  } catch (e) { next(e) }
})

chamadoRouter.patch('/:id', async (req, res, next) => {
  try {
    const scope = await resolveCondominioScope(req.user, 'all')
    const where = { id: req.params.id, ...buildCondominioWhere(scope.condominioIds) }
    if (req.user.role === 'MORADOR') where.moradorId = req.user.id
    const existing = await prisma.chamado.findFirst({ where })
    if (!existing) return res.status(404).json({ error: 'Não encontrado', code: 'NOT_FOUND' })

    const { status, resposta, responsavelId, nota } = req.body
    const data = {}
    if (status) data.status = status
    if (resposta) data.resposta = resposta
    if (responsavelId) data.responsavelId = responsavelId
    if (status === 'CONCLUIDO') data.dataConclusao = new Date()

    const item = await prisma.chamado.update({
      where: { id: req.params.id }, data,
      include: { morador: { select: { id: true, nome: true, whatsapp: true } }, condominio: true }
    })

    const acoes = { EM_ANALISE: 'Em análise', CONCLUIDO: 'Concluído' }
    if (acoes[status]) await prisma.historicoChamado.create({ data: { chamadoId: item.id, acao: `Chamado ${acoes[status]}`, nota: nota || resposta || null } })

    if (status && item.morador) {
      const config = await prisma.configWhatsApp.findUnique({ where: { condominioId: item.condominioId } })
      if (status === 'CONCLUIDO') {
        await criarNotificacao({ condominioId: item.condominioId, userId: item.morador.id, tipo: 'CHAMADO_CONCLUIDO', titulo: 'Chamado concluído', mensagem: item.titulo, link: '/meus-chamados' })
        if (item.morador.whatsapp && config?.notifChamadoConcluido) await enviarWhatsApp({ condominioId: item.condominioId, numero: item.morador.whatsapp, mensagem: `✅ *Chamado Concluído*\n\n*"${item.titulo}"* foi resolvido!\n${resposta ? `\n*Resposta:* ${resposta}` : ''}` })
      } else if (status === 'EM_ANALISE') {
        await criarNotificacao({ condominioId: item.condominioId, userId: item.morador.id, tipo: 'CHAMADO_ATUALIZADO', titulo: 'Chamado em análise', mensagem: item.titulo, link: '/meus-chamados' })
        if (item.morador.whatsapp && config?.notifChamadoAtualizado) await enviarWhatsApp({ condominioId: item.condominioId, numero: item.morador.whatsapp, mensagem: `🔍 *Chamado em Análise*\n\nSeu chamado *"${item.titulo}"* está sendo analisado.` })
      }
    }
    res.json(item)
  } catch (e) { next(e) }
})