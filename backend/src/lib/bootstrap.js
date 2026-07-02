import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'

const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@horizonte.com'
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'senha123'

export async function ensureBootstrapData() {
  if (process.env.DISABLE_BOOTSTRAP === 'true') return

  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
    if (existing) {
      console.log(`[bootstrap] Usuário inicial já existe: ${ADMIN_EMAIL}`)
      return
    }

    console.log('[bootstrap] Criando condomínio e usuário inicial...')

    const senha = await bcrypt.hash(ADMIN_PASSWORD, 10)

    const result = await prisma.$transaction(async tx => {
      let condominio = await tx.condominio.findFirst({
        where: { nome: 'Residencial Horizonte' }
      })

      if (!condominio) {
        condominio = await tx.condominio.create({
          data: {
            nome: 'Residencial Horizonte',
            endereco: 'Fortaleza - CE',
            cidade: 'Fortaleza',
            estado: 'CE',
            telefone: '(85) 3000-0001',
            email: 'contato@residencialhorizonte.com.br',
            tipoEdificacao: 'RESIDENCIAL_VERTICAL',
            blocos: 3,
            unidades: 96,
            pavimentos: 12,
            portalConfig: {
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
          nome: process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador Tá na Mão',
          email: ADMIN_EMAIL,
          senha,
          role: 'ADMIN',
          whatsapp: process.env.BOOTSTRAP_ADMIN_WHATSAPP || '5585999990001',
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

    console.log(`[bootstrap] Acesso inicial criado: ${result.user.email}`)
  } catch (error) {
    console.error('[bootstrap] Falha ao preparar dados iniciais:', error)
  }
}
