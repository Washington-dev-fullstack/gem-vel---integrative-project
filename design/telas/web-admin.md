# Gemóvel — Telas web do admin (rascunho)

> Seção de telas, versão web: o admin no computador. Notebook e tablet seguem as faixas da Seção 8 do `DESIGN.md`; o celular fica para as seções do fim, a pedido de vocês. Só vale depois de aprovado. No fim estão os pontos para decidir e o que muda no `DESIGN.md`.

- **Base:**
  - `DESIGN.md` v0.1, maturidade L1: as telas usam só peças e tokens documentados. Não há biblioteca de Figma; nada aqui vem de inspeção de arquivo.
  - os componentes de `design/componentes/` e a folha do lote A;
  - a especificação do banco (`docs/superpowers/specs/2026-11-06-banco-de-dados-design.md`): as regras R1 a R7 valem em todas as telas, e os campos de cada formulário são as colunas de `banco/01_estrutura.sql`.
- **Já aprovadas:** a casca do admin, a Visão geral e a Agenda (`design/exploracoes/admin.html`). Aqui elas só ganham o que está no item 9.
- **Endereços:** são lógicos. A arquitetura do front-end, a próxima seção, decide se viram páginas separadas ou rotas do Flask. Filtros, aba e gaveta aberta ficam no endereço: voltar, recarregar e mandar o link mantêm a tela como estava.
- **Exemplos:** os dados de exemplo do banco (`banco/02_dados_exemplo.sql`), como a Marina os vê se forem carregados na qui, 5 nov 2026, por volta das 13:00. A lista de tarefas e a equipe misturam alguns casos para mostrar todos os estados.
- **Formulários:** o campo opcional aparece como "Opcional" (padrão Formulário de cadastro). Nas tabelas abaixo, o que não diz "opcional" é obrigatório.

---

## 1. Mapa

| Tela | Endereço | Na navegação | Peças principais |
|---|---|---|---|
| Entrar | `/entrar` | — | Campo (e-mail, senha), Botão, Faixa de aviso |
| Visão geral | `/` | Visão geral | já aprovada, mais a Atividade recente |
| Agenda | `/agenda?mes=2026-11` | Agenda | já aprovada |
| Reservas | `/reservas`, aba `#hospedes` | Reservas | Cabeçalho, Abas, Filtros, Tabela de dados, Gaveta |
| Imóveis | `/imoveis` | Imóveis | Tabela de dados ou Cartão de imóvel, Alternador |
| Detalhe do imóvel | `/imoveis/1`, abas `#reservas` `#tarefas` `#dados` | Imóveis | Cabeçalho (detalhe), KPI, Abas |
| Tarefas | `/tarefas?dia=2026-11-05` | Tarefas | Seletor de período, Filtros, Cartão de tarefa (admin) |
| Equipe | `/equipe` | Equipe | Cartão de pessoa, Filtros |

**Gavetas:** abrem por cima da tela de onde vieram e têm endereço próprio: `?reserva=12`, `?reserva=nova`, `?hospede=12`, `?imovel=novo`, `?bloqueio=novo`, `?tarefa=5`, `?tarefa=nova`, `?pessoa=3`, `?pessoa=nova`. "Editar" troca o detalhe pelo formulário na mesma gaveta (`&editar`): uma gaveta nunca abre outra (lote B).

## 2. O que vale para todas as telas

- **Casca:** lateral com os 6 destinos, topo com a busca (⌘/Ctrl K) e o menu da conta. Cada tela tem um só `h1`, o título do cabeçalho.
- **Listas** seguem o padrão "Lista com filtros": cabeçalho → filtros → tabela ou cartões → estados de dados. Cada tela diz a sua ordem padrão.
- **Formulários** seguem o padrão "Formulário de cadastro" e moram sempre na gaveta de 430px, nunca numa página. "Salvar" fica no rodapé preso. O erro que volta do servidor cai no campo certo: conflito de datas no campo de datas, e-mail repetido no campo de e-mail.
- **Depois de salvar:** a gaveta fecha, a lista se atualiza com o item no lugar da ordem, e um aviso confirma com um atalho: "Reserva RSV-0017 criada · Ver na agenda".
- **Excluir, cancelar e desativar:** sem pergunta. Aviso com "Desfazer" por 10s; o pedido só vai ao servidor quando o aviso acaba (decisão do lote B).
- **Formatos:** dinheiro `R$ 1.350,00`; data "sex, 6 nov", com o ano só quando não é o ano corrente; horário "15:00"; números tabulares, alinhados à direita.
- **Códigos:** IMV com 3 dígitos e RSV com 4, a partir do id (IMV-001, RSV-0012). Servem para conferir e buscar; nada exige saber um código, porque a busca acha por nome, telefone ou e-mail.
- **Texto sem gênero:** o sistema não sabe o gênero de ninguém, então o texto não concorda com a pessoa: "Acesso de Cida desativado", e não "Cida desativada".
- **Dono dos dados:** cada administrador só vê o que é dele (regra R6). Nenhuma tela mostra isso.

