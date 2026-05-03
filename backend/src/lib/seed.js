// src/lib/seed.js — Tá na Mão v2.0
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed v2.0...\n')

  // Limpar banco
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.notificacao.deleteMany(),
    prisma.whatsAppLog.deleteMany(),
    prisma.reserva.deleteMany(),
    prisma.contaSindico.deleteMany(),
    prisma.taxa.deleteMany(),
    prisma.comentario.deleteMany(),
    prisma.voto.deleteMany(),
    prisma.vozMorador.deleteMany(),
    prisma.historicoChamado.deleteMany(),
    prisma.chamado.deleteMany(),
    prisma.planoManutencaoItem.deleteMany(),
    prisma.manutencao.deleteMany(),
    prisma.documento.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.inventario.deleteMany(),
    prisma.denuncia.deleteMany(),
    prisma.comunicado.deleteMany(),
    prisma.configWhatsApp.deleteMany(),
    prisma.espacoComum.deleteMany(),
    prisma.condominioAcesso.deleteMany(),
    prisma.user.deleteMany(),
    prisma.condominio.deleteMany(),
  ])
  console.log('🗑️  Banco limpo\n')

  // Condomínio
  const condo = await prisma.condominio.create({
    data: {
      nome: 'Residencial Horizonte',
      endereco: 'Rua das Flores, 500 — Bairro Boa Vista, Fortaleza - CE',
      cidade: 'Fortaleza',
      estado: 'CE',
      cep: '60150-160',
      cnpj: '12.345.678/0001-99',
      telefone: '(85) 3000-0001',
      email: 'contato@residencialhorizonte.com.br',
      tipoEdificacao: 'RESIDENCIAL_VERTICAL',
      blocos: 3,
      unidades: 96,
      pavimentos: 12,
      mandatoInicio: new Date('2026-01-01'),
      mandatoFim: new Date('2027-12-31'),
      seguroPossui: true,
      seguroSeguradora: 'Porto Seguro',
      seguroApolice: 'AP-HORIZONTE-2026',
      seguroInicio: new Date('2026-01-01'),
      seguroVencimento: new Date('2026-12-31'),
      portalConfig: { banners: true, comunicados: true, documentos: true, vozMorador: true, denuncias: true, reservas: true, iaChat: true },
    },
  })
  console.log('✅ Condomínio:', condo.nome)

  // Usuários
  const hash = await bcrypt.hash('senha123', 10)
  const admin = await prisma.user.create({ data: { nome: 'Roberto Alves', email: 'admin@horizonte.com', senha: hash, role: 'ADMIN', whatsapp: '5585999990001', condominioId: condo.id } })
  const sindico = await prisma.user.create({ data: { nome: 'Cláudia Martins', email: 'sindico@horizonte.com', senha: hash, role: 'SINDICO', whatsapp: '5585999990002', condominioId: condo.id } })
  const moradores = await Promise.all([
    prisma.user.create({ data: { nome: 'João Silva',      email: 'joao@email.com',     senha: hash, role: 'MORADOR', unidade: 'Ap. 204', bloco: 'Bloco A', whatsapp: '5585999990003', condominioId: condo.id } }),
    prisma.user.create({ data: { nome: 'Maria Costa',    email: 'maria@email.com',    senha: hash, role: 'MORADOR', unidade: 'Ap. 312', bloco: 'Bloco B', whatsapp: '5585999990004', condominioId: condo.id } }),
    prisma.user.create({ data: { nome: 'Pedro Melo',     email: 'pedro@email.com',    senha: hash, role: 'MORADOR', unidade: 'Ap. 101', bloco: 'Bloco A', whatsapp: '5585999990005', condominioId: condo.id } }),
    prisma.user.create({ data: { nome: 'Ana Lima',       email: 'ana@email.com',      senha: hash, role: 'MORADOR', unidade: 'Ap. 508', bloco: 'Bloco C', whatsapp: '5585999990006', condominioId: condo.id } }),
    prisma.user.create({ data: { nome: 'Carlos Pereira', email: 'carlos@email.com',   senha: hash, role: 'MORADOR', unidade: 'Ap. 203', bloco: 'Bloco A', whatsapp: '5585999990007', condominioId: condo.id } }),
    prisma.user.create({ data: { nome: 'Fernanda Castro',email: 'fernanda@email.com', senha: hash, role: 'MORADOR', unidade: 'Ap. 405', bloco: 'Bloco B', whatsapp: '5585999990008', condominioId: condo.id } }),
  ])
  console.log('✅ Usuários:', moradores.length + 2)

  await prisma.condominioAcesso.createMany({ data: [
    { userId: admin.id, condominioId: condo.id, role: 'ADMIN' },
    { userId: sindico.id, condominioId: condo.id, role: 'SINDICO' },
  ]})
  console.log('✅ Acessos multi-condomínio criados')

  // Inventário
  const [bomba, gerador, elevador, cftv, portao] = await Promise.all([
    prisma.inventario.create({ data: { nome: "Bomba d'água principal", codigo: 'EQ-001', categoria: 'Hidráulico',  status: 'Operacional', dataAquisicao: new Date('2022-01-15'), condominioId: condo.id } }),
    prisma.inventario.create({ data: { nome: 'Gerador de emergência',  codigo: 'EQ-002', categoria: 'Elétrico',    status: 'Manutenção',  dataAquisicao: new Date('2021-03-20'), condominioId: condo.id } }),
    prisma.inventario.create({ data: { nome: 'Elevador 1',             codigo: 'EQ-003', categoria: 'Elevadores',  status: 'Operacional', dataAquisicao: new Date('2019-06-10'), condominioId: condo.id } }),
    prisma.inventario.create({ data: { nome: 'Central CFTV',           codigo: 'EQ-004', categoria: 'Segurança',   status: 'Operacional', dataAquisicao: new Date('2023-11-05'), condominioId: condo.id } }),
    prisma.inventario.create({ data: { nome: 'Portão automático',      codigo: 'EQ-005', categoria: 'Portaria',    status: 'Manutenção',  dataAquisicao: new Date('2020-07-01'), condominioId: condo.id } }),
  ])
  console.log('✅ Inventário criado')

  // Manutenções
  const d3 = new Date(); d3.setDate(d3.getDate() + 3)
  const d7 = new Date(); d7.setDate(d7.getDate() + 7)
  const d14= new Date(); d14.setDate(d14.getDate() + 14)
  await Promise.all([
    prisma.manutencao.create({ data: { titulo: "Bomba d'água — Revisão geral",      tipo: 'PREVENTIVA', status: 'PENDENTE',     prioridade: 'ALTA',  responsavel: 'Hidro Serviços Ltda', dataVencimento: d3,  condominioId: condo.id, inventarioId: bomba.id,    checklist: [{ item: 'Verificar pressão', feito: false }, { item: 'Lubrificar rolamentos', feito: false }] } }),
    prisma.manutencao.create({ data: { titulo: 'Elevador 1 — Lubrificação mensal',  tipo: 'PREVENTIVA', status: 'EM_ANDAMENTO', prioridade: 'MEDIA', responsavel: 'ElevaTec',           dataVencimento: d7,  condominioId: condo.id, inventarioId: elevador.id } }),
    prisma.manutencao.create({ data: { titulo: 'Portão automático — Reparo motor',  tipo: 'CORRETIVA',  status: 'EM_ANDAMENTO', prioridade: 'ALTA',  responsavel: 'Portões Sul',         dataVencimento: d3,  condominioId: condo.id, inventarioId: portao.id } }),
    prisma.manutencao.create({ data: { titulo: 'Pintura corredor Bloco B',          tipo: 'CORRETIVA',  status: 'CONCLUIDO',    prioridade: 'BAIXA', responsavel: 'Pinturas Fortaleza',  dataConclusao: new Date('2025-04-15'), condominioId: condo.id } }),
    prisma.manutencao.create({ data: { titulo: 'CFTV — Câmera 3 substituição',      tipo: 'CORRETIVA',  status: 'PENDENTE',     prioridade: 'MEDIA', dataVencimento: d14, condominioId: condo.id, inventarioId: cftv.id } }),
    prisma.manutencao.create({ data: { titulo: 'Gerador — Troca de óleo',           tipo: 'PREVENTIVA', status: 'PENDENTE',     prioridade: 'MEDIA', responsavel: 'Geradorpel',          dataVencimento: d14, condominioId: condo.id, inventarioId: gerador.id } }),
  ])
  console.log('✅ Manutenções criadas')

  // Chamados
  const c1 = await prisma.chamado.create({ data: { titulo: 'Vazamento na garagem — vaga 12', descricao: 'Há vazamento de água no teto da garagem, próximo à vaga 12.', categoria: 'MANUTENCAO', status: 'EM_ANALISE', prioridade: 'ALTA', moradorId: moradores[0].id, responsavelId: sindico.id, condominioId: condo.id } })
  await prisma.historicoChamado.createMany({ data: [{ chamadoId: c1.id, acao: 'Chamado aberto pelo morador' }, { chamadoId: c1.id, acao: 'Chamado em análise', nota: 'Acionei a empresa de hidráulica.' }] })
  const c2 = await prisma.chamado.create({ data: { titulo: 'Barulho excessivo após 22h', descricao: 'Barulho intenso no corredor do 3º andar do Bloco B.', categoria: 'RECLAMACAO', status: 'ABERTO', prioridade: 'MEDIA', moradorId: moradores[1].id, condominioId: condo.id } })
  await prisma.historicoChamado.create({ data: { chamadoId: c2.id, acao: 'Chamado aberto pelo morador' } })
  const c3 = await prisma.chamado.create({ data: { titulo: 'Instalar rack de bicicletas', descricao: 'Um rack na garagem seria muito útil.', categoria: 'SUGESTAO', status: 'CONCLUIDO', prioridade: 'BAIXA', moradorId: moradores[2].id, condominioId: condo.id, resposta: 'Rack instalado! Obrigado pela sugestão!', dataConclusao: new Date() } })
  await prisma.historicoChamado.createMany({ data: [{ chamadoId: c3.id, acao: 'Chamado aberto pelo morador' }, { chamadoId: c3.id, acao: 'Chamado concluído', nota: 'Rack instalado.' }] })
  await prisma.chamado.create({ data: { titulo: 'Luz queimada no hall do Bloco C', descricao: 'Lâmpada queimada há 3 dias.', categoria: 'MANUTENCAO', status: 'ABERTO', prioridade: 'BAIXA', moradorId: moradores[3].id, condominioId: condo.id } })
  console.log('✅ Chamados criados')

  // Documentos
  await prisma.documento.createMany({ data: [
    { nome: 'Convenção do Condomínio 2024.pdf', pasta: 'Jurídico',    tipo: 'PDF',   acesso: 'PUBLICO',  url: '/uploads/convencao-2024.pdf',  tamanho: 2300000, condominioId: condo.id },
    { nome: 'Ata Assembleia Março 2025.pdf',    pasta: 'Assembleias', tipo: 'PDF',   acesso: 'PUBLICO',  url: '/uploads/ata-mar-2025.pdf',     tamanho:  856000, condominioId: condo.id },
    { nome: 'Orçamento Anual 2025.xlsx',        pasta: 'Financeiro',  tipo: 'Excel', acesso: 'PRIVADO',  url: '/uploads/orcamento-2025.xlsx',  tamanho: 1100000, condominioId: condo.id },
    { nome: 'Regulamento Interno.pdf',          pasta: 'Jurídico',    tipo: 'PDF',   acesso: 'PUBLICO',  url: '/uploads/regulamento.pdf',      tamanho:  540000, condominioId: condo.id },
    { nome: 'Contrato Empresa Limpeza.pdf',     pasta: 'Contratos',   tipo: 'PDF',   acesso: 'PRIVADO',  url: '/uploads/contrato-limpeza.pdf', tamanho:  320000, condominioId: condo.id },
  ]})
  console.log('✅ Documentos criados')

  // Banners
  await prisma.banner.createMany({ data: [
    { titulo: 'Assembleia Geral — 30 de Abril às 19h',     imagem: '🏢', ordem: 1, ativo: true,  condominioId: condo.id },
    { titulo: 'Manutenção Elevador — 24/04 das 8h às 12h', imagem: '🔧', ordem: 2, ativo: true,  condominioId: condo.id },
    { titulo: 'Festa Junina — 28 de Junho!',               imagem: '🎉', ordem: 3, ativo: false, condominioId: condo.id },
    { titulo: 'Novo sistema de reservas disponível!',       imagem: '📱', ordem: 4, ativo: true,  condominioId: condo.id },
  ]})
  console.log('✅ Banners criados')

  // Voz do Morador
  const [v1, v2, v3, v4] = await Promise.all([
    prisma.vozMorador.create({ data: { titulo: 'Criar área pet-friendly no jardim',             descricao: 'Muitos moradores têm pets e precisam de espaço adequado.', autorId: moradores[3].id, condominioId: condo.id } }),
    prisma.vozMorador.create({ data: { titulo: 'Instalar carregadores para veículos elétricos', descricao: 'Precisamos de pontos de recarga na garagem.', autorId: moradores[4].id, condominioId: condo.id } }),
    prisma.vozMorador.create({ data: { titulo: 'Academia ao ar livre no estacionamento',         descricao: 'Espaço de exercícios ao ar livre seria muito valorizado.', autorId: moradores[0].id, condominioId: condo.id } }),
    prisma.vozMorador.create({ data: { titulo: 'App de reservas de churrasqueira',               descricao: 'Facilitar reservas pelo celular.', autorId: moradores[2].id, condominioId: condo.id } }),
  ])
  await prisma.voto.createMany({ data: [
    { userId: moradores[0].id, vozId: v1.id }, { userId: moradores[1].id, vozId: v1.id },
    { userId: moradores[2].id, vozId: v1.id }, { userId: moradores[4].id, vozId: v1.id }, { userId: moradores[5].id, vozId: v1.id },
    { userId: moradores[0].id, vozId: v2.id }, { userId: moradores[3].id, vozId: v2.id }, { userId: moradores[5].id, vozId: v2.id },
    { userId: moradores[1].id, vozId: v3.id }, { userId: moradores[2].id, vozId: v3.id },
    { userId: moradores[0].id, vozId: v4.id },
  ]})
  await prisma.comentario.createMany({ data: [
    { texto: 'Ótima ideia! Meu cachorro agradece 🐾', autorId: moradores[0].id, vozId: v1.id },
    { texto: 'Apoio! Já tenho um elétrico.', autorId: moradores[4].id, vozId: v2.id },
  ]})
  console.log('✅ Voz do Morador criada')

  // Comunicados
  await prisma.comunicado.createMany({ data: [
    { titulo: 'Assembleia Geral',        conteudo: '30 de Abril às 19h no salão de festas. Pauta: prestação de contas.',    emoji: '📋', fixado: true,  condominioId: condo.id },
    { titulo: 'Manutenção Elevador',     conteudo: 'No dia 24/04 das 8h às 12h o elevador 1 ficará fora de operação.',      emoji: '🔧', condominioId: condo.id },
    { titulo: "Falta d'água programada", conteudo: "Em 25/04 das 6h às 10h haverá falta d'água para manutenção.",           emoji: '💧', condominioId: condo.id },
    { titulo: 'Boas-vindas ao Tá na Mão!', conteudo: 'O sistema está disponível! Acesse e aproveite todas as funcionalidades.', emoji: '🎉', condominioId: condo.id },
  ]})
  console.log('✅ Comunicados criados')

  // Espaços Comuns + Reserva
  const [salao] = await Promise.all([
    prisma.espacoComum.create({ data: { nome: 'Salão de Festas',  descricao: 'Capacidade para 80 pessoas', capacidade: 80,  regras: 'Horário máximo: 23h. Limpeza obrigatória.', condominioId: condo.id } }),
    prisma.espacoComum.create({ data: { nome: 'Churrasqueira A',  descricao: '4 churrasqueiras cobertas',  capacidade: 30,  regras: 'Reservar com 48h de antecedência.',          condominioId: condo.id } }),
    prisma.espacoComum.create({ data: { nome: 'Quadra Esportiva', descricao: 'Quadra poliesportiva iluminada', capacidade: 20, regras: 'Uso até 22h.',                             condominioId: condo.id } }),
  ])
  const hoje = new Date()
  await prisma.reserva.create({ data: { espacoId: salao.id, moradorId: moradores[0].id, condominioId: condo.id, data: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 5), horaInicio: '14:00', horaFim: '22:00', status: 'CONFIRMADA', observacao: 'Festa de aniversário' } })
  console.log('✅ Espaços e reservas criados')

  // Taxas
  const mes = hoje.getMonth() + 1; const ano = hoje.getFullYear()
  const venc = new Date(ano, mes - 1, 10)
  await Promise.all(moradores.map((m, i) =>
    prisma.taxa.create({ data: { descricao: 'Taxa Condominial', valor: 450.00, vencimento: venc, mes, ano, status: i === 0 ? 'PAGO' : i < 3 ? 'PENDENTE' : 'ATRASADO', pagamentoEm: i === 0 ? new Date() : null, moradorId: m.id, condominioId: condo.id } })
  ))
  console.log('✅ Taxas condominiais criadas')

  // Contas do síndico
  await prisma.contaSindico.createMany({ data: [
    { descricao: 'DARF retenções de serviços', categoria: 'IMPOSTO', fornecedor: 'Receita Federal', documento: 'DARF-04/2026', valor: 1280.75, vencimento: new Date(ano, mes - 1, 20), competenciaMes: mes, competenciaAno: ano, status: 'A_PAGAR', condominioId: condo.id },
    { descricao: 'Folha equipe de limpeza', categoria: 'MAO_DE_OBRA', fornecedor: 'Equipe interna', documento: 'FOLHA-04/2026', valor: 6200.00, vencimento: new Date(ano, mes - 1, 30), competenciaMes: mes, competenciaAno: ano, status: 'AGENDADO', recorrente: true, condominioId: condo.id },
    { descricao: 'Serviço de jardinagem', categoria: 'SERVICO', fornecedor: 'Verde Jardins ME', documento: 'NF-1832', valor: 950.00, vencimento: new Date(ano, mes - 1, 12), competenciaMes: mes, competenciaAno: ano, status: 'PAGO', pagamentoEm: new Date(ano, mes - 1, 10), recorrente: true, condominioId: condo.id },
    { descricao: 'Material eletrico para garagem', categoria: 'FORNECEDOR', fornecedor: 'Eletro Forte', documento: 'NF-9910', valor: 740.30, vencimento: new Date(ano, mes - 1, 16), competenciaMes: mes, competenciaAno: ano, status: 'A_PAGAR', condominioId: condo.id },
    { descricao: 'Seguro predial parcela mensal', categoria: 'SEGURO', fornecedor: 'Porto Seguro', documento: 'AP-2026-04', valor: 2100.00, vencimento: new Date(ano, mes - 1, 8), competenciaMes: mes, competenciaAno: ano, status: 'VENCIDO', recorrente: true, condominioId: condo.id },
  ]})
  console.log('✅ Contas do síndico criadas')

  // Denúncias
  await prisma.denuncia.createMany({ data: [
    { codigo: 'NSC-0001', categoria: 'PROBLEMA_INTERNO', descricao: 'Obras não autorizadas no Ap. 301 do Bloco A aos finais de semana.', local: 'Bloco A, Ap. 301', anonimo: true, anexos: [], status: 'RECEBIDO', prioridade: 'MEDIA', risco: 'Médio', acoesSugeridas: 'Analisar e acompanhar.', lida: false, condominioId: condo.id },
    { codigo: 'NSC-0002', categoria: 'CONDUTA_INADEQUADA', descricao: 'Morador usando área de serviço comum para guardar móveis pessoais.', local: 'Área de serviço', anonimo: true, anexos: [], status: 'EM_ANALISE', prioridade: 'MEDIA', risco: 'Médio', acoesSugeridas: 'Verificar com a administração e orientar o morador.', lida: true, condominioId: condo.id },
  ]})
  console.log('✅ Denúncias criadas')

  // Config WhatsApp
  await prisma.configWhatsApp.create({ data: { condominioId: condo.id, apiUrl: 'https://api.z-api.io', apiKey: '', instanceId: '', ativo: false } })
  console.log('✅ Config WhatsApp criada\n')

  console.log('✨ Seed concluído!')
  console.log('─'.repeat(50))
  console.log('📧 Credenciais:')
  console.log('   Admin:   admin@horizonte.com   / senha123')
  console.log('   Síndico: sindico@horizonte.com / senha123')
  console.log('   Morador: joao@email.com        / senha123')
  console.log('─'.repeat(50))
}

main()
  .catch(e => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
