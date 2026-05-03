// src/jobs/workers/index.js
// Agrega e inicializa todos os workers BullMQ
import { iniciarWorkerAlertaManutencao }       from './alertaManutencao.worker.js'
import { iniciarWorkerTaxasAtrasadas }          from './taxasAtrasadas.worker.js'
import { iniciarWorkerNotificarInadimplentes }  from './notificarInadimplentes.worker.js'
import { iniciarWorkerLimparNotificacoes }      from './limparNotificacoes.worker.js'

export function iniciarWorkers() {
  const workers = [
    iniciarWorkerAlertaManutencao(),
    iniciarWorkerTaxasAtrasadas(),
    iniciarWorkerNotificarInadimplentes(),
    iniciarWorkerLimparNotificacoes(),
  ]
  console.log('✅ 4 workers BullMQ registrados')
  return workers
}
