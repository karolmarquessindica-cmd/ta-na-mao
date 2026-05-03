// src/jobs/workers/limparNotificacoes.worker.js
import { Worker } from 'bullmq'
import { redisConnection, QUEUE_NAMES } from '../../lib/queue.js'
import { processarLimparNotificacoes } from '../tasks.js'

async function processar() {
  return processarLimparNotificacoes()
}

export function iniciarWorkerLimparNotificacoes() {
  const worker = new Worker(QUEUE_NAMES.LIMPAR_NOTIFICACOES, processar, {
    connection: redisConnection,
  })

  worker.on('completed', (job, result) => {
    console.log(`[BullMQ] ${QUEUE_NAMES.LIMPAR_NOTIFICACOES} #${job.id} concluido`, result)
  })
  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] ${QUEUE_NAMES.LIMPAR_NOTIFICACOES} #${job?.id} falhou (tentativa ${job?.attemptsMade}):`, err.message)
  })

  console.log(`[BullMQ] Worker "${QUEUE_NAMES.LIMPAR_NOTIFICACOES}" registrado`)
  return worker
}