## 3. Entrar

**Para quê:** entrar com e-mail e senha. Cada perfil cai na sua tela (padrão Entrar).

```
┌──────────────────────────────────────────────────────────────┐
│                          ◆ Gemóvel                           │
│                                                              │
│              ┌──────────────────────────────────┐            │
│              │ Entrar                           │            │
│              │                                  │            │
│              │ E-mail                           │            │
│              │ [ nome@exemplo.com             ] │            │
│              │ Senha                            │            │
│              │ [ ••••••••             Mostrar ] │            │
│              │                                  │            │
│              │ [            Entrar            ] │            │
│              │                                  │            │
│              │ Esqueceu a senha? Peça para quem │            │
│              │ administra o Gemóvel redefinir.  │            │
│              └──────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

- **Visual:** tema Obsidiana; Cartão de vidro (elevação 1) com 400px, sólido no nível Leve; título "Entrar" em `display-md`.
- **Campos:** e-mail (`type=email`, `autocomplete=username`) e senha (`autocomplete=current-password`, com Mostrar/Ocultar). Enter envia.
- **Botão:** primário, na largura toda; "Entrando…" enquanto espera.
- **Erros** (Faixa de aviso dentro do cartão; o foco vai para ela):
  - e-mail ou senha errados: "E-mail ou senha não conferem." Não diz qual dos dois.
  - conta desativada, só depois da senha certa: "Este acesso foi desativado. Fale com quem administra o Gemóvel."
  - servidor fora do ar: "Não deu para entrar agora. Confira a internet e tente de novo."
- **Depois:** o administrador vai para `/`, ou para a página que tinha pedido; o funcionário vai para o app da equipe (seções do celular).
- **Sem permissão:** um funcionário que abre um endereço do admin vai para o app da equipe, sem mensagem de erro.
- **Sessão expirada no meio do uso:** o diálogo "Sua sessão expirou" do lote B, com e-mail e senha nele mesmo, sem perder o que estava na tela.
- **Fora da v1:** "lembrar de mim" e recuperar a senha por e-mail; o sistema não envia e-mail.

## 4. Reservas

**Para quê:** achar, criar e mudar as reservas do período, com o hóspede e a limpeza da saída à mão.

```
Reservas                                                  [Bloquear datas] [+ Nova reserva]
nov 2026 · 13 reservas · R$ 21.350,00

 Reservas   Hóspedes
 ‾‾‾‾‾‾‾‾
[Período: Este mês ▾] [Imóvel: Todos ▾] [Estado: 3 ▾]

CÓDIGO    HÓSPEDE          IMÓVEL                ENTRADA     SAÍDA        NOITES         VALOR  ESTADO
  ⋮
RSV-0007  Fernanda Lima    Casa Lapa             ter, 3 nov  dom, 8 nov        5   R$ 1.700,00  Em curso  ⋯
RSV-0002  Mariana Costa    Loft Pinheiros        qua, 4 nov  sáb, 7 nov        3   R$ 1.140,00  Em curso  ⋯
RSV-0010  Eduardo Martins  Loft Vila Mariana     qui, 5 nov  seg, 9 nov        4   R$ 1.200,00  Futura    ⋯
RSV-0009  Daniela Rocha    Studio Vila Madalena  sex, 6 nov  seg, 9 nov        3     R$ 780,00  Futura    ⋯
RSV-0012  Carla Nogueira   Apto Jardins          sáb, 7 nov  qua, 11 nov       4   R$ 1.620,00  Futura    ⋯
  ⋮
                                           13 de 13
