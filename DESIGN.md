# Gemóvel — Linguagem de design

> Plataforma web para gestão de imóveis de temporada. Quem administra (no computador) cuida de imóveis, reservas, equipe e dos números do mês; a equipe de limpeza e manutenção (no celular, muitas vezes simples) vê e atualiza as próprias tarefas.

- **Situação:** v0.4, aprovada em 11 nov 2026. Maturidade **L1**: este arquivo é a fonte da verdade para desenhar e construir a interface. Quando um valor mudar aqui, mude também nos tokens, e vice-versa.
- **Valores:** todos provisórios; podem mudar quando as telas reais forem construídas e testadas com a equipe. Saíram dos protótipos descartáveis em `design/exploracoes/` (pôster Lapidado em `index.html`; painel e agenda em `admin.html`) e foram consolidados aqui. O que mudou na consolidação está no Apêndice A; o que o passe premium da v0.4 mudou, no Apêndice B.
- **Tokens em código:** `design/exploracoes/tokens.css` (provisório, ainda com os valores da v0.3; o arquivo de tokens do front-end nasce da v0.4). Folha visual, com o contraste medido ao vivo: `design/exploracoes/sistema.html`.
- **Histórico:** v0 (5 nov 2026): primeira versão, consolidada dos protótipos e testada na folha visual nos dois temas, nos três níveis de efeito e de 375 a 1440px de largura. v0.1 (7 nov 2026): componentes dos lotes A e B especificados e aprovados (Seção 4); no celular, tocar abre o detalhe e a busca vira um botão (Seção 8); ícones e busca no celular saem das perguntas em aberto (Seção 9). v0.2 (7 nov 2026): telas web do admin aprovadas (`design/telas/web-admin.md`): o modelo das listas e detalhes, as variantes da Busca, do Seletor de período e do Campo, e um estado a menos para desenhar (Seção 4); "Atrasada" sai das perguntas em aberto, resolvida pela regra R7 do banco (Seção 9). v0.3 (8 nov 2026): arquitetura do front-end aprovada (`docs/superpowers/specs/2026-11-08-front-end-design.md`): as fontes ficam no próprio servidor, em `.woff2` com o subconjunto latino (Seção 3), e a hospedagem sai das perguntas em aberto (Seção 9). v0.4 (11 nov 2026): passe premium a partir das referências Taste Skill, Transitions.dev, React Bits e Henrietta Said: neutros quase sem violeta, vidro só no que flutua, menos cartões, prisma só na identidade, movimento mais curto, microinterações novas, luz que segue o ponteiro e a tela Entrar como o momento da marca (Apêndice B).

---

## 1. Tema visual

**Declaração de tema:** lapidado, luminoso, instrumento de precisão.

**Caráter:** a operação é tratada como uma pedra sendo lapidada: o que chega bruto (pendente) é trabalhado (em andamento) até ficar polido (concluída). Cortes em ângulo, luz que refrata nas bordas do vidro e números grandes e calmos dão personalidade sem atrapalhar o trabalho. O brilho fica guardado para o que importa: estado, dinheiro e o "agora".

**Como a declaração decide:**
- *Lapidado* → arestas e cortes em ângulo (facetas) em vez de bolhas e sombras fofas; status desenhado como pedra.
- *Luminoso* → a luz vem de dentro (bordas claras, a luz que segue o ponteiro, o brilho do "agora"), nunca cinza lamacento nem brilho colorido; contraste alto nos dois temas.
- *Instrumento de precisão* → números tabulares, alinhamento rigoroso, nada decorativo disputando atenção com o dado; movimento rápido e com propósito.

**Dois temas, um sistema:**

| Tema | Para quem | Onde | Caráter |
|---|---|---|---|
| **Obsidiana** (escuro) | administração | computador (e celular quando precisa) | preto quase neutro, superfícies sólidas com luz na borda, vidro só no que flutua, números em destaque |
| **Quartzo** (claro) | equipe de limpeza e manutenção | celular, muitas vezes ao sol | claro e leve, alvos grandes, poucos efeitos |

**Referências:**
- Diagramas de lapidação (corte brilhante: mesa, coroa e pavilhão), a origem das formas de status e das facetas.
- Apple Liquid Glass (2025): refração e lente nas bordas, só no que flutua.
- Linear: calma, densidade e teclado em primeiro lugar no tema escuro.
- Stripe Dashboard: clareza para dinheiro e gráficos sóbrios.
- Tipografia didone editorial (Bodoni em revistas de moda): o contraste da voz da marca.
- Taste Skill (tasteskill.dev): telas de app com painéis quietos, números alinhados e cor gasta com dado; a lista do que denuncia interface gerada por IA.
- Transitions.dev: as microinterações (tambor de dígitos, troca de texto com desfoque, menu que abre a partir do botão) e a checagem de movimento.
- React Bits: a luz que segue o ponteiro e o brilho que passa pelo nome, refeitos em JavaScript puro.
- Henrietta Said (henriettasaid.com): o nome enorme, a etiqueta em caixa, os objetos flutuando e a faixa corrida da tela Entrar.

**Onde a marca aparece:** a tela Entrar e a página 404 são o momento da marca (Seção 4, Modelos). Dentro do painel, o instrumento fica quieto, e o brilho fica para estado, dinheiro e o "agora".

---

## 2. Cores

Três camadas: **primitivos** (valores crus, com nomes de gemas) → **semânticos** (a função; cada tema troca só este mapeamento) → **componentes** (escopo de um componente). Componente nunca usa primitivo direto. Os temas não têm primitivos próprios.

### 2.1 Neutros (matiz ≈ 288, quase sem cor)

Croma de no máximo 0,015: o bastante para o preto não ficar morto, pouco para virar roxo.

| Token | Hex | OKLCH | Uso |
|---|---|---|---|
| `neutral-0` | #ffffff | oklch(100% 0 0) | superfície no Quartzo; marcador do "agora" na Obsidiana |
| `neutral-50` | #f1f1f5 | oklch(96% 0.005 288) | página no Quartzo; texto principal na Obsidiana |
| `neutral-100` | #e7e7ed | oklch(93% 0.008 288) | fundo baixo e tinta "pendente" no Quartzo; ação primária, foco e "pendente" na Obsidiana |
| `neutral-400` | #a7a7af | oklch(73.1% 0.012 288) | texto secundário na Obsidiana |
| `neutral-500` | #898992 | oklch(63.3% 0.013 288) | texto terciário na Obsidiana; desabilitado no Quartzo |
| `neutral-600` | #63636c | oklch(50.3% 0.015 288) | texto terciário e gema "pendente" no Quartzo; desabilitado na Obsidiana |
| `neutral-700` | #4d4d56 | oklch(42.4% 0.014 288) | texto secundário no Quartzo |
| `neutral-850` | #1b1b21 | oklch(22.4% 0.011 286) | superfície elevada na Obsidiana |
| `neutral-900` | #131317 | oklch(18.8% 0.009 286) | superfície na Obsidiana; texto principal e ação primária no Quartzo |
| `neutral-950` | #08080b | oklch(13.7% 0.006 286) | página na Obsidiana |

### 2.2 Gemas: estado e dado (reservadas)

Cada gema tem um significado e só um. Os passos seguem a luminosidade OKLCH: 100 ≈ 94–96%, 300 ≈ 82%, 400 ≈ 68–71%, 600 ≈ 57–59%, 700 ≈ 47–50%.

