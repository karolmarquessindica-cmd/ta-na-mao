import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const publicExecutionSafeRouter = Router()

function checklistObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

async function findByToken(token) {
  const clean = String(token || '').trim()
  if (!clean) return null

  const direct = await prisma.manutencao.findFirst({
    where: { checklist: { path: ['execucaoToken'], equals: clean } },
    include: { condominio: true, inventario: true, planoItens: true },
  }).catch(() => null)
  if (direct) return direct

  const items = await prisma.manutencao.findMany({
    include: { condominio: true, inventario: true, planoItens: true },
  })
  return items.find(item => checklistObject(item.checklist).execucaoToken === clean) || null
}

publicExecutionSafeRouter.get('/:token', async (req, res, next) => {
  try {
    const item = await findByToken(req.params.token)
    if (!item) {
      return res.status(404).json({
        error: 'Link de execução não encontrado',
        code: 'EXECUTION_TOKEN_NOT_FOUND',
      })
    }

    const checklist = checklistObject(item.checklist)
    res.json({
      id: item.id,
      condominioId: item.condominioId,
      condominio: {
        id: item.condominioId,
        nome: item.condominio?.nome || 'Condomínio',
        logoUrl: item.condominio?.logo || null,
      },
      titulo: item.titulo,
      descricao: item.descricao,
      local: item.inventario?.nome || checklist.local || item.empresa || '',
      dataPrevista: item.dataVencimento,
      responsavel: item.responsavel || item.empresa || '',
      status: item.status,
      token: req.params.token,
    })
  } catch (error) {
    next(error)
  }
})