```

- **Cabeçalho:** o contexto traz o mês, a quantidade e a soma do valor das reservas listadas. Ação principal "Nova reserva"; secundária "Bloquear datas".
- **Abas:** Reservas · Hóspedes (decisão 1).
- **Filtros:**
  - Período: Este mês · Próximo mês · Mês passado · Escolher datas…; padrão Este mês. Entra toda reserva com ao menos uma noite no período. "Escolher datas…" abre o Seletor de datas sem as noites ocupadas, porque o filtro não é de um imóvel só.
  - Imóvel: vários, com contagem.
  - Estado: Futura · Em curso · Concluída · Cancelada; padrão: as três primeiras ("Estado: 3").
- **Tabela:** Código · Hóspede · Imóvel · Entrada · Saída · Noites (prioridade 3) · Valor · Estado · ⋯. Ordem padrão: data de entrada, da mais antiga para a mais nova.
- **Estado**, calculado na hora a partir das datas e do `status`:
  - Futura: antes da entrada. Pílula neutra.
  - Em curso: da entrada (15:00) até a saída (11:00), com os horários do imóvel. Pílula safira de estadia em curso.
  - Concluída: depois da saída. Pílula neutra, texto secundário.
  - Cancelada: `status` cancelada. Pílula neutra, valor riscado.
  - O texto sempre diz o estado; a cor só reforça.
- **Linha:** abre a gaveta de detalhe. Menu: Editar · Ver na agenda · Cancelar reserva (perigo; decisão 4).

### Gaveta: detalhe da reserva

```
RSV-0012                                  [Futura]  ✕
Carla Nogueira · Apto Jardins
────────────────────────────────────────────────────
HÓSPEDE      Carla Nogueira
             (61) 98333-1212 · WhatsApp
             carla.nogueira@example.com
ESTADIA      Entrada  sáb, 7 nov · 15:00
             Saída    qua, 11 nov · 11:00
             4 noites · 3 hóspedes
VALOR        R$ 450,00 × 4 noites = R$ 1.800,00
             Valor combinado R$ 1.620,00
LIMPEZA      ◇ Pendente · qua, 11 nov, 11:00–15:00
DA SAÍDA       Cida Ramos                          ›
OBSERVAÇÕES  Total editado: 10% de desconto pelas
             4 noites.
────────────────────────────────────────────────────
[Editar]                                         [⋯]
```

- O valor mostra a conta (diária × noites) e, quando foi editado, o valor combinado embaixo (regra R2).
- A limpeza da saída é uma linha do Cartão de tarefa (admin). Ela abre a gaveta da tarefa no lugar desta, com "← Reserva RSV-0012" para voltar.
- Menu: Ver na agenda · Cancelar reserva.

### Gaveta: nova reserva e editar reserva

| Campo | Peça | Regras (colunas de `reserva` e `hospede`) |
|---|---|---|
| Imóvel | Lista suspensa rica: nome, diária e capacidade | só imóveis ativos |
| Entrada e saída | Seletor de datas | mostra as noites já ocupadas e as bloqueadas do imóvel; resumo "4 noites · entrada 15:00, saída 11:00", com os horários do imóvel |
| Hóspede | Busca no formulário (lacuna 1) | acha por nome, telefone ou e-mail; a última opção, "Cadastrar "Ana Souza"", abre ali mesmo nome, telefone, e-mail e documento (os três últimos opcionais) |
| Hóspedes | Campo número com − e + | de 1 até a capacidade (R3): "O Apto Jardins recebe até 4 hóspedes." |
| Valor total | Campo moeda | começa em diária × noites, com a conta à vista (R2); se mudar, aparece "Voltar ao cálculo". A diária do imóvel fica guardada na reserva |
| Observações | Área de texto | opcional |

- **Limpeza da saída:** nasce sozinha ao salvar a reserva nova (regra R4; decisão 3). Embaixo das datas, o formulário avisa: "Ao salvar, a limpeza da saída fica marcada para qua, 11 nov, das 11:00 às 15:00."
- **Conflito, na hora (R1):** escolhidos o imóvel e as datas, o campo de datas avisa: "Conflita com RSV-0002 (Mariana Costa, 4 a 7 nov). Escolha outras datas." Ou: "O imóvel está bloqueado de 8 a 11 nov (troca do aquecedor)." Salvar continua disponível; se o servidor recusar, o resumo de erros no topo leva o foco às datas.
- **Rodapé:** "Salvar reserva" e "Fechar". "Cancelar" ficaria ambíguo com "Cancelar reserva". Fechar com mudanças abre o diálogo "Descartar as mudanças?" do lote B.
- **Vindo da Agenda:** arrastar numa linha abre este formulário com o imóvel e as datas preenchidos.

### Aba Hóspedes

```
[Buscar hóspede…]                                                   [Novo hóspede]

