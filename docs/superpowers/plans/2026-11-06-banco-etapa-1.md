# Banco de dados do Gemóvel (Etapa 1) — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam caixas (`- [ ]`) para acompanhar.

**Objetivo:** criar o banco `gemovel` no MariaDB do XAMPP, com dados de exemplo e testes, conectar o Python (Flask) a ele e exportar os diagramas para a entrega de 09/11.

**Arquitetura:**
- Três scripts SQL criam e conferem o banco: estrutura, dados de exemplo e testes.
- No Python, `config.py` lê o `.env`, a classe `Conexao` mantém um pool de conexões e o Flask responde em `GET /api/saude`.
- Os diagramas Mermaid são desenhados numa página, e o Edge, rodando sem janela, grava cada um em PNG e SVG.

**Tecnologias:**
- MariaDB 10.4.32, do XAMPP;
- Python 3.13, com Flask 3.1.0, mysql-connector-python 9.1.0 e python-dotenv 1.0.1;
- unittest, da biblioteca padrão;
- Mermaid 11.4.1;
- Microsoft Edge sem janela (modo headless).

**Especificação:** `docs/superpowers/specs/2026-11-06-banco-de-dados-design.md`

## Restrições globais

- O SQL roda no MariaDB 10.4 e no MySQL 8:
  - motor InnoDB, com `utf8mb4` / `utf8mb4_unicode_ci` (nunca `utf8mb4_0900_ai_ci`);
  - CHECKs nomeados como `ck_<tabela>_<regra>`.
- Nomes, tipos, regras, padrões, índices e ações de FK seguem exatamente a seção 3 da especificação.
- Todo script e toda conexão usam o modo estrito: `STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`.
- Python 3.13, com as dependências fixas em `backend/requirements.txt`: `Flask==3.1.0`, `mysql-connector-python==9.1.0`, `python-dotenv==1.0.1`. Elas são instaladas só em `backend/.venv`.
- As credenciais do banco ficam só em `backend/.env`, que fica fora do controle de versão. O `backend/.env.example` traz os padrões do XAMPP: usuário `root`, senha vazia, `127.0.0.1:3306`, banco `gemovel`.
- Contas de exemplo:
  - e-mails `@gemovel.test` e uma senha de teste comum a todas;
  - a senha aparece só no `LEIA-ME.md` e nos testes;
  - no banco, fica só o hash do werkzeug.
- As datas dos dados de exemplo são relativas a `CURDATE()` (abaixo, D = hoje), para o painel sempre parecer atual.
- A pasta não é um repositório git, então os passos não têm commit.
- Os comandos partem da raiz do projeto, no Git Bash, com:
  - `MYSQL=/c/xampp/mysql/bin/mysql.exe`;
  - `EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`.

## Foco da revisão

1. **MySQL do XAMPP desligado:** `verificar_conexao.py` termina com código 1 e uma frase clara, e `/api/saude` responde 503 em JSON, sem traceback. Testes `test_banco_desligado_*` (Tarefa 2).
2. **Acentos:** "Júlia", "Chalé da Serra" e "Itaguá" precisam voltar intactos ao Python. Por padrão, o conector pede uma collation que o MariaDB não conhece. Teste `test_acentos_voltam_intactos` (Tarefa 2).
3. **XAMPP sem modo estrito:** uma função inválida viraria texto vazio, sem erro. Teste 7 do `03_testes.sql` (Tarefa 1).
4. **Rodar os scripts de novo,** ou num computador que já tem um banco `gemovel`, não pode duplicar nem quebrar nada. Passo 6 da Tarefa 1.
5. **Senha das contas de exemplo:** o hash precisa bater com o `check_password_hash` do werkzeug, senão o login da Etapa 2 falha. Teste `test_senha_de_teste_confere` (Tarefa 2).

---

### Tarefa 1: Banco — estrutura, dados de exemplo e testes SQL

