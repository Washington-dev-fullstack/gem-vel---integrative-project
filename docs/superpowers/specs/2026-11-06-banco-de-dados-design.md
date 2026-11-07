# Gemóvel · Banco de dados (Etapa 1) — especificação

**Data:** 06/11/2026 · **Status:** aguardando sua revisão · **Caminho:** arquitetural (subsistema novo)

## 1. Entendimento

**O que você disse**
- **Etapa 1, até 09/11:** entregar o diagrama de classes UML revisado, as tabelas criadas e funcionando, e a conexão inicial do sistema com o banco.
- **Etapa 2, até 13/11:** entregar o back-end em Python, com classes, DAOs e rotas Flask, e com cadastro e consulta funcionando.
- **Entrega final, até 17/11:** entregar o front-end em HTML, CSS e JS consumindo as rotas Flask via Fetch, de ponta a ponta.
- Vocês costumam usar BRmodelo e XAMPP, mas posso usar o que for mais fácil.
- O design volta depois do modelo e do diagrama de classes.

**O que estou supondo** (corrija o que estiver errado)
- Não existe versão anterior do diagrama de classes. "Revisado" quer dizer a versão final, coerente com o banco.
- Cada administrador tem os próprios imóveis, funcionários e hóspedes, e não vê os de outro administrador. O PDF fala em administradores que "cadastrem suas propriedades".
- O banco roda no MariaDB 10.4 do XAMPP, que já está instalado. O mesmo SQL roda no MySQL 8.

**Pronto quando**
- Os scripts criam o banco do zero no XAMPP, sem erro e com dados de exemplo.
- O banco recusa dados inválidos, e há testes que mostram isso.
- O Python conecta, lê as tabelas e responde numa rota Flask.
- Os diagramas (modelo lógico e classes) estão em PNG e SVG para entregar.

## 2. Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Acesso ao banco no Python | DAOs com SQL escrito à mão, usando `mysql-connector-python` | Um ORM (SQLAlchemy) esconde o SQL, e a Etapa 2 pede DAOs. O PyMySQL é equivalente e fica de reserva. |
| Herança: usuário → administrador e funcionário | Duas tabelas: `usuario` guarda o login, comum aos dois perfis, e `funcionario` guarda só o que é do funcionário. | **Uma tabela só:** sobram colunas vazias no administrador, e o banco não garante que só funcionário recebe tarefa. **Uma tabela por perfil:** o login teria de procurar em duas tabelas. |
| Dono dos dados | O administrador, pela coluna `administrador_id` | **Empresa única, todos veem tudo:** é mais simples, mas contradiz o PDF. |
| Situações que dependem da data | Calculadas na hora: "hospedado agora", "finalizada", "atrasada" | **Gravar a situação:** exigiria uma rotina para atualizar tudo todo dia. |
| Registros com histórico | Desativar (`ativo = 0`). As chaves estrangeiras não deixam apagar. | **Apagar em cascata:** perderia reservas e histórico. |
| Diagramas | Mermaid (texto), exportado para PNG e SVG | **BRmodelo:** exige desenhar tudo à mão. O modelo lógico também pode ser conferido no Designer do phpMyAdmin. |

## 3. Modelo lógico

Diagrama: [`banco/diagramas/modelo-logico.mmd`](../../../banco/diagramas/modelo-logico.mmd)

**Padrões em todas as tabelas:**
- motor InnoDB, com `utf8mb4` / `utf8mb4_unicode_ci`;
- chave `id INT UNSIGNED AUTO_INCREMENT`, menos em `funcionario`, que usa o id da conta;
- nomes no singular, sem acento;
- datas e horas no horário de Brasília.

### usuario — contas de acesso
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| nome | VARCHAR(120) | obrigatório | |
| email | VARCHAR(160) | obrigatório, único | login |
| senha_hash | VARCHAR(255) | obrigatório | hash da senha (werkzeug); a senha em si nunca é gravada |
| telefone | VARCHAR(20) | opcional | |
| perfil | ENUM('administrador','funcionario') | obrigatório | escolhe o painel depois do login |
| ativo | TINYINT(1) | padrão 1 | 0 = não entra mais, e o histórico fica |
| criado_em | DATETIME | padrão agora | |

### funcionario — o que só o funcionário tem
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| usuario_id | INT UNSIGNED | PK e FK → usuario | o mesmo id da conta |
| administrador_id | INT UNSIGNED | FK → usuario | quem cadastrou e gerencia |
| funcao | ENUM('limpeza','manutencao') | obrigatório | |

### imovel
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| administrador_id | INT UNSIGNED | FK → usuario | dono dos dados |
| nome | VARCHAR(100) | obrigatório | "Loft Pinheiros" |
| logradouro | VARCHAR(150) | obrigatório | |
| numero | VARCHAR(10) | obrigatório | aceita "s/n" |
| complemento | VARCHAR(60) | opcional | |
| bairro | VARCHAR(80) | obrigatório | |
| cidade | VARCHAR(80) | obrigatório | |
| uf | CHAR(2) | obrigatório | |
| cep | CHAR(9) | opcional | 00000-000 |
| capacidade | TINYINT UNSIGNED | ≥ 1, padrão 2 | máximo de hóspedes |
| valor_diaria | DECIMAL(10,2) | > 0 | |
| horario_entrada | TIME | padrão 15:00 | check-in |
| horario_saida | TIME | padrão 11:00 | check-out |
| observacoes | TEXT | opcional | instruções de acesso para a equipe |
| ativo | TINYINT(1) | padrão 1 | |
| criado_em | DATETIME | padrão agora | |

