# Gemóvel — Arquitetura do front-end

> Especificação. Desenho aprovado na conversa em 8 nov 2026: abordagem A (páginas separadas servidas pelo Flask), com duas decisões: fontes no próprio servidor e testes de JavaScript com o Node.

- **Entrega:** final, 17/11/2026: "sistema integrado com front-end (HTML/CSS/JS) consumindo as rotas Flask via Fetch, funcionando de ponta a ponta, pronto para apresentação."
- **Base:**
  - o `DESIGN.md` v0.4 (com o passe premium do Apêndice B);
  - os componentes aprovados (`design/componentes/`);
  - as telas web do admin (`design/telas/web-admin.md`);
  - a API (`2026-11-08-api-etapa-2-design.md`), mais as rotas da entrega final.
- **Pilha:**
  - HTML, CSS e JavaScript do navegador, sem framework e sem etapa de compilação;
  - Jinja (já vem com o Flask) só para o esqueleto das páginas;
  - GSAP no próprio servidor.

  Funciona nas versões atuais do Chrome, Edge, Safari e Firefox.

## 1. Escopo

- **Entra:**
  - as telas web do admin aprovadas: entrar, visão geral, agenda, reservas (com a aba Hóspedes), imóveis e o detalhe do imóvel, tarefas e equipe;
  - a estrutura do app da equipe (F5).
- **Telas do app da equipe:** saem da seção do celular, que vem logo depois desta arquitetura. Aqui fica só onde elas moram e o que herdam.
- **Fora:** o modo sem internet, a escolha "Efeitos visuais" em Configurações, o admin no celular e o tema claro do admin.

## 2. Pastas

```
frontend/
  paginas/                  modelos de página do Flask (Jinja), sem dados
    base.html               o <head> comum: fontes, CSS do app, tema e o script do nível
    entrar.html · 404.html
    admin/
      base-admin.html       estende base.html; traz o menu (6 destinações), a busca e a conta
      visao-geral.html · agenda.html · reservas.html · imoveis.html · imovel.html
      tarefas.html · equipe.html
    app-equipe/
      base-equipe.html · minhas-tarefas.html
  estaticos/
    css/
      tokens.css · base.css · fontes.css · admin.css · app-equipe.css
      componentes/          um arquivo por componente
      telas/                um arquivo por tela, só com o layout dela
    js/
      nucleo/               api.js · html.js · url.js · formatos.js · nivel.js
      componentes/          shell.js · gaveta.js · formulario.js · aviso.js · faixa.js · menu.js
                            busca.js · seletor-datas.js · seletor-periodo.js · estados.js
                            tambor.js · luz.js
      telas/                um arquivo por tela
    fontes/                 os arquivos .woff2
    icones.svg              os ícones Lucide usados, as gemas e o logo
    lib/gsap.min.js
    LICENCAS.md             as licenças das fontes, dos ícones e do GSAP
  testes/                   *.test.js, para o node --test
backend/gemovel/rotas/paginas.py   as rotas das páginas
```

## 3. Como as páginas chegam ao navegador

- **Pastas no Flask:** `criar_app()` aponta o Flask para as pastas do front: `template_folder` = `frontend/paginas`, `static_folder` = `frontend/estaticos` e `static_url_path` = `/estaticos`.
- **Rotas das páginas** (`rotas/paginas.py`):

| Endereço | Página | Quem |
|---|---|---|
| `/entrar` | `entrar.html` | todos; quem já entrou vai para o próprio painel |
| `/` | `admin/visao-geral.html` | admin |
| `/agenda` | `admin/agenda.html` | admin |
| `/reservas` | `admin/reservas.html` | admin |
| `/imoveis` | `admin/imoveis.html` | admin |
| `/imoveis/<id>` | `admin/imovel.html` | admin |
| `/tarefas` | `admin/tarefas.html` | admin |
| `/equipe` | `admin/equipe.html` | admin |
| `/minhas-tarefas` | `app-equipe/minhas-tarefas.html` | funcionário |

- **Conferência antes de entregar:**
  - sem login → `302 /entrar?volta=<endereço pedido>`;
  - perfil errado → `302` para o próprio painel (`/` ou `/minhas-tarefas`), sem mensagem;
  - o `volta` só vale se começar com `/`, e não com `//`; assim ele nunca leva para outro site.