**Arquivos:**
- Criar: `banco/01_estrutura.sql`, `banco/02_dados_exemplo.sql`, `banco/03_testes.sql`
- Criar: `backend/requirements.txt` e o ambiente `backend/.venv/`. O hash das senhas usa o werkzeug, que vem com o Flask.

**Interfaces:**
- **Produz:** o banco `gemovel`, com as 8 tabelas da especificação e exatamente estas contagens: usuario 6, funcionario 4, imovel 9, hospede 15, reserva 16, bloqueio 2, tarefa 18, historico_tarefa 28.

- [ ] **Passo 1: Ligar o MySQL do XAMPP e conferir a versão e o modo**
  - No PowerShell: `Start-Process 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini','--standalone' -WindowStyle Hidden`
  - Depois: `$MYSQL -u root -e "SELECT VERSION(), @@GLOBAL.sql_mode"`. Esperado: `10.4.32-MariaDB`.
  - Se pedir senha, pare e pergunte ao usuário.

- [ ] **Passo 2: Escrever `03_testes.sql` (o teste que vai falhar)**
  - O script começa com `SET SESSION sql_mode = <modo estrito>;` e `USE gemovel;`.
  - A primeira consulta devolve uma linha só:
    ```sql
    SELECT 'contagens', (SELECT COUNT(*) FROM usuario), (SELECT COUNT(*) FROM funcionario),
           (SELECT COUNT(*) FROM imovel), (SELECT COUNT(*) FROM hospede), (SELECT COUNT(*) FROM reserva),
           (SELECT COUNT(*) FROM bloqueio), (SELECT COUNT(*) FROM tarefa), (SELECT COUNT(*) FROM historico_tarefa);
    ```
  - Depois vêm as consultas de conferência, cada uma precedida de um `SELECT '<título>';`:
    - agenda de hoje: entram Eduardo Martins; saem Thiago Ribeiro e Isabela Freitas;
    - tarefas da Cida Ramos;
    - imóveis do administrador 2: só "Casa do Lago";
    - receita do mês;
    - conflito da R1: uma reserva nova de D+1 a D+3 no Loft Pinheiros encontra a reserva da Mariana Costa.
  - Por fim, entre `START TRANSACTION;` e `ROLLBACK;`, sete comandos que precisam dar ERRO, cada um precedido de `SELECT 'Teste N: <o que testa> (deve dar ERRO)';`:
    1. reserva com saída antes da entrada (CHECK);
    2. imóvel com diária 0 (CHECK);
    3. usuário com o e-mail `marina@gemovel.test` (UNIQUE);
    4. tarefa com status `concluida` e `concluida_em` vazio (CHECK);
    5. reserva para `imovel_id = 999` (FK);
    6. `DELETE FROM imovel WHERE id = 1;`, que tem reservas (FK RESTRICT);
    7. funcionário com função `jardinagem` (ENUM no modo estrito).

- [ ] **Passo 3: Rodar e ver falhar**
  - `$MYSQL -u root --default-character-set=utf8mb4 --batch --skip-column-names --force < banco/03_testes.sql`
  - Esperado: `ERROR 1049 … Unknown database 'gemovel'`.

