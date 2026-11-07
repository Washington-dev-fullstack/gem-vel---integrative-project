# Gemóvel — Componentes (rascunho)

> Parte 1 da seção de componentes do brainstorming: inventário e regras comuns. É rascunho e só vale depois de aprovado. No fim da seção, o que for aprovado entra na Seção 4 do `DESIGN.md`, com a sua confirmação antes de gravar.

- **Base:** `DESIGN.md` v0 (maturidade L1) e os protótipos em `design/exploracoes/`. Não há arquivo de Figma; nada aqui vem de inspeção de biblioteca.
- **Situação:**
  - **existe**: já está no protótipo ou na folha; faltam estados ou detalhes.
  - **novo**: uma funcionalidade do PDF precisa dele e ainda não foi desenhado.
  - **depois**: útil no uso real, mas o PDF não pede.
- **Funcionalidades do PDF:**
  - F1 imóveis
  - F2 reservas e hóspedes
  - F3 limpeza e manutenção
  - F4 equipe e atribuição
  - F5 painel da equipe
  - F6 painel do admin
  - **Contas** (cada pessoa entra na própria conta)

---

## 1. Como construir: plataforma primeiro

Cada componente nasce do elemento nativo do navegador (`<button>`, `<a>`, `<input>`, `<select>`, `<dialog>`, `popover`) e recebe a aparência Lapidado por cima. Widget próprio só entra quando o nativo não resolve, e sempre com o nativo como reserva.

- **Acessível por padrão:** teclado, leitor de tela e os seletores do celular já vêm prontos.
- **Leve:** menos JavaScript, melhor para celular simples.
- **Não depende de framework:** serve para o que a seção de arquitetura escolher e para o HTML, CSS e JavaScript previstos no PDF.
- **O navegador já faz:**
  - `<dialog>` e `popover` funcionam nos três motores (Chrome, Safari e Firefox).
  - O posicionamento por âncora (menu e dica presos ao botão) chegou ao Firefox em janeiro de 2026 e agora também funciona nos três.
  - O `<select>` estilizável (`appearance: base-select`) funciona no Chrome, no Edge e no Safari 27. No Firefox aparece a lista normal do sistema, sem quebrar.

| Alternativa | Por que não |
|---|---|
| Biblioteca pronta (shadcn/Radix, Web Awesome, Material) | começa rápido, mas traz o visual e o peso de outro sistema e prende a um framework antes da hora |
| Tudo sob medida em JavaScript | controle total, mas mais código, mais risco de acessibilidade e mais peso no celular |

**Folha viva:** `design/exploracoes/componentes.html`, na Parte 2 (lote A). Mostra cada componente em todos os estados, nos dois temas e nos três níveis de efeito, como `sistema.html` faz com cores e tipos. A Parte 3 (lote B) virou documento, para economizar: `parte-3-lote-b.md`, nesta pasta.

---

## 2. Regras comuns

### 2.1 Estados

| Estado | Como aparece | Regra |
|---|---|---|
| Repouso | o desenho base | — |
| Hover | camada `color-hover` | só com mouse (`@media (hover: hover)`); nunca é a única pista |
| Foco | anel de 2px `color-focus`, afastado 2px | só no teclado (`:focus-visible`) |
| Pressionado | camada `color-pressed` | resposta imediata ao toque |
| Selecionado ou atual | `color-pressed` + marca (pílula, borda ou gema) | sempre com o atributo certo (`aria-pressed`, `aria-selected`, `aria-current`) |
| Desabilitado | `color-text-disabled`, sem hover | usar pouco e explicar o motivo perto do controle |
| Carregando | o ícone vira indicador; a largura não muda | `aria-busy`; rótulo no gerúndio ("Salvando…") |
| Erro | borda rubi + ícone octógono + mensagem embaixo | nunca só a cor; a mensagem fica ligada ao campo (`aria-describedby`) |
| Só leitura | sem borda de campo, texto normal | dá para selecionar e copiar |

O botão de salvar nunca fica desabilitado: o formulário valida ao salvar e mostra o que falta. Um botão desabilitado não diz por que está assim.

### 2.2 Tamanhos

- `control-sm` 32px · `control-md` 40px · `control-lg` 48px. Com toque: 40 · 44 · 48.
- O app da equipe usa `control-lg` como padrão.
- Área de toque de pelo menos 44 × 44px, mesmo quando o desenho é menor. O botão de ícone de 32px, por exemplo, ganha uma área invisível em volta.
- Ícones de 16px (sm), 20px (md) e 24px (lg).