### hospede
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| administrador_id | INT UNSIGNED | FK → usuario | dono dos dados |
| nome | VARCHAR(120) | obrigatório | |
| telefone | VARCHAR(20) | opcional | |
| email | VARCHAR(160) | opcional | |
| documento | VARCHAR(20) | opcional | CPF ou passaporte |
| observacoes | TEXT | opcional | |
| criado_em | DATETIME | padrão agora | |

### reserva
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| imovel_id | INT UNSIGNED | FK → imovel | |
| hospede_id | INT UNSIGNED | FK → hospede | |
| data_entrada | DATE | obrigatório | |
| data_saida | DATE | depois da entrada | a noite do dia da saída não conta |
| num_hospedes | TINYINT UNSIGNED | ≥ 1, padrão 1 | |
| valor_diaria | DECIMAL(10,2) | > 0 | a diária do dia em que a reserva foi feita |
| valor_total | DECIMAL(10,2) | ≥ 0 | começa em diária × noites e pode ser editado |
| status | ENUM('confirmada','cancelada') | padrão confirmada | |
| observacoes | TEXT | opcional | |
| criado_em | DATETIME | padrão agora | |

### bloqueio — datas fechadas sem hóspede (reforma, uso do dono)
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| imovel_id | INT UNSIGNED | FK → imovel | |
| data_inicio | DATE | obrigatório | |
| data_fim | DATE | depois do início | mesma lógica da reserva |
| motivo | VARCHAR(120) | obrigatório | |
| criado_em | DATETIME | padrão agora | |

### tarefa — limpeza e manutenção
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| imovel_id | INT UNSIGNED | FK → imovel | |
| reserva_id | INT UNSIGNED | FK → reserva, opcional | a limpeza de saída aponta para a reserva |
| funcionario_id | INT UNSIGNED | FK → funcionario, opcional | vazio = sem responsável |
| tipo | ENUM('limpeza','manutencao') | obrigatório | |
| titulo | VARCHAR(120) | obrigatório | "Limpeza de saída" |
| descricao | TEXT | opcional | |
| agendada_para | DATETIME | obrigatório | quando começa |
| prazo | DATETIME | opcional, não antes do início | até quando precisa terminar |
| status | ENUM('pendente','em_andamento','concluida') | padrão pendente | os três status do PDF |
| iniciada_em | DATETIME | opcional | |
| concluida_em | DATETIME | preenchido só quando concluída | |
| criada_em | DATETIME | padrão agora | |

### historico_tarefa — cada mudança de status
| Coluna | Tipo | Regras | Para quê |
|---|---|---|---|
| id | INT UNSIGNED | PK | |
| tarefa_id | INT UNSIGNED | FK → tarefa | |
| usuario_id | INT UNSIGNED | FK → usuario | quem mudou |
| status_anterior | mesmo ENUM de tarefa.status | opcional | vazio quando a tarefa é criada |
| status_novo | mesmo ENUM de tarefa.status | obrigatório | |
| observacao | VARCHAR(255) | opcional | "faltava sabonete, reposto" |
| registrado_em | DATETIME | padrão agora | alimenta a atividade recente do painel |

### Relacionamentos
| Relacionamento | Cardinalidade | Ao apagar o registro "pai" |
|---|---|---|
| administrador gerencia imóvel | 1 : 0..N | bloqueia |
| administrador emprega funcionário | 1 : 0..N | bloqueia |
| usuário é funcionário | 1 : 0..1 | apaga junto |
| administrador atende hóspede | 1 : 0..N | bloqueia |
| imóvel recebe reserva | 1 : 0..N | bloqueia |
| hóspede faz reserva | 1 : 0..N | bloqueia |
| imóvel tem bloqueio | 1 : 0..N | apaga junto |
| imóvel tem tarefa | 1 : 0..N | bloqueia |
| reserva gera tarefa | 0..1 : 0..N | a tarefa fica sem reserva |
| funcionário executa tarefa | 0..1 : 0..N | a tarefa fica sem responsável |
| tarefa registra histórico | 1 : 0..N | apaga junto |
| usuário altera histórico | 1 : 0..N | bloqueia |

**Índices além das chaves:**
- `reserva` (imovel_id, data_entrada, data_saida);
- `bloqueio` (imovel_id, data_inicio, data_fim);
- `tarefa` (funcionario_id, status) e (imovel_id, agendada_para);
- `hospede` (administrador_id, nome);
- `historico_tarefa` (registrado_em).

## 4. Regras de negócio

As regras ficam nas classes Python da Etapa 2. O que o banco consegue garantir sozinho também vira CHECK.