| Gema | Significa | Tinta clara | Vívida (tema escuro) | Ícone no claro | Texto no claro |
|---|---|---|---|---|---|
| Quartzo (neutro) | pendente: pedra bruta | `neutral-100` | `neutral-100` | `neutral-600` | `neutral-700` |
| Âmbar | em andamento: lapidando | `ambar-100` | `ambar-300` | `ambar-600` | `ambar-700` |
| Esmeralda | concluída: lapidada; "bom" | `esmeralda-100` | `esmeralda-300` | `esmeralda-600` | `esmeralda-700` |
| Rubi | atrasada: alerta; "ruim" | `rubi-100` | `rubi-400` | `rubi-700` | `rubi-700` |
| Safira | dado e presente: dinheiro, ocupação, estadia em curso, informação | `safira-100` | `safira-400` | `safira-700` | `safira-700` |

| Token | Hex | OKLCH |
|---|---|---|
| `ambar-100` | #fff0d6 | oklch(96% 0.038 82) |
| `ambar-300` | #ffb547 | oklch(82.4% 0.149 73) |
| `ambar-600` | #a86400 | oklch(56.7% 0.127 65) |
| `ambar-700` | #8a5300 | oklch(49.4% 0.109 67) |
| `esmeralda-100` | #dcf5ea | oklch(94.9% 0.030 167) |
| `esmeralda-300` | #2ee6a6 | oklch(82.3% 0.168 163) |
| `esmeralda-600` | #08936a | oklch(58.8% 0.122 165) |
| `esmeralda-700` | #06734e | oklch(49.2% 0.106 162) |
| `rubi-100` | #ffe4ea | oklch(94.2% 0.031 3) |
| `rubi-400` | #ff4d6d | oklch(67.9% 0.213 15) |
| `rubi-700` | #a8133a | oklch(47.2% 0.179 15) |
| `safira-100` | #e6ebff | oklch(94.2% 0.028 275) |
| `safira-400` | #7d9cff | oklch(71.3% 0.149 269) |
| `safira-700` | #3e5cb8 | oklch(50.2% 0.149 267) |

### 2.3 Prisma: identidade, nunca significado

`prisma-ciano` #a6f4ff · `prisma-lilas` #cdbcff · `prisma-rosa` #ffb8e3 · `prisma-champanhe` #ffe2a6 formam `gradient-prisma` (cônico ou linear, nessa ordem).
Usos permitidos: logo, avatar e a tela Entrar (as gemas flutuantes e o brilho que passa pelo nome). Nunca em botão, texto, status, gráfico ou fundo do painel.

### 2.4 Semânticos por tema

| Token | Obsidiana | Quartzo | Para quê |
|---|---|---|---|
| `color-bg` | `neutral-950` | `neutral-50` (degradê `neutral-0` → `neutral-100`) | fundo da página |
| `color-surface-1` | `neutral-900` | `neutral-0` | painéis e cartões; base das contas de contraste |
| `color-surface-2` | `neutral-850` | `neutral-50` | campo, linha em destaque, menus |
| `color-surface-inverse` | `neutral-100` | `neutral-900` | ação primária, "hoje", etiqueta do "agora" |
| `color-text` | `neutral-50` | `neutral-900` | texto principal |
| `color-text-muted` | `neutral-400` | `neutral-700` | texto secundário |
| `color-text-subtle` | `neutral-500` | `neutral-600` | rótulos, metadados, placeholder |
| `color-text-disabled` | `neutral-600` | `neutral-500` | controle desabilitado (isento de contraste, mas legível) |
| `color-text-on-inverse` | `neutral-900` | `neutral-0` | texto sobre `surface-inverse` |
| `color-border` | `neutral-0` a 7,5% | `neutral-900` a 8% | linha fina decorativa |
| `color-border-strong` | `neutral-0` a 13% | `neutral-900` a 14% | divisão que importa, cabeçalho de tabela |
| `color-border-control` | `neutral-0` a 36% | `neutral-900` a 50% | borda de campo e de caixa de seleção (≥3:1) |
| `color-focus` | `neutral-100` | `neutral-900` | anel de foco de 2px, afastado 2px |
| `color-now` | `neutral-0` com brilho | `neutral-900` | linha e etiqueta do "agora" |
| `color-hover` | `neutral-0` a 6% | `neutral-900` a 5% | fundo de hover: botão secundário, linha, item de menu |
| `color-pressed` | `neutral-0` a 11% | `neutral-900` a 9% | pressionado, selecionado, pílula de vidro |
| `color-surface-inverse-hover` | `neutral-0` | `neutral-850` | hover da ação primária |

**Ambiente e marca** (só aparência; nunca carregam significado):

| Token | Obsidiana | Quartzo | Para quê |
|---|---|---|---|
| `page-bg` | uma luz fria no alto à esquerda (`neutral-0` a 4,5%, raio de 1200px) sobre `neutral-950` | sem brilhos coloridos: degradê `neutral-0` → `neutral-50` → `neutral-100` | fundo da página |
| `facet-line` | `neutral-0` a 4% | `neutral-900` a 4% | malha de facetas do fundo, parada |
| `spotlight` | `neutral-0` a 6% | `neutral-900` a 4% | a luz que segue o ponteiro nos cartões (Seção 10) |
| `glow-now` | brilho branco de 12px | nenhum | linha do "agora" |
| `brand-stroke` · `brand-fill` | traço em prisma · sem preenchimento | traço `neutral-900` · preenchimento em prisma | logo |

**Status** (o coração do sistema):

| Token | Obsidiana | Quartzo |
|---|---|---|
| `status-todo-fg` · `-icon` · `-bg` | `neutral-100` · `neutral-100` · `neutral-100` a 12% | `neutral-700` · `neutral-600` · `neutral-100` |
| `status-doing-fg` · `-icon` · `-bg` | `ambar-300` · `ambar-300` · `ambar-300` a 12% | `ambar-700` · `ambar-600` · `ambar-100` |
| `status-done-fg` · `-icon` · `-bg` | `esmeralda-300` · `esmeralda-300` · `esmeralda-300` a 12% | `esmeralda-700` · `esmeralda-600` · `esmeralda-100` |
| `status-late-fg` · `-icon` · `-bg` | `rubi-400` · `rubi-400` · `rubi-400` a 12% | `rubi-700` · `rubi-700` · `rubi-100` |

- **Rótulo do chip:** na Obsidiana usa a cor do status (`-fg`); no Quartzo usa `color-text` e só a gema leva a cor viva (`-icon`). Motivo: no claro, cores de status escuras o bastante para virar texto ficam parecidas demais para quem tem daltonismo (ΔE 5,0); com o rótulo neutro, os ícones podem ser mais vivos e se separam (ΔE 9,6).
- **Retorno ao usuário:** `success` = esmeralda, `warning` = âmbar, `danger` = rubi, `info` = safira (`safira-400` / `safira-700`; fundo `safira-400` a 12% / `safira-100`). Aviso usa sempre ícone próprio (triângulo, octógono, círculo), nunca a gema; a forma separa "estado da tarefa" de "aviso do sistema".
- **Variação (▲▼):** a cor diz se é bom ou ruim, não a direção; sempre com seta e texto.

**Dados** (só no admin):

| Token | Obsidiana | Para quê |
|---|---|---|
| `data-realized` | `safira-400` | receita realizada (7,1:1) |
| `data-projected` | `safira-700` | receita prevista (3,0:1) |
| `data-track` | `safira-400` a 16% | trilho de medidor |
| `data-grid` | `neutral-0` a 7% | linhas de grade |
| `data-baseline` | `neutral-0` a 20% | linha de base |

O Quartzo não tem gráficos por enquanto; se o admin ganhar tema claro, estes tokens recebem valores claros validados (Seção 9, perguntas em aberto).

### 2.5 Contraste verificado

WCAG 2.x. Na v0.4, cartões, painéis e lateral são sólidos, e a conta é feita sobre a superfície; no vidro que sobrou (gaveta, diálogo, topo ao rolar), contra o pior ponto do vidro composto. Valores refeitos com os neutros da v0.4.

