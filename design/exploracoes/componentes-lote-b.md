# Gemóvel — Componentes, lote B (rascunho)

> Parte 3 da seção de componentes. O lote A virou uma página que mostra os componentes funcionando (`componentes.html`). O lote B, a pedido de vocês, para economizar, fica só neste documento. Ele só vale depois de aprovado. No fim está o que muda na Seção 4 do `DESIGN.md`; só gravo com o sim de vocês.

- **Base:**
  - `DESIGN.md` v0;
  - a Parte 1 (`componentes.rascunho.md`), aprovada;
  - a folha do lote A, aprovada.
- **Regras comuns:** estão na Parte 1, §2, e valem para tudo aqui: estados, tamanhos, acessibilidade, movimento, temas e níveis de efeito. Cada ficha só traz o que é próprio do componente.
- **Tokens:**
  - Os nomes novos (`--nav-*`, `--table-*`…) são tokens de componente e apontam para os semânticos.
  - Os valores em px moram no arquivo de tokens, como os demais.
  - Os rótulos "nível 1, 2, 3" são os níveis de profundidade da Seção 6 do `DESIGN.md`.
- **Funcionalidades do PDF:**
  - F1 imóveis
  - F2 reservas e hóspedes
  - F3 limpeza e manutenção
  - F4 equipe
  - F5 painel da equipe
  - F6 painel do admin

| Grupo | Componentes |
|---|---|
| Estrutura | 1 Navegação · 2 Cabeçalho de página · 3 Abas |
| Achar e recortar | 4 Busca · 5 Filtros |
| Listas | 6 Tabela de dados · 7 Linha de lista · 8 Atividade recente |
| Cartões | 9 Cartão de tarefa · 10 Cartão de imóvel · 11 Cartão de pessoa |
| Ação | 12 Avanço de estado · 13 Menu de ações |
| Camadas | 14 Gaveta e folha inferior · 15 Diálogo · 16 Dica flutuante · 17 Aviso |

---

## Estrutura

### 1. Navegação

Serve para trocar de área. Já existe no protótipo; aqui ganha regra.

**Base nativa**
- `<nav aria-label="Principal">` com links (`<a>`).
- O item da página atual leva `aria-current="page"`.
- São links, não botões: cada área tem endereço próprio, abre em nova aba e volta pelo botão do navegador.

**Destinos do admin**
- Visão geral · Agenda · Reservas · Imóveis · Tarefas · Equipe.
- O menu da conta fica no rodapé da lateral.
- **Configurações** sai da v1: a única opção prevista ("Efeitos visuais") cabe no menu da conta (13).

**Variantes**

| Variante | Onde | Como é |
|---|---|---|
| Lateral | admin, ≥1241px | 232px; logo, itens com ícone de 20px + rótulo + contador; menu da conta no rodapé |
| Trilho | admin, 761–1240px | 76px; só ícones, com o rótulo numa dica (16); o contador vira um número no canto do ícone |
| Barra inferior | admin ≤760px e app da equipe | flutuante, de vidro, a 8px das bordas; 64px + área segura do aparelho; de 3 a 5 destinos, com ícone e rótulo sempre visíveis |

**Celular**
- **Admin:** os 6 destinos não cabem em 5 lugares. Proposta: Visão geral · Agenda · Reservas · Tarefas · **Mais**.
  - O "Mais" abre um menu com Imóveis e Equipe.
  - No topo ficam o logo, o botão de busca e o avatar, que abre o menu da conta.
  - É o ponto 1 para decidir, no fim do documento.
- **App da equipe:** os destinos saem na seção do app da equipe. Com menos de 3 destinos, a barra não compensa; abas (3) e o menu da conta no topo resolvem.

**Contador**
- Mostra as tarefas atrasadas, que são o que pede ação.
- Nome acessível: "Tarefas, 1 atrasada". Some quando é zero.

**Item atual**
- Pílula de vidro (`--nav-pill-bg`) + texto `color-text` 600.
- Os outros itens ficam em `color-text-muted`.

**Movimento**
- A pílula desliza até o item novo (assinatura 2), usando View Transitions onde o navegador suportar.
- Sem suporte ou com movimento reduzido, ela aparece direto no item novo.

**Níveis de efeito**
- Completo: a pílula tem lente (é um dos dois lugares onde a lente é permitida).
- Padrão: vidro sem lente.
- Leve: `color-pressed` sólido, e a barra inferior fica sólida.

**Teclado:** Tab passa pelos links; não há setas, porque é navegação e não menu. O primeiro item da página é o link "Pular para o conteúdo".

**Tokens:** `--nav-w` 232px · `--nav-rail-w` 76px · `--nav-item-h: var(--control-md)` · `--nav-pill-bg: var(--color-pressed)` · `--nav-bar-h` 64px.

### 2. Cabeçalho de página

Diz onde a pessoa está e qual é a ação principal da página. Já existe, mas sem regra.

**Anatomia:** voltar (opcional) · título (`<h1>`, um por página) · linha de contexto · ações.

**Variantes**

