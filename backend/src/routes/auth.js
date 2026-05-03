// src/routes/auth.js
import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  invalidateRefreshToken,
  authenticate,
  requireRole
} from '../middleware/auth.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { loginLimiter } from '../middleware/rateLimiter.js'

export const authRouter = Router()

function randomPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, senha } = req.body

    if (!email || !senha) {
      return res.status(400).json({
        error: 'Email e senha obrigatórios',
        code: 'VALIDATION_ERROR'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { condominio: { select: { id: true, nome: true } } }
    })

    if (!user || !user.ativo) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        code: 'AUTH_INVALID_CREDENTIALS'
      })
    }

    const valid = await bcrypt.compare(senha, user.senha)

    if (!valid) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        code: 'AUTH_INVALID_CREDENTIALS'
      })
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = await generateRefreshToken(user.id)

    if (['ADMIN', 'SINDICO'].includes(user.role)) {
      await prisma.condominioAcesso.upsert({
        where: {
          userId_condominioId: {
            userId: user.id,
            condominioId: user.condominioId
          }
        },
        update: { role: user.role },
        create: {
          userId: user.id,
          condominioId: user.condominioId,
          role: user.role
        }
      })
    }

    const { senha: _, ...userSafe } = user

    res.json({
      token: accessToken,
      refreshToken,
      user: userSafe
    })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token obrigatório',
        code: 'VALIDATION_ERROR'
      })
    }

    const result = await rotateRefreshToken(refreshToken)

    if (!result) {
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
        code: 'AUTH_REFRESH_INVALID'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      include: { condominio: { select: { id: true, nome: true } } }
    })

    if (!user || !user.ativo) {
      return res.status(401).json({
        error: 'Usuário inativo',
        code: 'AUTH_USER_INACTIVE'
      })
    }

    const accessToken = generateAccessToken(user)
    const { senha: _, ...userSafe } = user

    res.json({
      token: accessToken,
      refreshToken: result.newRefreshToken,
      user: userSafe
    })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/logout
authRouter.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      await invalidateRefreshToken(refreshToken)
    }

    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { condominio: { select: { id: true, nome: true } } }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      })
    }

    const { senha: _, ...safe } = user

    res.json(safe)
  } catch (e) {
    next(e)
  }
})

// GET /api/auth/users
authRouter.get('/users', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const where = { condominioId: req.user.condominioId }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          unidade: true,
          bloco: true,
          ativo: true,
          createdAt: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    res.json(paginatedResponse({ data, total, page, limit }))
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/users
authRouter.post('/users', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const { nome, email, senha, role, unidade, bloco, telefone, whatsapp } = req.body

    if (!nome || !email) {
      return res.status(400).json({
        error: 'Nome e email são obrigatórios',
        code: 'VALIDATION_ERROR'
      })
    }

    const senhaFoiInformada = Boolean(senha)
    const hash = await bcrypt.hash(senha || randomPassword(), 10)

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hash,
        role: role || 'MORADOR',
        unidade,
        bloco,
        telefone,
        whatsapp,
        condominioId: req.user.condominioId
      }
    })

    if (['ADMIN', 'SINDICO'].includes(user.role)) {
      await prisma.condominioAcesso.create({
        data: {
          userId: user.id,
          condominioId: req.user.condominioId,
          role: user.role
        }
      })
    }

    let conviteLink = null

    if (!senhaFoiInformada) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt
        }
      })

      const frontendUrl = process.env.FRONTEND_URL || 'https://ta-na-mao-xeim.vercel.app'
      conviteLink = `${frontendUrl.replace(/\/$/, '')}/definir-senha.html?token=${token}`
    }

    const { senha: _, ...safe } = user

    res.status(201).json({
      ...safe,
      conviteLink
    })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/definir-senha
authRouter.post('/definir-senha', async (req, res, next) => {
  try {
    const { token, senha } = req.body

    if (!token || !senha) {
      return res.status(400).json({
        error: 'Token e senha são obrigatórios',
        code: 'VALIDATION_ERROR'
      })
    }

    if (senha.length < 6) {
      return res.status(400).json({
        error: 'A senha precisa ter pelo menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      })
    }

    const convite = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    })

    if (!convite || !convite.user || !convite.user.ativo) {
      return res.status(400).json({
        error: 'Link inválido ou expirado',
        code: 'RESET_TOKEN_INVALID'
      })
    }

    const hash = await bcrypt.hash(senha, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: convite.userId },
        data: { senha: hash }
      }),
      prisma.passwordResetToken.update({
        where: { id: convite.id },
        data: { usedAt: new Date() }
      })
    ])

    res.json({
      ok: true,
      message: 'Senha definida com sucesso'
    })
  } catch (e) {
    next(e)
  }
})

// PATCH /api/auth/users/:id
authRouter.patch('/users/:id', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        condominioId: req.user.condominioId
      }
    })

    if (!existing) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'NOT_FOUND'
      })
    }

    const { senha, ...data } = req.body
    const updateData = { ...data }

    if (senha) {
      updateData.senha = await bcrypt.hash(senha, 10)
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData
    })

    const { senha: _, ...safe } = user

    res.json(safe)
  } catch (e) {
    next(e)
  }
})
// DELETE /api/auth/users/:id
authRouter.delete('/users/:id', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        condominioId: req.user.condominioId
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'NOT_FOUND'
      })
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    })

    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/users/:id/reset-senha
authRouter.post('/users/:id/reset-senha', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        condominioId: req.user.condominioId
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'NOT_FOUND'
      })
    }

    const token = crypto.randomBytes(32).toString('hex')

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    })

    const frontendUrl = process.env.FRONTEND_URL || 'https://ta-na-mao-xeim.vercel.app'

    const conviteLink = `${frontendUrl.replace(/\/$/, '')}/definir-senha.html?token=${token}`

    res.json({
      ok: true,
      conviteLink
    })
  } catch (e) {
    next(e)
  }
})