- **Obsidiana:** texto 16,4 / 7,8 / 5,3:1 sobre `surface-1` (pior caso medido na v0.3: terciário no topo da gaveta, 4,6:1; refazer na construção). Status como texto e como gema ≥5,1:1, inclusive sobre a própria tinta. Botão primário 15,0:1. Borda de campo 3,3:1 sobre `surface-1` e sobre `surface-2`. Placeholder 4,9:1 sobre `surface-2`.
- **Quartzo:** texto 18,5 / 8,4 / 5,9:1 sobre branco e 15,0 / 6,8 / 4,8:1 sobre o fundo baixo. Status como texto ≥4,7:1. Gemas ≥3,1:1 em qualquer fundo vizinho, inclusive a tinta do chip (a gema pendente fica em 4,8:1). Borda de campo 3,4:1 no pior caso (sobre `surface-2`). Foco, com a mesma tinta do texto, 18,5:1 sobre branco e 15,0:1 sobre o fundo baixo.
- **Daltonismo** (validador de paletas, todos os pares, medido na v0.3): Obsidiana ΔE 10,8 com daltonismo e 19,8 sem; Quartzo (gemas) ΔE 9,6 e 16,7. Os dois passam. Além disso, status sempre tem forma (gema) e rótulo; a cor nunca trabalha sozinha.

---

## 3. Tipografia

