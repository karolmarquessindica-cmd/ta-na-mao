// src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit'

// Login: 5 tentativas por IP por minuto
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 1 minuto.', code: 'RATE_LIMIT_LOGIN' },
})

// API geral: 100 req/min por IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições excedido. Tente novamente em breve.', code: 'RATE_LIMIT_API' },
})

// Denúncias: 3/min (endpoint público)
export const denunciaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de denúncias excedido. Aguarde 1 minuto.', code: 'RATE_LIMIT_DENUNCIA' },
})

// Upload: 10/min
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de uploads excedido. Aguarde 1 minuto.', code: 'RATE_LIMIT_UPLOAD' },
})