- [ ] **Passo 4: Escrever `01_estrutura.sql`**
  - Começa com `SET SESSION sql_mode`, `DROP DATABASE IF EXISTS gemovel;` e `CREATE DATABASE gemovel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
  - Cria as 8 tabelas na ordem das dependências, com:
    - PKs e FKs, usando as ações da tabela "Relacionamentos" da especificação;
    - CHECKs, padrões e os índices da seção 3;
    - um comentário curto acima de cada tabela.

- [ ] **Passo 5: Criar o ambiente Python e escrever `02_dados_exemplo.sql`**
  - Criar o ambiente e instalar as dependências: `python -m venv backend/.venv` e `backend/.venv/Scripts/python -m pip install -r backend/requirements.txt`.
  - Gerar o hash da senha de teste com `werkzeug.security.generate_password_hash` e colar no script. As 6 contas usam o mesmo hash.
  - **Contas:**
    - 1 Marina Alves e 2 Paulo Mendes, administradores;
    - 3 Cida Ramos, 4 Júlia Lima e 5 Marcos Teixeira, na limpeza;
    - 6 Rafael Souza, na manutenção;
    - os quatro funcionários são do administrador 1.
  - **Imóveis do administrador 1** (diária / capacidade):
    1. Loft Pinheiros — 380 / 2
    2. Cobertura Moema — 620 / 6
    3. Casa Lapa — 340 / 5
    4. Studio Vila Madalena — 260 / 2
    5. Loft Vila Mariana — 300 / 3
    6. Apto Jardins — 450 / 4
    7. Casa da Praia (Itaguá, Ubatuba) — 520 / 8
    8. Chalé da Serra (Capivari, Campos do Jordão) — 480 / 4
  - **Imóvel do administrador 2:** 9. Casa do Lago (Atibaia) — 410 / 6.
  - **16 reservas, ids 1–16 nesta ordem:**
    - Loft Pinheiros: Helena Duarte D-7→D-1, Mariana Costa D-1→D+2, Gabriel Moura D+3→D+7, Larissa Campos D+8→D+10.
    - Cobertura Moema: Thiago Ribeiro D-4→D, André Barros D+5→D+9.
    - Casa Lapa: Fernanda Lima D-2→D+3.
    - Studio Vila Madalena: Bruno Carvalho D-9→D-6, Daniela Rocha D+1→D+4.
    - Loft Vila Mariana: Eduardo Martins D→D+4.
    - Apto Jardins: Isabela Freitas D-3→D, e Carla Nogueira D+2→D+6, com o total editado para 1620,00.
    - Casa da Praia: Thiago Ribeiro D+10→D+15, e Otávio Lins D+4→D+8, **cancelada**.
    - Chalé da Serra: Letícia Araújo D-5→D-2.
    - Casa do Lago: Ricardo Nunes D+1→D+5.
    - São 15 hóspedes, porque o Thiago volta. O Ricardo é o único hóspede do administrador 2.
    - A diária da reserva é a do imóvel, e o total é diária × noites (menos o da Carla).
  - **2 bloqueios:** Chalé da Serra D+3→D+6, "Troca do aquecedor"; Loft Vila Mariana D+20→D+23, "Uso do proprietário".
  - **Tarefas** (regra R4):
    - um `INSERT … SELECT` sobre as reservas confirmadas cria a limpeza de saída de cada uma, agendada na saída às 11:00 e com prazo às 15:00;
    - status: saída antes de hoje = concluída (das 11:00 às 14:00); saída hoje = em andamento (desde as 11:00); depois de hoje = pendente;
    - responsável: `3 + (reserva.id % 3)`, ou vazio se o imóvel for do administrador 2.
  - **Mais 3 manutenções do Rafael:**
    - torneira do Studio: hoje às 09:00, prazo 12:00, pendente;
    - aquecedor do Chalé: D+3 às 09:00, prazo D+5 às 18:00, pendente;
    - ar-condicionado da Casa Lapa: D-3, das 09:00 às 11:30, concluída.
  - **Histórico,** com três `INSERT … SELECT`:
    - a criação de cada tarefa (anterior vazio → pendente);
    - o início das 6 tarefas iniciadas;
    - a conclusão das 4 concluídas.
    - O autor é o responsável pela tarefa, ou o administrador do imóvel se não houver responsável.

- [ ] **Passo 6: Rodar tudo duas vezes e ver passar**
  - `for i in 1 2; do $MYSQL -u root --default-character-set=utf8mb4 < banco/01_estrutura.sql && $MYSQL -u root --default-character-set=utf8mb4 < banco/02_dados_exemplo.sql; done`
  - Repetir o passo 3, gravando a saída em `"$TEMP/saida-testes.txt"`.
  - **Esperado:**
    - primeira linha: `contagens	6	4	9	15	16	2	18	28`;
    - `grep -c '^ERROR' "$TEMP/saida-testes.txt"` → `7`;
    - o conflito lista a Mariana Costa;
    - o administrador 2 só tem a "Casa do Lago".

### Tarefa 2: Conexão Python e Flask

**Arquivos:**
- Criar: `backend/.env.example` e a cópia `backend/.env`; `backend/.gitignore` (com `.venv/`, `.env` e `__pycache__/`); `backend/config.py`; `backend/gemovel/__init__.py`; `backend/gemovel/conexao.py`; `backend/app.py`; `backend/verificar_conexao.py`
- Testes: `backend/testes/__init__.py`, `backend/testes/test_conexao.py`, `backend/testes/test_app.py`
- Modificar: `.claude/launch.json`, para incluir a configuração `gemovel-api` (`backend/.venv/Scripts/python.exe backend/app.py`, porta 5000)

**Interfaces:**
- **Consome:** o banco e as contagens da Tarefa 1.
- **Produz:**
  - `config.carregar_config() -> dict`
    - lê `backend/.env`: `DB_HOST`, `DB_PORTA`, `DB_USUARIO`, `DB_SENHA`, `DB_NOME`;
    - devolve `host`, `port`, `user`, `password` e `database`;
    - devolve também `charset='utf8mb4'`, `collation='utf8mb4_unicode_ci'` e `sql_mode=<modo estrito>`.
  - `gemovel.conexao.TABELAS: tuple[str, ...]`: as 8 tabelas, na ordem da especificação.
  - `gemovel.conexao.BancoIndisponivel(Exception)`.
  - `gemovel.conexao.Conexao(config: dict, tamanho_pool: int = 5)`
    - o pool (`mysql.connector.pooling.MySQLConnectionPool`) nasce no primeiro uso;
    - `obter()` é um gerenciador de contexto: entrega uma conexão do pool e a devolve no fim;
    - `testar() -> {"versao": str, "tabelas": dict[str, int]}`;
    - qualquer falha de conexão vira `BancoIndisponivel`.
  - `app.criar_app(config: dict | None = None) -> Flask`. O `config` é a configuração do banco, no mesmo formato de `carregar_config()`; se vier `None`, a função usa `carregar_config()`. A rota `GET /api/saude` responde de dois jeitos:
    - 200: `{"status": "ok", "banco": "gemovel", "versao": …, "tabelas": {…}}`
    - 503: `{"status": "erro", "mensagem": "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?"}`

- [ ] **Passo 1: Escrever os testes que vão falhar** (métodos de `unittest.TestCase`)
  ```python
  # testes/test_conexao.py
  ESPERADO = {"usuario": 6, "funcionario": 4, "imovel": 9, "hospede": 15,
              "reserva": 16, "bloqueio": 2, "tarefa": 18, "historico_tarefa": 28}

  def test_testar_conta_as_8_tabelas(self):
      resultado = Conexao(carregar_config()).testar()
      self.assertEqual(resultado["tabelas"], ESPERADO)
      self.assertTrue(resultado["versao"])

  def test_acentos_voltam_intactos(self):    # SELECT nome FROM imovel WHERE id = 8
      self.assertEqual(nome, "Chalé da Serra")

  def test_senha_de_teste_confere(self):     # senha_hash do usuário 1 (Marina)
      self.assertTrue(check_password_hash(senha_hash, SENHA_DE_TESTE))

  def test_banco_desligado_vira_banco_indisponivel(self):
      with self.assertRaises(BancoIndisponivel):
          Conexao({**carregar_config(), "port": 3999}).testar()
  ```
  ```python
  # testes/test_app.py
  def test_saude_responde_200_com_as_tabelas(self):
      resposta = criar_app().test_client().get("/api/saude")
      self.assertEqual(resposta.status_code, 200)
      self.assertEqual(resposta.get_json()["tabelas"]["imovel"], 9)

  def test_banco_desligado_responde_503(self):
      resposta = criar_app({**carregar_config(), "port": 3999}).test_client().get("/api/saude")
      self.assertEqual(resposta.status_code, 503)
      self.assertEqual(resposta.get_json()["status"], "erro")
  ```

- [ ] **Passo 2: Rodar e ver falhar**
  - `cd backend && .venv/Scripts/python -m unittest discover -s testes -t . -v`
  - Esperado: `ModuleNotFoundError: No module named 'gemovel'`.

- [ ] **Passo 3: Implementar `config.py`, `gemovel/conexao.py` e `app.py`** com as interfaces acima. O `app.py` termina com `if __name__ == "__main__": criar_app().run(debug=True)`.

- [ ] **Passo 4: Rodar e ver passar**
  - O mesmo comando do passo 2.
  - Esperado: `Ran 6 tests … OK`.

- [ ] **Passo 5: Escrever `verificar_conexao.py`**
  - Imprime a versão e uma linha por tabela com a contagem, e termina com código 0.
  - Com o MySQL desligado, imprime a frase do 503 e termina com código 1.
  - Para conferir: `backend/.venv/Scripts/python backend/verificar_conexao.py` → 8 linhas de tabela, e `echo $?` → `0`.

- [ ] **Passo 6: Conferir no navegador**
  - Rodar `preview_start gemovel-api` e abrir `http://localhost:5000/api/saude`.
  - Esperado: o JSON com `"status": "ok"`.

