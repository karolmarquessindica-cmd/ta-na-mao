function slug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function planoItem(categoria, elemento, atividade, periodicidade, responsavelSugerido, referenciaLegal, prioridade = 'MEDIA', dias = 180, avisoAntecipado = 15) {
  return {
    codigo: slug(`${categoria}_${elemento}`),
    nome: elemento,
    elemento,
    categoria,
    atividade,
    frequencia: periodicidade,
    periodicidade,
    dias,
    referenciaLegal,
    responsavelSugerido,
    avisoAntecipado,
    prioridade,
  }
}

export const planoManutencaoBase = [
  planoItem('Área Comum', 'Academia', 'Inspecionar equipamentos, fixações, pisos, ventilação e condições de uso.', 'Mensal', 'Zeladoria / empresa de manutenção', 'Manual dos fabricantes e boas práticas de conservação predial', 'MEDIA', 30, 10),
  planoItem('Área Comum', 'Calçadas e lixeiras', 'Verificar trincas, desníveis, limpeza, coleta, tampas e sinalização de descarte.', 'Mensal', 'Zeladoria', 'Código de posturas municipal e boas práticas de segurança de circulação', 'BAIXA', 30, 7),
  planoItem('Área Comum', 'Garagens', 'Inspecionar demarcações, ventilação, iluminação, sinalização, drenagem e pontos de infiltração.', 'Mensal', 'Zeladoria / manutenção predial', 'Manual de uso, operação e manutenção da edificação', 'MEDIA', 30, 10),
  planoItem('Área Comum', 'Playground', 'Inspecionar brinquedos, fixações, piso amortecedor, cantos vivos e conservação geral.', 'Mensal', 'Zeladoria / empresa especializada', 'ABNT NBR 16071 e recomendações do fabricante', 'ALTA', 30, 15),

  planoItem('Desratização e Desinsetização', 'Desratização e desinsetização', 'Executar controle de pragas nas áreas comuns e registrar certificado de aplicação.', 'Semestral', 'Empresa controladora de pragas', 'Vigilância sanitária local e boas práticas de controle integrado de pragas', 'MEDIA', 180, 20),
  planoItem('Desratização e Desinsetização', 'Desratização e desinsetização residencial', 'Programar campanha para unidades interessadas e orientar moradores sobre preparação dos ambientes.', 'Semestral', 'Empresa controladora de pragas', 'Recomendação técnica especializada e vigilância sanitária local', 'MEDIA', 180, 20),

  planoItem('Documentos', 'Alvará Bombeiro', 'Controlar validade, renovação e exigências do AVCB/CLCB ou documento equivalente.', 'Anual ou conforme validade', 'Síndico / consultoria de segurança contra incêndio', 'Corpo de Bombeiros e legislação estadual aplicável', 'ALTA', 365, 60),
  planoItem('Documentos', 'Seguro predial', 'Controlar apólice, cobertura obrigatória, renovação e comprovantes do seguro predial.', 'Anual', 'Síndico / administradora / corretora', 'Código Civil, art. 1.346', 'ALTA', 365, 45),

  planoItem('Elevadores e Plataformas', 'Cabos, máquina e estrutura', 'Inspecionar conjunto de tração, cabos, máquina, freios, casa de máquinas e estrutura.', 'Mensal', 'Empresa conservadora de elevadores', 'Normas ABNT aplicáveis, contrato de manutenção e recomendações do fabricante', 'ALTA', 30, 15),
  planoItem('Elevadores e Plataformas', 'Elevador', 'Executar manutenção preventiva mensal, testes de segurança e registro em relatório técnico.', 'Mensal', 'Empresa conservadora de elevadores', 'Normas ABNT aplicáveis e legislação municipal quando houver', 'ALTA', 30, 15),
  planoItem('Elevadores e Plataformas', 'Relatório de Inspeção Anual — RIA', 'Emitir ou arquivar relatório anual de inspeção dos elevadores quando aplicável.', 'Anual', 'Engenheiro / empresa conservadora habilitada', 'Legislação municipal aplicável e normas técnicas do setor', 'ALTA', 365, 45),

  planoItem('Equipamentos de Incêndio', 'Equipamentos de incêndio / Extintores', 'Conferir carga, lacres, pressão, validade, localização, sinalização e acesso aos extintores.', 'Mensal visual e anual técnica', 'Empresa de segurança contra incêndio', 'ABNT NBR 12962 e normas do Corpo de Bombeiros', 'ALTA', 30, 15),
  planoItem('Equipamentos de Incêndio', 'Mangueiras e hidrantes', 'Inspecionar hidrantes, mangueiras, abrigos, esguichos, registros e teste hidrostático quando aplicável.', 'Anual', 'Empresa de segurança contra incêndio', 'ABNT NBR 12779 e normas do Corpo de Bombeiros', 'ALTA', 365, 45),
  planoItem('Equipamentos de Incêndio', 'Marcações de rotas de fuga', 'Verificar placas, setas, iluminação, desobstrução e legibilidade das rotas de fuga.', 'Mensal', 'Zeladoria / empresa de segurança contra incêndio', 'Normas do Corpo de Bombeiros e ABNT NBR 13434', 'ALTA', 30, 15),

  planoItem('Equipamentos Industrializados', 'Ar-condicionado', 'Limpar filtros, drenos, condensadoras e verificar desempenho e ruídos.', 'Trimestral', 'Técnico de climatização', 'PMOC quando aplicável, manual do fabricante e boas práticas de climatização', 'MEDIA', 90, 15),
  planoItem('Equipamentos Industrializados', 'Grupo gerador', 'Testar partida, bateria, nível de óleo, combustível, quadro de transferência e funcionamento em carga.', 'Mensal', 'Empresa especializada em geradores', 'Manual do fabricante e plano preventivo de emergência', 'ALTA', 30, 15),
  planoItem('Equipamentos Industrializados', 'Iluminação de emergência', 'Testar autonomia, carga, acionamento e posicionamento das luminárias de emergência.', 'Mensal', 'Empresa de segurança contra incêndio / eletricista', 'ABNT NBR 10898 e normas do Corpo de Bombeiros', 'ALTA', 30, 15),
  planoItem('Equipamentos Industrializados', 'Porta corta-fogo', 'Inspecionar fechamento automático, dobradiças, barras antipânico, vedação e ausência de travas indevidas.', 'Mensal', 'Empresa de segurança contra incêndio', 'ABNT NBR 11742 e normas do Corpo de Bombeiros', 'ALTA', 30, 15),
  planoItem('Equipamentos Industrializados', 'Pressurização de escada', 'Testar acionamento, sensores, ventiladores, dampers e pressão operacional.', 'Mensal', 'Empresa especializada em pressurização', 'Normas do Corpo de Bombeiros e projeto aprovado', 'ALTA', 30, 15),
  planoItem('Equipamentos Industrializados', 'Sistema de aquecimento solar', 'Verificar coletores, bombas, controladores, vazamentos, isolamento e reservatórios térmicos.', 'Trimestral', 'Empresa de aquecimento solar', 'Manual do fabricante e normas técnicas aplicáveis', 'MEDIA', 90, 15),
  planoItem('Equipamentos Industrializados', 'Sistema de exaustão de churrasqueiras', 'Limpar dutos, coifas, filtros, motores e verificar risco de gordura acumulada.', 'Trimestral', 'Empresa de exaustão / limpeza técnica', 'Recomendação técnica especializada e prevenção de incêndio', 'ALTA', 90, 20),
  planoItem('Equipamentos Industrializados', 'SPDA / Para-raio', 'Inspecionar captores, descidas, aterramento, conexões e medição ôhmica.', 'Anual', 'Engenheiro eletricista / empresa habilitada', 'ABNT NBR 5419', 'ALTA', 365, 45),

  planoItem('Esquadrias', 'Esquadrias em geral', 'Verificar vedação, roldanas, trilhos, ferragens, corrosão, folgas e pontos de infiltração.', 'Semestral', 'Manutenção predial / serralheria', 'Manual de uso, operação e manutenção da edificação', 'MEDIA', 180, 20),

  planoItem('Estrutura', 'Lajes, vigas e pilares', 'Inspecionar fissuras, deformações, corrosão aparente, infiltrações e sinais de sobrecarga.', 'Anual', 'Engenheiro civil', 'ABNT NBR 16747 e boas práticas de inspeção predial', 'ALTA', 365, 45),

  planoItem('Fachada', 'Fachada', 'Inspecionar revestimentos, juntas, fissuras, infiltrações, pingadeiras e riscos de desprendimento.', 'Anual', 'Engenheiro civil / empresa de fachada', 'ABNT NBR 5674 e inspeção predial', 'ALTA', 365, 45),
  planoItem('Fachada', 'Pintura do prédio', 'Avaliar pintura, selantes, fissuras, descascamentos e necessidade de recuperação.', 'Anual', 'Empresa de pintura predial', 'Manual de manutenção e recomendação do fabricante da tinta', 'MEDIA', 365, 30),
  planoItem('Fachada', 'Teste de percussão de pastilhas', 'Realizar teste de percussão para identificar peças soltas e risco de queda.', 'Anual', 'Engenheiro civil / empresa de fachada', 'Inspeção predial e boas práticas de segurança em fachadas', 'ALTA', 365, 45),

  planoItem('Iluminação', 'Iluminação em geral', 'Verificar lâmpadas, sensores, luminárias, quadros, fotocélulas e economia de energia.', 'Mensal', 'Zeladoria / eletricista', 'Boas práticas de manutenção elétrica predial', 'BAIXA', 30, 7),
  planoItem('Iluminação', 'Luz piloto', 'Conferir luzes piloto de painéis, equipamentos, bombas e sistemas de controle.', 'Mensal', 'Eletricista', 'Manual dos equipamentos e boas práticas de operação', 'MEDIA', 30, 10),
  planoItem('Iluminação', 'Postes', 'Inspecionar postes, bases, luminárias, aterramento, corrosão e cabeamento externo.', 'Trimestral', 'Eletricista / manutenção predial', 'Boas práticas de segurança elétrica externa', 'MEDIA', 90, 15),

  planoItem('Impermeabilização', 'Áreas molhadas, piscinas, reservatórios, coberturas e jardins', 'Inspecionar infiltrações, mantas, ralos, juntas, caimentos e pontos críticos de umidade.', 'Semestral', 'Empresa de impermeabilização / engenheiro', 'ABNT NBR 9575 e manual de manutenção da edificação', 'ALTA', 180, 30),
  planoItem('Impermeabilização', 'Impermeabilização de caixa d’água', 'Verificar integridade da impermeabilização interna, trincas, vazamentos e condições sanitárias.', 'Anual', 'Empresa especializada em reservatórios', 'ABNT NBR 9575 e boas práticas sanitárias', 'ALTA', 365, 45),

  planoItem('Instalações Elétricas', 'Quadro de distribuição de circuitos', 'Apertar conexões, identificar circuitos, verificar aquecimento, disjuntores, DR/DPS e limpeza.', 'Semestral', 'Eletricista qualificado', 'ABNT NBR 5410 e boas práticas de manutenção elétrica', 'ALTA', 180, 30),

  planoItem('Jardim', 'Jardim', 'Verificar poda, irrigação, pragas, drenagem, árvores de risco e conservação paisagística.', 'Mensal', 'Jardinagem / zeladoria', 'Recomendação técnica de paisagismo e normas municipais quando aplicável', 'BAIXA', 30, 7),

  planoItem('Louças e Metais', 'Dobradiças e fechaduras', 'Lubrificar, regular e substituir ferragens com folgas, ruídos ou travamentos.', 'Trimestral', 'Zeladoria / manutenção predial', 'Manual de uso e conservação dos fabricantes', 'BAIXA', 90, 10),
  planoItem('Louças e Metais', 'Pontos de ferrugem e corrosão', 'Mapear, tratar e proteger pontos de oxidação em metais, gradis, corrimãos e acessórios.', 'Semestral', 'Manutenção predial / serralheria', 'Boas práticas de conservação predial', 'MEDIA', 180, 20),

  planoItem('Pavimentação', 'Pavimento intertravado / paver / lajota', 'Verificar recalques, peças soltas, drenagem, vegetação entre juntas e recomposição.', 'Semestral', 'Manutenção predial / empresa de pavimentação', 'Manual de manutenção e boas práticas de circulação segura', 'MEDIA', 180, 20),
  planoItem('Pavimentação', 'Piso cimentado / concreto / contrapiso', 'Inspecionar fissuras, desplacamentos, desníveis, juntas e pontos de acúmulo de água.', 'Semestral', 'Manutenção predial / pedreiro', 'Boas práticas de manutenção de pisos e circulação segura', 'MEDIA', 180, 20),

  planoItem('Piscinas', 'Piscinas', 'Controlar qualidade da água, casa de máquinas, bordas, ralos, bombas e segurança de uso.', 'Semanal', 'Piscineiro / empresa de piscinas', 'Boas práticas sanitárias e normas locais de qualidade da água', 'MEDIA', 7, 3),
  planoItem('Piscinas', 'Piscinas — manutenção', 'Executar limpeza, aspiração, controle químico, filtros, bombas e registros operacionais.', 'Semanal', 'Piscineiro / empresa de piscinas', 'Recomendação técnica especializada e boas práticas sanitárias', 'MEDIA', 7, 3),
  planoItem('Piscinas', 'Rejuntamento de revestimento da piscina', 'Inspecionar falhas, peças soltas, rejuntamento, infiltrações e bordas cortantes.', 'Semestral', 'Empresa de piscinas / manutenção predial', 'Manual de manutenção e segurança de áreas molhadas', 'MEDIA', 180, 20),
  planoItem('Piscinas', 'Trocador de calor', 'Verificar serpentina, conexões, filtros, fluxo, vazamentos e desempenho térmico.', 'Trimestral', 'Técnico especializado em aquecimento', 'Manual do fabricante e boas práticas de manutenção', 'MEDIA', 90, 15),

  planoItem('Quadras Poliesportivas', 'Campo de grama natural', 'Verificar irrigação, drenagem, nivelamento, pragas, adubação e falhas no gramado.', 'Mensal', 'Jardinagem / manutenção esportiva', 'Recomendação técnica de conservação de gramados', 'BAIXA', 30, 7),
  planoItem('Quadras Poliesportivas', 'Campo de grama sintética', 'Escovar fibras, verificar emendas, enchimento, drenagem, descolamentos e pontos de desgaste.', 'Mensal', 'Empresa de pisos esportivos', 'Manual do fabricante e boas práticas de uso', 'MEDIA', 30, 10),
  planoItem('Quadras Poliesportivas', 'Quadras de concreto', 'Inspecionar trincas, pintura, drenagem, alambrados, iluminação e marcações.', 'Trimestral', 'Manutenção predial / empresa esportiva', 'Boas práticas de segurança em áreas esportivas', 'MEDIA', 90, 15),
  planoItem('Quadras Poliesportivas', 'Redes de proteção', 'Verificar rasgos, tensionamento, fixadores, pontos de corrosão e vida útil.', 'Trimestral', 'Empresa de redes de proteção', 'Recomendação do fabricante e boas práticas de segurança', 'ALTA', 90, 20),

  planoItem('Rejuntamento e Vedações', 'Rejuntamento e vedações', 'Inspecionar silicone, juntas, rejuntes, vedações de esquadrias e áreas molhadas.', 'Semestral', 'Manutenção predial', 'Manual de uso e manutenção da edificação', 'MEDIA', 180, 20),

  planoItem('Revestimentos', 'Deck de madeira', 'Verificar tábuas soltas, cupins, apodrecimento, fixações, lixamento e proteção superficial.', 'Semestral', 'Marceneiro / manutenção predial', 'Recomendação do fabricante e conservação de madeira externa', 'MEDIA', 180, 20),
  planoItem('Revestimentos', 'Paredes externas, fachadas e muros', 'Inspecionar trincas, manchas, desplacamentos, umidade, pintura e revestimentos soltos.', 'Semestral', 'Manutenção predial / engenheiro', 'ABNT NBR 5674 e boas práticas de inspeção predial', 'MEDIA', 180, 20),

  planoItem('Sistema de Gás', 'Sistema de gás', 'Inspecionar central, tubulações aparentes, ventilação, sinalização, registros e estanqueidade.', 'Semestral', 'Empresa especializada em gás', 'ABNT NBR 15526, normas locais e Corpo de Bombeiros', 'ALTA', 180, 30),
  planoItem('Sistema de Gás', 'Troca de componentes', 'Substituir reguladores, mangueiras, válvulas e componentes conforme vida útil e laudo técnico.', 'Anual', 'Empresa especializada em gás', 'Manual dos fabricantes e normas técnicas de gás', 'ALTA', 365, 45),

  planoItem('Sistema de Automação', 'Controle de acesso, segurança e sistemas', 'Testar controladoras, câmeras, leitores, nobreaks, fechaduras, sensores e logs do sistema.', 'Mensal', 'Empresa de automação / segurança eletrônica', 'Manual dos equipamentos e boas práticas de segurança patrimonial', 'MEDIA', 30, 10),
  planoItem('Sistema de Automação', 'Portões de acesso', 'Inspecionar motores, sensores, fotocélulas, cremalheiras, trilhos, controles e parada de segurança.', 'Mensal', 'Empresa de portões automáticos', 'Manual do fabricante e segurança operacional', 'ALTA', 30, 15),

  planoItem('Sistema de Drenagem Urbana', 'Boca de lobo / bueiro', 'Limpar grades, remover obstruções, verificar caixas, drenagem e risco de alagamento.', 'Trimestral', 'Zeladoria / empresa de limpeza técnica', 'Boas práticas de drenagem urbana e prevenção de enchentes', 'MEDIA', 90, 15),

  planoItem('Sistemas Hidrossanitários', 'Bomba de incêndio', 'Testar partida, pressão, quadro elétrico, válvulas, manômetros e regime de prontidão.', 'Mensal', 'Empresa de bombas / segurança contra incêndio', 'Normas do Corpo de Bombeiros e projeto de incêndio', 'ALTA', 30, 15),
  planoItem('Sistemas Hidrossanitários', 'Bombas de água potável', 'Inspecionar funcionamento, pressão, ruídos, vazamentos, alternância e quadro de comando.', 'Mensal', 'Empresa de bombas / hidráulica', 'Manual do fabricante e plano preventivo hidráulico', 'ALTA', 30, 15),
  planoItem('Sistemas Hidrossanitários', 'Bombas submersas', 'Testar acionamento, boias, recalque, cabos, limpeza e funcionamento em carga.', 'Mensal', 'Empresa de bombas / hidráulica', 'Manual do fabricante e boas práticas de drenagem', 'MEDIA', 30, 10),
  planoItem('Sistemas Hidrossanitários', 'Caixas de esgoto, gordura e águas servidas', 'Limpar caixas, verificar tampas, vedação, retorno, obstruções e descarte adequado.', 'Trimestral', 'Empresa limpa-fossa / hidráulica', 'Vigilância sanitária local e boas práticas hidrossanitárias', 'ALTA', 90, 20),
  planoItem('Sistemas Hidrossanitários', 'Metais, acessórios e registros', 'Verificar vazamentos, travamentos, corrosão, pressão e substituição preventiva de registros.', 'Trimestral', 'Encanador / manutenção predial', 'Manual de uso e boas práticas hidráulicas', 'MEDIA', 90, 15),
  planoItem('Sistemas Hidrossanitários', 'Ralos, grelhas, calhas e canaletas', 'Limpar, desobstruir e inspecionar quedas, grelhas quebradas, calhas e canaletas.', 'Mensal', 'Zeladoria / manutenção predial', 'Boas práticas de drenagem e conservação predial', 'MEDIA', 30, 10),
  planoItem('Sistemas Hidrossanitários', 'Reservatório de água potável — boia', 'Testar boia, extravasor, registros, válvulas, tampa e vedação do reservatório.', 'Mensal', 'Encanador / manutenção predial', 'Boas práticas sanitárias e manutenção hidráulica', 'ALTA', 30, 15),
  planoItem('Sistemas Hidrossanitários', 'Reservatório de água potável — nível e boias', 'Conferir nível, sensores, boias elétricas, alarmes, extravasores e automatização.', 'Mensal', 'Encanador / eletricista', 'Manual de operação hidráulica e boas práticas sanitárias', 'ALTA', 30, 15),
  planoItem('Sistemas Hidrossanitários', 'Reservatório de água potável — limpeza e potabilidade', 'Executar limpeza, desinfecção e análise de potabilidade com documentação.', 'Semestral', 'Empresa especializada em reservatórios', 'Vigilância sanitária local e padrões de potabilidade', 'ALTA', 180, 30),
  planoItem('Sistemas Hidrossanitários', 'Sistema de irrigação', 'Verificar bombas, aspersores, gotejamento, automação, vazamentos e programação.', 'Mensal', 'Jardinagem / irrigação', 'Manual do sistema e boas práticas de uso racional da água', 'BAIXA', 30, 7),
]

export function getPlanoItem(codigo) {
  return planoManutencaoBase.find(item => item.codigo === codigo)
}
