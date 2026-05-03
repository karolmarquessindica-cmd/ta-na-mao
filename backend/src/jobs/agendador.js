// src/jobs/agendador.js
// Rotas de gerenciamento de jobs — agendamento via BullMQ (ver scheduler.js e workers/)
import { Router } from 'express'
export const agendadorRouter = Router()

async function getQueues() {
  return import('../lib/queue.js')
}

async function getNativeScheduler() {
  return import('./nativeScheduler.js')
}

// ─── GET /api/jobs/executar — trigger manual de todos os jobs ──
// Adiciona cada job na fila com prioridade alta (priority: 1)
agendadorRouter.get('/executar', async (req, res, next) => {
  try {
    if (process.env.JOBS_BACKEND === 'native') {
      const { runAllNativeJobs } = await getNativeScheduler()
      const jobs = await runAllNativeJobs()
      return res.json({ ok: true, backend: 'native', executadoEm: new Date().toISOString(), jobs })
    }
    if (process.env.JOBS_BACKEND === 'disabled') {
      return res.status(503).json({ error: 'Jobs desativados por DISABLE_JOBS=true', code: 'JOBS_DISABLED' })
    }

    const { queues, QUEUE_NAMES } = await getQueues()
    const opts = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      priority: 1,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    }

    const [jAlerta, jTaxas, jInadimplentes, jLimpeza] = await Promise.all([
      queues.alertaManutencao.add(QUEUE_NAMES.ALERTA_MANUTENCAO, { manual: true }, opts),
      queues.taxasAtrasadas.add(QUEUE_NAMES.TAXAS_ATRASADAS, { manual: true }, opts),
      queues.notificarInadimplentes.add(QUEUE_NAMES.NOTIFICAR_INADIMPLENTES, { manual: true }, opts),
      queues.limparNotificacoes.add(QUEUE_NAMES.LIMPAR_NOTIFICACOES, { manual: true }, opts),
    ])

    res.json({
      ok: true,
      enfileiradoEm: new Date().toISOString(),
      jobs: [
        { fila: QUEUE_NAMES.ALERTA_MANUTENCAO,       id: jAlerta.id },
        { fila: QUEUE_NAMES.TAXAS_ATRASADAS,         id: jTaxas.id },
        { fila: QUEUE_NAMES.NOTIFICAR_INADIMPLENTES, id: jInadimplentes.id },
        { fila: QUEUE_NAMES.LIMPAR_NOTIFICACOES,     id: jLimpeza.id },
      ],
    })
  } catch (e) { next(e) }
})

// ─── GET /api/jobs/status — status detalhado de cada fila ──────
agendadorRouter.get('/status', async (req, res, next) => {
  try {
    if (process.env.JOBS_BACKEND === 'native') {
      const { getNativeJobsStatus } = await getNativeScheduler()
      return res.json({ backend: 'native', filas: getNativeJobsStatus() })
    }
    if (process.env.JOBS_BACKEND === 'disabled') {
      return res.json({ backend: 'disabled', filas: [] })
    }

    const { queues, QUEUE_NAMES } = await getQueues()
    const [
      contAlerta, contTaxas, contInadimplentes, contLimpeza,
      repAlerta, repTaxas, repInadimplentes, repLimpeza,
    ] = await Promise.all([
      queues.alertaManutencao.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      queues.taxasAtrasadas.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      queues.notificarInadimplentes.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      queues.limparNotificacoes.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      queues.alertaManutencao.getRepeatableJobs(),
      queues.taxasAtrasadas.getRepeatableJobs(),
      queues.notificarInadimplentes.getRepeatableJobs(),
      queues.limparNotificacoes.getRepeatableJobs(),
    ])

    res.json({
      filas: [
        {
          nome: QUEUE_NAMES.ALERTA_MANUTENCAO,
          descricao: 'Alertas de Manutenção',
          cron: '0 * * * *',
          intervalo: 'A cada hora',
          contadores: contAlerta,
          proximaExecucao: repAlerta[0]?.next ? new Date(repAlerta[0].next).toISOString() : null,
        },
        {
          nome: QUEUE_NAMES.TAXAS_ATRASADAS,
          descricao: 'Taxas Atrasadas',
          cron: '0 */6 * * *',
          intervalo: 'A cada 6 horas',
          contadores: contTaxas,
          proximaExecucao: repTaxas[0]?.next ? new Date(repTaxas[0].next).toISOString() : null,
        },
        {
          nome: QUEUE_NAMES.NOTIFICAR_INADIMPLENTES,
          descricao: 'Notificar Inadimplentes',
          cron: '0 9 * * 1',
          intervalo: 'Toda segunda-feira às 9h',
          contadores: contInadimplentes,
          proximaExecucao: repInadimplentes[0]?.next ? new Date(repInadimplentes[0].next).toISOString() : null,
        },
        {
          nome: QUEUE_NAMES.LIMPAR_NOTIFICACOES,
          descricao: 'Limpar Notificações',
          cron: '0 0 * * *',
          intervalo: 'Diariamente à meia-noite',
          contadores: contLimpeza,
          proximaExecucao: repLimpeza[0]?.next ? new Date(repLimpeza[0].next).toISOString() : null,
        },
      ],
    })
  } catch (e) { next(e) }
})