### 2.3 Acessibilidade

- Todo widget próprio segue o padrão WAI-ARIA do seu tipo (APG): botão de menu, abas, diálogo modal, caixa de combinação, interruptor.
- Teclado:
  - setas andam dentro de listas, menus, abas e segmentados;
  - Tab sai do grupo;
  - Esc fecha;
  - ao fechar, o foco volta para quem abriu.
- Rótulo sempre visível (placeholder não é rótulo). Botão só de ícone tem nome acessível e dica.
- Mudança de estado é anunciada (`role="status"`). Erro ao salvar usa `role="alert"`.
- Zoom de 200% e texto aumentado não cortam conteúdo.

### 2.4 Movimento

- Cada componente usa os tokens da Seção 10 do `DESIGN.md`:
  - hover e toque em `dur-fast`;
  - menus, dicas e popovers surgem em `dur-base` (opacidade + 4px);
  - gaveta e aviso seguem a assinatura 5;
  - abas e segmentados usam o deslize da pílula.
- Único movimento novo: a gema que se lapida no **Avanço de estado**, com `ease-pop` (já reservado às gemas).
- Com movimento reduzido, sobra só um fade de 160ms.

### 2.5 Temas e níveis de efeito

- Só tokens semânticos ou de componente; nada de hex ou px soltos.
- Todo primitivo funciona nos dois temas, porque aparece no admin (Obsidiana) e no app da equipe (Quartzo).
- Cada componente diz o que muda por nível:

  | Nível | Vidro | Lente | Aro do botão primário | Desfoque |
  |---|---|---|---|---|
  | **Completo** | sim | onde é permitida | girando | sim |
  | **Padrão** | sim | não | parado | sim |
  | **Leve** | não (superfície sólida) | não | some | não |

- Menus, dicas e avisos são do nível 2 de profundidade (quase sólidos). Não dependem de desfoque e custam pouco no celular.

### 2.6 Conteúdo e encaixe

- Os textos seguem a Seção 11 (voz e tom): botão com verbo + objeto, datas como "qua, 5 nov".
- Nome longo corta com reticências e aparece inteiro na dica. Dinheiro e datas nunca cortam.
- Componente não tem margem própria. Quem decide o espaço entre eles é o padrão ou a tela.

---

## 3. Inventário

### 3.1 Primitivos

| Componente | Para quê | Situação | Onde |
|---|---|---|---|
| Gema de status | estado pela forma | existe | F3 · F5 |
| Botão | primário, secundário, fantasma, perigo, só ícone; sm, md, lg | existe (estados completos na folha) | todas |
| Link | navegar no meio do texto ("Ver todas", "Abrir na agenda") | **novo** | todas |
| Campo | texto, área de texto, número com − e + (hóspedes), moeda, telefone, e-mail, senha (mostrar ou ocultar), horário | existe só o de texto; faltam os outros tipos e o só leitura | F1–F4 · Contas |
| Lista suspensa | escolher entre opções fixas (imóvel, tipo, responsável) | existe a nativa estilizada. Falta a lista rica: no Chrome, no Edge e no Safari 27, com avatar, gema e a carga do dia ("Cida · 2 tarefas hoje"); no Firefox, a lista do sistema | F1–F4 |
| Caixa de seleção · rádio · interruptor | marcar, escolher um, ligar ou desligar | **novo** | F1 · F4 · filtros |
| Chip de status | estado compacto | existe | F2 · F3 · F5 |
| Pílula | etiqueta neutra | existe | todas |
| Atalho (kbd) | mostrar a tecla | existe | admin |
| Avatar | pessoa | existe | F4 |
| Medidor | proporção | existe | F1 · F6 |
| Ícone | apoio visual | existe (desenho próprio). Proposta: Lucide para os ícones gerais; gemas e logo continuam desenho próprio | todas |
| Esqueleto facetado | carregar sem o layout pular | **novo** | todas |
| Carregando | indicador para botão e para área | existe (só no botão) | todas |

O interruptor vale na hora, sem "Salvar". A caixa de seleção vale quando o formulário é salvo.

A caixa de seleção tem os cantos cortados em 20% do lado (4px em 20px), a mesma proporção do ladrilho do estado vazio. Com mais corte ela vira um octógono quase redondo e se confunde com o rádio.

### 3.2 Componentes

