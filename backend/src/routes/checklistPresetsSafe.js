import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

export const checklistPresetsSafeRouter = Router()
checklistPresetsSafeRouter.use(authenticate)

const presets = [
  ['Abertura diária do condomínio','Rotina diária','DIARIO','Zelador / responsável operacional','Conferência geral de abertura e condições iniciais das áreas comuns.',[
    'Portões de pedestres e veículos funcionando normalmente','Portaria e controle de acesso operando normalmente','Iluminação das áreas comuns sem falhas aparentes','Elevadores em funcionamento, quando houver','Bombas e quadro de recalque sem alarmes aparentes','Áreas comuns sem vazamentos ou infiltrações aparentes','Rotas de circulação e saídas desobstruídas','Lixeiras e pontos de descarte em condições adequadas','Registrar ocorrências ou anormalidades encontradas']],
  ['Fechamento diário e segurança','Segurança','DIARIO','Zelador / portaria','Verificação de segurança e encerramento da rotina diária.',[
    'Portões e acessos fechando corretamente','Portas de áreas restritas devidamente fechadas','Iluminação externa e de segurança funcionando','Áreas de lazer conferidas conforme horário de funcionamento','Objetos ou obstáculos retirados das circulações','Nenhuma situação de risco aparente nas áreas comuns','Registrar ocorrência identificada no fechamento']],
  ['Limpeza das áreas comuns','Limpeza','DIARIO','ASG / auxiliar de serviços gerais','Controle diário da limpeza e organização das áreas comuns.',[
    'Hall de entrada e portaria limpos','Halls e corredores limpos','Escadas e corrimãos limpos','Elevadores limpos, quando houver','Banheiros das áreas comuns higienizados','Academia, brinquedoteca e salas comuns organizadas, quando houver','Deck, salão de festas e áreas de convivência limpos, quando houver','Lixeiras recolhidas e higienizadas quando necessário','Vidros e guarda-corpos sem sujeira excessiva','Materiais de limpeza armazenados adequadamente','Registrar necessidade de manutenção observada durante a limpeza']],
  ['Vistoria semanal de segurança','Segurança','SEMANAL','Síndico / zelador','Inspeção visual dos principais itens de segurança condominial.',[
    'Extintores presentes, sinalizados e sem obstrução','Mangueiras e hidrantes acessíveis, quando houver','Iluminação de emergência sem avarias aparentes','Rotas de fuga e escadas livres e desobstruídas','Corrimãos e guarda-corpos firmes','Portões automáticos sem ruídos ou falhas anormais','Cerca elétrica, CFTV e controles de acesso operando, quando houver','Quadros elétricos fechados e sem sinais de aquecimento ou ferrugem','Casa de máquinas e áreas técnicas com acesso restrito','Registrar fotos ou ocorrências dos itens irregulares']],
  ['Piscina e área de lazer','Lazer','SEMANAL','Zelador / piscineiro','Inspeção operacional da piscina, deck e equipamentos da área de lazer.',[
    'Água visualmente limpa e em condições adequadas','Parâmetros da água conferidos pelo responsável técnico/prestador','Ralos, grelhas e dispositivos de sucção sem avarias aparentes','Casa de máquinas sem vazamentos ou alagamento','Filtro, bomba e tubulações sem ruídos ou vazamentos anormais','Deck sem peças soltas, escorregadias ou danificadas','Chuveiro e ralos funcionando','Mobiliário da área de lazer em bom estado','Placas e regras de uso visíveis, quando aplicável','Registrar manutenção necessária']],
  ['Bombas, cisterna e abastecimento de água','Hidráulica','SEMANAL','Zelador / manutenção','Verificação visual do sistema de abastecimento, bombas e recalque.',[
    'Quadro de comando energizado e sem alarmes aparentes','Bombas operando sem ruído ou vibração anormal','Tubulações e conexões sem vazamentos aparentes','Registros em posição operacional adequada','Cisterna/reservatório sem sinais visíveis de contaminação ou acesso indevido','Boias e acionamentos aparentam funcionamento normal','Casa de bombas seca, organizada e sem materiais indevidos','Registrar falhas e necessidade de assistência técnica']],
  ['Portões, portas e controle de acesso','Acesso e segurança','SEMANAL','Zelador / portaria','Conferência preventiva dos acessos do condomínio.',[
    'Portão de veículos abre e fecha normalmente','Portão de pedestres abre e fecha normalmente','Sensores e dispositivos de segurança funcionando','Fechaduras, eletroímãs e interfones operando','Controles, tags ou leitores funcionando','Portas de blocos e áreas comuns fechando corretamente','Nenhum acesso improvisado ou vulnerável identificado','Registrar defeitos e providências necessárias']],
  ['Iluminação e instalações elétricas aparentes','Elétrica','SEMANAL','Zelador / manutenção','Inspeção visual das instalações elétricas acessíveis e iluminação comum.',[
    'Lâmpadas das áreas comuns funcionando','Iluminação externa e jardins funcionando','Iluminação de emergência sem avarias aparentes','Quadros elétricos fechados e identificados','Sem fios expostos ou tomadas danificadas aparentes','Sem sinais de aquecimento, cheiro de queimado ou oxidação','Equipamentos elétricos comuns funcionando normalmente','Registrar pontos que exigem eletricista qualificado']],
  ['Vistoria de playground e brinquedoteca','Lazer e segurança','SEMANAL','Zelador / síndico','Inspeção visual dos brinquedos, mobiliários e condições de uso.',[
    'Brinquedos firmes e sem peças soltas','Sem pontas, parafusos ou partes cortantes expostas','Piso sem risco aparente de queda ou acidente','Mobiliário em bom estado','Ambiente limpo e organizado','Tomadas e instalações protegidas','Regras de utilização visíveis, quando aplicável','Registrar interdição imediata de item inseguro']],
  ['Vistoria de academia','Lazer e equipamentos','SEMANAL','Zelador / síndico','Conferência visual dos equipamentos e condições da academia.',[
    'Equipamentos firmes e sem peças soltas','Cabos, bancos e estruturas sem danos aparentes','Esteiras e equipamentos elétricos sem choque, ruído ou falha aparente','Tomadas e extensões sem avarias','Piso limpo, seco e sem obstáculos','Ventilação e iluminação adequadas','Regras de uso visíveis, quando aplicável','Equipamento com defeito retirado de uso ou sinalizado']],
  ['Coleta de lixo e lixeira','Resíduos','DIARIO','ASG / zelador','Rotina de acondicionamento, coleta e higiene dos resíduos.',[
    'Lixeira organizada e sem resíduos fora dos recipientes','Sacos devidamente acondicionados','Ausência de vazamentos de chorume','Piso sem acúmulo excessivo de sujeira','Portas e acessos da lixeira funcionando','Coleta realizada conforme programação','Higienização executada quando programada','Sem descarte irregular nas áreas comuns','Registrar necessidade de dedetização ou manutenção']],
  ['Jardins e áreas externas','Áreas externas','SEMANAL','Zelador / jardinagem','Inspeção de conservação dos jardins, calçadas e áreas externas.',[
    'Jardins sem acúmulo de lixo','Vegetação sem obstruir circulação ou equipamentos','Árvores sem galhos aparentemente perigosos sobre áreas de circulação','Calçadas e pisos sem obstáculos relevantes','Ralos externos sem obstrução aparente','Iluminação externa funcionando','Sinais de pragas ou necessidade de poda registrados','Registrar reparos necessários']],
  ['Inspeção após chuva forte','Vistoria extraordinária','MANUAL','Síndico / zelador','Checklist para vistoria após chuvas intensas ou eventos climáticos.',[
    'Garagens e áreas baixas sem alagamento','Ralos e drenagens escoando normalmente','Casa de máquinas sem entrada de água','Quadros elétricos sem contato com água ou umidade aparente','Fachadas e halls sem novas infiltrações aparentes','Muros, coberturas e telhados sem danos aparentes','Árvores e galhos sem risco aparente','Elevadores e poços sem ocorrência relacionada à água, quando aplicável','Registrar fotos e chamados necessários']],
  ['Vistoria mensal geral do síndico','Gestão e inspeção','MENSAL','Síndico','Ronda mensal para registrar conservação, segurança, manutenção e pendências.',[
    'Áreas comuns vistoriadas','Pendências de manutenção revisadas','Contratos e serviços recorrentes conferidos','Equipamentos de segurança visualmente conferidos','Limpeza e conservação avaliadas','Chamados pendentes revisados','Garantias e ocorrências construtivas verificadas','Necessidades de comunicação aos moradores identificadas','Orçamentos ou serviços necessários registrados','Fotos da vistoria anexadas quando necessário']],
  ['Preparação do salão de festas','Reservas e eventos','MANUAL','Zelador / responsável pela entrega','Conferência antes da liberação do espaço reservado.',[
    'Ambiente limpo e organizado','Mesas e cadeiras conferidas','Banheiros limpos e abastecidos','Iluminação e tomadas funcionando','Pias, torneiras e ralos funcionando','Equipamentos disponíveis conferidos','Sem avarias aparentes antes da entrega','Regras e horário informados ao responsável','Registrar fotos antes da utilização']],
  ['Vistoria pós-uso do salão de festas','Reservas e eventos','MANUAL','Zelador / responsável pela entrega','Conferência do espaço após reserva para registrar limpeza e eventuais danos.',[
    'Mesas e cadeiras devolvidas e conferidas','Ambiente entregue limpo conforme regras','Banheiros sem avarias','Equipamentos e utensílios conferidos','Paredes, portas e mobiliário sem novos danos aparentes','Lixo retirado corretamente','Chaves ou controles devolvidos','Registrar fotos e eventual ocorrência/dano']]
]

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function fields(items) {
  return items.map(label => ({
    label,
    type: /registrar|fotos/i.test(label) ? 'AREA' : 'CHECKBOX',
    required: false,
    options: [],
  }))
}

