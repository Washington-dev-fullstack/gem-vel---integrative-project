-- Gemóvel · testes do banco (Etapa 1)
-- Confere os dados de exemplo e tenta gravar dados inválidos, que o banco precisa recusar.
-- Rode depois do 01 e do 02, no Git Bash:
--   mysql -u root --default-character-set=utf8mb4 --batch --skip-column-names --unbuffered --force < banco/03_testes.sql
-- (--force continua depois de cada erro; --unbuffered mantém cada ERROR logo abaixo do seu "Teste N".)
-- Resultado esperado:
--   primeira linha: contagens 6 4 9 15 16 2 18 28
--   sete linhas começando com ERROR, uma para cada "Teste N" (nada é gravado: tudo termina em ROLLBACK).

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
USE gemovel;

SELECT 'contagens', (SELECT COUNT(*) FROM usuario), (SELECT COUNT(*) FROM funcionario),
       (SELECT COUNT(*) FROM imovel), (SELECT COUNT(*) FROM hospede), (SELECT COUNT(*) FROM reserva),
       (SELECT COUNT(*) FROM bloqueio), (SELECT COUNT(*) FROM tarefa), (SELECT COUNT(*) FROM historico_tarefa);

-- ---------------------------------------------------------------------------
-- Consultas de conferência
-- ---------------------------------------------------------------------------

SELECT 'Agenda de hoje (entra Eduardo Martins; saem Thiago Ribeiro e Isabela Freitas)';
SELECT CASE WHEN r.data_entrada = CURDATE() THEN 'entrada' ELSE 'saída' END AS movimento,
       h.nome AS hospede, i.nome AS imovel
FROM reserva r
JOIN hospede h ON h.id = r.hospede_id
JOIN imovel i ON i.id = r.imovel_id
WHERE r.status = 'confirmada' AND CURDATE() IN (r.data_entrada, r.data_saida)
ORDER BY movimento, hospede;

SELECT 'Tarefas da Cida Ramos';
SELECT t.id, i.nome AS imovel, t.titulo, t.agendada_para, t.status
FROM tarefa t
JOIN imovel i ON i.id = t.imovel_id
WHERE t.funcionario_id = (SELECT id FROM usuario WHERE email = 'cida@gemovel.test')
ORDER BY t.agendada_para;

SELECT 'Imóveis do administrador 2 (só a Casa do Lago)';
SELECT id, nome, cidade FROM imovel WHERE administrador_id = 2;

SELECT 'Receita do mês por administrador (reservas confirmadas com entrada neste mês)';
SELECT u.nome AS administrador, COUNT(*) AS reservas, SUM(r.valor_total) AS receita
FROM reserva r
JOIN imovel i ON i.id = r.imovel_id
JOIN usuario u ON u.id = i.administrador_id
WHERE r.status = 'confirmada'
  AND r.data_entrada >= CURDATE() - INTERVAL (DAYOFMONTH(CURDATE()) - 1) DAY
  AND r.data_entrada <  CURDATE() - INTERVAL (DAYOFMONTH(CURDATE()) - 1) DAY + INTERVAL 1 MONTH
GROUP BY u.id, u.nome;

-- R1: a mesma consulta que o ReservaDAO.existe_conflito vai fazer, nas duas tabelas.
-- Duas estadias se cruzam quando uma começa antes de a outra terminar, nos dois sentidos.
SELECT 'R1: conflitos de uma reserva nova no Loft Pinheiros, de D+1 a D+3 (lista a Mariana Costa)';
SELECT 'reserva' AS origem, r.id, h.nome AS descricao, r.data_entrada AS inicio, r.data_saida AS fim
FROM reserva r
JOIN hospede h ON h.id = r.hospede_id
WHERE r.imovel_id = 1 AND r.status = 'confirmada'
  AND r.data_entrada < CURDATE() + INTERVAL 3 DAY
  AND r.data_saida   > CURDATE() + INTERVAL 1 DAY