| Variante | Título | Linha de contexto | Ações |
|---|---|---|---|
| Área (lista) | `display-lg` (`display-md` no celular): "Reservas" | `text-sm`, `color-text-muted`: "nov 2026 · 16 reservas" | uma primária ("Nova reserva") + até duas secundárias; o resto no menu "Mais ações" |
| Detalhe | `display-md`: "Casa do Lago" + chip de prontidão | "IMV-003 · Centro, Gramado · Diária R$ 450" (código em mono) | "Editar" (secundário) + menu de ações |
| Saudação (equipe) | `display-md`: "Bom dia, Cida" | "qua, 5 nov · 3 tarefas hoje" | nenhuma; a ação fica nos cartões |

**Regras**
- **Voltar:** um link com seta e o nome da lista ("← Reservas"), nunca só "Voltar". Os filtros estão no endereço (5), então a lista volta com eles.
- **Celular:**
  - A ação primária desce para a linha de baixo, em largura toda (44px).
  - As ações secundárias vão para "Mais ações".
- **Ação primária:** no máximo uma por cabeçalho.
- **Rolagem:** o cabeçalho rola com a página; quem fica preso é o topo da casca.

### 3. Abas

Dividem um detalhe em partes: "Reservas · Tarefas · Dados" no imóvel; "Hoje · Próximas" no app da equipe.

**Base:** o padrão de abas da APG.
- `role="tablist"`;
- cada aba é um `<button role="tab">` com `aria-selected` e `aria-controls`;
- cada painel tem `role="tabpanel"`.
- **Ativação automática:** a seta já troca o painel. Enquanto os dados chegam, o painel mostra o esqueleto do lote A.

**Diferença do segmentado:** o segmentado é uma pílula e troca o jeito de ver a mesma coisa ("Mês · Semana"). A aba é texto com um traço embaixo e troca o conteúdo. Assim as duas peças não se confundem.

**Anatomia**
- Rótulo em `text-base` 500, com contador opcional ("Tarefas 3").
- Na aba ativa, um traço de 2px em `color-text` com as pontas cortadas em ângulo (`cut-sm`).
- O traço desliza para a aba nova em `dur-slow`, `ease-entrance`.

**Estados**
- Repouso: `color-text-muted`.
- Ativa: `color-text` 600 + traço.
- Hover: `color-hover` atrás do rótulo.

**Teclado:** ← → andam entre as abas (do fim voltam ao começo); Home e End vão às pontas; Tab entra no painel.

**Endereço:** a aba ativa vai para o endereço (`#tarefas`); atualizar a página ou voltar mantém a mesma aba.

**Celular**
- Abas que não cabem rolam de lado, sem quebrar linha. Um degradê na borda mostra que há mais.
- No app da equipe, duas abas dividem a largura, com 48px de altura.

**Movimento reduzido:** o traço aparece direto na aba nova.

**Tokens:** `--tab-h: var(--control-md)` (equipe: `control-lg`) · `--tab-indicator: var(--color-text)` · `--tab-indicator-h` 2px.

---

## Achar e recortar

### 4. Busca

Acha imóvel, hóspede ou reserva de qualquer tela do admin. Hoje existe só o campo; faltam os resultados, as ações rápidas e a versão do celular.