| Componente | Para quê | Situação | Onde |
|---|---|---|---|
| Cartão de vidro | agrupar conteúdo | existe | todas |
| KPI | número do mês | existe | F6 |
| Alternador e segmentado | escolher visão ou modo | existe | todas |
| Seletor de período | navegar entre meses | existe | F2 · F6 |
| Gráfico de receita · Ocupação por imóvel · Bloco "Hoje" | o painel | existe | F6 |
| Dica flutuante | detalhe ao apontar ou focar | existe | todas |
| Aviso (toast) | confirmar e permitir desfazer | existe | todas |
| Faixa de aviso | aviso dentro da página; diferente do Aviso, que flutua e some sozinho | existe. Faltam três versões: com ação ("Tentar de novo"), fixa (sem internet) e a que se fecha | todas |
| Gaveta | detalhe e formulário | existe. Faltam a versão que sobe de baixo no celular e o aviso de mudanças não salvas | F1–F4 |
| Busca | achar imóvel, hóspede ou reserva | existe só o campo. Faltam os resultados agrupados, as ações rápidas ("Nova reserva") e o botão que abre a busca em tela cheia no celular | F1 · F2 |
| Navegação | trocar de área | existe | todas |
| Cabeçalho de página | título, linha de contexto, ação principal, voltar | existe sem regra; formalizar | todas |
| Linha de lista | gema ou avatar, título, metadados, valor ou ação | existe no "Hoje"; formalizar (≥56px no app da equipe) | F4 · F5 · F6 |
| Filtros | recortar uma lista por imóvel, estado, período ou responsável | existe no painel (período + imóvel). Falta a fila de filtros com contagem e "Limpar filtros" | F2 · F3 |
| Cartão de tarefa | a tarefa no celular (grande) e no admin (compacto) | existe no pôster (equipe); **novo** no admin | F3 · F5 |
| Seletor de datas | entrada e saída. No computador, um calendário que mostra as noites já ocupadas do imóvel e calcula noites × diária. No celular, o seletor do sistema | **novo** | F2 |
| Tabela de dados | listas densas: cabeçalho preso, ordenar por coluna, a linha abre o detalhe, menu na ponta; no celular vira cartões | **novo** (a tabela equivalente dos gráficos é a base) | F1–F4 |
| Abas | dividir um detalhe ("Reservas · Tarefas · Dados"; "Hoje · Próximas") | **novo** | F1 · F5 |
| Menu de ações | ações de uma linha ou cartão (Editar, Excluir) e o menu da conta | **novo** | F1–F4 · Contas |
| Cartão de imóvel | prontidão ("Pronto", "Limpando", "Em curso"), ocupação do mês, próxima entrada | **novo** | F1 |
| Cartão de pessoa | função, telefone, tarefas de hoje em fila de gemas | **novo** | F4 |
| Avanço de estado | levar a tarefa ao próximo estado (detalhe abaixo) | **novo** · assinatura | F5 |
| Atividade recente | quem fez o quê e quando ("Cida concluiu a limpeza da Casa da Praia · 10:42") | **novo** | F6 |
| Estado vazio | o que é + primeira ação; três tipos: primeiro uso, sem resultado, dia livre | **novo** | todas |
| Diálogo | confirmar o que não tem desfazer (descartar mudanças) e avisar que a sessão expirou | **novo** | todas |

**Avanço de estado** é a peça assinatura do app da equipe:
- **Forma:** um botão grande (48px, largura toda) com o próximo passo: "Começar limpeza" → "Concluir limpeza".
- **Ao tocar:**
  - a gema do cartão se lapida: pedra bruta → contorno âmbar → lapidada esmeralda;
  - o chip de status muda;
  - aparece o aviso com "Desfazer" por 10s.
- **Sem confirmação:** o "Desfazer" resolve o toque errado.
- **Leitor de tela:** ouve "Limpeza da Casa da Praia em andamento".

### 3.3 Padrões

| Padrão | Como funciona | Situação |
|---|---|---|
| Agenda | linha do tempo de imóveis × dias | existe |
| Nova reserva | gaveta com valor = diária × noites e checagem de conflito | existe |
| Desfazer em vez de confirmar | ação reversível → aviso com "Desfazer" | existe |
| Tabela equivalente | todo gráfico e a agenda têm tabela | existe |
| Formulário de cadastro | rótulo em cima; campo opcional marcado como "Opcional"; valida ao sair do campo e ao salvar; resumo de erros no topo leva o foco ao primeiro erro; ao fechar com mudanças, pergunta antes de descartar | **novo** |
| Lista com filtros | cabeçalho + filtros + tabela ou cartões + carregando, vazio e erro; os filtros continuam ao voltar | **novo** |
| Estados de dados | primeira carga com esqueleto; ao atualizar, os dados antigos ficam à vista; erro com "Tentar de novo" | **novo** |
| Entrar | e-mail e senha; o erro não diz qual dos dois está errado; cada perfil cai na sua tela (admin no painel, equipe nas tarefas) | **novo** |
| Sem internet (equipe) | guardar a mudança e sincronizar depois? | decidir na seção do app da equipe |

