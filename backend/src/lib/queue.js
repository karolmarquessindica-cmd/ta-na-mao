// src/lib/queue.js
// Conexão Redis + instâncias de Queue BullMQ
import { Queue } from 'bullmq'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Parseia a URL do Redis para opções ioredis (BullMQ usa ioredis internamente)
function parseRedisUrl(url) {
  try {
    const u = new URL(url)
    return {
      host: u.hostname || 'localhost',
      port: parseInt(u.port) || 6379,
      ...(u.password ? { password: u.password } : {}),
      ...(u.pathname && u.pathname !== '/' ? { db: parseInt(u.pathname.slice(1)) || 0 } : {}),
    }
  } catch {
    return { host: 'localhost', port: 6379 }
  }
}

// Opções de conexão compartilhadas (BullMQ cria suas próprias instâncias ioredis internamente)
export const redisConnection = parseRedisUrl(REDIS_URL)

// Nomes das filas — fonte única da verdade
export const QUEUE_NAMES = {
  ALERTA_MANUTENCAO:       'alerta-manutencao',
  TAXAS_ATRASADAS:         'taxas-atrasadas',
  NOTIFICAR_INADIMPLENTES: 'notificar-inadimplentes',
  LIMPAR_NOTIFICACOES:     'limpar-notificacoes',
}

// Instâncias de Queue usadas para enfileirar jobs e consultar status
export const queues = {
  alertaManutencao:       new Queue(QUEUE_NAMES.ALERTA_MANUTENCAO,       { connection: redisConnection }),
  taxasAtrasadas:         new Queue(QUEUE_NAMES.TAXAS_ATRASADAS,         { connection: redisConnection }),
  notificarInadimplentes: new Queue(QUEUE_NAMES.NOTIFICAR_INADIMPLENTES, { connection: redisConnection }),
  limparNotificacoes:     new Queue(QUEUE_NAMES.LIMPAR_NOTIFICACOES,     { connection: redisConnection }),
}
