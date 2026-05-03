// src/jobs/workers/notificarInadimplentes.worker.js
import { Worker } from 'bullmq'
import { redisConnection, QUEUE_NAMES } from '../../lib/queue.js'
import { processarNotificarInadimplentes } from '../tasks.js'

async function processar() {
  return processarNotificarInadimplentes()
}

export function iniciarWorkerNotificarInadimplentes() {
  const worker = new Worker(QUEUE_NAMES.NOTIFICAR_INADIMPLENTES, processar, {
    connection: redisConnection,
  })

  worker.on('completed', (job, result) => {
    console.log(`[BullMQ] ${QUEUE_NAMES.NOTIFICAR_INADIMPLENTES} #${job.id} concluido`, result)
  })
  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] ${QUEUE_NAMES.NOTIFICAR_INADIMPLENTES} #${job?.id} falhou (tentativa ${job?.attemptsMade}):`, err.message)
  })

  console.log(`[BullMQ] Worker "${QUEUE_NAMES.NOTIFICAR_INADIMPLENTES}" registrado`)
  return worker
}