### 3.4 Modelos (telas)

Ficam para as seções de telas. Entram aqui só para fechar a conta.

| Modelo | Situação |
|---|---|
| Casca do admin · Visão geral · Agenda | existe |
| Lista (imóveis, reservas, tarefas, equipe) · Detalhe do imóvel · Entrar | **novo** |
| App da equipe: casca, minhas tarefas, detalhe da tarefa | planejado (seção própria) |

### 3.5 Depois (fora do PDF)

Vieram da pesquisa com apps de limpeza para temporada (Turno, Breezeway). Ficam fora da v1 de propósito, e dá para puxar qualquer um:

- checklist de limpeza por imóvel;
- foto de comprovação ao concluir;
- relatar problema (vira tarefa de manutenção);
- notificações (quando a equipe conclui, quando chega reserva);
- foto do imóvel;
- busca dentro das listas suspensas, quando as listas passarem de uns 30 itens;
- ações em lote (selecionar várias linhas).

### 3.6 Contagem

48 peças: 30 já existem nos protótipos, 17 são novas e 1 fica para decidir na seção do app da equipe (sem internet). Nenhuma peça nova está aqui sem uma funcionalidade do PDF que precise dela.

---

## 4. Rastreabilidade: funcionalidade → telas → componentes

| Funcionalidade (PDF) | Telas | Componentes principais |
|---|---|---|
| F1 · Imóveis | lista, detalhe com abas, cadastro | Cartão de imóvel, Tabela de dados, Abas, Formulário de cadastro, Menu de ações |
| F2 · Reservas e hóspedes | agenda, lista, detalhe, nova reserva | Agenda, Seletor de datas, Tabela de dados, Filtros, Gaveta, Busca |
| F3 · Limpeza e manutenção | lista de tarefas, detalhe, nova tarefa | Cartão de tarefa (admin), Gema e chip de status, Lista suspensa (responsável), Filtros |
| F4 · Equipe e atribuição | lista de pessoas, cadastro, atribuição na tarefa | Cartão de pessoa, Avatar, Lista suspensa com avatar e carga do dia |
| F5 · Painel da equipe | minhas tarefas, detalhe da tarefa | Cartão de tarefa (equipe), Avanço de estado, Abas, Navegação (barra inferior) |
| F6 · Painel do admin | visão geral | KPI, gráficos, Bloco "Hoje", Atividade recente |
| Contas | entrar, sair, sessão expirada | Campo de senha, Menu da conta, Diálogo |

---

## 5. Próximas partes

1. **Parte 2 — folha, lote A:** primitivos, campos, lista suspensa, seletor de datas, escolhas, esqueleto, faixa de aviso e estado vazio.
2. **Parte 3 — lote B, em documento (`parte-3-lote-b.md`):** navegação, cabeçalho, abas, menu, busca, filtros, tabela, linha de lista, cartões, atividade recente, avanço de estado, gaveta, diálogo, dica e aviso.
3. **Fecho:** proposta de texto para a Seção 4 do `DESIGN.md`. Só gravo com o seu sim.

Esta parte também responde a duas perguntas em aberto do `DESIGN.md` (Seção 9):
- **Ícones:** Lucide.
- **Busca no celular:** um botão no topo abre a busca em tela cheia.

---

## Fontes da pesquisa

- Turno, relato de problemas pela equipe de limpeza: https://turno.com/features/problem-reporting/
- Turno, checklists com foto: https://turno.com/features/photo-checklists/
- Análise do Breezeway (checklists, fotos, relato de problemas, uso sem internet): https://strspecialist.com/reviews/breezeway-cleaning-ops-review
- Chrome, `<select>` estilizável com CSS: https://developer.chrome.com/blog/a-customizable-select
- Safari 27 e o `<select>` estilizável: https://blakecrosley.com/pt-BR/blog/customizable-select-safari-27
- web.dev, novidades de junho de 2026: https://web.dev/blog/web-platform-06-2026
- web.dev, novidades de janeiro de 2026 (posicionamento por âncora no Firefox 147): https://web.dev/blog/web-platform-01-2026
