// src/jobs/nativeScheduler.js
import { nativeJobs } from './tasks.js'

const timers = new Map()
const state = new Map(nativeJobs.map(job => [job.id, {
  id: job.id,
  descricao: job.descricao,
  intervalo: job.intervalo,
  backend: 'native',
  rodando: false,
  ultimaExecucao: null,
  proximaExecucao: null,
  ultimoResultado: null,
  ultimoErro: null,
  lastRunKey: null,
}]))

function nextDate(ms) {
  return new Date(Date.now() + ms).toISOString()
}

function dateKey(date) {
  return date.toISOString().slice(0, 13)
}

export async function runNativeJob(id) {
  const job = nativeJobs.find(j => j.id === id)
  if (!job) throw new Error(`Job nativo nao encontrado: ${id}`)

  const current = state.get(id)
  if (current?.rodando) return { skipped: true, reason: 'Job ja esta em execucao' }

  state.set(id, { ...current, rodando: true, ultimoErro: null })
  try {
    const result = await job.run()
    state.set(id, {
      ...state.get(id),
      rodando: false,
      ultimaExecucao: new Date().toISOString(),
      proximaExecucao: nextDate(job.everyMs),
      ultimoResultado: result,
      ultimoErro: null,
    })
    return result
  } catch (e) {
    state.set(id, {
      ...state.get(id),
      rodando: false,
      ultimaExecucao: new Date().toISOString(),
      proximaExecucao: nextDate(job.everyMs),
      ultimoErro: e.message,
    })
    throw e
  }
}

async function tick(job) {
  const now = new Date()
  const current = state.get(job.id)

  if (job.shouldRun) {
    const key = dateKey(now)
    if (!job.shouldRun(now) || current?.lastRunKey === key) {
      state.set(job.id, { ...current, proximaExecucao: nextDate(job.everyMs) })
      return
    }
    state.set(job.id, { ...current, lastRunKey: key })
  }

  await runNativeJob(job.id).catch(e => console.error(`[Job:native] ${job.id} falhou:`, e.message))
}

export function iniciarNativeScheduler() {
  if (timers.size) return getNativeJobsStatus()

  for (const job of nativeJobs) {
    state.set(job.id, { ...state.get(job.id), proximaExecucao: nextDate(job.everyMs) })
    timers.set(job.id, setInterval(() => tick(job), job.everyMs))
  }

  // Mantem dados financeiros corretos logo no boot local.
  runNativeJob('taxas-atrasadas').catch(e => console.error('[Job:native] taxas-atrasadas falhou:', e.message))

  console.log('[boot] Scheduler nativo iniciado sem Redis — 4 jobs via setInterval')
  return getNativeJobsStatus()
}

export async function runAllNativeJobs() {
  const results = []
  for (const job of nativeJobs) {
    results.push({ id: job.id, result: await runNativeJob(job.id) })
  }
  return results
}

export function getNativeJobsStatus() {
  return [...state.values()]
}