- **Página que não existe:** fora de `/api`, aparece a página `404.html`; dentro de `/api`, o erro em JSON.
- **Imóvel inexistente:** `/imoveis/<id>` sempre entrega a página. Se a API responder 404, a tela mostra o estado de não encontrado.
- **Sem dados nas páginas:** os modelos só usam valores fixos, como o título e qual tela é. Nada vem do banco nem da sessão. A página traz a estrutura e os esqueletos de carregamento; o módulo da tela busca os dados na API e monta as linhas.
- **Modelos:**
  - `base.html` tem os blocos `titulo`, `tema`, `css`, `conteudo` e `scripts`;
  - `base-admin.html` estende `base.html` e põe o menu, com a destinação atual marcada (`aria-current="page"`);
  - cada tela estende `base-admin.html`.
- **Entrar:** a tela manda `POST /api/sessao`. Se der certo, vai para o `volta` (conferido do mesmo jeito) ou para o painel do perfil.
- **Sair:** o menu da conta manda `DELETE /api/sessao` e vai para `/entrar?saiu=1`, que mostra "Você saiu do Gemóvel."

## 4. CSS

- **Camadas:** `@layer tokens, base, componentes, telas;`, declaradas no começo de `admin.css` e `app-equipe.css`. O estilo de uma tela vence o de um componente sem `!important`.
- **Arquivo do app:** `admin.css` e `app-equipe.css` só importam os outros, cada um na sua camada, como em `@import url("componentes/botao.css") layer(componentes);`.
- **O que a página linka:** o arquivo do app e o da tela, como `telas/reservas.css`, escrito dentro de `@layer telas`.
- **`tokens.css`:**
  - escrito a partir do DESIGN.md, nas três camadas: primitivos → semânticos → componentes;
  - os semânticos são remapeados em `[data-theme="obsidiana"]` e `[data-theme="quartzo"]`;
  - o `design/exploracoes/tokens.css` é o ponto de partida; onde ele diverge do DESIGN.md, vale o DESIGN.md (por exemplo, `--chip-label`);
  - quando o arquivo existir, a linha "Tokens em código" do DESIGN.md passa a apontar para ele.
- **Níveis de efeito:** o que depende do nível fica em seletores de `[data-tier]`:
  - vidro só em `completo` e `padrao`; `leve` é sólido;
  - `prefers-reduced-motion: reduce` tira todo deslocamento;
  - `prefers-reduced-transparency: reduce` tira o vidro.
- **Troca de página:** `@view-transition { navigation: auto; }`, dentro de `@media (prefers-reduced-motion: no-preference)`. A lateral e o topo levam `view-transition-name` e não piscam; só o conteúdo esmaece, em 200ms.

## 5. Fontes e ícones

- **Fontes** (`fontes.css` e a pasta `fontes/`): arquivos `.woff2` só com o subconjunto latino, que cobre os acentos do português, com `font-display: swap`.
  - Geist variável, pesos 400 a 600; Geist Mono variável, pesos 400 a 500.
  - Bodoni Moda variável no admin (tamanho óptico de 6 a 96, peso de 400 a 900). No app da equipe, uma única instância: peso 500, tamanho óptico 72.
  - O admin pré-carrega (`preload`) a Geist e a Bodoni; a equipe, só a Geist.
  - Na construção, conferir se os caracteres que as telas usam (→, ·, –) estão no subconjunto.
- **Ícones** (`icones.svg`):
  - um `<symbol>` por ícone Lucide usado, mais as gemas e o logo;
  - uso: `<svg class="icone" aria-hidden="true"><use href="/estaticos/icones.svg#calendario"></use></svg>`;
  - traço de 1,75 px e a cor do texto (`currentColor`), definidos pelo CSS;
  - tamanhos de 16, 20 e 24 px;
  - num botão só com ícone, o `aria-label` fica no botão.
- **Origem:** os arquivos são baixados na construção, com a permissão de vocês:
  - as fontes, do Google Fonts ou do Fontsource (licença OFL);
  - os SVG do Lucide (licença ISC);
  - o GSAP 3.13 (licença gratuita da GSAP).

  As licenças ficam em `LICENCAS.md`.

## 6. JavaScript

- **Módulos nativos:** cada página termina com `<script type="module" src="/estaticos/js/telas/<tela>.js">`, e o módulo importa o que usa por caminho relativo. O único script dentro do HTML é o do nível (seção 7).