NOME            TELEFONE         E-MAIL                      RESERVAS  ÚLTIMA RESERVA
André Barros    (11) 99660-6006  —                                  1  ter, 10 nov
Bruno Carvalho  (11) 99880-8008  —                                  1  ter, 27 out
Carla Nogueira  (61) 98333-1212  carla.nogueira@example.com         1  sáb, 7 nov
```

- O campo filtra a tabela enquanto se digita (nome, telefone ou e-mail). Ordem: nome.
- **Linha:** abre a gaveta do hóspede, com os dados, as reservas dele em linhas compactas e "Editar".
- **Menu:** Editar · Nova reserva para Carla · Excluir. "Excluir" só funciona para quem não tem reservas; senão fica desabilitado com o motivo ("Excluir — tem 1 reserva"), porque o banco guarda o histórico.
- **Formulário:** nome; telefone, e-mail, documento e observações são opcionais.

## 5. Imóveis

```
Imóveis                                                   [Tabela | Cartões] [+ Novo imóvel]
8 imóveis · 4 prontos

[Prontidão: Todas ▾] [Cidade: Todas ▾]                                ○ Mostrar desativados

CÓDIGO   NOME           BAIRRO, CIDADE      DIÁRIA     PRONTIDÃO                PRÓX. ENTRADA        OCUPAÇÃO NOV
IMV-006  Apto Jardins   Jardins, São Paulo  R$ 450,00  ◈ Limpando               sáb, 7 nov · 15:00   23%
IMV-007  Casa da Praia  Itaguá, Ubatuba     R$ 520,00  ◆ Pronto                 dom, 15 nov · 15:00  17%
IMV-003  Casa Lapa      Lapa, São Paulo     R$ 340,00  Hóspedes até dom, 8 nov  —                    17%
```

- **Cabeçalho:** contexto "8 imóveis · 4 prontos". Alternador Tabela · Cartões, lembrado no navegador.
- **Filtros:** Prontidão (Hóspedes · Limpeza pendente · Limpando · Pronto · Limpeza atrasada); Cidade, só quando há mais de uma. Interruptor "Mostrar desativados": eles aparecem com a pílula "Desativado" e texto secundário.
- **Prontidão:** a tabela do Cartão de imóvel (lote B). "Limpeza atrasada" é a limpeza da saída que passou do prazo (R7); pela R4, o prazo é o horário de entrada do dia da saída.
- **Tabela:** Código · Nome · Bairro, cidade (prioridade 2) · Diária · Prontidão (a mesma pílula ou chip do cartão) · Próxima entrada · Ocupação do mês (medidor de 4px e %, prioridade 3) · ⋯. Ordem: nome.
- **Cartões:** o Cartão de imóvel do lote B, em grade de no mínimo 280px.
- **Linha ou cartão:** abre a página Detalhe do imóvel.
- **Menu:** Editar · Bloquear datas · Desativar. Com reservas futuras, "Desativar" fica desabilitado com o motivo (decisão 6).

### Detalhe do imóvel

```
← Imóveis
Loft Pinheiros  [Hóspedes até sáb, 7 nov]                        [Editar] [⋯]
IMV-001 · Pinheiros, São Paulo · Diária R$ 380,00

┌ Ocupação em nov ──┐ ┌ Receita em nov ───┐ ┌ Próxima entrada ────┐
│ 40%               │ │ R$ 4.560,00       │ │ dom, 8 nov · 15:00  │
│ 12 de 30 noites   │ │ 12 noites         │ │ Gabriel Moura       │
└───────────────────┘ └───────────────────┘ └─────────────────────┘

 Reservas   Tarefas   Dados
 ‾‾‾‾‾‾‾‾
 (a tabela de Reservas, só deste imóvel e sem a coluna Imóvel)
