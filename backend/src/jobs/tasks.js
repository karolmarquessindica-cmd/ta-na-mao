// src/jobs/tasks.js
import { prisma } from '../lib/prisma.js'
import { enviarWhatsApp } from '../routes/whatsapp.js'
import { criarNotificacao } from '../routes/notificacao.js'

export async function processarAlertaManutencao() {
  const agora = new Date()
  const em3dias = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000)

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      status: { not: 'CONCLUIDO' },
      dataVencimento: { gte: agora, lte: em3dias },
    },
    include: {
      condominio: {
        include: { users: { where: { role: { in: ['ADMIN', 'SINDICO'] }, ativo: true } } }
      }
    }
  })

  for (const m of manutencoes) {
    const diasRestantes = Math.ceil((new Date(m.dataVencimento) - agora) / (1000 * 60 * 60 * 24))
    const msg = `⚠️ *Manutenção vencendo em ${diasRestantes} dia(s)*\n\n📋 *${m.titulo}*\n📅 Vencimento: ${new Date(m.dataVencimento).toLocaleDateString('pt-BR')}\n\nAcesse o sistema para atualizar.`

    for (const admin of m.condominio.users) {
      await criarNotificacao({
        condominioId: m.condominioId,
        userId: admin.id,
        tipo: 'MANUTENCAO_VENCENDO',
        titulo: `Manutenção vencendo em ${diasRestantes} dia(s)`,
        mensagem: m.titulo,
        link: '/manutencoes',
      })

      if (admin.whatsapp) {
        await enviarWhatsApp({ condominioId: m.condominioId, numero: admin.whatsapp, mensagem: msg })
      }
    }
  }

  const total = manutencoes.length
  if (total) console.log(`[Job] ${total} alertas de manutenção enviados`)
  return { alertasEnviados: total }
}

export async function processarTaxasAtrasadas() {
  const { count } = await prisma.taxa.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' }
  })

  if (count) console.log(`[Job] ${count} taxa(s) marcadas como ATRASADO`)
  return { atualizadas: count }
}

export async function processarNotificarInadimplentes() {
  const taxasAtrasadas = await prisma.taxa.findMany({
    where: { status: 'ATRASADO' },
    include: {
      morador: { select: { nome: true, whatsapp: true } },
      condominio: { select: { nome: true } }
    },
    distinct: ['moradorId'],
  })

  let notificados = 0
  for (const taxa of taxasAtrasadas) {
    if (!taxa.morador.whatsapp) continue
    const msg = `⚠️ *Aviso de Inadimplência — ${taxa.condominio.nome}*\n\nOlá, ${taxa.morador.nome.split(' ')[0]}!\n\nIdentificamos taxa(s) em atraso no sistema. Por favor, regularize sua situação.\n\nDúvidas? Entre em contato com a administração.`
    await enviarWhatsApp({ condominioId: taxa.condominioId, numero: taxa.morador.whatsapp, mensagem: msg })
    notificados++
  }

  if (notificados) console.log(`[Job] ${notificados} inadimplentes notificados`)
  return { notificados }
}

export async function processarLimparNotificacoes() {
  const limite = new Date()
  limite.setDate(limite.getDate() - 60)

  const { count } = await prisma.notificacao.deleteMany({
    where: { lida: true, createdAt: { lt: limite } }
  })

  if (count) console.log(`[Job] ${count} notificações antigas removidas`)
  return { removidas: count }
}

export const nativeJobs = [
  {
    id: 'alerta-manutencao',
    descricao: 'Alertas de Manutenção',
    intervalo: 'A cada hora',
    everyMs: 60 * 60 * 1000,
    run: processarAlertaManutencao,
  },
  {
    id: 'taxas-atrasadas',
    descricao: 'Taxas Atrasadas',
    intervalo: 'A cada 6 horas',
    everyMs: 6 * 60 * 60 * 1000,
    run: processarTaxasAtrasadas,
  },
  {
    id: 'notificar-inadimplentes',
    descricao: 'Notificar Inadimplentes',
    intervalo: 'Toda segunda-feira as 9h',
    everyMs: 60 * 60 * 1000,
    shouldRun: now => now.getDay() === 1 && now.getHours() === 9,
    run: processarNotificarInadimplentes,
  },
  {
    id: 'limpar-notificacoes',
    descricao: 'Limpar Notificações',
    intervalo: 'Diariamente a meia-noite',
    everyMs: 24 * 60 * 60 * 1000,
    run: processarLimparNotificacoes,
  },
]
