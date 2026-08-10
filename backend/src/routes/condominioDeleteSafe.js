import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const condominioDeleteSafeRouter = Router()
condominioDeleteSafeRouter.use(authenticate)

condominioDeleteSafeRouter.delete('/:id', requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const id = req.params.id
    const condominio = await prisma.condominio.findUnique({
      where: { id },
      select: { id: true, nome: true },
    })

    if (!condominio) {
      return res.status(404).json({ error: 'Edificação não encontrada.', code: 'NOT_FOUND' })
    }

    const userId = req.user?.id
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { condominioId: true },
      })
      if (currentUser?.condominioId === id) {
        return res.status(409).json({
          error: 'Esta edificação é a base do seu usuário atual. Troque sua edificação principal antes de excluí-la.',
          code: 'PRIMARY_CONDOMINIUM',
        })
      }
    }

    await prisma.$transaction(async tx => {
      await tx.checklistExecution.deleteMany({ where: { condominioId: id } })
      await tx.checklistTemplate.deleteMany({ where: { condominioId: id } })
      await tx.reserva.deleteMany({ where: { condominioId: id } })
      await tx.espacoComum.deleteMany({ where: { condominioId: id } })
      await tx.taxa.deleteMany({ where: { condominioId: id } })
      await tx.notificacao.deleteMany({ where: { condominioId: id } })
      await tx.chamado.deleteMany({ where: { condominioId: id } })
      await tx.vozMorador.deleteMany({ where: { condominioId: id } })
      await tx.planoManutencaoItem.deleteMany({ where: { condominioId: id } })
      await tx.manutencao.deleteMany({ where: { condominioId: id } })
      await tx.inventario.deleteMany({ where: { condominioId: id } })
      await tx.documento.deleteMany({ where: { condominioId: id } })
      await tx.banner.deleteMany({ where: { condominioId: id } })
      await tx.denuncia.deleteMany({ where: { condominioId: id } })
      await tx.comunicado.deleteMany({ where: { condominioId: id } })
      await tx.whatsAppLog.deleteMany({ where: { condominioId: id } })
      await tx.contaSindico.deleteMany({ where: { condominioId: id } })
      await tx.configWhatsApp.deleteMany({ where: { condominioId: id } })
      await tx.condominioAcesso.deleteMany({ where: { condominioId: id } })
      await tx.user.deleteMany({ where: { condominioId: id } })
      await tx.condominio.delete({ where: { id } })
    })

    return res.json({ ok: true, id, nome: condominio.nome })
  } catch (e) {
    next(e)
  }
})