**Famílias** (Google Fonts, licença SIL OFL; em produção, hospedar no próprio servidor com subconjunto latino):
- **Display (voz da marca):** `"Bodoni Moda", "Bodoni 72", Didot, "Bodoni MT", Georgia, serif`. Variável (tamanho óptico 6–96, peso 400–900); usar peso 500 com tamanho óptico **fixo**: `font-variation-settings: "opsz" var(--opsz-display-lg)` (96) no `display-lg` e no `display-xl`, e `var(--opsz-display)` (72) no `display-md` e no `display-sm`. O automático usaria o corte de texto, mais grosso, e apagaria os filetes finos que dão o brilho de pedra lapidada.
- **Interface e números:** `Geist, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Variável; pesos 400, 500 e 600.
- **Mono (horários, códigos, micro-rótulos):** `"Geist Mono", ui-monospace, "Cascadia Mono", Consolas, monospace`. Pesos 400–500.

**Escala:** de produto e densa (passos de 1–2px no texto de interface), não modular; números e display dão saltos maiores. Base de 14px no admin e 16px no app da equipe. Nada abaixo de 11px.

| Token | Tamanho | Família · peso | Altura de linha | Espaçamento | Uso |
|---|---|---|---|---|---|
| `text-2xs` | 11px · 0.6875rem | Geist Mono 500, caixa alta | 1.3 | +0.12em | sobrelinhas, cabeçalho de tabela, micro-rótulos |
| `text-xs` | 12px · 0.75rem | Geist 400/500 | 1.4 | 0 | metadados, legendas, marcas de eixo |
| `text-sm` | 13px · 0.8125rem | Geist 400/500 | 1.45 | 0 | tabelas, rótulos de campo, dicas, chips |
| `text-base` | 14px · 0.875rem | Geist 400/500/600 | 1.5 | 0 | corpo do admin, botões, campos |
| `text-md` | 16px · 1rem | Geist 400/600 | 1.5 | −0.005em | corpo do app da equipe, título de cartão, texto de abertura |
| `text-lg` | 18px · 1.125rem | Geist 600 | 1.35 | −0.01em | título de tarefa (equipe), título de bloco pequeno |
| `text-xl` | 20px · 1.25rem | Geist 600 | 1.3 | −0.015em | valor da dica flutuante, título de tela simples |
| `num-md` | 28px · 1.75rem | Geist 600 | 1 | −0.03em | valor na gaveta, contadores |
| `num-lg` | 32px · 2rem | Geist 600 | 1 | −0.035em | valores de KPI, contagens do "Hoje" |
| `num-xl` | 52px · 3.25rem (44px no celular) | Geist 600 | 1 | −0.045em | número herói (receita do mês) |
| `display-sm` | 28px · 1.75rem | Bodoni Moda 500 | 1.05 | −0.02em | títulos de bloco ("Hoje") |
| `display-md` | 32px · 2rem | Bodoni Moda 500 | 1.05 | −0.025em | título de seção, título da gaveta, título da página no celular |
| `display-lg` | 42px · 2.625rem | Bodoni Moda 500 | 1 | −0.035em | título da página no computador |
| `display-xl` | 96px · 6rem (64px no celular) | Bodoni Moda 500 | 0.95 | −0.035em | o nome "Gemóvel" na tela Entrar, e só lá |

**Regras:**
- **Algarismos:** tabulares (`font-variant-numeric: tabular-nums`) em tabelas, agenda, eixos, horários e KPIs. Proporcionais só dentro de texto corrido.
  - **Número que conta é sempre tabular.** Com algarismos proporcionais, cada dígito tem uma largura e o valor treme enquanto sobe.
  - O atalho `font:` zera o `font-variant-numeric`; declare os tabulares depois dele.
- **Dinheiro:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
  - Nos KPIs, sem centavos: "R$ 12.340".
  - Abreviado quando faltar espaço: "R$ 12,3 mil".
  - Na gaveta, com centavos.
- **Bodoni:** só em títulos de 28px ou mais. Nunca em números, tabelas, rótulos ou botões. Itálico 400 só para uma palavra de ênfase.
- **Mono:** para horários ("15:00"), códigos e micro-rótulos em caixa alta. Nunca em parágrafos.
- **App da equipe:** carrega Geist (400–600) e uma única instância de Bodoni (500, latino). No nível Leve, aceita a serifada do sistema.
- **Hospedagem:** os arquivos `.woff2` ficam no próprio servidor, só com o subconjunto latino (cobre os acentos do português), com `font-display: swap`. Nada vem do Google Fonts: a interface funciona sem internet.

---

## 4. Componentes

Situação: **especificado** = desenho fechado, na folha do lote A (`design/exploracoes/componentes.html`), na Parte 3 (`design/componentes/parte-3-lote-b.md`) ou nas telas web (`design/telas/web-admin.md`), que vira código nas entregas; **protótipo** = existe no protótipo descartável e vira código só depois da especificação; **pôster** = só no pôster da direção; **planejado** = ainda não desenhado.

Esta seção é o índice. As regras comuns a todas as peças (estados, tamanhos, acessibilidade, movimento, temas e níveis de efeito, conteúdo) estão na Parte 1, `design/componentes/parte-1-regras-e-inventario.md`, §2; a ficha de cada peça, na folha do lote A ou na Parte 3.

### Primitivos

| Componente | Para quê | Variantes | Situação |
|---|---|---|---|
| Gema de status | mostrar estado pela forma | pendente (pedra bruta) · em andamento (contorno lapidado com coroa) · concluída (lapidada e preenchida, com coroa e pavilhão) · atrasada (pedra bruta com "!") | especificado |
| Botão | ações | primário (superfície inversa sólida, sem aro nem brilho) · secundário (superfície com filete) · fantasma · perigo · só ícone; tamanhos sm, md, lg; carregando e desabilitado; ao pressionar, encolhe para 0,97; o rótulo troca com desfoque ("Salvar reserva" → "Salvando…") | especificado |
| Link | navegar no meio do texto ("Ver todas", "Abrir na agenda") | — | especificado |
| Campo | digitar um valor | texto, área de texto, número com − e + (hóspedes), moeda, telefone, e-mail, senha (mostrar ou ocultar), horário, data (o campo de data do sistema); padrão · foco · erro · desabilitado · só leitura; rótulo em cima, dica e erro embaixo | especificado |
| Lista suspensa | escolher entre opções fixas (imóvel, tipo, responsável) | nativa estilizada · rica, com avatar, gema e a carga do dia ("Cida · 2 tarefas hoje"), no Chrome, no Edge e no Safari 27; no Firefox, a lista do sistema | especificado |
| Caixa de seleção, rádio e interruptor | marcar, escolher um, ligar ou desligar | o interruptor vale na hora; a caixa de seleção vale quando o formulário é salvo | especificado |
| Chip de status | estado compacto | 4 estados; rótulo de tarefa ("Pendente") ou de prontidão do imóvel ("Limpando", "Pronto"); o rótulo troca com desfoque quando o estado muda | especificado |
| Pílula | etiqueta neutra | neutra · estadia em curso · contador | especificado |
| Atalho (kbd) | mostra a tecla | troca ⌘ por Ctrl conforme o sistema | especificado |
| Avatar | pessoa | iniciais sobre prisma | especificado |
| Medidor | proporção simples (ocupação) | 8px · 4px | especificado |
| Ícone | apoio visual | Lucide (licença ISC, traço 1,75px) nos ícones gerais; gemas e logo em desenho próprio; 16, 20 e 24px | especificado |
| Esqueleto facetado | carregar sem o layout pular | no formato do conteúdo que vai chegar | especificado |
| Carregando | indicador de espera | no botão · numa área | especificado |

### Componentes

| Componente | Para quê | Variantes | Situação |
|---|---|---|---|
| Cartão | agrupar conteúdo quando a elevação diz algo | superfície sólida (elevação 1), filete de 1px e luz na borda de cima; cabeçalho com título, subtítulo e ferramentas; nunca um cartão dentro de outro: dentro dele, divida com filetes e espaço | protótipo |
| KPI | número do mês | faixa de KPIs: um painel só, com filetes entre os números; herói · padrão; com variação e legenda; o valor gira no tambor de dígitos ao chegar e ao mudar | protótipo |
| Alternador e segmentado | escolher visão ou modo | alternador (`aria-pressed`) · segmentado (grupo de rádio) | protótipo |
| Seletor de período | navegar entre meses ou dias | anterior · rótulo · próximo; a variante dia ganha "Hoje", e o rótulo abre o campo de data | protótipo (mês) · especificado (dia) |
| Seletor de datas | entrada e saída da reserva | no computador, calendário que mostra as noites já ocupadas do imóvel e calcula noites × diária; no celular, o seletor do sistema | especificado |
| Gráfico de receita | realizado × previsto por mês | colunas empilhadas, com dica e tabela equivalente | protótipo |
| Ocupação por imóvel | comparar imóveis | barras horizontais com linha da média | protótipo |
| Bloco "Hoje" | o dia num relance | um painel com seções divididas por filetes: contagens · chegadas · alertas com ação | protótipo |
| Faixa de aviso | aviso dentro da página; o Aviso (toast) flutua e some sozinho | erro · atenção · informação · sucesso; com ação ("Tentar de novo") · fixa (sem internet) · que se fecha | especificado |
| Estado vazio | dizer o que é e dar a primeira ação | primeiro uso · sem resultado · dia livre | especificado |
| Cabeçalho de página | título, linha de contexto, ações e voltar | área · detalhe · saudação da equipe; uma ação principal e até duas secundárias | especificado |
| Abas | dividir um detalhe ("Reservas · Tarefas · Dados") | texto com sublinhado de pontas cortadas; a aba ativa fica no endereço (`#tarefas`) | especificado |
| Navegação | trocar de área | lateral (≥1241px) · trilho de ícones (761–1240px) · barra inferior de 3 a 5 destinos (≤760px e app da equipe). Admin: Visão geral, Agenda, Reservas, Imóveis, Tarefas e Equipe; no celular, Imóveis e Equipe ficam em "Mais". Configurações sai da v1: "Efeitos visuais" vai para o menu da conta; a pílula do item ativo é sólida e desliza; o contador salta quando muda | especificado |
| Busca | achar imóvel, reserva, hóspede ou ação | campo com ⌘/Ctrl K e resultados agrupados (Ações, Imóveis, Reservas, Hóspedes) · no celular, botão que abre a busca em tela cheia · no formulário: só hóspedes, com nome e telefone, e a última opção "Cadastrar…" | especificado |
| Filtros | recortar uma lista por imóvel, estado, período ou responsável | fila de botões com painel e contagem, e "Limpar"; ficam no endereço; no celular, folha inferior com "Mostrar" | especificado |
| Tabela de dados | listas densas do admin | cabeçalho preso, ordenar por coluna, a linha abre o detalhe, menu na ponta, colunas que somem por prioridade, "Carregar mais" de 50 em 50; no celular vira linhas de lista | especificado |
| Linha de lista | gema ou avatar, título, metadados, valor ou ação | compacta (40px, admin) · confortável (≥56px, equipe e celular); grupos por dia | especificado |
| Atividade recente | quem fez o quê e quando | vem do histórico das tarefas; 8 no cartão, 50 na gaveta "Ver histórico" | especificado |
| Cartão de tarefa | a tarefa do dia | grande no celular (por estado; ação principal de 48px) · compacto no admin, com menu | especificado |
| Cartão de imóvel | prontidão, próxima entrada e diária | prontidão: "Hóspedes até…", "Limpeza pendente", "Limpando", "Pronto", "Limpeza atrasada"; menu com Editar, Bloquear datas e Desativar; luz que segue o ponteiro (só com mouse) | especificado |
| Cartão de pessoa | função, telefone e tarefas de hoje em fila de gemas | situação agora ("Agora: limpando…", "Próxima: 14:00…", "Dia livre"); telefone com link de WhatsApp; menu com Nova tarefa, Editar e Desativar; luz que segue o ponteiro (só com mouse) | especificado |
| Avanço de estado | levar a tarefa ao próximo estado; assinatura do app da equipe | botão de 48px na largura toda ("Começar limpeza" → "Concluir limpeza"); a gema se lapida; aviso com "Desfazer" por 10s | especificado |
| Menu de ações | ações de uma linha ou cartão, e o menu da conta | menu do item (ações destrutivas por último, em rubi) · menu da conta (Efeitos visuais, Sair); abre a partir do botão que o chamou; no celular, folha inferior | especificado |
| Gaveta | detalhe e formulário | painel de 430px à direita · folha inferior no celular; endereço próprio (`?reserva=1042`); pergunta antes de descartar mudanças | especificado |
| Diálogo | decidir o que não tem desfazer | descartar mudanças · sessão expirada (entrar de novo sem perder o formulário) | especificado |
| Dica flutuante | detalhe ao apontar ou focar | rótulo · rica (dado · reserva · limpeza); nunca é o único lugar da informação | especificado |
| Aviso (toast) | confirmar e permitir desfazer | simples (5s) · com "Desfazer" (10s, ⌘/Ctrl Z, linha de tempo); até 3 empilhados; pausa ao apontar ou focar; erro nunca vira aviso: vai para a Faixa de aviso | especificado |

### Padrões

