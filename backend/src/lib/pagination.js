// src/lib/pagination.js — Helper de paginação offset-based

/**
 * Extrai e valida parâmetros de paginação de req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination(query) {
  let page = parseInt(query.page) || 1
  let limit = parseInt(query.limit) || 20

  if (page < 1) page = 1
  if (limit < 1) limit = 1
  if (limit > 100) limit = 100

  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/**
 * Monta a resposta paginada padrão
 * @param {{ data: any[], total: number, page: number, limit: number }} opts
 */
export function paginatedResponse({ data, total, page, limit }) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }
}
