# Gemóvel

Sistema de gestão de imóveis de temporada: imóveis, reservas, hóspedes e as tarefas de limpeza e manutenção da equipe.
Projeto integrado do Técnico em Informática, turma 2 TID: Arthur Gazzoli e Washington.

Este guia cobre a **Etapa 1** (entrega de 09/11): o banco de dados criado e funcionando, os diagramas (modelo do banco e classes UML) e a primeira conexão do Python com o banco.

## O que tem em cada pasta

| Pasta ou arquivo | O que é |
|---|---|
| `banco/01_estrutura.sql` | cria o banco `gemovel` do zero, com as 8 tabelas |
| `banco/02_dados_exemplo.sql` | carrega os dados de exemplo: imóveis, hóspedes, reservas, tarefas e histórico |
| `banco/03_testes.sql` | confere os dados e tenta gravar dados inválidos, que o banco precisa recusar |
| `banco/diagramas/` | modelo lógico do banco e diagramas de classes, em PNG e SVG (os `.mmd` são a fonte) |
| `backend/` | a API em Python com Flask: `app.py`, a conexão com o banco (`gemovel/conexao.py`) e os testes (`testes/`) |
| `DESIGN.md` | o sistema de design do Gemóvel, fonte da verdade da interface |
| `design/componentes/` | a especificação aprovada dos componentes da interface |
| `design/telas/` | as telas aprovadas: o que cada uma mostra, faz e pede do back-end |
| `design/exploracoes/` | protótipos descartáveis de interface (ainda não é o produto final) |
| `docs/escola/` | a proposta do projeto integrado (PDF) e o cronograma das entregas |
| `docs/superpowers/` | as especificações e os planos de cada etapa |
| `CLAUDE.md` | orientações para o Claude Code trabalhar neste projeto |

## Do zero ao funcionando

Os comandos rodam na pasta do projeto, no terminal do VS Code (PowerShell) ou no Git Bash.

### 1. Ligar o MySQL

Abra o **XAMPP Control Panel** e clique em **Start** na linha do **MySQL**. O Apache só é necessário para usar o phpMyAdmin.

### 2. Criar o banco e carregar os dados de exemplo

Rode os dois scripts, nesta ordem.

- **Pelo phpMyAdmin** (http://localhost/phpmyadmin, com o Apache ligado): aba **Importar**, escolha `banco/01_estrutura.sql` e clique em **Importar**. Depois, o mesmo com `banco/02_dados_exemplo.sql`.
- **Pelo terminal:**

```bash
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 -e "source banco/01_estrutura.sql"
```

```bash
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 -e "source banco/02_dados_exemplo.sql"
```

O `01` apaga o banco `gemovel` (se existir) e cria de novo, vazio. O `02` apaga os dados e carrega os de exemplo. As datas dos exemplos são relativas ao dia de hoje: rode o `02` de novo no dia da apresentação e o painel vai parecer atual.

### 3. Conferir o banco

```bash
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 --batch --skip-column-names --unbuffered --force -e "source banco/03_testes.sql"
```

Precisa aparecer:
- a linha `contagens 6 4 9 15 16 2 18 28` (linhas em usuario, funcionario, imovel, hospede, reserva, bloqueio, tarefa e historico_tarefa);
- as consultas de conferência (agenda de hoje, tarefas da Cida, conflito de datas…);
- **7 linhas `ERROR`**, uma logo depois de cada "Teste N".

Esses 7 erros são o resultado certo: mostram que o banco recusa dados inválidos. Nada é gravado, porque os testes terminam desfazendo tudo.

### 4. Preparar o Python (uma vez só)

Precisa do Python 3.13. Se o comando `python` não for encontrado, troque por `py`.

```bash
python -m venv backend/.venv
```

```bash
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
```

Depois copie `backend/.env.example` para `backend/.env` (no PowerShell: `Copy-Item backend/.env.example backend/.env`; no Git Bash: `cp backend/.env.example backend/.env`). O `.env` guarda o usuário e a senha do banco e já vem com os padrões do XAMPP. Ele não vai para o controle de versão.

### 5. Conferir a conexão do Python

```bash
backend/.venv/Scripts/python backend/verificar_conexao.py
```

Mostra a versão do MySQL e quantas linhas cada tabela tem. Para rodar os testes automáticos:

```bash
backend/.venv/Scripts/python -m unittest discover -s backend/testes -t backend -v
```

Precisa terminar com `Ran 11 tests` e `OK`. **Os testes esperam os dados de exemplo:** rode o `01` e o `02` antes.

### 6. Ligar a API

```bash
backend/.venv/Scripts/python backend/app.py
```

Abra http://localhost:5000/api/saude. Com o banco ligado, a resposta traz `"status": "ok"` e as contagens das tabelas. Com o MySQL desligado, a resposta é o erro 503 com a frase "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?". Para parar a API, use Ctrl+C.

## Contas de teste

Todas usam a senha **`Gemovel@2026`**. O login entra na Etapa 2; por enquanto, o banco guarda só o hash da senha (nunca a senha em si).

| E-mail | Nome | Perfil |
|---|---|---|
| `marina@gemovel.test` | Marina Alves | administrador: 8 imóveis e a equipe toda |
| `paulo@gemovel.test` | Paulo Mendes | administrador: só a Casa do Lago (mostra que cada administrador vê só os próprios dados) |
| `cida@gemovel.test` | Cida Ramos | funcionário, limpeza |
| `julia@gemovel.test` | Júlia Lima | funcionário, limpeza |
| `marcos@gemovel.test` | Marcos Teixeira | funcionário, limpeza |
| `rafael@gemovel.test` | Rafael Souza | funcionário, manutenção |

## Se der problema

| O que aparece | O que fazer |
|---|---|
| "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?" | Ligue o MySQL no XAMPP (passo 1). |
| "O banco gemovel não existe…" | Rode o `01` e o `02` (passo 2). |
| "O MySQL recusou o usuário ou a senha…" | O seu MySQL tem senha: veja abaixo. |
| O MySQL não liga no XAMPP (porta 3306 ocupada) | Outro MySQL está rodando no computador. Pare-o nos Serviços do Windows, ou mude a porta no XAMPP e em `DB_PORTA` no `backend/.env`. |
| `ERROR 2002 … Can't connect` nos comandos `mysql.exe` | O MySQL está desligado (passo 1). |

**Se o root tiver senha** (o XAMPP vem sem): escreva a senha em `DB_SENHA=` no `backend/.env` e acrescente `-p` aos comandos do `mysql.exe`, que então vai pedir a senha.

## Diagramas

| Arquivo | O que mostra |
|---|---|
| `banco/diagramas/modelo-logico` | as 8 tabelas, com tipos, chaves e cardinalidades |
| `banco/diagramas/classes-dominio` | o diagrama de classes UML: as classes da Etapa 2, com atributos, métodos, herança e enumerações |
| `banco/diagramas/classes-dao` | as classes de acesso ao banco (DAOs) da Etapa 2 |

Cada diagrama tem um `.png` (para slides e documentos) e um `.svg` (vetor, amplia sem perder qualidade). Os `.mmd` são a fonte, em Mermaid. Para ver um diagrama depois de editar o `.mmd`, sirva a pasta do projeto só para este computador (`python -m http.server 5500 --bind 127.0.0.1`; sem o `--bind`, qualquer um na mesma rede veria a pasta, inclusive o `backend/.env`) e abra http://localhost:5500/banco/diagramas/exportar.html?d=modelo-logico (ou `classes-dominio`, `classes-dao`). A página precisa de internet para carregar o Mermaid.