| Padrão | Como funciona | Situação |
|---|---|---|
| Agenda (linha do tempo) | imóveis × dias. Reserva = faceta com pontas em ângulo (entrada 15:00, saída 11:00). Gema da limpeza fica entre 11:00 e 15:00. Linha do "agora". Arrastar para criar (mouse) ou tocar (toque). Coluna dos imóveis presa ao rolar | protótipo |
| Nova reserva | gaveta com valor = diária × noites (editável) e checagem de conflito ao vivo | protótipo |
| Desfazer em vez de confirmar | ação reversível → aviso com "Desfazer". Excluir só chega ao servidor quando o aviso acaba (10s); se a página fechar antes, o pedido sai na hora. No Avanço de estado, desfazer apaga o último registro do histórico (mesma pessoa, menos de 10s) | especificado |
| Tabela equivalente | todo gráfico e a agenda têm uma tabela com os mesmos dados | protótipo |
| Formulário de cadastro | rótulo em cima; campo opcional marcado como "Opcional"; valida ao sair do campo e ao salvar; resumo de erros no topo leva o foco ao primeiro erro; ao fechar com mudanças, pergunta antes de descartar | especificado |
| Lista com filtros | cabeçalho + filtros + tabela ou cartões + carregando, vazio e erro; os filtros continuam ao voltar | especificado |
| Estados de dados | primeira carga com esqueleto; ao atualizar, os dados antigos ficam à vista; erro com "Tentar de novo" | especificado |
| Entrar | e-mail e senha; o erro não diz qual dos dois está errado; cada perfil cai na sua tela (admin no painel, equipe nas tarefas); a tela é o momento da marca (Modelos) | especificado |

### Modelos

| Modelo | Composição | Situação |
|---|---|---|
| Casca do admin | lateral sólida + topo (vidro fosco só ao rolar) + conteúdo; na troca de página, a lateral e o topo ficam e só o conteúdo esmaece | protótipo |
| Visão geral | saudação, Hoje, KPIs, gráficos e a Atividade recente (telas web) | protótipo |
| Agenda | ferramentas, linha do tempo, legenda | protótipo |
| Listas e detalhes do admin | reservas (com a aba Hóspedes), imóveis e o detalhe do imóvel, tarefas (lista por dia; o quadro por estado fica para depois), equipe e entrar | especificado: `design/telas/web-admin.md` |
| App da equipe | saudação, tarefas do dia, detalhe da tarefa | planejado: seções do celular, no fim |
| Entrar | tela dividida. À esquerda, o palco da marca: a etiqueta "Gestão de temporada" numa caixa sobre "Gemóvel" em `display-xl`, gemas facetadas flutuando com paralaxe do ponteiro, um brilho que passa pelo nome uma vez e uma faixa corrida fina embaixo ("Entrada 15:00 · Saída 11:00 · Limpeza entre estadias · Reservas sem conflito"). À direita, o formulário num painel sólido. No celular, o palco vira uma faixa curta com o nome, e o formulário vem embaixo | especificado: `design/telas/web-admin.md` §3 |
| Página 404 | uma gema rachada, "Esta página ainda não foi lapidada." e o link para o próprio painel | especificado |

### Estados que faltam desenhar

| Onde | Estado | Prioridade |
|---|---|---|
| App da equipe | sem internet (guardar a mudança e sincronizar depois) | alta, nas seções do celular |

**Tokens de componente:** sempre apontam para os semânticos; os valores ficam no arquivo de tokens. Lote A e agenda: `--btn-primary-bg: var(--color-surface-inverse)`, `--btn-primary-fg: var(--color-text-on-inverse)`, `--field-border: var(--color-border-control)`, `--field-border-focus: var(--color-focus)`, `--field-border-error: var(--status-late-fg)`, `--chip-label` (status na Obsidiana, `color-text` no Quartzo), `--bar-stay-bg` (safira), `--bar-future-bg` (`neutral-100` a 17%), `--bar-past-bg` (`neutral-0` a 6%), `--bar-block-bg` (listras a 135°). No Quartzo, provisórios até a agenda ganhar tema claro: `safira-100` com texto `safira-700`, `neutral-100`, `neutral-900` a 4% e listras a 9%.

Lote B, por peça: navegação `--nav-w`, `--nav-rail-w`, `--nav-item-h`, `--nav-pill-bg`, `--nav-bar-h`; abas `--tab-h`, `--tab-indicator`, `--tab-indicator-h`; filtros `--filter-h`, `--filter-active-bg`; tabela `--table-row-h`, `--table-head-h`, `--table-head-fg`, `--table-divider`, `--table-head-divider`, `--table-row-open-bar`; linha de lista `--row-h-compact`, `--row-h-comfy`, `--row-pad-x`, `--row-gap`; cartões `--task-card-pad`, `--task-card-radius`, `--prop-card-min`; avanço de estado `--advance-h`, `--advance-bg`, `--advance-fg`; menu `--menu-min-w`, `--menu-item-h`, `--menu-danger-fg`; gaveta e folha `--drawer-w`, `--drawer-pad`, `--sheet-top-gap`, `--sheet-handle-w`, `--sheet-handle-h`; diálogo `--dialog-w`; dica `--tip-max-w`, `--tip-delay`, `--tip-offset`; aviso `--toast-w`, `--toast-offset`, `--toast-gap`. Os valores e as ligações estão em cada ficha da Parte 3.

---

## 5. Layout

**Unidade base: 4px.** Todo espaçamento é múltiplo de 4. Os valores de 2px e 6px servem só para micro-ajustes de ícone e espaçador de gráfico.

| Token | Valor | Uso típico |
|---|---|---|
| `space-0-5` | 2px | espaçador entre barras de gráfico |
| `space-1` | 4px | espaço mínimo |
| `space-1-5` | 6px | gema ↔ rótulo no chip |
| `space-2` | 8px | ícone ↔ texto; itens compactos |
| `space-3` | 12px | entre controles; vão da grade no celular |
| `space-4` | 16px | margem da página no celular; recuo de caixas |
| `space-5` | 20px | vão entre cartões no computador; recuo de cartão |
| `space-6` | 24px | recuo de gaveta e de seção |
| `space-8` | 32px | margem da página no computador |
| `space-10` | 40px | entre seções |
| `space-12` | 48px | respiro grande |
| `space-16` | 64px | topo de página |

**Raios:** `radius-xs` 6px (atalho) · `radius-sm` 10px (botão pequeno, alternador, segmento) · `radius-md` 12px (botão, campo, busca, item de navegação) · `radius-lg` 16px (aviso, dica, caixas internas) · `radius-xl` 24px (cartão, gaveta, barra inferior) · `radius-full` (chip, pílula, avatar).

**Facetas** (cortes em ângulo com `clip-path`): `cut-sm` 4px (legenda, barras no modo mês) · `cut-md` 8px (barra de reserva).

**Alturas de controle:** `control-sm` 32px · `control-md` 40px · `control-lg` 48px.
- Com ponteiro grosso (toque): `control-sm` vai a 40px e `control-md` a 44px.
- O app da equipe usa `control-lg` como padrão.

**Grade:**
- **Admin:** casca com lateral de 232px e conteúdo fluido. Dentro, composição por áreas (CSS Grid com frações), não 12 colunas fixas: a página tem poucos blocos grandes.
  - KPIs: herói 1,45fr + 3 × 1fr.
  - Gráficos: 1,7fr + 1fr.
  - Hoje: 292px + 1,15fr + 1fr.
  - Vão de 20px no computador e 12px no celular; margem da página de 32px e 16px.
  - Visão geral com largura máxima de 1600px, centralizada. A agenda usa a largura toda (mais dias à vista).
- **App da equipe:** coluna única, margem de 16px, vão de 12px.

**Densidade:**
- **Admin:** padrão-compacta. Texto 14px, controles de 40px, linhas de tabela de 40px, linhas da agenda de 58px.
- **Equipe:** confortável. Texto 16px, controles de 48px, itens de lista com pelo menos 56px.

---

## 6. Profundidade

