-- Gemóvel · dados de exemplo (Etapa 1)
-- Apaga os dados atuais e carrega os de exemplo. Rode depois do 01_estrutura.sql.
-- Pode rodar de novo quando quiser (por exemplo, no dia da apresentação): as datas são
-- relativas a hoje (CURDATE()), então o painel sempre parece atual. Abaixo, D = hoje.
--   Terminal (Git Bash): mysql -u root --default-character-set=utf8mb4 < banco/02_dados_exemplo.sql
--   phpMyAdmin: aba Importar, escolha este arquivo.
-- Contas: e-mails @gemovel.test, todas com a mesma senha de teste, que está no LEIA-ME.md.
-- Aqui fica só o hash da senha (werkzeug).

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
-- O MySQL Workbench liga o "safe updates", que recusaria os DELETE sem WHERE logo abaixo.
SET SESSION sql_safe_updates = 0;
USE gemovel;

-- Limpa os dados atuais, das tabelas "filhas" para as "mães", e zera a numeração das tarefas.
DELETE FROM historico_tarefa;
DELETE FROM tarefa;
DELETE FROM bloqueio;
DELETE FROM reserva;
DELETE FROM hospede;
DELETE FROM imovel;
DELETE FROM funcionario;
DELETE FROM usuario;
ALTER TABLE tarefa AUTO_INCREMENT = 1;
ALTER TABLE historico_tarefa AUTO_INCREMENT = 1;

-- Contas: 2 administradores e 4 funcionários (todos da Marina).
SET @hash = 'scrypt:32768:8:1$CZXJUldDNZie8Mgm$c0ada8d2fc24f84e8ecf3c189c71bfc466e32a6345d0ef5ef7e349c77265b122bc60575a0aba1f313ca59e3918f9062faa7937d261795097da3797802b0e6a6c';

INSERT INTO usuario (id, nome, email, senha_hash, telefone, perfil) VALUES
  (1, 'Marina Alves',    'marina@gemovel.test', @hash, '(11) 98101-2020', 'administrador'),
  (2, 'Paulo Mendes',    'paulo@gemovel.test',  @hash, '(11) 98202-3030', 'administrador'),
  (3, 'Cida Ramos',      'cida@gemovel.test',   @hash, '(11) 98303-4040', 'funcionario'),
  (4, 'Júlia Lima',      'julia@gemovel.test',  @hash, '(11) 98404-5050', 'funcionario'),
  (5, 'Marcos Teixeira', 'marcos@gemovel.test', @hash, '(11) 98505-6060', 'funcionario'),
  (6, 'Rafael Souza',    'rafael@gemovel.test', @hash, '(11) 98606-7070', 'funcionario');

INSERT INTO funcionario (usuario_id, administrador_id, funcao) VALUES
  (3, 1, 'limpeza'),
  (4, 1, 'limpeza'),
  (5, 1, 'limpeza'),
  (6, 1, 'manutencao');

