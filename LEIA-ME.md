# Gemóvel

Sistema de gestão de imóveis de temporada: imóveis, reservas, hóspedes e as tarefas de limpeza e manutenção da equipe.
Projeto integrado do Técnico em Informática, turma 2 TID: Arthur Gazzoli e Washington.

Este guia leva do zero ao sistema funcionando no seu computador: o banco de dados com os dados de exemplo, a API em Python com Flask e as telas no navegador, que conversam com a API pelo Fetch.

## O que tem em cada pasta

| Pasta ou arquivo | O que é |
|---|---|
| `banco/01_estrutura.sql` | cria o banco `gemovel` do zero, com as 8 tabelas |
| `banco/02_dados_exemplo.sql` | carrega os dados de exemplo: imóveis, hóspedes, reservas, tarefas e histórico |
| `banco/03_testes.sql` | confere os dados e tenta gravar dados inválidos, que o banco precisa recusar |
| `banco/diagramas/` | modelo lógico do banco e diagramas de classes, em PNG e SVG (os `.mmd` são a fonte) |
| `backend/` | a API em Python com Flask: `app.py`, a conexão com o banco (`gemovel/conexao.py`) e os testes (`testes/`) |
| `frontend/` | as telas: as páginas (`paginas/`), que o Flask serve, o CSS e o JavaScript (`estaticos/`) e os testes do JavaScript (`testes/`) |
| `ferramentas/gerar_site.py` | gera a versão de demonstração para o GitHub Pages na pasta `site/` |
| `site/` | a versão de demonstração gerada (não edite à mão: ela é refeita pelo gerador) |
| `Abrir o site.bat` | dois cliques abrem a versão de demonstração no navegador, sem Flask e sem MySQL (roda `ferramentas/abrir_site.py`) |
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

Por fim, gere a chave que assina o cookie de login e cole o resultado depois de `SEGREDO_SESSAO=`, no `backend/.env`:

```bash
backend/.venv/Scripts/python -c "import secrets; print(secrets.token_hex(32))"
```

Sem a chave, a API usa uma chave temporária, e todo mundo sai quando ela reinicia.

### 5. Conferir a conexão do Python

```bash
backend/.venv/Scripts/python backend/verificar_conexao.py
```

Mostra a versão do MySQL e quantas linhas cada tabela tem. Para rodar os testes automáticos:

```bash
backend/.venv/Scripts/python -m unittest discover -s backend/testes -t backend -v
```

Precisa terminar com `Ran 198 tests` e `OK`. **Os testes esperam os dados de exemplo:** rode o `01` e o `02` antes.

Os testes do JavaScript (as regras das telas, como o conflito de datas e a ordem das tarefas) precisam do Node 22 ou mais novo, sem `npm install`:

```bash
cd frontend
```

```bash
node --test "testes/*.test.js"
```

Precisa terminar com `fail 0`.

### 6. Ligar a API

```bash
backend/.venv/Scripts/python backend/app.py
```

Abra http://localhost:5000/api/saude. Com o banco ligado, a resposta traz `"status": "ok"` e as contagens das tabelas. Com o MySQL desligado, a resposta é o erro 503 com a frase "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?". Para parar a API, use Ctrl+C.

As outras rotas pedem login. O `POST /api/sessao`, com o e-mail e a senha em JSON (`{"email": ..., "senha": ...}`), guarda a sessão num cookie, e os pedidos seguintes levam o cookie junto. O que cada rota recebe e devolve está na seção 5 da especificação, `docs/superpowers/specs/2026-11-08-api-etapa-2-design.md`, e, nas rotas que as telas pediram depois, no plano do front-end (`docs/superpowers/plans/2026-11-11-front-end.md`). Em resumo:

| Rota | Quem usa | Para quê |
|---|---|---|
| `POST`, `GET` e `DELETE /api/sessao` | todos | entrar, ver quem está logado e sair |
| `GET` e `POST /api/funcionarios`; `PATCH /api/funcionarios/<id>`, `.../senha`, `.../desativar` e `.../reativar` | administrador | a equipe |
| `GET` e `POST /api/imoveis`; `GET` e `PATCH /api/imoveis/<id>`, `.../desativar` e `.../reativar` | administrador | os imóveis, com a prontidão e a ocupação |
| `GET` e `POST /api/imoveis/<id>/bloqueios`; `GET /api/bloqueios?de=&ate=`; `DELETE /api/bloqueios/<id>` | administrador | as datas bloqueadas |
| `GET /api/hospedes?busca=` e `POST /api/hospedes`; `GET`, `PATCH` e `DELETE /api/hospedes/<id>` | administrador | a busca (por nome ou telefone) e o cadastro de hóspedes |
| `GET /api/reservas?de=&ate=` e `POST /api/reservas`; `GET` e `PATCH /api/reservas/<id>`, `.../cancelar` | administrador | as reservas do período e o cadastro, que já cria a limpeza da saída |
| `GET` e `POST /api/tarefas` (`?dia=` ou `?imovel_id=`); `GET`, `PATCH` e `DELETE /api/tarefas/<id>` | administrador | as tarefas (sem filtro, as abertas) e o cadastro |
| `POST /api/tarefas/<id>/estado` e `.../desfazer` | todos | começar, concluir e reabrir uma tarefa; desfazer até 10s depois |
| `GET /api/visao-geral` e `GET /api/busca?q=` | administrador | os números do mês e o resumo de hoje; a busca geral do topo |
| `GET /api/atividade?limite=` | administrador | as últimas mudanças de estado das tarefas |
| `GET /api/minhas-tarefas?dia=` | funcionário | as tarefas da pessoa no dia e as que ficaram abertas |

Os erros vêm sempre no mesmo formato: `{"erro": {"mensagem": ..., "campos": {...}}}`, com a frase para mostrar na tela e, quando é o caso, a frase de cada campo.

### 7. Abrir o sistema

Com a API ligada (passo 6), abra http://localhost:5000/entrar e entre com uma das contas de teste. O administrador cai na Visão geral, com a Agenda, as Reservas, os Imóveis, as Tarefas e a Equipe no menu; quem é da equipe cai em Minhas tarefas, feita para o celular. Cada tela busca e grava os dados pela API, com o Fetch.

### 8. Versão de demonstração (GitHub Pages)

A pasta `site/` é o sistema como site estático, para abrir sem Flask e sem MySQL: as mesmas telas, com uma API simulada no navegador e os dados de exemplo. Quem visita entra com qualquer conta de exemplo (a tela Entrar lista as contas, e qualquer senha serve), e as mudanças ficam só no navegador dela, até clicar em **Recomeçar** na faixa do topo. As datas andam sozinhas até o dia da visita. No computador da dupla, com o Flask ligado, nada muda: tudo continua indo para a API de verdade.

Para refazer o site depois de mudar o front-end ou os dados de exemplo, recarregue os dados (passo 2) e rode, da raiz do projeto:

```
backend/.venv/Scripts/python ferramentas/gerar_site.py
```

Para ver no computador: dois cliques em `Abrir o site.bat`, na raiz do projeto (ou `python ferramentas/abrir_site.py` no terminal). O site abre no navegador em http://127.0.0.1:5700/; para desligar, feche a janela.

**Publicar:** cada push na `main` que muda a pasta `site/` publica o site (`.github/workflows/pages.yml`). No GitHub, uma vez só: Settings → Pages → Source: **GitHub Actions**. O endereço fica `https://<usuário>.github.io/gemovel-integrative-project/`.

## Contas de teste

Todas usam a senha **`Gemovel@2026`**. Entre por http://localhost:5000/entrar (passo 7) ou pela API (`POST /api/sessao`, no passo 6); o banco guarda só o hash da senha (nunca a senha em si).

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