| Nível | Nome | Obsidiana | Quartzo | Uso |
|---|---|---|---|---|
| 0 | Plano | sem sombra; `surface-1` ou transparente | idem | linhas, tabelas, seções |
| 1 | Superfície | `surface-1` sólido, luz de 1px na borda de cima (`neutral-0` a 6%, por dentro), contorno de 1px (`color-border`), sombra `0 24px 60px -34px rgba(0,0,0,.85)` | `neutral-0` sólido, contorno `neutral-900` a 7%, sombra `0 14px 30px -18px rgba(19,19,23,.22)` | cartões, painéis, lateral |
| 1v | Vidro fosco | degradê `rgba(30,30,37,.74)` → `rgba(19,19,23,.84)`, `blur(20px) saturate(140%)`, brilho interno de 1px no topo, contorno de 1px a 5,5% | `rgba(255,255,255,.72)`, `blur(14px) saturate(160%)`, brilho branco no topo, contorno `neutral-900` a 6% | só o que flutua sobre a página que rola: topo ao rolar e barra inferior |
| 2 | Flutuante | quase sólido `rgba(26,26,32,.96)` a `rgba(32,32,39,.96)`, contorno `border-strong`, sombra `0 18px 40px -16px rgba(0,0,0,.85)` | `rgba(255,255,255,.96)`, contorno `neutral-900` a 10%, sombra `0 18px 40px -16px rgba(19,19,23,.2)` | dica, aviso, menu |
| 3 | Sobreposto | degradê `rgba(40,40,49,.8)` → `rgba(19,19,23,.9)`, `blur(24px) saturate(150%)`, lente na borda (só nível Completo), sombra `-30px 0 80px -30px rgba(0,0,0,.85)`; véu `rgba(4,4,6,.45)` | folha que sobe de baixo, `rgba(255,255,255,.94)`, sombra `0 -20px 60px -30px rgba(19,19,23,.28)`; véu `rgba(19,19,23,.35)` | gaveta, diálogo, folha inferior |

**Tokens:** cada nível tem `elev-N-bg`, `elev-N-edge` (brilho e contorno internos) e `elev-N-shadow`. Os níveis de vidro (1v e 3) têm também `elev-N-filter` e `elev-N-solid`, a superfície usada quando o vidro cai. O véu é `scrim`.

**Camadas (z-index):**

| Token | Valor | O quê |
|---|---|---|
| `z-bg` | −1 | fundo (degradê; na tela Entrar, as gemas) |
| `z-base` | 0 | conteúdo |
| `z-gem` | 2 | gemas sobre as barras da agenda |
| `z-now` | 3 | linha do "agora" |
| `z-sticky` | 4 | coluna presa da agenda, rascunho ao arrastar |
| `z-header` | 20 | topo fixo |
| `z-nav` | 40 | barra inferior (celular) |
| `z-scrim` | 55 | véu |
| `z-drawer` | 60 | gaveta, diálogo |
| `z-tooltip` | 80 | dica flutuante |
| `z-toast` | 90 | aviso |
| `z-skip` | 100 | link "pular para o conteúdo" |

**Regras do vidro:**
1. Vidro só no que flutua sobre conteúdo: gaveta, diálogo, folha inferior, topo ao rolar e barra inferior. Cartões, painéis, a lateral e a pílula da navegação são sólidos. No máximo duas camadas de vidro empilhadas.
2. O texto sobre vidro é medido contra o pior ponto do vidro composto, não contra a cor nominal.
3. Sem `backdrop-filter`, no nível Leve ou com `prefers-reduced-transparency`, o vidro vira superfície sólida (`surface-1`; gaveta em `neutral-850` no escuro).
4. Lente (mapa de deslocamento SVG) só no nível Completo e só na borda da gaveta, com escala de no máximo 14. Acima disso ela puxa letras para a borda.

**Níveis de efeito** (desempenho e conforto; `data-tier` no `<html>`):

| Nível | Quando | Vidro (no que flutua) | Lente | Luz do ponteiro | Tela Entrar | Laços infinitos |
|---|---|---|---|---|---|---|
| **Completo** | Chromium no computador, ponteiro fino, sem economia de dados | sim | sim | sim | gemas flutuando, paralaxe, brilho no nome e faixa corrida | sim |
| **Padrão** | outros navegadores com `backdrop-filter` | sim | não | sim, com mouse | paralaxe e brilho no nome; gemas e faixa paradas | só o pulso do "ao vivo" |
| **Leve** | `deviceMemory` ≤ 4 ou `hardwareConcurrency` ≤ 4, economia de dados, `prefers-reduced-transparency`, sem `backdrop-filter` | não (sólido) | não | não | tudo parado | não |

- O app da equipe começa no Leve e sobe no máximo para Padrão.
- `prefers-reduced-motion` desliga o movimento em qualquer nível (Seção 10).
- Planejado: em Configurações, a pessoa escolhe "Efeitos visuais: automático, completo ou leve".

---

## 7. O que fazer e o que evitar

### Faça
- Mostre status sempre com gema (forma) + rótulo + cor. A cor nunca trabalha sozinha.
- Use a superfície inversa (quartzo no escuro, obsidiana no claro) para a ação primária, e só uma por área.
- Guarde o prisma para a identidade: logo, avatar e a tela Entrar.
- Escreva números em Geist, com algarismos tabulares (tabelas, agenda, horários, KPIs e todo número que conta); proporcionais só no meio do texto; dinheiro com `Intl` pt-BR.
- No app da equipe: alvos de 48px, texto de 16px, tema Quartzo, nível Leve por padrão.
- Ofereça desfazer em toda ação reversível (aviso de 10s + ⌘/Ctrl Z) em vez de perguntar "tem certeza?".
- Escreva datas e horas do jeito brasileiro: "qua, 5 nov", "15:00". Entrada às 15:00 e saída às 11:00 são o padrão do imóvel.
- Dê a cada gráfico e à agenda uma tabela equivalente, e a cada dica flutuante um caminho por toque e por teclado.
- Use superfície sólida em cartões, painéis e na lateral; vidro só no que flutua.
- Agrupe com filetes e espaço antes de criar um cartão; os KPIs ficam numa faixa só.
- Antes de dar uma tela por pronta, confira os 8 estados (padrão, hover, foco, pressionado, desabilitado, carregando, erro e sucesso), o uso só pelo teclado, o contraste e as larguras de 1440, 1024 e 375px.

### Evite
- Âmbar, esmeralda, rubi ou safira para categorias, séries de gráfico ou enfeite: são reservados para estado e dado.
- Mais de duas camadas de vidro empilhadas, ou vidro sem conteúdo atrás.
- Bodoni em números, tabelas, rótulos, botões ou abaixo de 28px.
- "Check-in", "check-out", "booking" e "alocação" na interface: use "entrada", "saída" e "reserva".
- Animar `width`, `height`, `top` ou `left`. Usar quique ou elástico fora das exceções da Seção 10. Laços infinitos no app da equipe.
- Esconder informação essencial atrás do hover.
- Lente fora do Chromium no computador, ou com escala acima de 14.
- Criação que só funciona arrastando: sempre há caminho por toque, teclado ou botão.
- Travessão (—) nos textos da interface: use vírgula, dois-pontos ou ponto. O meia-risca dos intervalos ("5–8 nov") continua.
- `transition: all`: nomeie as propriedades, com as durações e as curvas dos tokens.
- Cartão dentro de cartão, e vidro em cartão, painel ou na lateral.
- Brilho colorido sob botões, aro girando ou fundo animado dentro do painel.

---

## 8. Responsivo

**Estratégia:** o admin nasce no computador e desce até o celular sem perder função. O app da equipe nasce no celular.

**Faixas do admin** (como o protótipo se comporta hoje):