```

- **Cabeçalho (detalhe):** nome, prontidão e linha de contexto; "Editar" e o menu (Bloquear datas · Desativar ou Reativar).
- **KPIs:** três KPI padrão, com as mesmas contas do painel: ocupação do mês, receita do mês e próxima entrada.
- **Abas:**
  - Reservas: a tabela de Reservas filtrada pelo imóvel; "Nova reserva" já vem com ele escolhido.
  - Tarefas: as tarefas do imóvel a partir de hoje, agrupadas por dia em linhas do Cartão de tarefa, com "Carregar mais".
  - Dados: leitura em grupos, com "Editar":
    - Endereço;
    - Hospedagem: capacidade, diária, entrada e saída;
    - Instruções para a equipe (`observacoes`);
    - Bloqueios: período e motivo, cada um com menu (Excluir, com desfazer), e o botão "Bloquear datas".
- **Imóvel desativado:** faixa informativa no topo, "Este imóvel está desativado e não aparece para novas reservas.", com "Reativar".

### Gaveta: novo imóvel e editar imóvel

| Grupo | Campos (colunas de `imovel`) |
|---|---|
| Identificação | Nome ("Loft Pinheiros", até 100 caracteres) |
| Endereço | CEP (opcional, 00000-000) · Logradouro · Número ("s/n" vale) · Complemento (opcional) · Bairro · Cidade · UF (lista suspensa nativa) |
| Hospedagem | Capacidade (número com − e +, padrão 2) · Diária (moeda, maior que zero) · Entrada (horário, padrão 15:00) · Saída (horário, padrão 11:00) |
| Para a equipe | Instruções (opcional, área de texto). Dica: "Aparece para quem faz a limpeza e a manutenção: chave, portão, onde fica o material." |

- O código IMV nasce com o cadastro; ninguém digita.
- Ao mudar a diária: "A nova diária vale para as próximas reservas. As já feitas guardam a diária do dia em que foram feitas."

### Gaveta: bloquear datas

Campos (colunas de `bloqueio`): Imóvel, já preenchido quando vem do detalhe · Período, no Seletor de datas, com a mesma checagem de conflito da reserva (R1) · Motivo ("Troca do aquecedor"). Ao salvar, aviso "Datas bloqueadas · Ver na agenda".

## 6. Tarefas

```
Tarefas                                                                     [+ Nova tarefa]
qui, 5 nov · 4 tarefas · 1 atrasada

[‹] [Hoje] [qui, 5 nov] [›]   [Tipo: Todos ▾] [Responsável: Todos ▾] [Imóvel: Todos ▾]

ATRASADAS
 ◇!  Trocar a torneira do banheiro · Studio Vila Madalena  (RS) Rafael Souza      09:00–12:00  Atrasada      ⋯
EM ANDAMENTO
 ◈   Limpeza de saída · Cobertura Moema                    (MT) Marcos Teixeira  11:00–15:00  Em andamento  ⋯
PENDENTES
 ◇   Limpeza de saída · Apto Jardins                       Sem responsável       11:00–15:00  Pendente      ⋯