- **R1 Sem sobreposição:** uma reserva confirmada não pode cruzar outra reserva confirmada nem um bloqueio do mesmo imóvel. Sair e entrar no mesmo dia pode, porque a saída é às 11:00 e a entrada às 15:00. `ReservaDAO.existe_conflito` confere as duas tabelas antes de gravar.
- **R2 Valor:** ao criar a reserva, o total é diária × noites. Depois o administrador pode editar.
- **R3 Lotação:** o número de hóspedes não passa da capacidade do imóvel.
- **R4 Limpeza de saída:** ao registrar uma reserva, o sistema cria a tarefa de limpeza ligada a ela. A tarefa fica agendada para a data de saída, no horário de saída, com prazo no horário de entrada.
- **R5 Status da tarefa:** segue pendente → em andamento → concluída. Cada mudança grava uma linha no histórico, com quem mudou, quando e uma observação. Só o administrador reabre uma tarefa concluída.
- **R6 Isolamento:**
  - cada administrador só vê os próprios dados;
  - tarefas só vão para funcionários do mesmo administrador;
  - o funcionário só vê e muda as próprias tarefas.
- **R7 Atraso:** a tarefa está atrasada quando não foi concluída e já passou do prazo. Se não houver prazo, vale o horário agendado.
- **R8 Senhas:** o banco grava só o hash da senha. O usuário e a senha do banco ficam num arquivo `.env`, fora do código.

**CHECKs no banco:**
- diária > 0;
- capacidade ≥ 1;
- saída depois da entrada;
- fim do bloqueio depois do início;
- número de hóspedes ≥ 1;
- total ≥ 0;
- prazo não antes do agendamento;
- `concluida_em` preenchido se e somente se o status for concluída.

## 5. Diagrama de classes (UML)

- **Domínio** ([`classes-dominio.mmd`](../../../banco/diagramas/classes-dominio.mmd)):
  - `Usuario` é abstrata e tem duas filhas, `Administrador` e `Funcionario`;
  - as outras classes são `Imovel`, `Hospede`, `Reserva`, `Bloqueio`, `Tarefa` e `HistoricoTarefa`;
  - as enumerações são `Funcao`, `TipoTarefa`, `StatusTarefa` e `StatusReserva`;
  - os métodos implementam as regras R1 a R7.
- **Persistência** ([`classes-dao.mmd`](../../../banco/diagramas/classes-dao.mmd)):
  - `Conexao` mantém um pool de conexões;
  - `DAOBase` é abstrata e reúne as consultas comuns;
  - há um DAO por tabela;
  - `FuncionarioDAO` herda de `UsuarioDAO` porque grava nas duas tabelas na mesma transação.
- Os atributos `*_id` espelham as chaves estrangeiras, como no código. As associações mostram as multiplicidades.
- `perfil` não é atributo nas classes: cada subclasse responde pelo método `perfil()`. No banco, a coluna `perfil` guarda essa resposta para o login achar o painel numa consulta só.
- As datas de criação (`criado_em`, `criada_em`) existem só no banco e não aparecem no diagrama de classes.
- As rotas Flask entram na Etapa 2 e não aparecem aqui.

## 6. O que a Etapa 1 entrega

| Arquivo | O que é |
|---|---|
| `banco/01_estrutura.sql` | Cria o banco `gemovel` e as 8 tabelas. Apaga um banco `gemovel` anterior, para poder rodar de novo. |
| `banco/02_dados_exemplo.sql` | Dados do protótipo: 8 imóveis, 4 funcionários, hóspedes, reservas de novembro e tarefas. Inclui um segundo administrador, com um imóvel, para testar o isolamento. |
| `banco/03_testes.sql` | Consultas de conferência e inserções inválidas que o banco deve recusar |
| `banco/diagramas/` | Os `.mmd` (fonte), mais `.png` e `.svg` |
| `backend/requirements.txt`, `.env.example`, `config.py` | Dependências e configuração |
| `backend/gemovel/conexao.py` | A classe `Conexao` |
| `backend/app.py` | Flask com `GET /api/saude`, que conecta e devolve quantas linhas cada tabela tem |
| `backend/verificar_conexao.py` | O mesmo teste pelo terminal |
| `LEIA-ME.md` | Como instalar e rodar com o XAMPP, passo a passo, e as senhas de teste |

As bibliotecas Python (Flask, mysql-connector-python, python-dotenv) são instaladas num ambiente virtual dentro de `backend/.venv`, sem mexer no Python do computador.

## 7. Testes

- Rodar `01` e `02` num banco vazio e repetir: o resultado precisa ser o mesmo.
- Rodar `03_testes.sql`:
  - as inserções inválidas precisam falhar: saída antes da entrada, diária zero, e-mail repetido, tarefa concluída sem data;
  - as consultas de conferência precisam bater com os dados de exemplo.
- Rodar `verificar_conexao.py` e chamar `GET /api/saude`: os dois precisam mostrar a contagem de cada tabela.

## 8. Fora desta etapa

- Na Etapa 2: as rotas de cadastro e consulta e as classes completas.
- Na entrega final: as telas.
- Fora do projeto por enquanto: pagamentos, canais como Airbnb e Booking, fotos e checklists.