| Faixa | Largura | O que muda |
|---|---|---|
| Computador | ≥1241px | lateral de 232px com rótulos; KPIs em 4 colunas; gráficos lado a lado; Hoje em 3 colunas |
| Notebook | 1021–1240px | trilho de ícones de 76px (rótulos somem, contador vai para o canto); busca de 240px; KPIs em 2 colunas; gráficos empilhados |
| Tablet | 761–1020px | Hoje em 1 coluna (contagens em 4 colunas); topo quebra em duas linhas |
| Celular | ≤760px | barra inferior flutuante (vidro, 8px das bordas); topo deixa de ser fixo e perde o vidro; título em 32px; margem 16px; KPIs em 1 coluna; herói em 44px; agenda com coluna de imóveis de 128px; legenda da agenda some; a busca vira um botão que abre em tela cheia |

**Principais adaptações:**

| Elemento | Celular | Computador |
|---|---|---|
| Navegação | barra inferior | lateral (trilho de ícones no notebook) |
| Agenda | rola de lado com a coluna de imóveis presa; tocar num dia cria uma reserva de 1 noite | arrastar numa linha vazia cria a reserva; dica ao apontar |
| Gaveta | quase tela cheia (12px de margem) | painel à direita de 430px |
| Dicas | tocar abre o detalhe, quando ele existe; no gráfico, tocar mostra a dica. O conteúdo também está na gaveta e na tabela | apontar ou focar mostra |
| Formulários | campos de 44px, texto de 16px (evita o zoom do iOS) | campos de 40px |

**Ponteiro:** `(hover: none) and (pointer: coarse)` troca as instruções de "arraste" por "toque" e aumenta os controles (Seção 5).

---

## 9. Guia para agentes

**Ao gerar interface para este projeto:**
- Use os tokens semânticos (`--color-*`, `--status-*`, `--data-*`, `--space-*`, `--radius-*`, `--cut-*`, `--control-*`, `--text-*`, `--elev-*`, `--z-*`, `--dur-*`, `--ease-*`). Nunca escreva hex ou px soltos num componente; primitivos só existem no arquivo de tokens.
- Escolha o tema pelo público: admin = Obsidiana, equipe = Quartzo. Não misture temas na mesma tela.
- Defenda cada decisão contra a declaração "lapidado, luminoso, instrumento de precisão".
- Procure um componente na Seção 4 antes de propor outro.
- Trate a Seção 7 como regra.
- Decida efeitos pelo nível (`data-tier`), não por palpite de aparelho.

**Invariantes (só mudam junto com este arquivo):**
- Status = pendente, em andamento, concluída, atrasada, sempre com a mesma forma de gema e a mesma cor (Seção 2.4). "Atrasada" não é gravada: é calculada na hora pela regra R7 do banco (não concluída e com o prazo vencido; sem prazo, vale o horário agendado).
- Ação primária = superfície inversa.
- Texto ≥4,5:1; texto grande, ícones e bordas de controle ≥3:1, medidos no pior ponto do vidro.
- Bodoni só a partir de 28px.
- Todo hover tem equivalente por toque e por teclado; todo gráfico tem tabela.
- `prefers-reduced-motion` tira todo deslocamento; `prefers-reduced-transparency` tira todo vidro.

**Perguntas em aberto (pergunte em vez de supor):**
- **Tema claro do admin:** não planejado agora. Os tokens permitem; os valores de dados claros precisam ser validados antes.
- **Sem internet no app da equipe:** guardar a mudança e sincronizar depois? Define o estado offline.
- **Teste com a equipe:** contraste ao sol e tamanho dos alvos num Android simples.

---

## 10. Movimento

**Durações:**

| Token | Valor | Uso |
|---|---|---|
| `dur-fast` | 140ms | hover, pressionar, troca de cor |
| `dur-base` | 200ms | menus e dicas abrindo, troca de texto com desfoque, troca de página, véu |
| `dur-moderate` | 300ms | aviso entrando, tambor de dígitos, contador que salta |
| `dur-slow` | 400ms | gaveta e folha entrando, pílula da navegação, corte de faceta |
| `dur-exit` | 220ms | gaveta, folha e aviso saindo |
| `dur-cinematic` | 900ms | abertura da primeira visita da sessão (cascata e gráficos crescendo) e a tela Entrar |

Laços: pulso do "ao vivo" 2,4s; anel das gemas em andamento/atrasada 2,2s; na tela Entrar, as gemas flutuam em 6 a 9s e a faixa corrida dá a volta em 40s (para ao apontar). Nada de aro girando nem fundo animado dentro do painel.

**Curvas:**

