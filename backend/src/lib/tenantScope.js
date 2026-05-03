import { prisma } from './prisma.js'

const CONDOMINIO_SELECT = {
  id: true,
  nome: true,
  logo: true,
  cidade: true,
  estado: true,
  tipoEdificacao: true,
  ativo: true,
}

function withLogoUrl(item) {
  return item ? { ...item, logoUrl: item.logo || null } : item
}

function uniqById(items) {
  const seen = new Set()
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export async function getAccessibleCondominios(user) {
  if (!user?.id) return []

  if (user.role === 'ADMIN') {
    const condominios = await prisma.condominio.findMany({
      select: CONDOMINIO_SELECT,
      orderBy: { nome: 'asc' },
    })
    return condominios.map(withLogoUrl)
  }

  if (user.role === 'MORADOR') {
    if (!user.condominioId) return []
    const condominio = await prisma.condominio.findUnique({
      where: { id: user.condominioId },
      select: CONDOMINIO_SELECT,
    })
    return condominio ? [withLogoUrl(condominio)] : []
  }

  const condominios = await prisma.condominio.findMany({
    where: {
      OR: [
        { acessos: { some: { userId: user.id } } },
        { users: { some: { id: user.id } } },
        ...(user.condominioId ? [{ id: user.condominioId }] : []),
      ],
    },
    select: CONDOMINIO_SELECT,
    orderBy: { nome: 'asc' },
  })

  return uniqById(condominios).map(withLogoUrl)
}

export async function resolveCondominioScope(user, selectedValue) {
  const condominios = await getAccessibleCondominios(user)
  const accessibleIds = condominios.map(item => item.id)
  const selected = String(selectedValue || 'all').trim()
  const normalized = selected.toLowerCase()
  const selectedCondominioId = ['all', 'todos', 'todas', ''].includes(normalized) ? 'all' : selected

  if (!accessibleIds.length) {
    return {
      condominios,
      condominioIds: [],
      selectedCondominioId: 'all',
      all: true,
      label: 'Nenhuma edificacao',
      logoUrl: null,
    }
  }

  if (selectedCondominioId !== 'all') {
    if (!accessibleIds.includes(selectedCondominioId)) {
      const error = new Error('Edificacao fora do acesso deste usuario')
      error.status = 403
      error.code = 'CONDOMINIO_FORBIDDEN'
      throw error
    }

    const condominio = condominios.find(item => item.id === selectedCondominioId)
    return {
      condominios,
      condominioIds: [selectedCondominioId],
      selectedCondominioId,
      all: false,
      label: condominio?.nome || 'Edificacao selecionada',
      logoUrl: condominio?.logo || null,
    }
  }

  const single = accessibleIds.length === 1 ? condominios[0] : null
  return {
    condominios,
    condominioIds: accessibleIds,
    selectedCondominioId: 'all',
    all: true,
    label: accessibleIds.length === 1 ? condominios[0].nome : 'Todas as edificacoes',
    logoUrl: single?.logo || null,
  }
}

function parseDate(value, endOfDay = false) {
  if (!value) return null
  const raw = String(value)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
  const date = dateOnly
    ? new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(raw)

  return Number.isNaN(date.getTime()) ? null : date
}

export function buildDateRange(field, de, ate) {
  const range = {}
  const start = parseDate(de)
  const end = parseDate(ate, true)
  if (start) range.gte = start
  if (end) range.lte = end
  return Object.keys(range).length ? { [field]: range } : {}
}

export function buildCondominioWhere(condominioIds) {
  return condominioIds.length === 1
    ? { condominioId: condominioIds[0] }
    : { condominioId: { in: condominioIds } }
}