▸ 1 concluída
```

- **Cabeçalho:** contexto "qui, 5 nov · 4 tarefas · 1 atrasada".
- **Dia:** Seletor de período na variante "dia" (lacuna 2): anterior · Hoje · rótulo · próximo; o rótulo abre o campo de data (lacuna 3).
- **Filtros:** Tipo (Limpeza · Manutenção) · Responsável (as pessoas e "Sem responsável") · Imóvel. Estado não é filtro: os grupos já separam.
- **Grupos**, na ordem do lote B: Atrasadas · Em andamento · Pendentes, cada grupo por horário. As concluídas ficam recolhidas ("1 concluída").
  - Atrasada segue a regra R7 do banco: não concluída e com o prazo vencido; sem prazo, vale o horário agendado. É calculada na hora.
  - A gema de atrasada só vale antes de começar. Uma tarefa em andamento atrasada fica no grupo dela, com o atraso escrito em rubi (lote B).
- **Linha:** o Cartão de tarefa na versão compacta do admin, na ordem do lote B: gema · título e imóvel · responsável, ou "Sem responsável" em texto de atenção · horário (de `agendada_para` até `prazo`) · chip · ⋯.
- **Menu:** Editar · Marcar como… (os dois outros estados) · Excluir. "Marcar como" grava no histórico com o admin como autor (R5) e mostra o aviso com "Desfazer". Só o admin reabre uma tarefa concluída (R5), e é por aqui.
- **Gaveta da tarefa:** tipo, título, imóvel, reserva ligada ("RSV-0005 · saída qui, 5 nov"), horário, responsável, descrição e o histórico (`historico_tarefa`) nas linhas da Atividade recente: "Marcos começou · 11:00", "Marina criou · seg, 2 nov". Rodapé: "Editar".

### Gaveta: nova tarefa e editar tarefa

| Campo | Peça | Regras (colunas de `tarefa`) |
|---|---|---|
| Tipo | Rádio: Limpeza · Manutenção | muda o título sugerido e as pessoas da lista de responsáveis |
| Imóvel | Lista suspensa rica | só imóveis ativos |
| Título | Campo de texto | sugerido: "Limpeza" ou "Manutenção"; até 120 caracteres |
| Reserva ligada | Lista suspensa | opcional, só para limpeza: as reservas do imóvel com saída próxima ("RSV-0012 · saída qua, 11 nov"). Ao escolher, início e prazo seguem a regra R4: o horário de saída e o de entrada do imóvel, no dia da saída |
| Início | Campo data (lacuna 3) + Campo horário | `agendada_para` |
| Prazo | Campo data + Campo horário | opcional; "O prazo não pode ser antes do início." Sugere a próxima entrada do imóvel: "Próxima entrada: sáb, 7 nov, 15:00 · Usar como prazo" |
| Responsável | Lista suspensa rica: avatar, nome e carga do dia ("Marcos · 1 tarefa hoje") | opcional; só pessoas ativas da função do tipo; a primeira opção é "Sem responsável" |
| Descrição | Área de texto | opcional: o que fazer, o material |

## 7. Equipe

```
Equipe                                                          [+ Nova pessoa]
4 pessoas · 3 com tarefas hoje

[Função: Todas ▾]                                           ○ Mostrar desativadas

┌ (MT) Marcos Teixeira          ⋯ ┐  ┌ (JL) Júlia Lima               ⋯ ┐
│ Limpeza                         │  │ Limpeza                         │
│ (11) 98505-6060 · WhatsApp      │  │ (11) 98404-5050 · WhatsApp      │
│ Hoje  ◈   0 de 1                │  │ Hoje  ◆   1 de 1                │
│ Agora: limpando Cobertura Moema │  │ Próxima: dom, 8 nov · Casa Lapa │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

- **Cabeçalho:** contexto "4 pessoas · 3 com tarefas hoje".
- **Filtros:** Função (Limpeza · Manutenção); interruptor "Mostrar desativadas".
- **Grade:** o Cartão de pessoa do lote B, com no mínimo 280px; ordem: nome.
- **Cartão:** abre a gaveta da pessoa, com função, telefone com WhatsApp, e-mail de acesso, e as tarefas de hoje e as próximas em linhas compactas. Rodapé: "Editar". Menu: Nova tarefa para Marcos · Redefinir senha · Desativar.
- **Desativar:** aviso "Acesso de Cida desativado. 4 tarefas futuras ficaram sem responsável.", com "Desfazer" (decisão 5).

### Gaveta: nova pessoa e editar pessoa

| Campo | Regras (colunas de `usuario` e `funcionario`) |
|---|---|
| Nome | até 120 caracteres |
| Função | rádio: Limpeza · Manutenção |
| Telefone | opcional, (00) 00000-0000; é o que liga o WhatsApp |
| E-mail de acesso | único: "Este e-mail já tem acesso ao Gemóvel." |
| Senha inicial | só na pessoa nova; mínimo 8 caracteres, com Mostrar. Dica: "Passe a senha para a pessoa: ela entra com este e-mail e esta senha." (decisão 7) |

**Redefinir senha:** gaveta curta com um campo, "Nova senha", e a mesma dica.

## 8. Busca e menu da conta

- **Resultados da busca:** imóvel abre o Detalhe do imóvel; reserva abre Reservas com a gaveta; hóspede abre a aba Hóspedes com a gaveta. Ações: Nova reserva · Novo imóvel · Nova tarefa · Nova pessoa · Bloquear datas.
- **Menu da conta:** nome e e-mail · Efeitos visuais · Sair (lote B). "Sair" leva a `/entrar`, com a faixa informativa "Você saiu do Gemóvel."

## 9. Visão geral e Agenda: o que muda

