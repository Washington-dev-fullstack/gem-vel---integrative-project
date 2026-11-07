-- Gemóvel · estrutura do banco (Etapa 1)
-- Apaga e recria o banco `gemovel` do zero, com as 8 tabelas da especificação.
-- Roda no MariaDB 10.4 (XAMPP) e no MySQL 8.
--   Terminal (Git Bash): mysql -u root --default-character-set=utf8mb4 < banco/01_estrutura.sql
--   phpMyAdmin: aba Importar, escolha este arquivo.
-- Depois rode o 02_dados_exemplo.sql.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Modo estrito: valor inválido vira ERRO, em vez de ser trocado em silêncio (o XAMPP vem sem ele).
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP DATABASE IF EXISTS gemovel;
CREATE DATABASE gemovel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gemovel;

-- Contas de acesso. O perfil escolhe o painel depois do login.
-- A senha nunca é gravada, só o hash (werkzeug). ativo = 0: a pessoa não entra mais, e o histórico fica.
CREATE TABLE usuario (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL,
  telefone    VARCHAR(20)  NULL,
  perfil      ENUM('administrador','funcionario') NOT NULL,
  ativo       TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- O que só o funcionário tem. Usa o mesmo id da conta (herança: usuario + funcionario).
-- Apagar a conta apaga esta linha junto; o administrador que tem funcionários não pode ser apagado.
CREATE TABLE funcionario (
  usuario_id        INT UNSIGNED NOT NULL,
  administrador_id  INT UNSIGNED NOT NULL,
  funcao            ENUM('limpeza','manutencao') NOT NULL,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_funcionario_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT fk_funcionario_administrador FOREIGN KEY (administrador_id)
    REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Imóveis de cada administrador (dono dos dados). observacoes = instruções de acesso para a equipe.
CREATE TABLE imovel (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  administrador_id  INT UNSIGNED NOT NULL,
  nome              VARCHAR(100) NOT NULL,
  logradouro        VARCHAR(150) NOT NULL,
  numero            VARCHAR(10)  NOT NULL,
  complemento       VARCHAR(60)  NULL,
  bairro            VARCHAR(80)  NOT NULL,
  cidade            VARCHAR(80)  NOT NULL,
  uf                CHAR(2)      NOT NULL,
  cep               CHAR(9)      NULL,
  capacidade        TINYINT UNSIGNED NOT NULL DEFAULT 2,
  valor_diaria      DECIMAL(10,2) NOT NULL,
  horario_entrada   TIME         NOT NULL DEFAULT '15:00:00',
  horario_saida     TIME         NOT NULL DEFAULT '11:00:00',
  observacoes       TEXT         NULL,
  ativo             TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_imovel_administrador FOREIGN KEY (administrador_id)
    REFERENCES usuario (id) ON DELETE RESTRICT,
  CONSTRAINT ck_imovel_capacidade CHECK (capacidade >= 1),
  CONSTRAINT ck_imovel_diaria CHECK (valor_diaria > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hóspedes de cada administrador.
CREATE TABLE hospede (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  administrador_id  INT UNSIGNED NOT NULL,
  nome              VARCHAR(120) NOT NULL,
  telefone          VARCHAR(20)  NULL,
  email             VARCHAR(160) NULL,
  documento         VARCHAR(20)  NULL,
  observacoes       TEXT         NULL,
  criado_em         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_hospede_administrador_nome (administrador_id, nome),
  CONSTRAINT fk_hospede_administrador FOREIGN KEY (administrador_id)
    REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservas. A noite do dia da saída não conta: entrar e sair no mesmo dia pode (saída 11:00, entrada 15:00).
-- valor_diaria = a diária do dia em que a reserva foi feita; valor_total começa em diária × noites e pode ser editado.
CREATE TABLE reserva (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  imovel_id     INT UNSIGNED NOT NULL,
  hospede_id    INT UNSIGNED NOT NULL,
  data_entrada  DATE         NOT NULL,
  data_saida    DATE         NOT NULL,
  num_hospedes  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  valor_diaria  DECIMAL(10,2) NOT NULL,
  valor_total   DECIMAL(10,2) NOT NULL,
  status        ENUM('confirmada','cancelada') NOT NULL DEFAULT 'confirmada',
  observacoes   TEXT         NULL,
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_reserva_periodo (imovel_id, data_entrada, data_saida),
  CONSTRAINT fk_reserva_imovel FOREIGN KEY (imovel_id)
    REFERENCES imovel (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reserva_hospede FOREIGN KEY (hospede_id)
    REFERENCES hospede (id) ON DELETE RESTRICT,
  CONSTRAINT ck_reserva_datas CHECK (data_saida > data_entrada),
  CONSTRAINT ck_reserva_hospedes CHECK (num_hospedes >= 1),
  CONSTRAINT ck_reserva_diaria CHECK (valor_diaria > 0),
  CONSTRAINT ck_reserva_total CHECK (valor_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datas fechadas sem hóspede (reforma, uso do dono). Mesma lógica de datas da reserva.
-- Apagar o imóvel apaga os bloqueios junto.
CREATE TABLE bloqueio (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  imovel_id    INT UNSIGNED NOT NULL,
  data_inicio  DATE         NOT NULL,
  data_fim     DATE         NOT NULL,
  motivo       VARCHAR(120) NOT NULL,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_bloqueio_periodo (imovel_id, data_inicio, data_fim),
  CONSTRAINT fk_bloqueio_imovel FOREIGN KEY (imovel_id)
    REFERENCES imovel (id) ON DELETE CASCADE,
  CONSTRAINT ck_bloqueio_datas CHECK (data_fim > data_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tarefas de limpeza e manutenção. A limpeza de saída aponta para a reserva.
-- funcionario_id vazio = sem responsável. concluida_em é preenchido só quando a tarefa está concluída.
CREATE TABLE tarefa (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  imovel_id       INT UNSIGNED NOT NULL,
  reserva_id      INT UNSIGNED NULL,
  funcionario_id  INT UNSIGNED NULL,
  tipo            ENUM('limpeza','manutencao') NOT NULL,
  titulo          VARCHAR(120) NOT NULL,
  descricao       TEXT         NULL,
  agendada_para   DATETIME     NOT NULL,
  prazo           DATETIME     NULL,
  status          ENUM('pendente','em_andamento','concluida') NOT NULL DEFAULT 'pendente',
  iniciada_em     DATETIME     NULL,
  concluida_em    DATETIME     NULL,
  criada_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_tarefa_funcionario_status (funcionario_id, status),
  KEY ix_tarefa_imovel_agenda (imovel_id, agendada_para),
  CONSTRAINT fk_tarefa_imovel FOREIGN KEY (imovel_id)
    REFERENCES imovel (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tarefa_reserva FOREIGN KEY (reserva_id)
    REFERENCES reserva (id) ON DELETE SET NULL,
  CONSTRAINT fk_tarefa_funcionario FOREIGN KEY (funcionario_id)
    REFERENCES funcionario (usuario_id) ON DELETE SET NULL,
  CONSTRAINT ck_tarefa_prazo CHECK (prazo IS NULL OR prazo >= agendada_para),
  CONSTRAINT ck_tarefa_conclusao CHECK ((status = 'concluida') = (concluida_em IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada mudança de status de uma tarefa: quem mudou, quando e uma observação.
-- status_anterior vazio = a tarefa acabou de ser criada. Alimenta a atividade recente do painel.
CREATE TABLE historico_tarefa (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tarefa_id        INT UNSIGNED NOT NULL,
  usuario_id       INT UNSIGNED NOT NULL,
  status_anterior  ENUM('pendente','em_andamento','concluida') NULL,
  status_novo      ENUM('pendente','em_andamento','concluida') NOT NULL,
  observacao       VARCHAR(255) NULL,
  registrado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_historico_registrado (registrado_em),
  CONSTRAINT fk_historico_tarefa FOREIGN KEY (tarefa_id)
    REFERENCES tarefa (id) ON DELETE CASCADE,
  CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
