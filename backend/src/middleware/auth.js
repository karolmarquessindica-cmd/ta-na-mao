// src/middleware/auth.js
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'

const JWT_SECRET = process.env.JWT_SECRET || 'tanamaao-secret-key-change-in-production'
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido', code: 'AUTH_NO_TOKEN' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'AUTH_TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Token inválido', code: 'AUTH_TOKEN_INVALID' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Acesso negado', code: 'AUTH_FORBIDDEN' })
    }
    next()
  }
}

export function generateAccessToken(user, condominioId = user.condominioId) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, condominioId },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  )
}

// Alias para compatibilidade
export const generateToken = generateAccessToken

export async function generateRefreshToken(userId) {
  // Invalidar refresh tokens anteriores do usuário
  await prisma.refreshToken.deleteMany({ where: { userId } })

  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS)

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt }
  })

  return token
}

export async function rotateRefreshToken(oldToken) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } })

  if (!stored) return null
  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } })
    return null
  }

  // Deletar o token antigo
  await prisma.refreshToken.delete({ where: { id: stored.id } })

  // Gerar novo refresh token
  const newToken = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS)

  await prisma.refreshToken.create({
    data: { token: newToken, userId: stored.userId, expiresAt }
  })

  return { newRefreshToken: newToken, userId: stored.userId }
}

export async function invalidateRefreshToken(token) {
  try {
    await prisma.refreshToken.delete({ where: { token } })
  } catch {
    // Token pode já ter sido removido
  }
}