- **Visão geral:** ganha o cartão Atividade recente (lote B), numa linha nova depois dos gráficos, em largura cheia.
- **Bloco "Hoje":** o alerta de limpeza sem responsável leva para Tarefas, já filtrada por "Sem responsável".
- **Agenda e "Hoje":** abrem as mesmas gavetas desta seção (detalhe da reserva, nova reserva, bloqueio, tarefa).

## 10. Vazios e erros, tela por tela

| Tela | Primeiro uso | Filtros sem resultado |
|---|---|---|
| Reservas | "Nenhuma reserva ainda. Cadastre a primeira: ela aparece aqui e na agenda." + Nova reserva. Sem imóvel cadastrado: "Cadastre um imóvel antes da primeira reserva." + Novo imóvel | "Nenhuma reserva com esses filtros." + Limpar filtros |
| Hóspedes | "Os hóspedes aparecem aqui quando você cadastra uma reserva." | "Nenhum hóspede com esse nome, telefone ou e-mail." |
| Imóveis | "Nenhum imóvel ainda. Cadastre o primeiro para começar a receber reservas." + Novo imóvel | "Nenhum imóvel com esses filtros." + Limpar filtros |
| Tarefas | "Dia livre: nenhuma tarefa marcada para sex, 6 nov." + Nova tarefa | "Nenhuma tarefa com esses filtros neste dia." + Limpar filtros |
| Equipe | "Ninguém na equipe ainda. Cadastre quem faz a limpeza e a manutenção para atribuir as tarefas." + Nova pessoa | "Ninguém com essa função." + Limpar filtros |
| Detalhe do imóvel | abas vazias: "Nenhuma reserva neste imóvel.", "Nenhuma tarefa marcada.", "Nenhuma data bloqueada." | — |

**Erro ao carregar**, em toda tela: faixa de aviso "Não deu para carregar as reservas." (ou os imóveis, as tarefas…) com "Tentar de novo". Se já havia dados, eles continuam à vista (padrão Estados de dados).

## 11. Checagem pelas heurísticas

| Heurística | Onde | Como a tela resolve |
|---|---|---|
| Visibilidade do estado (Nielsen 1) | salvar, carregar | botão com "Salvando…", esqueleto na primeira carga, aviso ao terminar |
| Linguagem de quem usa (Nielsen 2) | formulário da reserva | "Fechar" no rodapé, porque "Cancelar" se confundiria com cancelar a reserva |
| Controle e liberdade (Nielsen 3) | excluir, cancelar, desativar | "Desfazer" por 10s em vez de pergunta |
| Consistência (Nielsen 4) | todas as listas | mesma ordem de zonas, mesmo lugar da ação principal, mesma gaveta |
| Prevenção de erro (Nielsen 5) | reserva | conflito de datas e lotação avisados enquanto se preenche, antes de salvar |
| Reconhecer em vez de lembrar (Nielsen 6) | hóspede, responsável | escolher numa lista com nome, telefone e carga do dia; nada pede código |
| Lei de Hick | cabeçalhos | uma ação principal por tela, no máximo duas secundárias |

## 12. Lacunas: o que as peças atuais não cobrem

Procurei na Seção 4 do `DESIGN.md` antes de propor, como ela pede. Três necessidades ficaram sem peça, e as três viram variantes de peças que já existem, sem componente novo. Entram no `DESIGN.md` só com o sim de vocês.

| # | Necessidade | Peça mais próxima, e por que não basta | Proposta |
|---|---|---|---|
| 1 | Escolher o hóspede da reserva entre muitos, ou cadastrar um novo sem sair do formulário | Lista suspensa rica: serve até uns 30 itens, e os hóspedes passam disso logo. Busca: já é o combobox certo, mas é a busca geral do topo | variante "no formulário" da Busca: o mesmo comportamento (combobox da APG, ↓/↑, Esc), só com hóspedes, cada resultado com nome e telefone, e a última opção "Cadastrar "Ana Souza"" |
| 2 | Andar dia a dia nas tarefas | Seletor de período: só anda por mês | variante "dia" do Seletor de período, com o botão "Hoje" |
| 3 | Escolher um dia só: início e prazo da tarefa, o rótulo do navegador de dias | Seletor de datas: é para o período da reserva, com as noites ocupadas. Campo: não tem o tipo data | o Campo ganha o tipo "data": o campo de data do sistema (`<input type="date">`) estilizado, como o Seletor de datas já faz no celular |

