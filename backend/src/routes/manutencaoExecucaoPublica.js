import { Router } from 'express'
import fs from 'fs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'
import { validateFileMagicBytes, validateBufferMagicBytes } from '../lib/validateUpload.js'
import { multerUpload, uploadFile, isS3Enabled } from '../lib/storage.js'

export const manutencaoExecucaoPublicaRouter = Router()

function obj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function executionToken(checklist) {
  return obj(checklist).execucaoToken || null
}

async function findByToken(token) {
  const items = await prisma.manutencao.findMany({
    include: { condominio: { select: { id: true, nome: true } }, inventario: { select: { nome: true } } },
  })
  return items.find(item => executionToken(item.checklist) === token) || null
}

async function validateFiles(files = []) {
  for (const file of files) {
    const result = isS3Enabled
      ? await validateBufferMagicBytes(file.buffer)
      : await validateFileMagicBytes(file.path)
    if (!result.valid) {
      if (!isS3Enabled && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
      const error = new Error('Arquivo inválido. Envie imagem ou PDF válido.')
      error.status = 400
      error.code = 'INVALID_FILE_TYPE'
      throw error
    }
  }
}

async function uploadMany(files, folder) {
  return Promise.all((files || []).map(file => uploadFile(file, folder)))
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

manutencaoExecucaoPublicaRouter.get('/execucao/:token', async (req, res, next) => {
  try {
    const item = await findByToken(req.params.token)
    if (!item) return res.status(404).json({ error: 'Link de execução não encontrado', code: 'NOT_FOUND' })
    res.json({
      id: item.id,
      token: req.params.token,
      condominio: item.condominio,
      titulo: item.titulo,
      descricao: item.descricao,
      local: item.inventario?.nome || obj(item.checklist).local || item.empresa || '',
      dataPrevista: item.dataVencimento,
      responsavel: item.responsavel || item.empresa || '',
      status: item.status,
      execucao: obj(item.checklist).ultimaExecucaoPublica || null,
    })
  } catch (e) { next(e) }
})

manutencaoExecucaoPublicaRouter.post('/execucao/:token', uploadLimiter, multerUpload.fields([
  { name: 'fotosAntes', maxCount: 8 },
  { name: 'fotosDepois', maxCount: 8 },
  { name: 'fotosDurante', maxCount: 8 },
  { name: 'notaFiscal', maxCount: 1 },
  { name: 'recibo', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const item = await findByToken(req.params.token)
    if (!item) return res.status(404).json({ error: 'Link de execução não encontrado', code: 'NOT_FOUND' })

    const allFiles = Object.values(req.files || {}).flat()
    await validateFiles(allFiles)

    const [antes, depois, durante] = await Promise.all([
      uploadMany(req.files?.fotosAntes, 'manutencoes/antes'),
      uploadMany(req.files?.fotosDepois, 'manutencoes/depois'),
      uploadMany(req.files?.fotosDurante, 'manutencoes/durante'),
    ])
    const nota = req.files?.notaFiscal?.[0] ? await uploadFile(req.files.notaFiscal[0], 'manutencoes/notas') : null
    const recibo = req.files?.recibo?.[0] ? await uploadFile(req.files.recibo[0], 'manutencoes/recibos') : null

    const custoMaoObra = numberOrNull(req.body.custoMaoObra)
    const custoMateriais = numberOrNull(req.body.custoMateriais)
    const custoOutros = numberOrNull(req.body.custoOutros)
    const valorTotalInformado = numberOrNull(req.body.valorTotal)
    const valorTotal = valorTotalInformado ?? [custoMaoObra, custoMateriais, custoOutros].reduce((soma, valor) => soma + (valor || 0), 0)
    const checklist = obj(item.checklist)

    const execucao = {
      id: crypto.randomUUID(),
      token: req.params.token,
      status: req.body.status || 'CONCLUIDO',
      dataExecucao: new Date().toISOString(),
      horaInicio: req.body.horaInicio || null,
      horaTermino: req.body.horaTermino || null,
      prestadorNome: req.body.prestadorNome || null,
      prestadorEmpresa: req.body.prestadorEmpresa || null,
      prestadorTelefone: req.body.prestadorTelefone || null,
      descricaoServico: req.body.descricaoServico || req.body.comentarios || null,
      problemasEncontrados: req.body.problemasEncontrados || null,
      materiaisUtilizados: req.body.materiaisUtilizados || null,
      observacoesFinais: req.body.observacoesFinais || null,
      custoMaoObra,
      custoMateriais,
      custoOutros,
      valorTotal,
      fotosAntes: antes.map(file => file.url),
      fotosDurante: durante.map(file => file.url),
      fotosDepois: depois.map(file => file.url),
      notaFiscal: nota?.url || null,
      recibo: recibo?.url || null,
      visivelMorador: req.body.visivelMorador !== 'false',
    }

    const historico = Array.isArray(checklist.historicoExecucoes) ? checklist.historicoExecucoes : []
    const todasFotos = [...execucao.fotosAntes, ...execucao.fotosDurante, ...execucao.fotosDepois]
    const updated = await prisma.manutencao.update({
      where: { id: item.id },
      data: {
        status: execucao.status === 'CONCLUIDO' ? 'CONCLUIDO' : 'EM_ANDAMENTO',
        dataConclusao: execucao.status === 'CONCLUIDO' ? new Date() : item.dataConclusao,
        custo: valorTotal || item.custo,
        fotos: [...(item.fotos || []), ...todasFotos],
        checklist: {
          ...checklist,
          ultimaExecucaoPublica: execucao,
          historicoExecucoes: [execucao, ...historico].slice(0, 50),
        },
      },
    })

    res.json({ ok: true, manutencaoId: updated.id, status: updated.status, execucao })
  } catch (e) { next(e) }
})

manutencaoExecucaoPublicaRouter.get('/relatorio/:id', async (req, res, next) => {
  try {
    const item = await prisma.manutencao.findUnique({
      where: { id: req.params.id },
      include: { condominio: { select: { nome: true } }, inventario: { select: { nome: true } } },
    })
    if (!item) return res.status(404).json({ error: 'Manutenção não encontrada', code: 'NOT_FOUND' })
    const execucao = obj(item.checklist).ultimaExecucaoPublica
    if (!execucao || execucao.visivelMorador === false) return res.status(404).json({ error: 'Relatório ainda não disponível', code: 'REPORT_NOT_AVAILABLE' })

    res.json({
      id: item.id,
      titulo: item.titulo,
      descricao: item.descricao,
      condominio: item.condominio?.nome,
      local: item.inventario?.nome || obj(item.checklist).local || item.empresa || '',
      status: item.status,
      dataConclusao: item.dataConclusao,
      execucao: {
        dataExecucao: execucao.dataExecucao,
        prestadorNome: execucao.prestadorNome,
        prestadorEmpresa: execucao.prestadorEmpresa,
        descricaoServico: execucao.descricaoServico,
        problemasEncontrados: execucao.problemasEncontrados,
        materiaisUtilizados: execucao.materiaisUtilizados,
        observacoesFinais: execucao.observacoesFinais,
        fotosAntes: execucao.fotosAntes || [],
        fotosDurante: execucao.fotosDurante || [],
        fotosDepois: execucao.fotosDepois || [],
        notaFiscal: execucao.notaFiscal || null,
        recibo: execucao.recibo || null,
      },
    })
  } catch (e) { next(e) }
})