-- Imóveis: 8 da Marina e 1 do Paulo. Horários de entrada e saída: os padrões (15:00 e 11:00).
INSERT INTO imovel (id, administrador_id, nome, logradouro, numero, complemento, bairro, cidade, uf, cep, capacidade, valor_diaria, observacoes) VALUES
  (1, 1, 'Loft Pinheiros',       'Rua dos Pinheiros',      '1020', 'ap. 52',    'Pinheiros',     'São Paulo',        'SP', '05422-001', 2, 380.00, 'Chave na portaria. Avisar o porteiro na chegada.'),
  (2, 1, 'Cobertura Moema',      'Alameda dos Maracatins', '780',  'cobertura', 'Moema',         'São Paulo',        'SP', '04089-001', 6, 620.00, 'Pedir a senha do portão social à administradora.'),
  (3, 1, 'Casa Lapa',            'Rua Guaicurus',          '455',  NULL,        'Lapa',          'São Paulo',        'SP', '05033-001', 5, 340.00, NULL),
  (4, 1, 'Studio Vila Madalena', 'Rua Harmonia',           '230',  'ap. 14',    'Vila Madalena', 'São Paulo',        'SP', '05435-000', 2, 260.00, 'Fechadura eletrônica: o código muda a cada reserva.'),
  (5, 1, 'Loft Vila Mariana',    'Rua Domingos de Morais', '1500', 'ap. 81',    'Vila Mariana',  'São Paulo',        'SP', '04010-100', 3, 300.00, NULL),
  (6, 1, 'Apto Jardins',         'Rua Haddock Lobo',       '900',  'ap. 33',    'Jardins',       'São Paulo',        'SP', '01414-001', 4, 450.00, 'Vaga de garagem nº 12.'),
  (7, 1, 'Casa da Praia',        'Rua das Gaivotas',       '120',  NULL,        'Itaguá',        'Ubatuba',          'SP', '11680-000', 8, 520.00, 'Chave com o caseiro, Sr. Jorge. Lavar as toalhas de praia à parte.'),
  (8, 1, 'Chalé da Serra',       'Rua Djalma Forjaz',      '300',  NULL,        'Capivari',      'Campos do Jordão', 'SP', '12460-000', 4, 480.00, 'Lenha para a lareira no depósito dos fundos.'),
  (9, 2, 'Casa do Lago',         'Estrada do Lago',        's/n',  NULL,        'Represa',       'Atibaia',          'SP', NULL,        6, 410.00, NULL);

-- Hóspedes: 14 da Marina e 1 do Paulo. O Thiago Ribeiro volta duas vezes.
INSERT INTO hospede (id, administrador_id, nome, telefone, email, observacoes) VALUES
  (1,  1, 'Helena Duarte',   '(11) 99110-1001', 'helena.duarte@example.com',   NULL),
  (2,  1, 'Mariana Costa',   '(21) 99220-2002', 'mariana.costa@example.com',   NULL),
  (3,  1, 'Gabriel Moura',   '(31) 99330-3003', NULL,                          NULL),
  (4,  1, 'Larissa Campos',  '(11) 99440-4004', 'larissa.campos@example.com',  NULL),
  (5,  1, 'Thiago Ribeiro',  '(41) 99550-5005', 'thiago.ribeiro@example.com',  'Hóspede frequente.'),
  (6,  1, 'André Barros',    '(11) 99660-6006', NULL,                          NULL),
  (7,  1, 'Fernanda Lima',   '(19) 99770-7007', 'fernanda.lima@example.com',   'Viaja com um cachorro pequeno.'),
  (8,  1, 'Bruno Carvalho',  '(11) 99880-8008', NULL,                          NULL),
  (9,  1, 'Daniela Rocha',   '(51) 99990-9009', 'daniela.rocha@example.com',   NULL),
  (10, 1, 'Eduardo Martins', '(11) 98111-1010', NULL,                          'Chega de voo à noite, por volta das 21:00.'),
  (11, 1, 'Isabela Freitas', '(11) 98222-1111', 'isabela.freitas@example.com', NULL),
  (12, 1, 'Carla Nogueira',  '(61) 98333-1212', 'carla.nogueira@example.com',  NULL),
  (13, 1, 'Otávio Lins',     '(81) 98444-1313', NULL,                          NULL),
  (14, 1, 'Letícia Araújo',  '(11) 98555-1414', 'leticia.araujo@example.com',  NULL),
  (15, 2, 'Ricardo Nunes',   '(11) 98666-1515', 'ricardo.nunes@example.com',   NULL);

