// src/jobs/workers/alertaManutencao.worker.js
import { Worker } from 'bullmq'
import { redisConnection, QUEUE_NAMES } from '../../lib/queue.js'
import { processarAlertaManutencao } from '../tasks.js'

async function processar() {
  return processarAlertaManutencao()
}

export function iniciarWorkerAlertaManutencao() {
  const worker = new Worker(QUEUE_NAMES.ALERTA_MANUTENCAO, processar, {
    connection: redisConnection,
  })

  worker.on('completed', (job, result) => {
    console.log(`[BullMQ] ${QUEUE_NAMES.ALERTA_MANUTENCAO} #${job.id} concluido`, result)
  })
  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] ${QUEUE_NAMES.ALERTA_MANUTENCAO} #${job?.id} falhou (tentativa ${job?.attemptsMade}):`, err.message)
  })

  console.log(`[BullMQ] Worker "${QUEUE_NAMES.ALERTA_MANUTENCAO}" registrado`)
  return worker
}