**Núcleo** (`nucleo/`):

| Módulo | Exporta | Faz |
|---|---|---|
| `api.js` | `api.get(caminho, parametros)`, `api.post(caminho, dados)`, `api.patch(caminho, dados)`, `api.delete(caminho, {keepalive})` e a classe `ErroApi` | é o único `fetch` do sistema. Manda e lê JSON e devolve os dados (ou `null` no 204). Erro vira `ErroApi {status, mensagem, campos}`. O 401 (fora do login) dispara o evento `gemovel:sessao-expirada`. Sem resposta em 15 s, ou sem internet, vira `ErroApi` com `status` 0 |
| `html.js` | `html` (template marcado) e `renderizar(elemento, trecho)` | escapa `& < > " '` de todo valor interpolado. Listas viram texto juntas, e um trecho já montado com `html` não é escapado de novo |
| `url.js` | `lerEstado()`, `trocarFiltro(nome, valor)`, `abrirGaveta(tipo, id, {editar})`, `fecharGaveta()` e `aoMudar(funcao)` | filtros e aba mudam o endereço com `replaceState`; a gaveta usa `pushState`, então o Voltar fecha. `aoMudar` responde ao Voltar e ao Avançar |
| `formatos.js` | `dinheiro`, `data`, `dataCurta`, `periodo`, `horario` e `lerData` | formata com `Intl` pt-BR: "R$ 1.620,00", "sex, 6 nov", "ter, 3 nov → dom, 8 nov", "15:00". `lerData("2026-11-06")` monta a data local, sem o fuso puxar para o dia anterior |
| `nivel.js` | `nivelAtual()`, `podeAnimar()` e `carregarGsap()` | lê o `data-tier` e a preferência por movimento reduzido. `carregarGsap()` carrega o GSAP uma vez só, e só se `podeAnimar()` |

**Componentes** (`componentes/`), cada um sobre o elemento nativo que o lote B definiu:

| Módulo | Base | Faz |
|---|---|---|
| `shell.js` | — | preenche a conta com `GET /api/sessao`, liga ⌘/Ctrl K e o Sair, e mostra o aviso de sessão expirada |
| `gaveta.js` | `<dialog>` com `showModal()` | abre e fecha pela URL; põe o foco ao abrir e o devolve ao fechar, como no lote B; avisa sobre mudanças não salvas ("Descartar") |
| `formulario.js` | `<form>` | junta os campos, envia pela `api` e mostra "Salvando…". Põe cada mensagem de `ErroApi.campos` no campo certo (`aria-invalid` e `aria-describedby`) e leva o foco ao primeiro erro |
| `aviso.js` | região viva | avisos que somem sozinhos, com uma ação ("Ver na agenda"). `adiarEnvio(funcao)` espera 10 s com "Desfazer" e manda na hora se a página for fechada (`pagehide` com `keepalive`) |
| `faixa.js` | — | a faixa de erro com "Tentar de novo" e a de sem internet |
| `menu.js` | `popover` com `role="menu"` | os menus ⋯ e o da conta, com o teclado do lote B |
| `busca.js` | `popover` (no celular, `<dialog>`) | a busca geral e a Busca no formulário (hóspedes) |
| `seletor-datas.js` | — | calendário com as noites ocupadas |
| `seletor-periodo.js` | — | navegação por mês ou por dia |
| `estados.js` | — | esqueleto, vazio e erro de uma área da tela |
| `tambor.js` | — | o tambor de dígitos dos KPIs e contadores (DESIGN.md §10, item 7): monta as colunas de 0 a 9, desliza até o valor e deixa só o valor final para o leitor de tela |
| `luz.js` | — | a luz que segue o ponteiro nos cartões (item 11), só com mouse e nos níveis `completo` e `padrao` |

- **Telas** (`telas/`): um módulo por tela, sempre nesta ordem:
  1. lê a URL;
  2. mostra o esqueleto;
  3. busca os dados na API;
  4. monta a tela com `html`;
  5. liga os componentes.

  Quando a URL muda, `aoMudar` repete o ciclo sem recarregar a página. O modelo de cada linha fica no módulo da tela, escrito com `html`.
- **Estado:** não há framework nem estado global. O estado de cada tela fica na URL e num objeto do próprio módulo.

## 7. Nível de efeito e movimento