async function scopedCondominioId(req) {
  const requested = req.query.condominioId || req.user?.condominioId
  if (!requested) return null
  if (requested === req.user?.condominioId) return requested
  const access = await prisma.condominio.findFirst({
    where: {
      id: requested,
      OR: [
        { users: { some: { id: req.user.id } } },
        { acessos: { some: { userId: req.user.id } } },
      ],
    },
    select: { id: true },
  })
  return access?.id || null
}

checklistPresetsSafeRouter.get('/templates', async (req, res, next) => {
  try {
    const condominioId = await scopedCondominioId(req)
    if (!condominioId) return next()

    const current = await prisma.checklistTemplate.findMany({
      where: { condominioId },
      select: { nome: true },
    })
    const existing = new Set(current.map(item => normalize(item.nome)))

    const missing = presets.filter(([nome]) => !existing.has(normalize(nome)))
    if (missing.length) {
      await prisma.checklistTemplate.createMany({
        data: missing.map(([nome, categoria, recorrencia, responsavelPadrao, descricao, itens]) => ({
          nome,
          categoria,
          recorrencia,
          responsavelPadrao,
          descricao,
          ativo: true,
          campos: fields(itens),
          condominioId,
        })),
      })
    }

    next()
  } catch (error) {
    next(error)
  }
})