-- Reservas. Diária = a do imóvel; total = diária × noites (menos o da Carla, editado à mão).
-- Sair e entrar no mesmo dia pode: no Loft Pinheiros, a Helena sai em D-1 e a Mariana entra em D-1.
INSERT INTO reserva (id, imovel_id, hospede_id, data_entrada, data_saida, num_hospedes, valor_diaria, valor_total, status, observacoes) VALUES
  (1,  1, 1,  CURDATE() - INTERVAL 7 DAY,  CURDATE() - INTERVAL 1 DAY,  2, 380.00, 2280.00, 'confirmada', NULL),
  (2,  1, 2,  CURDATE() - INTERVAL 1 DAY,  CURDATE() + INTERVAL 2 DAY,  2, 380.00, 1140.00, 'confirmada', NULL),
  (3,  1, 3,  CURDATE() + INTERVAL 3 DAY,  CURDATE() + INTERVAL 7 DAY,  1, 380.00, 1520.00, 'confirmada', NULL),
  (4,  1, 4,  CURDATE() + INTERVAL 8 DAY,  CURDATE() + INTERVAL 10 DAY, 2, 380.00,  760.00, 'confirmada', NULL),
  (5,  2, 5,  CURDATE() - INTERVAL 4 DAY,  CURDATE(),                   4, 620.00, 2480.00, 'confirmada', NULL),
  (6,  2, 6,  CURDATE() + INTERVAL 5 DAY,  CURDATE() + INTERVAL 9 DAY,  5, 620.00, 2480.00, 'confirmada', NULL),
  (7,  3, 7,  CURDATE() - INTERVAL 2 DAY,  CURDATE() + INTERVAL 3 DAY,  3, 340.00, 1700.00, 'confirmada', NULL),
  (8,  4, 8,  CURDATE() - INTERVAL 9 DAY,  CURDATE() - INTERVAL 6 DAY,  1, 260.00,  780.00, 'confirmada', NULL),
  (9,  4, 9,  CURDATE() + INTERVAL 1 DAY,  CURDATE() + INTERVAL 4 DAY,  2, 260.00,  780.00, 'confirmada', NULL),
  (10, 5, 10, CURDATE(),                   CURDATE() + INTERVAL 4 DAY,  2, 300.00, 1200.00, 'confirmada', NULL),
  (11, 6, 11, CURDATE() - INTERVAL 3 DAY,  CURDATE(),                   2, 450.00, 1350.00, 'confirmada', NULL),
  (12, 6, 12, CURDATE() + INTERVAL 2 DAY,  CURDATE() + INTERVAL 6 DAY,  3, 450.00, 1620.00, 'confirmada', 'Total editado: 10% de desconto pelas 4 noites.'),
  (13, 7, 5,  CURDATE() + INTERVAL 10 DAY, CURDATE() + INTERVAL 15 DAY, 6, 520.00, 2600.00, 'confirmada', NULL),
  (14, 7, 13, CURDATE() + INTERVAL 4 DAY,  CURDATE() + INTERVAL 8 DAY,  4, 520.00, 2080.00, 'cancelada',  'Cancelada pelo hóspede.'),
  (15, 8, 14, CURDATE() - INTERVAL 5 DAY,  CURDATE() - INTERVAL 2 DAY,  2, 480.00, 1440.00, 'confirmada', NULL),
  (16, 9, 15, CURDATE() + INTERVAL 1 DAY,  CURDATE() + INTERVAL 5 DAY,  4, 410.00, 1640.00, 'confirmada', NULL);

INSERT INTO bloqueio (id, imovel_id, data_inicio, data_fim, motivo) VALUES
  (1, 8, CURDATE() + INTERVAL 3 DAY,  CURDATE() + INTERVAL 6 DAY,  'Troca do aquecedor'),
  (2, 5, CURDATE() + INTERVAL 20 DAY, CURDATE() + INTERVAL 23 DAY, 'Uso do proprietário');

