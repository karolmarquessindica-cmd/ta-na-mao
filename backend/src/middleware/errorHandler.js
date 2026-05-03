// src/middleware/errorHandler.js
import crypto from 'crypto'

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || crypto.randomUUID()
  const timestamp = new Date().toISOString()

  console.error(`[${timestamp}] [${requestId}] Error:`, err)

  // Prisma unique constraint
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Registro duplicado',
      code: 'DB_DUPLICATE',
      details: { field: err.meta?.target },
    })
  }
  // Prisma not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro não encontrado',
      code: 'DB_NOT_FOUND',
    })
  }

  // Zod validation
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: err.issues,
    })
  }

  // AppError (thrown by our code)
  if (err.code && err.status) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details || undefined,
    })
  }

  const status = err.status || 500
  const message = status === 500 ? 'Erro interno do servidor' : err.message
  res.status(status).json({
    error: message,
    code: 'INTERNAL_ERROR',
  })
}

// Middleware para adicionar requestId
export function requestId(req, _res, next) {
  req.requestId = crypto.randomUUID()
  next()
}
