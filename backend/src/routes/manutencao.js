// TRECHO MODIFICADO (adicione no topo)
import { enviarWhatsApp } from './whatsapp.js'

// ADICIONE ESTA FUNÇÃO
async function dispararManutencaoWhatsApp({ condominioId, item }) {
  const config = await prisma.configWhatsApp.findUnique({ where: { condominioId } })
  if (!config?.ativo || !config?.notifManutencaoVencendo) return

  const admins = await prisma.user.findMany({
    where: { condominioId, role: { in: ['ADMIN', 'SINDICO'] }, ativo: true, whatsapp: { not: null } },
    select: { whatsapp: true, nome: true }
  })

  const mensagem = `⚠️ *Manutenção próxima ou vencendo*\n\n*${item.titulo}*\n\nVerifique o sistema para evitar problemas.`

  await Promise.allSettled(
    admins.map(a => enviarWhatsApp({ condominioId, numero: a.whatsapp, mensagem }))
  )
}

// AGORA DENTRO DO POST /api/manutencoes
// após criar o item, adicione:
await dispararManutencaoWhatsApp({ condominioId: scopedCondominioId, item })

// E DENTRO DO PATCH, após atualizar:
if (item.dataVencimento) {
  const dias = Math.ceil((new Date(item.dataVencimento) - new Date()) / (1000*60*60*24))
  if (dias <= 15) {
    await dispararManutencaoWhatsApp({ condominioId: scopedCondominioId, item })
  }
}
