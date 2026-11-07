# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Gemóvel: gestão de imóveis de aluguel por temporada (imóveis, reservas, hóspedes e as tarefas de limpeza e manutenção da equipe). Projeto integrado do Técnico em Informática, turma 2 TID: Arthur Gazzoli e Washington. Converse e escreva em português do Brasil.

Entregas da escola (cronograma em `docs/escola/`):
- **Etapa 1, 09/11/2026 (pronta):** diagramas UML, tabelas criadas e conexão do Python com o banco.
- **Etapa 2, 13/11:** classes, DAOs e rotas Flask, com cadastrar e listar funcionando.
- **Entrega final, 17/11:** front-end em HTML, CSS e JS chamando as rotas do Flask via Fetch.

## Comandos

Rode da raiz do projeto, com o MySQL do XAMPP ligado. O passo a passo completo está no `LEIA-ME.md`.

- Recriar o banco: `C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 -e "source banco/01_estrutura.sql"`, depois o mesmo com `banco/02_dados_exemplo.sql`. `banco/03_testes.sql` confere os dados e as recusas.
- Todos os testes: `backend/.venv/Scripts/python -m unittest discover -s backend/testes -t backend -v`
- Um teste só: acrescente `-k <parte do nome>`, por exemplo `-k acentos`.
- API: `backend/.venv/Scripts/python backend/app.py`, depois `http://127.0.0.1:5000/api/saude`.
- Protótipos de design: `python -m http.server 5500 --bind 127.0.0.1` e abra `/design/exploracoes/`.

Os testes usam o banco de verdade e esperam as contagens exatas dos dados de exemplo: se os dados mudaram, recarregue o `01` e o `02` antes.

## Arquitetura

- **Banco** (`banco/`, MariaDB 10.4 do XAMPP; o SQL também precisa rodar no MySQL): 8 tabelas. `funcionario` estende `usuario` (herança 1:1), e cada administrador é dono dos próprios imóveis, hóspedes e reservas por `administrador_id`. A limpeza entre estadias é uma `tarefa` ligada à `reserva`; `historico_tarefa` registra cada mudança de estado. Imóvel e usuário são desativados (`ativo = 0`), nunca apagados. O modelo lógico e os diagramas de classes estão em `banco/diagramas/` (a fonte é o `.mmd`); a especificação, em `docs/superpowers/specs/`.
- **Back-end** (`backend/`): `config.py` lê `backend/.env` (modelo em `.env.example`) e monta a configuração do conector, com `sql_mode` estrito em toda conexão, inclusive as reaproveitadas pelo pool, e `use_pure=True`, que é obrigatório. `gemovel/conexao.py` guarda um pool criado no primeiro uso; com o pool cheio, o pedido espera uma conexão livre, e as falhas viram `BancoIndisponivel`, com uma mensagem que diz o que conferir. `app.py` tem a fábrica `criar_app()`; `/api/saude` responde 503 quando o banco não responde. A Etapa 2 acrescenta as classes de domínio e os DAOs, com SQL escrito à mão, seguindo os diagramas de classes.
- **Interface:** `DESIGN.md` (sistema Lapidado) é a fonte da verdade: tema Obsidiana (escuro) no admin, Quartzo (claro) no app da equipe, efeitos por nível (`data-tier`). Os componentes aprovados estão em `design/componentes/`. `design/exploracoes/` é protótipo descartável, não código do produto; os tokens provisórios ficam em `design/exploracoes/tokens.css`.

## Combinados

- `DESIGN.md` só muda com o sim da dupla. As entregas de design são documentos `.md`, sem páginas de demonstração. A versão web (computador) vem primeiro; as seções só do celular ficam para o fim.
- A escola exige commits ao longo do trabalho: um commit por parte concluída, mensagem em português, com a linha de coautoria do Claude no fim; depois, push para `origin main`. Não reescreva o histórico.
- A senha das contas de teste fica só no `LEIA-ME.md`, nos dados de exemplo e nos testes; não a repita na conversa.

## Armadilhas do Windows

- Ligue o MySQL pelo botão Start do painel do XAMPP: um `mysqld` iniciado com `Start-Process` morre quando o comando termina.
- O PowerShell 5.1 não tem o redirecionamento `<`: use `mysql.exe -e "source arquivo.sql"`.
