// src/jobs/workers/taxasAtrasadas.worker.js
import { Worker } from 'bullmq'
import { redisConnection, QUEUE_NAMES } from '../../lib/queue.js'
import { processarTaxasAtrasadas } from '../tasks.js'

async function processar() {
  return processarTaxasAtrasadas()
}

export function iniciarWorkerTaxasAtrasadas() {
  const worker = new Worker(QUEUE_NAMES.TAXAS_ATRASADAS, processar, {
    connection: redisConnection,
  })

  worker.on('completed', (job, result) => {
    console.log(`[BullMQ] ${QUEUE_NAMES.TAXAS_ATRASADAS} #${job.id} concluido`, result)
  })
  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] ${QUEUE_NAMES.TAXAS_ATRASADAS} #${job?.id} falhou (tentativa ${job?.attemptsMade}):`, err.message)
  })

  console.log(`[BullMQ] Worker "${QUEUE_NAMES.TAXAS_ATRASADAS}" registrado`)
  return worker
}