UNION ALL
SELECT 'bloqueio', b.id, b.motivo, b.data_inicio, b.data_fim
FROM bloqueio b
WHERE b.imovel_id = 1
  AND b.data_inicio < CURDATE() + INTERVAL 3 DAY
  AND b.data_fim    > CURDATE() + INTERVAL 1 DAY;

SELECT 'R2: reservas com total diferente de diária × noites (só a da Carla Nogueira, editada)';
SELECT r.id, h.nome AS hospede, r.valor_diaria * DATEDIFF(r.data_saida, r.data_entrada) AS calculado, r.valor_total
FROM reserva r
JOIN hospede h ON h.id = r.hospede_id
WHERE r.valor_total <> r.valor_diaria * DATEDIFF(r.data_saida, r.data_entrada);

SELECT 'R1 e R3 nos dados de exemplo: sobreposições e lotação estourada (nenhuma linha)';
SELECT 'reservas sobrepostas' AS problema, a.id, b.id
FROM reserva a
JOIN reserva b ON b.imovel_id = a.imovel_id AND b.id > a.id
WHERE a.status = 'confirmada' AND b.status = 'confirmada'
  AND a.data_entrada < b.data_saida AND b.data_entrada < a.data_saida
UNION ALL
SELECT 'reserva sobre bloqueio', r.id, b.id
FROM reserva r
JOIN bloqueio b ON b.imovel_id = r.imovel_id
WHERE r.status = 'confirmada' AND r.data_entrada < b.data_fim AND b.data_inicio < r.data_saida
UNION ALL
SELECT 'lotação estourada', r.id, i.capacidade
FROM reserva r
JOIN imovel i ON i.id = r.imovel_id
WHERE r.num_hospedes > i.capacidade;

-- ---------------------------------------------------------------------------
-- Dados inválidos: cada comando abaixo PRECISA dar ERRO.
-- Tudo roda dentro de uma transação desfeita no fim, então o banco não muda.
-- ---------------------------------------------------------------------------

START TRANSACTION;

SELECT 'Teste 1: reserva com saída antes da entrada (deve dar ERRO)';
INSERT INTO reserva (imovel_id, hospede_id, data_entrada, data_saida, valor_diaria, valor_total)
VALUES (1, 1, CURDATE() + INTERVAL 30 DAY, CURDATE() + INTERVAL 28 DAY, 380.00, 0);

SELECT 'Teste 2: imóvel com diária 0 (deve dar ERRO)';
INSERT INTO imovel (administrador_id, nome, logradouro, numero, bairro, cidade, uf, valor_diaria)
VALUES (1, 'Imóvel de teste', 'Rua de Teste', '1', 'Centro', 'São Paulo', 'SP', 0);

SELECT 'Teste 3: usuário com um e-mail que já existe (deve dar ERRO)';
INSERT INTO usuario (nome, email, senha_hash, perfil)
VALUES ('Outra Marina', 'marina@gemovel.test', 'x', 'administrador');

SELECT 'Teste 4: tarefa concluída sem data de conclusão (deve dar ERRO)';
INSERT INTO tarefa (imovel_id, tipo, titulo, agendada_para, status)
VALUES (1, 'limpeza', 'Tarefa de teste', NOW(), 'concluida');

SELECT 'Teste 5: reserva num imóvel que não existe (deve dar ERRO)';
INSERT INTO reserva (imovel_id, hospede_id, data_entrada, data_saida, valor_diaria, valor_total)
VALUES (999, 1, CURDATE() + INTERVAL 30 DAY, CURDATE() + INTERVAL 32 DAY, 380.00, 760.00);

SELECT 'Teste 6: apagar um imóvel que tem reservas (deve dar ERRO)';
DELETE FROM imovel WHERE id = 1;

SELECT 'Teste 7: funcionário com função fora da lista, no modo estrito (deve dar ERRO)';
INSERT INTO usuario (nome, email, senha_hash, perfil)
VALUES ('Funcionário de teste', 'teste.funcao@gemovel.test', 'x', 'funcionario');
INSERT INTO funcionario (usuario_id, administrador_id, funcao)
VALUES (LAST_INSERT_ID(), 1, 'jardinagem');

ROLLBACK;
