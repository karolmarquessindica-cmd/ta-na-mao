// src/jobs/scheduler.js
// Agenda jobs recorrentes via BullMQ repeat (cron expressions)
import { queues, QUEUE_NAMES } from '../lib/queue.js'

// Opções de retry compartilhadas para todos os jobs agendados
const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 20 },
  removeOnFail: { count: 50 },
}

export async function iniciarScheduler() {
  try {
    // Limpa jobs recorrentes existentes para evitar duplicatas ao reiniciar
    for (const q of Object.values(queues)) {
      const existentes = await q.getRepeatableJobs()
      for (const job of existentes) {
        await q.removeRepeatableByKey(job.key)
      }
    }

    // ─── Alertas de manutenção: a cada hora ──────────────────
    await queues.alertaManutencao.add(
      QUEUE_NAMES.ALERTA_MANUTENCAO,
      {},
      { ...JOB_OPTS, repeat: { pattern: '0 * * * *' } }
    )

    // ─── Taxas atrasadas: a cada 6 horas ─────────────────────
    await queues.taxasAtrasadas.add(
      QUEUE_NAMES.TAXAS_ATRASADAS,
      {},
      { ...JOB_OPTS, repeat: { pattern: '0 */6 * * *' } }
    )

    // ─── Notificar inadimplentes: toda segunda-feira às 9h ────
    await queues.notificarInadimplentes.add(
      QUEUE_NAMES.NOTIFICAR_INADIMPLENTES,
      {},
      { ...JOB_OPTS, repeat: { pattern: '0 9 * * 1' } }
    )

    // ─── Limpar notificações: diariamente à meia-noite ────────
    await queues.limparNotificacoes.add(
      QUEUE_NAMES.LIMPAR_NOTIFICACOES,
      {},
      { ...JOB_OPTS, repeat: { pattern: '0 0 * * *' } }
    )

    console.log('⏰ Scheduler BullMQ iniciado — 4 jobs agendados')
    console.log('   • alerta-manutencao:       0 * * * *   (a cada hora)')
    console.log('   • taxas-atrasadas:          0 */6 * * * (a cada 6h)')
    console.log('   • notificar-inadimplentes:  0 9 * * 1   (toda segunda, 9h)')
    console.log('   • limpar-notificacoes:      0 0 * * *   (diário, meia-noite)')
  } catch (e) {
    console.error('[Scheduler] Erro ao iniciar scheduler BullMQ:', e.message)
    throw e
  }
}
