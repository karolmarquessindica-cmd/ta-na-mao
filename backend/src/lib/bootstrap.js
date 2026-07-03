import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'

const ADMIN_EMAIL = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'Karolmarquessindica@gmail.com').trim().toLowerCase()
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD
const LEGACY_ADMIN_EMAIL = 'admin@horizonte.com'

async function deactivateLegacyAdmin() {
  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_ADMIN_EMAIL } })
  if (!legacy) return

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: legacy.id } }),
    prisma.condominioAcesso.deleteMany({ where: { userId: legacy.id } }),
    prisma.user.update({
      where: { id: legacy.id },
      data: {
        ativo: false,
        email: `desativado-${legacy.id}@tanamao.local`,
        role: 'MORADOR',
      },
    }),
  ])

  console.log(`[bootstrap] Usuário legado desativado: ${LEGACY_ADMIN_EMAIL}`)
}

export async function ensureBootstrapData() {
  if (process.env.DISABLE_BOOTSTRAP === 'true') return

  try {
    await deactivateLegacyAdmin()

    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
    if (existing) {
      console.log(`[bootstrap] Usuário master já existe: ${ADMIN_EMAIL}`)
      return
    }

    if (!ADMIN_PASSWORD) {
      console.warn('[bootstrap] BOOTSTRAP_ADMIN_PASSWORD não configurada. Usuário master não foi criado automaticamente.')
      return
    }

    console.log('[bootstrap] Criando condomínio e usuário master inicial...')

    const senha = await bcrypt.hash(ADMIN_PASSWORD, 10)

    const result = await prisma.$transaction(async tx => {
      let condominio = await tx.condominio.findFirst({
        where: { nome: 'Central Master Tá na Mão' }
      })

      if (!condominio) {
        condominio = await tx.condominio.create({
          data: {
            nome: 'Central Master Tá na Mão',
            endereco: 'Fortaleza - CE',
            cidade: 'Fortaleza',
            estado: 'CE',
            telefone: process.env.BOOTSTRAP_ADMIN_WHATSAPP || null,
            email: ADMIN_EMAIL,
            tipoEdificacao: 'COMERCIAL',
            blocos: 1,
            unidades: 1,
            pavimentos: 1,
            portalConfig: {
              centralMaster: true,
              origem: 'bootstrap',
              criadoEm: new Date().toISOString(),
              banners: true,
              comunicados: true,
              documentos: true,
              vozMorador: true,
              denuncias: true,
              reservas: true,
              iaChat: true
            }
          }
        })
      }

      const user = await tx.user.create({
        data: {
          nome: process.env.BOOTSTRAP_ADMIN_NAME || 'Karol Marques',
          email: ADMIN_EMAIL,
          senha,
          role: 'ADMIN',
          whatsapp: process.env.BOOTSTRAP_ADMIN_WHATSAPP || null,
          condominioId: condominio.id
        }
      })

      await tx.condominioAcesso.upsert({
        where: {
          userId_condominioId: {
            userId: user.id,
            condominioId: condominio.id
          }
        },
        update: { role: 'ADMIN' },
        create: {
          userId: user.id,
          condominioId: condominio.id,
          role: 'ADMIN'
        }
      })

      return { condominio, user }
    })

    console.log(`[bootstrap] Acesso master criado: ${result.user.email}`)
  } catch (error) {
    console.error('[bootstrap] Falha ao preparar dados iniciais:', error)
  }
}