-- R4: cada reserva confirmada gera a limpeza de saída, agendada para o dia da saída, no horário
-- de saída do imóvel, e com prazo no horário de entrada (quando o próximo hóspede pode chegar).
-- Responsável: rodízio entre Cida (3), Júlia (4) e Marcos (5), só se for funcionário do mesmo
-- administrador do imóvel (R6). Por isso a limpeza da Casa do Lago fica sem responsável.
-- Status: saída antes de hoje = concluída; saída hoje = em andamento; depois de hoje = pendente.
INSERT INTO tarefa (imovel_id, reserva_id, funcionario_id, tipo, titulo, agendada_para, prazo, status, iniciada_em, concluida_em, criada_em)
SELECT r.imovel_id,
       r.id,
       f.usuario_id,
       'limpeza',
       'Limpeza de saída',
       TIMESTAMP(r.data_saida, i.horario_saida),
       TIMESTAMP(r.data_saida, i.horario_entrada),
       CASE WHEN r.data_saida < CURDATE() THEN 'concluida'
            WHEN r.data_saida = CURDATE() THEN 'em_andamento'
            ELSE 'pendente' END,
       CASE WHEN r.data_saida <= CURDATE() THEN TIMESTAMP(r.data_saida, i.horario_saida) END,
       CASE WHEN r.data_saida <  CURDATE() THEN TIMESTAMP(r.data_saida, '14:00:00') END,
       LEAST(TIMESTAMP(r.data_saida, i.horario_saida) - INTERVAL 3 DAY, NOW())
FROM reserva r
JOIN imovel i ON i.id = r.imovel_id
LEFT JOIN funcionario f ON f.usuario_id = 3 + (r.id % 3) AND f.administrador_id = i.administrador_id
WHERE r.status = 'confirmada'
ORDER BY r.id;

-- Manutenções do Rafael.
INSERT INTO tarefa (imovel_id, reserva_id, funcionario_id, tipo, titulo, descricao, agendada_para, prazo, status, iniciada_em, concluida_em, criada_em) VALUES
  (4, NULL, 6, 'manutencao', 'Trocar a torneira do banheiro',
   'A torneira do banheiro está pingando. A próxima hóspede chega amanhã.',
   TIMESTAMP(CURDATE(), '09:00:00'), TIMESTAMP(CURDATE(), '12:00:00'),
   'pendente', NULL, NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '18:30:00')),
  (8, NULL, 6, 'manutencao', 'Trocar o aquecedor',
   'O aquecedor a gás parou. O chalé fica bloqueado durante a troca.',
   TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '09:00:00'), TIMESTAMP(CURDATE() + INTERVAL 5 DAY, '18:00:00'),
   'pendente', NULL, NULL, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '10:00:00')),
  (3, NULL, 6, 'manutencao', 'Revisar o ar-condicionado',
   'Limpar os filtros e testar o ar-condicionado da sala.',
   TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '09:00:00'), NULL,
   'concluida', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '09:00:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '11:30:00'),
   TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '16:00:00'));

-- Histórico (R5). Criação: anterior vazio → pendente, registrada pelo administrador do imóvel,
-- que é quem cria a tarefa (ao registrar a reserva ou ao pedir a manutenção).
INSERT INTO historico_tarefa (tarefa_id, usuario_id, status_anterior, status_novo, observacao, registrado_em)
SELECT t.id, i.administrador_id, NULL, 'pendente', NULL, t.criada_em
FROM tarefa t
JOIN imovel i ON i.id = t.imovel_id
ORDER BY t.id;

-- Início: pendente → em andamento, pelo responsável (ou pelo administrador, se não houver).
INSERT INTO historico_tarefa (tarefa_id, usuario_id, status_anterior, status_novo, observacao, registrado_em)
SELECT t.id, COALESCE(t.funcionario_id, i.administrador_id), 'pendente', 'em_andamento', NULL, t.iniciada_em
FROM tarefa t
JOIN imovel i ON i.id = t.imovel_id
WHERE t.iniciada_em IS NOT NULL
ORDER BY t.id;

-- Conclusão: em andamento → concluída, com uma observação em duas delas.
INSERT INTO historico_tarefa (tarefa_id, usuario_id, status_anterior, status_novo, observacao, registrado_em)
SELECT t.id, COALESCE(t.funcionario_id, i.administrador_id), 'em_andamento', 'concluida',
       CASE WHEN t.tipo = 'manutencao' THEN 'Filtros limpos; o ar está gelando bem.'
            WHEN t.reserva_id = 1 THEN 'Faltava sabonete, reposto.' END,
       t.concluida_em
FROM tarefa t
JOIN imovel i ON i.id = t.imovel_id
WHERE t.status = 'concluida'
ORDER BY t.id;