### Tarefa 3: Diagramas em PNG e SVG

**Arquivos:**
- Criar: `banco/diagramas/exportar.html`
- Gerar: `banco/diagramas/{modelo-logico,classes-dominio,classes-dao}.{png,svg}`

**Interfaces:**
- **Consome:** os três `.mmd`, já validados no Mermaid 11.4.1.
- **Produz:** 6 imagens para a entrega.

- [ ] **Passo 1: Escrever `exportar.html?d=<nome>`.** A página:
  - carrega o Mermaid 11.4.1 do jsDelivr e lê `<nome>.mmd`;
  - desenha o diagrama num fundo branco do tamanho dele, com o tema `base`, a fonte "Segoe UI" e bordas e linhas no ametista do `DESIGN.md`;
  - usa `htmlLabels: false`, para o SVG funcionar fora do navegador;
  - marca `<body data-pronto>` quando termina.

- [ ] **Passo 2: Gerar as imagens** com o Edge sem janela (`--user-data-dir="$TEMP/edge-exportar"`), abrindo a página pelo servidor `gemovel` em `localhost:5500`:
  - SVG: `"$EDGE" --headless=new --virtual-time-budget=15000 --dump-dom <url>`. Um comando Python curto recorta o `<svg>…</svg>` para `<nome>.svg` e informa o `viewBox`.
  - PNG: `"$EDGE" --headless=new --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=15000 --window-size=<largura>,<altura do viewBox> --screenshot=<nome>.png <url>`

- [ ] **Passo 3: Conferir**
  - Os 6 arquivos existem e têm mais de 10 KB.
  - O SVG não contém `foreignObject`.
  - No PNG do modelo lógico, nomes de tabela, tipos e cardinalidades estão legíveis e nada saiu cortado.

### Tarefa 4: LEIA-ME e verificação final

**Arquivos:**
- Criar: `LEIA-ME.md`

- [ ] **Passo 1: Escrever o `LEIA-ME.md`,** com:
  - o que tem em cada pasta;
  - como ligar o MySQL no XAMPP;
  - como importar 01 e 02 pelo phpMyAdmin, ou pelo terminal;
  - como criar o ambiente Python e o `.env`;
  - como rodar `verificar_conexao.py`, os testes e o Flask;
  - as contas de teste e a senha;
  - o que fazer se o root tiver senha;
  - um aviso: os testes esperam os dados de exemplo, então é preciso rodar 01 e 02 antes.

- [ ] **Passo 2: Verificar do zero, seguindo o próprio LEIA-ME**
  - rodar 01, 02 e 03 e conferir as contagens e os 7 ERROs;
  - rodar os 6 testes, o `verificar_conexao.py` e o `/api/saude`;
  - marcar cada item de "Pronto quando" da especificação.
