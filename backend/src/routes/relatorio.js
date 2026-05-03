// src/routes/relatorio.js
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { buildCondominioWhere, buildDateRange, resolveCondominioScope } from '../lib/tenantScope.js'

export const relatorioRouter = Router()
relatorioRouter.use(authenticate)

// Helper: formatar data pt-BR
function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function htmlSafe(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

function absoluteAssetUrl(req, url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${req.protocol}://${req.get('host')}${url}`
  return url
}

const NONE = '__none__'

function categoryParts(value) {
  const raw = String(value || 'all')
  if (raw === 'all') return { area: 'all', value: 'all' }
  const [area, ...rest] = raw.split(':')
  return rest.length ? { area, value: rest.join(':') } : { area: 'legacy', value: raw }
}

function applyManutencaoCategory(where, categoria) {
  const { area, value } = categoryParts(categoria)
  if (area === 'all') return where
  if (area === 'manutencao' && ['PREVENTIVA', 'CORRETIVA'].includes(value)) return { ...where, tipo: value }
  if (area === 'plano' && value) {
    return {
      ...where,
      OR: [
        { inventario: { is: { categoria: value } } },
        { planoItens: { some: { categoria: value } } },
      ],
    }
  }
  if (area === 'legacy' && ['PREVENTIVA', 'CORRETIVA'].includes(value)) return { ...where, tipo: value }
  return { ...where, id: NONE }
}

function applyChamadoCategory(where, categoria, user) {
  const { area, value } = categoryParts(categoria)
  const scoped = user.role === 'MORADOR' ? { ...where, moradorId: user.id } : where
  if (area === 'all') return scoped
  if (area === 'chamado' && ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(value)) return { ...scoped, categoria: value }
  if (area === 'legacy' && ['MANUTENCAO', 'RECLAMACAO', 'SUGESTAO'].includes(value)) return { ...scoped, categoria: value }
  return { ...scoped, id: NONE }
}

function applyOnlyAllCategory(where, categoria) {
  return categoryParts(categoria).area === 'all' ? where : { ...where, id: NONE }
}

async function reportContext(req) {
  const selected = req.query.edificacaoId || req.query.condominioId || 'all'
  const scope = await resolveCondominioScope(req.user, selected)
  const scopedLogoUrl = absoluteAssetUrl(req, scope.logoUrl)
  const baseWhere = scope.condominioIds.length
    ? { ...buildCondominioWhere(scope.condominioIds), ...buildDateRange('createdAt', req.query.de, req.query.ate) }
    : { id: NONE }
  return { scope: { ...scope, logoUrl: scopedLogoUrl }, baseWhere, categoria: req.query.categoria || 'all', logoUrl: scopedLogoUrl }
}

function periodoLabel(de, ate, fallback) {
  if (de && ate) return `Periodo: ${fmtData(de)} a ${fmtData(ate)}`
  if (de) return `A partir de ${fmtData(de)}`
  if (ate) return `Ate ${fmtData(ate)}`
  return fallback
}

// ─── Gerar HTML para impressão (converte para PDF no client) ──
function gerarHTMLRelatorio({ titulo, condominio, logoUrl, periodo, colunas, linhas, rodape }) {
  const rows = linhas.map(l =>
    `<tr>${l.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`
  ).join('')
  const safeCondominio = htmlSafe(condominio)
  const brand = logoUrl
    ? `<div class="brand"><img class="brand-logo" src="${htmlSafe(logoUrl)}" alt="${safeCondominio}"><div><div class="brand-title">${safeCondominio}</div><div class="brand-sub">TA NA MAO</div></div></div>`
    : `<div class="brand"><div><div class="brand-title">${safeCondominio}</div><div class="brand-sub">TA NA MAO</div></div></div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a2840; padding: 40px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; border-bottom: 3px solid #0F4C81; padding-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 260px; }
  .brand-logo { width: 64px; height: 64px; object-fit: contain; border: 1px solid #e2ebf6; border-radius: 12px; padding: 6px; background: #fff; }
  .brand-title { font-size: 18px; font-weight: 800; color: #0F4C81; line-height: 1.15; }
  .brand-sub { font-size: 10px; color: #6b7fa3; font-weight: 800; letter-spacing: 1.4px; margin-top: 4px; }
  .logo { display: none; }
  .meta { text-align: right; font-size: 12px; color: #6b7fa3; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #0F4C81; }
  .periodo { font-size: 12px; color: #6b7fa3; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #0F4C81; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
  td { padding: 9px 12px; border-bottom: 1px solid #e2ebf6; font-size: 12px; }
  tr:nth-child(even) td { background: #f8faff; }
  tr:last-child td { border-bottom: none; }
  .rodape { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2ebf6; font-size: 11px; color: #6b7fa3; display: flex; justify-content: space-between; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .badge-verde { background: #d4edda; color: #155724; }
  .badge-amarelo { background: #fff3cd; color: #856404; }
  .badge-azul { background: #cce5ff; color: #004085; }
  .badge-vermelho { background: #f8d7da; color: #721c24; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    ${brand}
    <div class="logo">Tá na <span>Mão</span></div>
    <div style="font-size:13px; color:#1a2840; margin-top:4px; font-weight:600;">${brand ? '' : condominio}</div>
  </div>
  <div class="meta">
    <div>Emitido em: ${fmtData(new Date())}</div>
    <div>Tá na Mão — Sistema de Gestão Condominial</div>
  </div>
</div>
<h1>${titulo}</h1>
<div class="periodo">${periodo || ''}</div>
<table>
  <thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="rodape">
  <span>${rodape || ''}</span>
  <span>www.tanamaao.com.br</span>
</div>
</body></html>`
}

// ─── ENDPOINTS ────────────────────────────────────────────

// GET /api/relatorios/manutencoes
relatorioRouter.get('/manutencoes', async (req, res, next) => {
  try {
    const { de, ate, status } = req.query
    const { scope, baseWhere, categoria, logoUrl } = await reportContext(req)
    const where = applyManutencaoCategory({ ...baseWhere }, categoria)
    if (status) where.status = status

    const items = await prisma.manutencao.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { inventario: { select: { nome: true } } }
    })

    const statusLabels = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído' }
    const html = gerarHTMLRelatorio({
      titulo: 'Relatório de Manutenções',
      condominio: scope.label,
      logoUrl,
      periodo: periodoLabel(de, ate, 'Todas as manutenções'),
      colunas: ['Título', 'Tipo', 'Status', 'Prioridade', 'Responsável', 'Vencimento', 'Conclusão'],
      linhas: items.map(m => [
        m.titulo,
        m.tipo === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva',
        statusLabels[m.status],
        m.prioridade,
        m.responsavel || '—',
        fmtData(m.dataVencimento),
        fmtData(m.dataConclusao),
      ]),
      rodape: `Total: ${items.length} manutenções`
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) { next(e) }
})

// GET /api/relatorios/chamados
relatorioRouter.get('/chamados', async (req, res, next) => {
  try {
    const { de, ate, status } = req.query
    const { scope, baseWhere, categoria, logoUrl } = await reportContext(req)
    const where = applyChamadoCategory({ ...baseWhere }, categoria, req.user)
    if (status) where.status = status

    const items = await prisma.chamado.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { morador: { select: { nome: true, unidade: true } } }
    })

    const html = gerarHTMLRelatorio({
      titulo: 'Relatório de Chamados',
      condominio: scope.label,
      logoUrl,
      periodo: periodoLabel(de, ate, 'Todos os chamados'),
      colunas: ['Título', 'Categoria', 'Morador', 'Unidade', 'Status', 'Data Abertura', 'Conclusão'],
      linhas: items.map(c => [
        c.titulo, c.categoria,
        c.morador?.nome || '—',
        c.morador?.unidade || '—',
        c.status,
        fmtData(c.createdAt),
        fmtData(c.dataConclusao),
      ]),
      rodape: `Total: ${items.length} chamados | Concluídos: ${items.filter(c => c.status === 'CONCLUIDO').length}`
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) { next(e) }
})

// GET /api/relatorios/financeiro
relatorioRouter.get('/financeiro', async (req, res, next) => {
  try {
    const { mes, ano, de, ate } = req.query
    const { scope, baseWhere, categoria, logoUrl } = await reportContext(req)
    const where = applyOnlyAllCategory({ ...baseWhere }, categoria)
    if (mes) where.mes = parseInt(mes)
    if (ano) where.ano = parseInt(ano)

    const taxas = await prisma.taxa.findMany({
      where, orderBy: [{ status: 'asc' }, { vencimento: 'asc' }],
      include: { morador: { select: { nome: true, unidade: true, bloco: true } } }
    })

    const total = taxas.reduce((s, t) => s + t.valor, 0)
    const pago  = taxas.filter(t => t.status === 'PAGO').reduce((s, t) => s + t.valor, 0)
    const inadimplente = taxas.filter(t => t.status !== 'PAGO' && t.status !== 'ISENTO').length

    const html = gerarHTMLRelatorio({
      titulo: `Relatório Financeiro${mes && ano ? ` — ${mes}/${ano}` : ''}`,
      condominio: scope.label,
      logoUrl,
      periodo: `${periodoLabel(de, ate, 'Todas as taxas')} | Arrecadado: ${fmtMoeda(pago)} / ${fmtMoeda(total)} | Inadimplentes: ${inadimplente}`,
      colunas: ['Morador', 'Unidade', 'Descrição', 'Valor', 'Vencimento', 'Status', 'Pagamento'],
      linhas: taxas.map(t => [
        t.morador?.nome || '—',
        `${t.morador?.unidade || ''} ${t.morador?.bloco || ''}`.trim() || '—',
        t.descricao,
        fmtMoeda(t.valor),
        fmtData(t.vencimento),
        t.status,
        fmtData(t.pagamentoEm),
      ]),
      rodape: `Total cobrado: ${fmtMoeda(total)} | Recebido: ${fmtMoeda(pago)} | Pendente: ${fmtMoeda(total - pago)}`
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) { next(e) }
})

// GET /api/relatorios/inventario
relatorioRouter.get('/inventario', async (req, res, next) => {
  try {
    const { scope, baseWhere, categoria, logoUrl } = await reportContext(req)
    const where = applyOnlyAllCategory({ ...baseWhere }, categoria)
    const items = await prisma.inventario.findMany({
      where,
      include: { _count: { select: { manutencoes: true } } },
      orderBy: { categoria: 'asc' }
    })
    const html = gerarHTMLRelatorio({
      titulo: 'Relatório de Inventário',
      condominio: scope.label,
      logoUrl,
      periodo: `Total de equipamentos: ${items.length}`,
      colunas: ['Código', 'Nome', 'Categoria', 'Status', 'Aquisição', 'Garantia até', 'Manutenções'],
      linhas: items.map(i => [
        i.codigo, i.nome, i.categoria, i.status,
        fmtData(i.dataAquisicao), fmtData(i.garantiaAte),
        i._count.manutencoes,
      ]),
      rodape: `Emitido em ${fmtData(new Date())}`
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) { next(e) }
})

// GET /api/relatorios/moradores
relatorioRouter.get('/moradores', async (req, res, next) => {
  try {
    const { scope, baseWhere, categoria, logoUrl } = await reportContext(req)
    const where = applyOnlyAllCategory({ ...baseWhere }, categoria)
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ bloco: 'asc' }, { unidade: 'asc' }]
    })
    const html = gerarHTMLRelatorio({
      titulo: 'Relatório de Moradores',
      condominio: scope.label,
      logoUrl,
      periodo: `Total: ${users.length} pessoas cadastradas`,
      colunas: ['Nome', 'Perfil', 'Unidade', 'Bloco', 'Email', 'WhatsApp', 'Status'],
      linhas: users.map(u => [
        u.nome, u.role, u.unidade || '—', u.bloco || '—',
        u.email, u.whatsapp || '—', u.ativo ? 'Ativo' : 'Inativo'
      ]),
      rodape: `Moradores ativos: ${users.filter(u => u.ativo).length}`
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) { next(e) }
})

// GET /api/relatorios/dados — JSON com todos os dados para gráficos
relatorioRouter.get('/dados', async (req, res, next) => {
  try {
    const { baseWhere, categoria } = await reportContext(req)
    const [
      manutPorStatus, chamadosPorCat, vozVotos, taxasPorStatus
    ] = await Promise.all([
      prisma.manutencao.groupBy({ by: ['status'], where: applyManutencaoCategory({ ...baseWhere }, categoria), _count: true }),
      prisma.chamado.groupBy({ by: ['categoria'], where: applyChamadoCategory({ ...baseWhere }, categoria, req.user), _count: true }),
      prisma.vozMorador.findMany({ where: applyOnlyAllCategory({ ...baseWhere }, categoria), include: { _count: { select: { votos: true } } }, orderBy: { votos: { _count: 'desc' } }, take: 5 }),
      prisma.taxa.groupBy({ by: ['status'], where: applyOnlyAllCategory({ ...baseWhere }, categoria), _count: true, _sum: { valor: true } }),
    ])
    res.json({ manutPorStatus, chamadosPorCat, vozVotos, taxasPorStatus })
  } catch (e) { next(e) }
})
