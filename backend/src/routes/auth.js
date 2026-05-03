// POST /api/auth/users — criar usuário (admin)
authRouter.post('/users', authenticate, requireRole('ADMIN', 'SINDICO'), async (req, res, next) => {
  try {
    const { nome, email, senha, role, unidade, bloco, telefone, whatsapp } = req.body

    // Validação básica
    if (!nome || !email) {
      return res.status(400).json({
        error: 'Nome e email são obrigatórios',
        code: 'VALIDATION_ERROR'
      })
    }

    // Verifica se veio senha
    const senhaFoiInformada = Boolean(senha)

    // Gera senha (ou usa uma aleatória)
    const hash = await bcrypt.hash(senha || randomPassword(), 10)

    // Cria usuário
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

    // Se for ADMIN ou SÍNDICO, cria acesso
    if (['ADMIN', 'SINDICO'].includes(user.role)) {
      await prisma.condominioAcesso.create({
        data: {
          userId: user.id,
          condominioId: req.user.condominioId,
          role: user.role
        }
      })
    }

    // Link de convite
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

      conviteLink = `${frontendUrl}/definir-senha?token=${token}`
    }

    // Remove senha da resposta
    const { senha: _, ...safe } = user

    // Retorno final
    res.status(201).json({
      ...safe,
      conviteLink
    })

  } catch (e) {
    next(e)
  }
})