- **Script do nível:** fica inline no `<head>` de `base.html`, antes do CSS, e segue a tabela do DESIGN.md:
  1. `leve` se `deviceMemory ≤ 4`, `hardwareConcurrency ≤ 4`, economia de dados, `prefers-reduced-transparency` ou sem `backdrop-filter`;
  2. senão, `completo`, se for Chromium no computador e com ponteiro fino;
  3. senão, `padrao`.

  No app da equipe, o nível vai no máximo até `padrao`. Para conferir, `?nivel=completo|padrao|leve` força o nível naquela aba.
- **GSAP:** carrega só por `carregarGsap()`, nos níveis `completo` e `padrao`, e nunca com movimento reduzido. As durações e as curvas vêm dos tokens de movimento do DESIGN.md (a coluna GSAP).
- **Fundo animado:** só na tela Entrar (as gemas, o brilho no nome e a faixa corrida), como na tabela de níveis do DESIGN.md; no painel, o fundo é parado. Os laços infinitos seguem a mesma tabela.
- **Primeira visita:** a abertura coreografada (cascata e gráficos crescendo) roda só na primeira tela da sessão, marcada no `sessionStorage`; depois, a tela aparece pronta.
- **Movimento reduzido:** tudo aparece no estado final, com os números já contados e os gráficos já desenhados.
- **Gráficos da Visão geral:** SVG desenhado à mão, como no protótipo, sem biblioteca.

## 8. Dados e estados

- **Carregar:** primeiro o esqueleto, depois o conteúdo. Lista vazia usa os textos das telas (item 10 de `web-admin.md`); erro mostra a faixa com "Tentar de novo".
- **Salvar:**
  - deu certo (201): a gaveta fecha, o aviso aparece ("Reserva RSV-0017 criada · Ver na agenda") e a lista recarrega;
  - campo inválido (422) ou conflito (409): a mensagem vai para o campo certo, e o foco vai para o primeiro erro.
- **Excluir, cancelar e desativar:** o item sai da lista na hora, e `adiarEnvio` dá 10 s para Desfazer. O pedido só sai depois.
- **Sessão expirada:** qualquer 401 abre o aviso do lote B. "Entrar de novo" leva para `/entrar?volta=<endereço atual>`.
- **Banco fora ou sem internet:** aparece a faixa, e nada some da tela.
- **Voltar à aba:** se a aba ficou escondida mais de 5 minutos, a tela recarrega os dados quando a pessoa volta.

## 9. App da equipe

- **Endereço e visual:** fica em `/minhas-tarefas`, no tema Quartzo, com o nível no máximo em Padrão.
- **CSS:** `app-equipe.css` traz só o que a equipe usa.
- **O que não carrega:** nem GSAP nem canvas. Das fontes, só a Geist e uma instância da Bodoni.
- **O que divide com o admin:** o mesmo núcleo e os mesmos componentes.
- **O que vem depois:** as telas e o estado sem internet saem da seção do celular. O service worker, quando vier, fica restrito a `/minhas-tarefas` e a `/estaticos`.

## 10. Testes e conferência

- **JavaScript** (`frontend/testes/`, com `node --test frontend/testes/`):
  - `formatos`: datas no fuso de São Paulo, dinheiro e períodos;
  - `html`: escapa os cinco caracteres e não escapa duas vezes;
  - `url`: a parte que lê e escreve o estado, sem o `history`.
- **Python** (`backend/testes/test_paginas.py`):
  - sem login, vai para `/entrar?volta=…`;
  - perfil errado vai para o próprio painel;
  - um `volta` para outro site é ignorado;
  - uma página que não existe dá a `404.html`, e uma rota de API que não existe, o erro em JSON.
- **No navegador:** cada tela é conferida contra a API com os dados de exemplo, em:
  - os dois temas e os três níveis (`?nivel=`);
  - movimento reduzido e uso só pelo teclado;
  - leitor de tela nos fluxos principais;
  - larguras de 1440, 1024 e 375 px.

## 11. Ordem de construção

1. A API, até 13/11 (Etapa 2).
2. A base do front: rotas das páginas, modelos, tokens, base, fontes, ícones, núcleo e componentes.
3. As telas do admin.
4. As telas da equipe, depois da seção do celular.
5. A conferência de ponta a ponta.

O plano detalha cada passo.