**Base**
- `<search>` com `<input type="search">`, no papel de caixa de combinação da APG (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`).
- Os resultados ficam num `popover` preso ao campo por âncora.

**Abrir:** clicar no campo, ou ⌘/Ctrl K em qualquer tela.

**Antes de digitar:** mostra "Recentes" (os últimos 5 itens abertos, guardados no navegador) e "Ações".

**Resultados**
- Aparecem a partir de 2 letras, 200ms depois da última tecla. Uma busca nova cancela a anterior.

| Grupo | Cada resultado mostra | Máximo |
|---|---|---|
| Ações | "Nova reserva", "Novo imóvel", "Nova tarefa", quando o texto combina ("nova", "res"…) | 3 |
| Imóveis | nome · código · bairro | 5 |
| Reservas | código · hóspede · "5–8 nov" | 5 |
| Hóspedes | nome · telefone | 5 |

- O trecho que combina com a busca fica em negrito (`<mark>`, sem cor de fundo).
- Um grupo que passa do máximo termina em "Ver os 12 resultados", que abre a lista com o filtro aplicado.

**Estados**
- Carregando: um indicador no fim do campo. Os resultados antigos ficam até chegarem os novos.
- Sem resultado: "Nada encontrado para "casa do lgo". Confira a grafia ou busque pelo código, como IMV-003."
- Erro: "Não deu para buscar agora." + "Tentar de novo".

**Teclado**
- ↓ ↑ andam pelos resultados, pulando os títulos dos grupos.
- Enter abre o resultado.
- Esc limpa o texto; um segundo Esc fecha a busca.
- Tab sai da busca.

**Leitor de tela:** cada grupo é `role="group"` com nome. Quando a busca termina, uma região viva diz quantos resultados vieram ("8 resultados").

**Celular (≤760px)**
- O campo some e o topo ganha um botão "Buscar" (lupa).
- O botão abre a busca em tela cheia (`<dialog>`): campo no alto, já com o cursor, e "Cancelar" ao lado.
- Os resultados aparecem como linhas de lista de 56px (7).
- O botão voltar do Android fecha a busca.

**Tamanhos:** campo de 320px (240px no notebook); painel de 480px, com altura máxima de 60% da tela.

**Níveis:** o painel é de nível 2 (quase sólido) nos três níveis de efeito.

**Tokens:** `--search-w` 320px · `--search-w-compact` 240px · `--search-panel-w` 480px · `--search-panel-max-h` 60vh.

### 5. Filtros

Recortam uma lista por imóvel, estado, período ou responsável. O painel já tem período e imóvel; falta a fila completa.

**Anatomia (computador)**
- Uma fila de botões de filtro.
- "Limpar filtros", um link que só aparece com algum filtro ativo.
- À direita, a contagem ("16 reservas") e, quando houver, o alternador Tabela · Cartões.

**Botão de filtro**
- Botão secundário pequeno (`control-sm`) com o nome e o valor: "Imóvel: Todos", "Estado: Pendente".
- Com mais de um valor, mostra o número: "Estado: 2".
- Filtro ativo: fundo `color-pressed` e o valor em 600.

**Painel do filtro:** um `popover` preso ao botão.
- **Escolha múltipla** (estado, imóvel, responsável): caixas de seleção do lote A, com a contagem de cada opção: "Pendente (4)".
- **Escolha única** (período): rádios "Este mês", "Próximo mês" e "Escolher datas…". A última abre o seletor de datas do lote A.
- "Limpar" fica no rodapé do painel.
- A escolha vale na hora: cada marcação já atualiza a lista e a contagem.

**Endereço:** os filtros vão para o endereço (`?estado=pendente&imovel=3`). Voltar de um detalhe, atualizar a página ou mandar o link para alguém mantém o recorte.

**Sem resultado:** o estado vazio "sem resultado" do lote A, com "Limpar filtros".

**Celular**
- A fila vira um botão só, "Filtros (2)", que abre uma folha inferior (14) com todos os grupos.
- No rodapé da folha: "Mostrar 12 reservas" e "Limpar".
- Aqui a lista só muda ao tocar em "Mostrar", para a tela de trás não pular enquanto a pessoa marca as opções.

**Teclado:** Enter ou Espaço abre e fecha o painel; dentro dele, Tab passa pelas opções; Esc fecha e devolve o foco ao botão.

**Leitor de tela:** uma região viva diz quantos itens ficaram depois de cada mudança ("12 reservas").

**Tokens:** `--filter-h: var(--control-sm)` · `--filter-active-bg: var(--color-pressed)`.

---

## Listas

### 6. Tabela de dados

As listas densas do admin: reservas, imóveis, tarefas e equipe.

**Base**
- `<table>` de verdade, com `<caption>` (pode ficar visível só para o leitor de tela).
- `<thead>` preso ao rolar e `<th scope="col">`.

**Linha**
- A primeira célula tem o link do item, que abre a gaveta ou o detalhe.
- O link cobre a linha inteira: um alvo só e uma parada de Tab por linha.
- A última célula tem o menu de ações (13), por cima do link.

**Colunas**
- Cabeçalho em `text-2xs` (mono, caixa alta), cor `color-text-subtle`, com linha `color-border-strong` embaixo.
- Corpo em `text-sm`, linhas de 40px, divisões em `color-border`.
- Números, dinheiro e horários alinhados à direita, com algarismos tabulares.
- Datas como "qua, 5 nov"; estado com chip; pessoa com avatar pequeno.
- Cada coluna tem prioridade 1, 2 ou 3:
  - a 3 some abaixo de 1240px;
  - a 2 some abaixo de 1020px;
  - código e nome nunca somem.

**Ordenar**
- O rótulo de cada cabeçalho é um botão. Clicar alterna entre crescente e decrescente, com uma seta.
- Ordena por uma coluna de cada vez; o `<th>` leva `aria-sort`.
- Ordem inicial:
  - reservas por entrada, a partir de hoje;
  - imóveis por nome;
  - tarefas por horário;
  - equipe por nome.

**Linha aberta:** a linha cuja gaveta está aberta fica com `color-pressed` e um traço de 2px em `color-text` à esquerda.

**Estados da tabela**
- **Primeira carga:** 8 linhas de esqueleto (lote A).
- **Ao atualizar:** os dados antigos ficam, e um indicador aparece ao lado da contagem.
- **Erro:** a faixa de aviso do lote A, acima da tabela, com "Tentar de novo".
- **Vazio:** o estado vazio do lote A no lugar das linhas.

**Muitas linhas**
- A tabela mostra 50 linhas e um botão "Carregar mais" no fim; a contagem diz "50 de 132".
- Sem páginas numeradas, para a pessoa não perder o ponto da rolagem.

**Vidro**
- A tabela fica num cartão de vidro, e o cabeçalho preso usa o mesmo vidro. É a segunda camada de vidro, o limite permitido.
- No nível Leve, tudo é sólido.

**Teclado**
- Tab passa pelos botões de ordenar e, depois, pelo link e pelo menu de cada linha.
- Não há setas célula a célula: é uma tabela de leitura, não uma planilha (`role="grid"` não entra).

**Celular (≤760px):** a tabela vira uma lista de linhas (7) com as colunas de prioridade 1. Ordenar e filtrar vão para a folha de filtros (5).

**Tokens:** `--table-row-h` 40px · `--table-head-h` 36px · `--table-head-fg: var(--color-text-subtle)` · `--table-divider: var(--color-border)` · `--table-head-divider: var(--color-border-strong)` · `--table-row-open-bar: var(--color-text)`.

### 7. Linha de lista

Um item numa lista. Aparece no bloco "Hoje", nas tarefas da equipe, na tabela do celular, na busca do celular e na atividade recente.

**Anatomia**
- **Início:** gema, avatar ou ícone.
- **Meio:**
  - o título, em uma linha que corta com reticências (`text-base` 500 no admin, `text-md` 600 na equipe);
  - os metadados embaixo, em `text-sm` muted: "Casa da Praia · 11:00–15:00".
- **Fim:** um valor (algarismos tabulares), um chip, um botão fantasma, ou a seta › quando a linha leva a outra tela.

**Tamanhos**
- Compacta: 40px, uma linha, no admin.
- Confortável: a partir de 56px, duas linhas, no app da equipe e no celular.

**Toque**
- A linha inteira é um alvo só (um link que cobre a linha).
- Uma ação extra no fim é um botão separado, por cima do link, nunca dentro dele.

**Grupos:** títulos por dia ("Hoje", "Amanhã, qui 6 nov") em `text-2xs`. No celular, o título fica preso no topo enquanto o grupo rola.

**Divisões:** 1px em `color-border`, começando depois do elemento de início.

**Base:** `<ul role="list">` com `<li>`. O papel de lista vai escrito porque o Safari o tira quando o marcador da lista some.

**Tokens:** `--row-h-compact` 40px · `--row-h-comfy` 56px · `--row-pad-x: var(--space-4)` · `--row-gap: var(--space-3)`.

### 8. Atividade recente

Mostra no painel do admin quem fez o quê e quando: "Cida concluiu a limpeza da Casa da Praia · 10:42".

**Fonte:** o histórico das tarefas (`historico_tarefa`), que já guarda quem criou, começou ou concluiu cada tarefa, e quando. As reservas ficam de fora: quem cria uma reserva é o próprio admin, que não precisa ver o que ele mesmo fez.

**Anatomia:** linha compacta (7) com o avatar da pessoa, a frase (o nome em 600, o verbo e a tarefa como link) e a hora em `<time datetime>`.

**Hora**
- "agora", ou "há 5 min" até completar uma hora;
- depois, a hora: "10:42";
- de ontem: "ontem, 18:20";
- mais antiga: "seg, 3 nov".

**Quantidade**
- O cartão do painel mostra as 8 últimas atividades, agrupadas em "Hoje" e "Ontem".
- "Ver histórico" abre a gaveta com 50 atividades e "Carregar mais".

**Atualizar**
- Quando a aba volta a ficar visível, e a cada 2 minutos.
- Uma atividade nova entra com fade e uma subida de 14px (a cascata); com movimento reduzido, só o fade.
- Não há região viva: a atualização do painel não interrompe o leitor de tela.

**Vazio:** "Nada aconteceu hoje ainda. Quando a equipe começar ou concluir uma tarefa, aparece aqui."

**Erro:** a faixa de aviso dentro do cartão, com "Tentar de novo".

---

## Cartões

### 9. Cartão de tarefa

A tarefa em forma de cartão. No app da equipe ele é grande (já está no pôster); no admin é compacto (novo).

**App da equipe (Quartzo)**

```
┌─────────────────────────────────────┐
│ ◇ Pendente              11:00–15:00 │  gema grande + chip + horário (mono)
│ Limpeza · Casa da Praia             │  text-lg 600
│ Centro · entrada às 15:00           │  text-sm muted
│ 4 hóspedes                          │
│ ┌─────────────────────────────────┐ │
│ │ ▶  Começar limpeza              │ │  Avanço de estado (12), 48px
│ └─────────────────────────────────┘ │
│ Ver detalhes ›                      │  link para o detalhe
└─────────────────────────────────────┘
```

- **Aparência:** cantos `radius-xl` e recuo `space-5`. Fica de vidro no nível Padrão e sólido no Leve (o app começa no Leve).
- **Por estado:**

  | Estado | Gema | Botão | Linha extra |
  |---|---|---|---|
  | Pendente | pedra bruta | "Começar limpeza" | — |
  | Em andamento | contorno âmbar | "Concluir limpeza" | "Começou às 11:05" |
  | Concluída | lapidada esmeralda | nenhum | "Concluída às 12:40" |
  | Atrasada | pedra bruta com "!", em rubi | "Começar limpeza" | "Atrasada · a entrada é às 15:00" |

- **Atrasada:** a gema de atrasada só vale enquanto a tarefa não começou. Depois de começar, a forma da gema mostra o avanço (em andamento), e o atraso continua escrito em rubi na linha de contexto. Assim a forma sempre conta o progresso da tarefa.
- **Ordem na tela:**
  - primeiro as atrasadas, depois as em andamento, depois as pendentes, cada grupo por horário;
  - as concluídas descem para um grupo recolhido: "3 concluídas".
- **Leitor de tela:** o cartão é um `<article>` com o título como nome. O botão é descrito pelo título (`aria-describedby`) e soa como "Começar limpeza, Limpeza · Casa da Praia".

**Admin (Obsidiana)**
- É uma linha compacta (7), numa lista agrupada por dia.
- Mostra: gema média · "Limpeza · Casa da Praia" · avatar e nome do responsável · horário · chip · menu de ações.
- O menu tem "Editar", "Marcar como…" (os dois outros estados) e "Excluir".
- O admin muda o estado pelo menu; o Avanço de estado é exclusivo do app da equipe.

**Tokens:** `--task-card-pad: var(--space-5)` · `--task-card-radius: var(--radius-xl)`.

### 10. Cartão de imóvel

A lista de imóveis em grade (F1): prontidão, ocupação do mês e próxima entrada.

```
┌─────────────────────────────────────┐
│ Casa do Lago                      ⋯ │  text-md 600 + menu de ações
│ IMV-003 · Centro, Gramado           │  código em mono + local
│ ◆ Pronto                            │  chip de prontidão
│ ━━━━━━━━━━━━━━━━━━━━━━──────  78%   │  medidor de 4px + valor
│ Próxima entrada · qui, 6 nov        │
│ 15:00 · Mariana Costa               │
│ Diária R$ 450                       │
└─────────────────────────────────────┘
```

**Prontidão:** calculada a partir das reservas e das tarefas.

| Situação | Como aparece |
|---|---|
| Hóspedes no imóvel | pílula safira "Hóspedes até sex, 7 nov" |
| Os hóspedes saíram e a limpeza não começou | chip pendente "Limpeza pendente" |
| Limpeza em andamento | chip em andamento "Limpando" |
| Limpo, ou sem reserva por perto | chip concluída "Pronto" |
| A limpeza não terminou antes da próxima entrada | chip atrasada "Limpeza atrasada" |

**Ocupação do mês:** o medidor de 4px do lote A + "78%". A dica do medidor diz "78% de ocupação em novembro (23 de 30 noites)".

**Sem imagem:** a foto do imóvel está em "Depois" (Parte 1). O cartão também não ganha imagem de enfeite nem prisma, que é reservado à identidade.

**Toque**
- O cartão inteiro leva ao detalhe do imóvel.
- O menu fica no canto, por cima do cartão: "Editar", "Bloquear datas" e "Desativar".
- "Desativar" usa o campo `ativo` que o banco já tem: o imóvel some das listas, o histórico fica, e o aviso oferece "Desfazer".
- Não há "Excluir": um imóvel com reservas não pode ser apagado.

**Grade**
- Colunas de pelo menos 280px que preenchem a largura (`auto-fill`), com vão de 20px. No celular, uma coluna.
- A lista de imóveis abre em cartões e tem o alternador Tabela · Cartões. A escolha fica guardada no navegador.

**Tokens:** `--prop-card-min` 280px.

### 11. Cartão de pessoa

A equipe (F4): a função, o contato e o dia de cada pessoa.

```
┌─────────────────────────────────────┐
│ (CR) Cida Ramos                   ⋯ │  avatar grande + nome + menu
│      Limpeza                        │  pílula neutra
│ (54) 99123-4567                     │  link tel:
│ Hoje  ◆ ◆ ◇  2 de 3 concluídas      │  fila de gemas + texto
│ Agora: limpando Casa da Praia       │
└─────────────────────────────────────┘
```

**Fila de gemas**
- Uma gema pequena por tarefa de hoje, na ordem do horário.
- O texto ao lado dá o número ("2 de 3 concluídas"), porque a fila sozinha não é lida pelo leitor de tela.
- Com mais de 6 tarefas: 6 gemas e "+2".

**Linha do agora:** "Agora: limpando Casa da Praia" (quando há tarefa em andamento), "Próxima: 14:00 · Chalé da Serra" ou "Dia livre".

**Telefone:** um link `tel:` com o número formatado. O link de WhatsApp é o ponto 2 para decidir, no fim do documento.

**Menu**
- "Nova tarefa para Cida", "Editar" e "Desativar".
- "Desativar" usa o campo `ativo` do usuário: a pessoa não entra mais no sistema e some da lista de responsáveis, mas o histórico dela fica.

---

## Ação

### 12. Avanço de estado (assinatura)

A peça assinatura do app da equipe: leva a tarefa para o próximo estado com um toque.

**Forma**
- Botão primário (superfície inversa), largura toda, 48px, com ícone, verbo e objeto.
- ▶ "Começar limpeza" leva de pendente a em andamento; ✓ "Concluir limpeza" leva de em andamento a concluída.
- Na manutenção: "Começar manutenção" e "Concluir manutenção".
- Na tarefa concluída, o botão sai e fica a linha "Concluída às 12:40".

**Ao tocar**
1. O botão vira "Começando…" ou "Concluindo…", com o indicador do lote A, sem mudar de largura. Toques repetidos são ignorados.
2. O pedido vai ao servidor, e por enquanto a tela espera a resposta. A versão que muda na hora e sincroniza depois vem junto com a decisão do modo sem internet, na seção do app da equipe.
3. Com a resposta, a gema do cartão se lapida:

| Passagem | O que a gema faz | Tempo |
|---|---|---|
| pendente → em andamento | o contorno bruto vira o contorno lapidado: as linhas da coroa se desenham, e a cor passa de quartzo a âmbar | 400ms (`dur-moderate`, `ease-entrance`) |
| em andamento → concluída | o preenchimento sobe da ponta do pavilhão até a coroa, as linhas do pavilhão aparecem, a cor passa a esmeralda e um brilho atravessa a gema uma vez | 600ms (`dur-slow`) |
| no fim das duas | um único "pulo" de escala (1 → 1,15 → 1) | `ease-pop` (`back.out(2)`), uma vez |

4. O chip troca de texto, e aparece o aviso "Limpeza da Casa da Praia concluída." com "Desfazer" por 10s.
5. Ao concluir, o celular vibra por 15ms. Isso funciona no Android; o iPhone ignora.

**Desfazer:** volta ao estado anterior com um fade simples, sem o pulo.

**Esqueceu de começar?** Dois toques seguidos resolvem: "Começar", depois "Concluir". Não há atalho para pular uma etapa; a peça fica mais simples e o histórico registra as duas.

**Se falhar:** a gema não muda, o botão volta ao normal e o cartão mostra uma faixa de aviso: "Não deu para salvar. Confira a internet." + "Tentar de novo".

**Foco e leitor de tela**
- **Em andamento:** o foco fica no botão, que agora diz "Concluir limpeza". A região viva anuncia "Limpeza da Casa da Praia em andamento".
- **Concluída:** o botão sai, e o foco vai para a linha "Concluída às 12:40" (`tabindex="-1"`), nunca para o vazio. A região viva anuncia "Limpeza da Casa da Praia concluída".

**Níveis de efeito:** igual nos três. É uma animação que roda uma vez e só mexe em `transform`, `opacity`, `clip-path` e no traço do SVG, então é barata.

**Movimento reduzido:** a gema troca de estado com um fade de 160ms, sem o desenho e sem o pulo.

**Tokens:** `--advance-h: var(--control-lg)` · `--advance-bg: var(--color-surface-inverse)` · `--advance-fg: var(--color-text-on-inverse)`.

### 13. Menu de ações

As ações de uma linha ou de um cartão ("Editar", "Excluir"), e também o menu da conta.

**Base**
- O padrão de botão de menu da APG: `<button aria-haspopup="menu" aria-expanded>`.
- O botão abre um `popover` com `role="menu"` e itens `role="menuitem"`.
- O menu fica preso ao botão por âncora e se vira para cima ou para o lado quando falta espaço.

**Gatilho:** um botão só de ícone ("⋯"), com um nome que diz de quem são as ações ("Ações da reserva RSV-1042") e a dica "Mais ações".

**Itens**
- Cada item tem ícone de 16px, rótulo e, quando houver, atalho de teclado (`kbd`).
- Grupos de itens são separados por uma linha.
- O item destrutivo vem por último, em rubi e com ícone próprio: "Excluir reserva".

**Excluir:** acontece na hora, e o aviso mostra "Reserva excluída." com "Desfazer" (o padrão "Desfazer em vez de confirmar"). O diálogo (15) fica só para o que não tem desfazer.

**Item indisponível:** só aparece quando a pessoa precisa saber que a ação existe. O motivo vem embaixo do rótulo: "Bloquear datas — o imóvel está desativado".

**Menu da conta**
- O gatilho é o avatar com o nome (na lateral) ou só o avatar (no topo, no celular).
- No topo do menu ficam o nome e o e-mail da pessoa, sem receber foco.
- "Efeitos visuais" tem três opções (`menuitemradio`): Automático · Completo · Leve.
- Por último, "Sair".

**Teclado**
- Enter, Espaço ou ↓ abrem o menu no primeiro item; ↑ abre no último.
- ↑ ↓ andam entre os itens (do fim voltam ao começo); Home e End vão às pontas.
- Digitar uma letra pula para o item que começa com ela.
- Esc fecha e devolve o foco ao botão; Tab fecha e segue adiante.

**Celular (≤760px):** o mesmo menu aparece como folha inferior, com itens de 48px e "Cancelar" no fim. Só o CSS muda.

**Níveis:** nível 2 (quase sólido) nos três níveis de efeito.

**Movimento**
- O menu surge em `dur-base`: opacidade e 4px de deslocamento a partir do botão.
- Como folha, sobe em `dur-moderate` (`ease-entrance`) e desce em `dur-base` (`ease-exit`).

**Tokens:** `--menu-min-w` 200px · `--menu-item-h: var(--control-sm)` (40px no toque, 48px na folha) · `--menu-danger-fg: var(--status-late-fg)`.

---

## Camadas

### 14. Gaveta e folha inferior

Detalhes e formulários por cima da tela. As gavetas da reserva, da nova reserva e do bloqueio já existem; faltam a folha do celular e o aviso de mudanças não salvas.

**Base:** `<dialog>` aberto com `showModal()`. O foco fica preso dentro dele, o fundo para de responder, e Esc fecha.

**Anatomia**
- **Cabeçalho:** título em `display-md`, linha de contexto e o botão "Fechar". No detalhe, também "Editar" e o menu de ações.
- **Corpo:** rola quando o conteúdo não cabe.
- **Rodapé:** fica preso embaixo, com as ações do formulário ("Cancelar" e "Salvar reserva"; a primária à direita).

**Computador:** painel à direita, com 430px, no nível 3 de profundidade.

**Celular (≤760px)**
- Folha que sobe de baixo e ocupa quase a tela toda (sobram 12px no topo).
- Cantos de cima em `radius-xl` e uma alça de 36 × 4px.
- Arrastar a alça para baixo fecha a folha, mas o botão "Fechar" continua sendo o caminho principal.

**Endereço:** abrir um detalhe põe o item no endereço (`?reserva=1042`). Atualizar a página reabre a gaveta, e o botão voltar (inclusive o do Android) fecha.

**Ir mais fundo:** uma gaveta nunca abre outra. Da reserva para o hóspede, o conteúdo troca dentro da mesma gaveta, e o cabeçalho ganha "← Reserva RSV-1042".

**Mudanças não salvas**
- Fechar um formulário alterado por qualquer caminho (Esc, "Fechar", "Cancelar", clique fora da gaveta ou voltar) abre o diálogo "Descartar as mudanças?" (15).
- Recarregar ou sair da página com mudanças usa o aviso do próprio navegador (`beforeunload`).

**Foco:** ao abrir, vai para o primeiro campo (formulário) ou para o título (detalhe). Ao fechar, volta para quem abriu.

**Níveis de efeito**
- Completo: vidro com lente na borda.
- Padrão: vidro.
- Leve: sólido (`elev-3-solid`).

**Movimento**
- A gaveta entra pela direita em 550–600ms (`expo.out`) e sai em 240ms (assinatura 5). A folha faz o mesmo, de baixo para cima.
- Com movimento reduzido, só um fade de 160ms.

**Tokens:** `--drawer-w` 430px · `--drawer-pad: var(--space-6)` · `--sheet-top-gap` 12px · `--sheet-handle-w` 36px · `--sheet-handle-h` 4px.

### 15. Diálogo

Para o que não tem desfazer e para a sessão expirada.

**Base:** `<dialog>` aberto com `showModal()`, com o nome vindo do título (`aria-labelledby`) e a descrição do texto (`aria-describedby`). O "Descartar" também leva `role="alertdialog"`.

**Anatomia**
- Título em forma de pergunta (`text-lg` 600).
- Uma ou duas frases dizendo a consequência.
- Os botões.
- Largura máxima de 400px, centralizado, no nível 3 de profundidade, com véu atrás.

**Variantes**

| Variante | Título | Texto | Botões (foco inicial em negrito) |
|---|---|---|---|
| Descartar | "Descartar as mudanças?" | "O que você preencheu na nova reserva vai se perder." | "Descartar" (perigo) · **"Continuar editando"** |
| Sessão expirada | "Sua sessão expirou" | "Por segurança, entre de novo. O que você estava fazendo continua aqui." | e-mail e senha no próprio diálogo · **"Entrar"** · "Sair" |

**Sessão expirada sem perder trabalho**
- Quando o servidor avisa que a sessão acabou, o diálogo pede o e-mail e a senha ali mesmo.
- Depois de entrar, o pedido que tinha falhado é feito de novo, e o formulário que estava atrás continua preenchido.
- Esc não fecha esse diálogo, porque sem entrar nada funciona. "Sair" é a saída para quem está num aparelho emprestado.

**Botões:** no computador, à direita, com a ação principal por último. No celular, empilhados em largura toda, com a principal em cima.

**Esc:** no "Descartar", Esc equivale a "Continuar editando", o caminho seguro.

**Movimento:** entra com escala de 0,96 para 1 e opacidade, em `dur-base` (`ease-entrance`), e sai em `dur-fast`. Com movimento reduzido, só o fade.

**Tokens:** `--dialog-w` 400px.

### 16. Dica flutuante

Mostra um detalhe ao apontar ou focar. As dicas de dado, reserva e limpeza já existem; aqui ganham regra.

**Dois tipos**

| Tipo | Para quê | Conteúdo | Leitor de tela |
|---|---|---|---|
| Rótulo | dar nome a botão só de ícone e a item do trilho | uma linha, em `text-xs` | `aria-hidden`: o nome já está no `aria-label` do botão; sem isso, seria lido duas vezes |
| Rica | prévia de um dado: barra da agenda, coluna do gráfico, gema | título + 2 a 4 linhas ("Mariana Costa · 5–8 nov · 3 noites · R$ 1.350") | `role="tooltip"`, ligada ao elemento por `aria-describedby` |

**Base:** `popover="manual"` preso por âncora. Aparece em cima e vai para baixo quando falta espaço, a 8px do elemento, com até 280px de largura.

**Quando aparece**
- Ao apontar, depois de 300ms, para a agenda não piscar quando o mouse passa por cima.
- Ao focar, na hora.
- Depois que uma dica apareceu, a vizinha aparece sem espera, por 600ms.
- Some com Esc, ao tirar o mouse (com 100ms de folga) ou quando o foco sai.

**Regras:** a dica nunca tem botão ou link dentro e nunca é o único lugar de uma informação; a mesma coisa está na gaveta ou na tabela equivalente.

**Toque**
- A dica de rótulo não aparece: no celular, os rótulos ficam visíveis na barra inferior.
- Na dica rica, tocar no elemento abre direto o detalhe, quando ele existe (uma reserva ou uma limpeza abrem a gaveta). É um toque em vez de dois.
- No gráfico, que não tem gaveta, tocar mostra a dica, e tocar fora esconde.
- Isso refina a Seção 8 do `DESIGN.md`, que hoje diz só "tocar mostra" (ver o fim do documento).

**Níveis:** nível 2 nos três níveis de efeito.

**Movimento:** `dur-base`, com opacidade e 4px de deslocamento; com movimento reduzido, só a opacidade.

**Tokens:** `--tip-max-w` 280px · `--tip-delay` 300ms · `--tip-offset: var(--space-2)`.

### 17. Aviso (toast)

Confirma uma ação e permite desfazer. Os avisos simples e com ação já existem; aqui ganham regra.

**Onde:** embaixo e centralizado, a 24px da borda. No celular, fica acima da barra inferior, com 16px nas laterais.

**Variantes**

| Variante | Exemplo | Some em | Detalhe |
|---|---|---|---|
| Simples | "Reserva salva." | 5s | — |
| Com ação | "Reserva excluída." + "Desfazer" | 10s | ⌘/Ctrl Z também desfaz; uma linha fina embaixo encolhe com o tempo que resta (some com movimento reduzido) |

**Erro não vai em aviso:** o aviso some sozinho, e um erro que pede ação precisa ficar na tela. O erro vai na faixa de aviso do lote A, perto de onde aconteceu.

**Pilha**
- Até 3 avisos ao mesmo tempo, com o mais novo embaixo.
- O quarto aviso tira o mais antigo.
- Um aviso novo não apaga o "Desfazer" do anterior.

**Tempo:** a contagem pausa ao apontar, ao focar e quando a aba fica escondida. Todo aviso tem "Fechar" (×).

**Leitor de tela:** a região `role="status"` existe desde o carregamento da página e recebe o texto de cada aviso, para ser lido sem interromper. O aviso nunca rouba o foco.

**Níveis:** nível 2 nos três níveis de efeito.

**Movimento:** sobe 12px em 400ms e sai em 220ms (assinatura 5). Com movimento reduzido, só o fade.

**Tokens:** `--toast-w` 360px · `--toast-offset: var(--space-6)` · `--toast-gap: var(--space-2)`.

---

## Pontos para vocês decidirem

Tenho uma recomendação para cada um. Se concordarem com todas, basta dizer.

| # | Pergunta | Recomendo | Por quê |
|---|---|---|---|
| 1 | Admin no celular: 6 destinos em 5 lugares | Visão geral · Agenda · Reservas · Tarefas · Mais (Imóveis, Equipe); Configurações sai da v1 | são as áreas do dia a dia; imóveis e equipe mudam pouco |
| 2 | Link de WhatsApp no cartão de pessoa | sim, ao lado do telefone | é como a equipe de limpeza se comunica no Brasil, e custa só um link |
| 3 | Tarefas no admin: lista por dia ou quadro por estado (arrastando cartões) | lista por dia; o quadro vai para "Depois" | o quadro exige arrastar e um caminho alternativo pelo teclado; a lista já mostra tudo |
| 4 | Desfazer uma exclusão sem mudar o banco | o front espera os 10s do aviso e só então pede a exclusão ao servidor; se a página fechar antes, pede na hora (`fetch` com `keepalive`) | o banco da Etapa 1 fica como está |
| 5 | Desfazer o Avanço de estado no histórico | apagar o último registro, se for da mesma pessoa e tiver menos de 10s | o histórico não fica com "começou, voltou, começou" por causa de um toque errado |

---

## O que muda no `DESIGN.md` (só gravo com o sim de vocês)

**Seção 4 (Componentes)**
1. **Nova situação, "especificado":** o desenho está fechado, na folha do lote A ou neste documento, e vira código nas entregas. As peças dos lotes A e B passam para ela.
2. **Linhas novas:**
   - do lote A: Link · Caixa de seleção, rádio e interruptor · Esqueleto facetado · Seletor de datas · Faixa de aviso · Estado vazio;
   - do lote B: Cabeçalho de página · Abas · Filtros · Tabela de dados · Linha de lista · Atividade recente · Cartão de imóvel · Cartão de pessoa · Avanço de estado · Menu de ações · Diálogo.
3. **Linhas atualizadas:**
   - Botão: ganha perigo e carregando.
   - Campo: todos os tipos e o só leitura.
   - Lista suspensa: a lista rica.
   - Carregando: também para uma área.
   - Busca: os resultados e a versão do celular.
   - Navegação: os destinos e a barra de 3 a 5.
   - Gaveta: a folha inferior e as mudanças não salvas.
   - Dica: os dois tipos.
   - Aviso: a pilha, a linha de tempo, e o erro fora dele.
   - Cartão de tarefa: a versão compacta do admin.
4. **Padrões novos**, já aprovados na Parte 1: Formulário de cadastro · Lista com filtros · Estados de dados · Entrar.
5. **"Estados que faltam desenhar"** fica só com dois: sem internet (app da equipe) e sem permissão.
6. **Tokens de componente:** entram os deste documento e os do lote A.

**Fora da Seção 4**
- **Seção 8:** "Dicas: tocar mostra" passa a "tocar abre o detalhe, quando ele existe; no gráfico, tocar mostra a dica".
- **Seção 9:** Ícones (Lucide) e Busca no celular (botão que abre a busca em tela cheia) saem das perguntas em aberto, como a Parte 1 já tinha decidido.

Depois disso, o próximo passo do design é o app da equipe (telas e o modo sem internet) e, em seguida, a arquitetura do front-end.