## 13. Pontos para vocês decidirem

Tenho uma recomendação para cada um. Se concordarem com todas, basta dizer.

| # | Pergunta | Recomendo | Por quê |
|---|---|---|---|
| 1 | Onde ficam os hóspedes | aba "Hóspedes" dentro de Reservas | o hóspede nasce na reserva; um 7º destino na navegação pesa mais do que ajuda |
| 2 | As três variantes do item 12 | aprovar as três | resolvem com peças que já existem |
| 3 | A limpeza da saída, que a regra R4 já cria | nasce pendente e sem responsável; se a saída da reserva mudar, ela vai junto enquanto estiver pendente | o bloco "Hoje" já avisa limpeza sem responsável; a que já começou não deve mudar sozinha |
| 4 | Cancelar reserva | o `status` vira cancelada, com "Desfazer"; a limpeza da saída ainda pendente é apagada junto. A reserva continua acessível pelo filtro de Estado | o banco já tem esse estado; apagar perderia o histórico do hóspede |
| 5 | Desativar uma pessoa | as tarefas futuras ainda pendentes dela ficam sem responsável, e o aviso diz quantas | ninguém fica com tarefa de quem não entra mais |
| 6 | Desativar um imóvel com reservas futuras | não deixa: o item do menu fica desabilitado com o motivo ("há 2 reservas futuras") | evita reserva confirmada num imóvel que sumiu das listas |
| 7 | Senha de quem entra na equipe | quem administra define uma senha inicial e pode redefinir; trocar a própria senha fica para depois | o sistema não envia e-mail; é o caminho mais curto para a v1 |

## 14. O que as telas pedem do back-end

Serve para a arquitetura e para a Etapa 2 (13/11). Ela pede cadastrar e listar: a coluna "Lê" e o "criar" de cada linha bastam para ela, e o resto entra até a entrega final.

| Tela | Lê | Grava |
|---|---|---|
| Entrar | — | entrar (e-mail e senha → perfil), sair |
| Reservas | reservas do período, com hóspede, imóvel e estado; uma reserva, com a limpeza da saída; conflito de imóvel e datas (R1) | criar (com o hóspede novo, quando pedido, e a limpeza da saída, R4), editar (a limpeza pendente vai junto), cancelar (apaga a limpeza pendente) |
| Hóspedes | hóspedes com o número de reservas e a última | criar, editar, excluir (sem reservas) |
| Imóveis e detalhe | imóveis com a prontidão de hoje, a próxima entrada e a ocupação do mês; um imóvel com KPIs, reservas, tarefas e bloqueios | criar, editar, desativar e reativar; criar e excluir bloqueio |
| Tarefas | tarefas de um dia, com imóvel, responsável e atraso (R7); uma tarefa, com o histórico | criar, editar, mudar o estado (grava o histórico, R5), excluir (o histórico vai junto) |
| Equipe | pessoas com as tarefas de hoje e a atual; quantas tarefas futuras pendentes cada uma tem | criar (`usuario` + `funcionario`, senha só com hash, R8), editar, redefinir a senha, desativar (tira o responsável das tarefas futuras pendentes) e reativar |
| Visão geral | o que o protótipo já usa, mais os 8 últimos registros do histórico | — |

## 15. O que muda no `DESIGN.md` (só gravo com o sim de vocês)

- **Seção 4, Modelos:** "Listas e detalhes do admin" passa a especificado, apontando para este documento. A Visão geral ganha a Atividade recente.
- **Seção 4, Componentes:** a Busca ganha a variante "no formulário"; o Seletor de período, a variante "dia"; o Campo, o tipo "data".
- **Seção 4, Estados que faltam:** sai "Sessão — sem permissão", resolvido no item 3.
- **Seção 9:** sai a pergunta "Atrasada": vale a regra R7 do banco (não concluída e com o prazo vencido; sem prazo, o horário agendado), calculada na hora. A gema segue a regra do lote B.
- **Parte 3 (lote B), Cartão de imóvel:** "Limpeza atrasada" passa a dizer "a limpeza da saída passou do prazo (R7)", igual ao banco.

Depois disso, o próximo passo é a arquitetura do front-end. As seções do celular continuam no fim.