| Token | CSS | GSAP | Uso |
|---|---|---|---|
| `ease-standard` | `cubic-bezier(.23,1,.32,1)` | `power4.out` | interface em geral: hover, menus, troca de texto, tambor |
| `ease-entrance` | `cubic-bezier(.16,1,.3,1)` | `expo.out` | entradas, gaveta, pílula, corte de faceta |
| `ease-exit` | `cubic-bezier(.2,.8,.2,1)` | `power3.out` | saídas, curtas; nada de `ease-in` na interface |
| `ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | `back.out(2)` | **só** coisas pequenas, uma vez por mudança: gemas surgindo (≤24px), o contador que salta e o dígito do tambor assentando |
| `ease-shake` | — | `elastic.out(1, .3)` | **só** tremor de ação inválida (rascunho em conflito) |

**Transições assinatura:**
1. **Corte de faceta:** a barra de reserva (e a abertura) se revela por um `clip-path` com ponta em ângulo, controlado pela variável `--rv` (0 → 1). 400ms, `ease-entrance`, na primeira visita da sessão ou quando a barra nasce.
2. **Deslize da pílula:** a pílula sólida desliza até o item ativo da navegação. 400ms, `expo.out`.
3. **Cascata:** blocos entram subindo 14px com opacidade, 45ms entre eles. 650ms, `power3.out`. Só na primeira visita da sessão; depois, a tela aparece pronta.
4. **O dado cresce:** colunas e barras nascem da linha de base. 900ms, `power3.out`, 35–40ms entre elas, também só na primeira visita. Os números chegam pelo tambor de dígitos (item 7).
5. **Gaveta e aviso:**
   - A gaveta entra pela direita em 400ms (`expo.out`) e sai em 220ms (`ease-exit`).
   - O aviso sobe 12px em 300ms e sai em 200ms.
6. **Troca de página:** a View Transitions API (`@view-transition { navigation: auto; }`) esmaece só o conteúdo, em 200ms. A lateral e o topo levam `view-transition-name` e não piscam.
7. **Tambor de dígitos** (Transitions.dev): cada algarismo é uma coluna de 0 a 9 que desliza até o valor novo. 300ms, `ease-standard`, 30ms entre as colunas, e o último passo assenta com `ease-pop`. Vale nos KPIs e contadores, ao chegar e ao mudar. Algarismos tabulares sempre; o leitor de tela lê só o valor final.
8. **Troca de texto com desfoque:** o texto velho sai subindo 4px com `blur(4px)`, e o novo entra vindo de 4px abaixo. 200ms. No chip de status, no rótulo do botão ("Salvar reserva" → "Salvando…") e no Avanço de estado.
9. **Menu que abre a partir do botão:** menus e dicas crescem de 0,96 a 1 com opacidade, com a origem no botão que os chamou. 200ms para abrir, 140ms para fechar. O diálogo fica centrado e cresce de 0,98.
10. **Contador que salta:** quando o contador da navegação muda, ele vai de 0,8 a 1 com `ease-pop`, em 300ms, e o número troca pelo tambor.
11. **Luz do ponteiro** (React Bits, refeita em JavaScript puro): nos cartões de imóvel e de pessoa, um brilho radial de 360px (`spotlight`) segue o ponteiro e aparece em 200ms. Só com `(hover: hover) and (pointer: fine)`, nos níveis Completo e Padrão.
12. **Momento da marca** (tela Entrar): as gemas seguem o ponteiro com paralaxe de até 12px (as mais próximas mexem mais), um brilho atravessa o nome uma vez em 900ms, e a faixa corrida anda devagar. O que roda em cada nível está na tabela de níveis (Seção 6).

**Movimento reduzido:** com `prefers-reduced-motion: reduce`, nada se desloca. Tudo aparece no estado final (números já no valor, gráficos já desenhados), os laços param e, no máximo, sobra um fade de opacidade de 140ms. O tambor mostra o valor direto, a troca de texto vira um fade, e a tela Entrar fica parada. Na implementação: `gsap.matchMedia()` e CSS.

**Desempenho:** anime só `transform`, `opacity`, `clip-path` e `filter` curtos. Nada de animar layout nem de `transition: all`: nomeie as propriedades, sempre com as durações e as curvas dos tokens. Toda dica, menu, gaveta e aviso tem entrada e saída.

---

## 11. Voz e tom

**Voz:** clara, calma e prática. Fala como uma colega experiente: direta, gentil e sem jargão.

| Use | Evite | Observação |
|---|---|---|
| reserva | alocação, booking | "alocações" no pedido = reservas |
| imóvel | propriedade, unidade, listing | |
| entrada · saída ("Entrada 15:00") | check-in, check-out, checkout | o PDF do projeto usa "datas de entrada e saída" |
| hóspede | cliente, locatário | sem artigo quando der: "Hóspede: Mariana Costa" |
| diária (preço de uma noite) | tarifa, rate | |
| noites (a contagem) | diárias, para contar | "3 noites · R$ 1.350" |
| receita | faturamento | "Receita do mês" |
| ocupação | taxa de ocupação, fora de eixo | "78% de ocupação" |
| limpeza · manutenção | job, OS, chamado | são as tarefas |
| equipe; a pessoa pelo nome | funcionário, colaborador | "Cida está limpando" |
| pendente · em andamento · concluída · atrasada | a fazer, fazendo, feito, done | estados da tarefa |
| limpando · pronto | liberado, ok | prontidão do imóvel para a próxima entrada |

**Microtexto:**
- **Maiúsculas:** só no início da frase ("Nova reserva", "Visão geral").
- **Botões:** verbo no imperativo + objeto ("Salvar reserva", "Começar limpeza", "Concluir limpeza"). Nada de "OK", "Sim" ou "Enviar".
- **Erros:** dizem o que aconteceu e como resolver, sem culpar a pessoa. Exemplos: "A saída precisa ser depois da entrada."; "Essas datas batem com a reserva de Mariana (5–8 nov). Escolha outras datas."
- **Vazio:** diz o que é e qual a primeira ação. Exemplo: "Nenhuma reserva neste mês. Arraste numa linha da agenda ou use Nova reserva."
- **Confirmação:** prefira desfazer a perguntar ("Reserva excluída." + "Desfazer").
- **Datas e números:** "qua, 5 nov"; intervalos "5–8 nov"; horas "15:00"; "hoje" e "amanhã" quando ajudar; "R$ 12.340"; "78%".
- **Inclusão:** evite flexão de gênero quando der ("Boas-vindas", "Bom dia, Cida", "Quem vai limpar").
- **Leitor de tela:**
  - Toda mudança de estado é anunciada numa região viva.
  - Ícone decorativo leva `aria-hidden`.
  - A gema sempre vem com texto.

---

## Apêndice A — O que a consolidação mudou

| Antes, no protótipo | Agora | Por quê |
|---|---|---|
| 19 tamanhos de fonte (10 a 52px, com meios pixels) | 13 tokens (11 a 52px) | o 12,5px virou 13 (rótulos) ou 12 (metadados); nada abaixo de 11 |
| 15 raios (3 a 26px) | 6 raios + 2 facetas | 13px → 12, 9 e 10 → 10, 14 a 16 → 16, 20 a 26 → 24 |
| espaços fora da grade (7, 9, 11, 13, 22, 26, 34px) | múltiplos de 4 | o mais próximo na escala |
| controles de 30, 40, 42 e 44px | 32, 40 e 48px (toque: 40 e 44) | três alturas, com aumento automático para dedo |
| borda de campo a 13% (2,0:1) | `color-border-control` a 36% (3,3:1) | borda de campo precisa de 3:1 |
| texto claro #6d6880, tags #9a5d00 e #0a8a5f | `neutral-600`, `ambar-700`, `esmeralda-700` | passavam abaixo de 4,5:1 no fundo baixo |
| chip claro com texto colorido | rótulo neutro + gema viva | daltonismo: ΔE 5,0 → 9,6 |
| "Check-ins no mês" | "Entradas no mês" | vocabulário do PDF |
| aro de prisma girando sempre | gira só no nível Completo; parado no Padrão; some no Leve | desempenho e calma |
| aro do primário num `::before` atrás do botão | borda em degradê (`padding-box` + `border-box`) no próprio botão | o `::before` com z-index negativo vazava por cima do botão ao pressionar |
| KPI com algarismos proporcionais | algarismos tabulares em todo número que conta | ao contar, dígitos proporcionais mudam de largura e o valor treme |

## Apêndice B — O que a v0.4 mudou (passe premium, 11 nov 2026)

Referências: Taste Skill, Transitions.dev, React Bits e Henrietta Said (Seção 1). Onde a Parte 1, a Parte 3, a folha do lote A ou `design/telas/web-admin.md` ainda falarem em cartão de vidro, aro de prisma no botão, brilho lilás, fundo animado no painel ou nas durações antigas, vale esta versão.

| Antes (v0.3) | Agora (v0.4) | Por quê |
|---|---|---|
| neutros com croma até 0,041 (matiz 295); brilhos lilás, ciano e rosa no fundo | croma até 0,015 (matiz 288); uma luz fria discreta no fundo do painel; nenhum brilho colorido no app da equipe | o violeta com brilho lilás é a cara de interface gerada por IA; o preto quase neutro parece mais caro |
| vidro em cartões, lateral, topo e barra inferior | superfície sólida com filete e luz na borda de cima; vidro só no que flutua (gaveta, diálogo, folha, topo ao rolar e barra inferior); a lente fica só na borda da gaveta | vidro por padrão é o visual mais batido, pesa no desempenho e complica o contraste |
| quatro cartões de KPI; o "Hoje" em cartões | faixa de KPIs num painel só; o "Hoje" num painel com seções; nunca cartão dentro de cartão | cartão só quando a elevação diz algo |
| aro de prisma no botão primário (girando no Completo) e brilho lilás embaixo | botão primário sólido, que encolhe para 0,97 ao pressionar; prisma só no logo, no avatar e na tela Entrar | o enfeite disputava atenção com o dado |
| durações de 160 a 900ms; cascata e contagem em toda visita; saída com `ease-in` | 140 a 400ms na interface; a abertura só na primeira visita da sessão; saídas curtas, sem `ease-in`; troca de página de 200ms sem a casca piscar | movimento repetido cansa, e a interface precisa responder rápido |
| números que contam até o valor | tambor de dígitos, troca de texto com desfoque, menu que abre a partir do botão e contador que salta | as microinterações do Transitions.dev dão acabamento sem chamar atenção |
| (não havia) | luz que segue o ponteiro nos cartões de imóvel e de pessoa | o "luminoso" vira luz de verdade, sem cor |
| Entrar num cartão de vidro centrado; fundo animado em todo o admin | tela Entrar dividida, com o palco da marca (`display-xl`, gemas, brilho no nome, faixa corrida); a página 404 com a gema rachada; o painel com o fundo parado | a marca ganha um lugar próprio, e o instrumento fica quieto |
| (não havia) | nenhum travessão nos textos da interface; nada de `transition: all`; os 8 estados, o teclado, o contraste e as três larguras conferidos antes de dar uma tela por pronta | regras contra as marcas de interface gerada e a favor do acabamento |
