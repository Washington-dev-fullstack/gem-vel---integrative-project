# Gemóvel — App da equipe: Minhas tarefas

> Seção de telas do app da equipe: a pessoa da limpeza ou da manutenção, no celular (375px), vendo e atualizando as próprias tarefas do dia. No computador e no tablet, a mesma tela numa coluna central. **Aprovada pela dupla em 13 nov 2026.**

- **Base:**
  - `DESIGN.md` v0.4: tema Quartzo (claro), nível de efeitos no máximo Padrão, sem GSAP; texto de 16px e alvos de 48px.
  - Lote B: Cartão de tarefa grande (§9), Avanço de estado (§12), Aviso com Desfazer (§17), Faixa de aviso, Esqueleto, Menu de ações (§13).
  - API pronta: `GET /api/minhas-tarefas?dia=` (as tarefas da pessoa no dia, com o endereço e as observações do imóvel), `POST /api/tarefas/<id>/estado`, `POST /api/tarefas/<id>/desfazer` (até 10s depois) e `DELETE /api/sessao`.
- **Endereço:** `/minhas-tarefas`, com o dia na URL (`?dia=2026-11-14`; sem `dia`, hoje). Quem entra com perfil de equipe cai aqui; o admin que abrir o endereço volta para o painel.
- **Fora desta seção:** o modo sem internet (guardar a mudança e mandar depois) e a barra de navegação inferior, que só faz sentido quando houver um segundo destino (item 7).

---

## 1. A tela

```
┌───────────────────────────────┐
│ Gemóvel                  (CR) │  marca pequena · avatar abre o menu da conta
│                               │
│ Bom dia, Cida.                │  display (Bodoni 500), uma linha
│ Sex, 13 nov · 3 tarefas,      │  text-sm muted; vira "Tudo pronto por hoje."
│ 1 concluída                   │  quando não sobra nada aberto
│                               │
│ ‹  Hoje  13 nov  ›            │  seletor de dia (o mesmo da tela Tarefas)
│                               │
│ ATRASADAS                     │  título de grupo (mono, caixa alta)
│ ┌───────────────────────────┐ │
│ │ cartão de tarefa (§2)     │ │
│ └───────────────────────────┘ │
│ EM ANDAMENTO                  │
│ PENDENTES                     │
│ ▸ 1 concluída                 │  grupo recolhido; abre com um toque
└───────────────────────────────┘
```

- **Ordem:** atrasadas, em andamento e pendentes, cada grupo pelo horário; o grupo vazio não aparece. As concluídas ficam no fim, num grupo recolhido ("3 concluídas").
- **A tarefa que a pessoa acabou de concluir fica onde está** até a próxima carga da tela: o foco e o Desfazer precisam dela à vista. Ela só desce para o grupo recolhido quando a tela recarrega ou o dia muda.
- **Outro dia:** as setas do seletor mostram ontem e amanhã, e o botão "Hoje" volta. Num dia que não é hoje, o Avanço continua valendo (o servidor decide o que pode).
- **Menu da conta:** o nome da pessoa e "Sair". Sair encerra a sessão e volta para Entrar.

## 2. Cartão de tarefa (lote B §9, grande)

```
┌─────────────────────────────────────┐
│ ◇ Pendente              11:00–15:00 │  gema grande + chip + janela (agendada–prazo)
│ Limpeza · Casa da Praia             │  text-lg 600: tipo · imóvel
│ Limpeza de saída                    │  o título da tarefa, text-sm muted
│ ┌─────────────────────────────────┐ │
│ │ ▶  Começar limpeza              │ │  Avanço de estado (§3), 48px
│ └─────────────────────────────────┘ │
│ Ver detalhes ▾                      │  abre no próprio cartão
└─────────────────────────────────────┘
```

- **Janela de horário:** "11:00–15:00" quando a tarefa tem prazo; só "11:00" quando não tem.
- **Linha de estado** (entre o título e o botão):

  | Estado | Gema | Botão | Linha |
  |---|---|---|---|
  | Pendente | pedra bruta | "Começar limpeza" | — |
  | Atrasada (ainda não começou) | pedra bruta com "!", rubi | "Começar limpeza" | "Atrasada · o prazo era 12:00", em rubi |
  | Em andamento | contorno âmbar | "Concluir limpeza" | "Começou às 11:05" (e, se passou do prazo, "· atrasada" em rubi) |
  | Concluída | lapidada esmeralda | nenhum | "Concluída às 12:40" |

  Na manutenção, os verbos são "Começar manutenção" e "Concluir manutenção".
- **Ver detalhes:** abre no próprio cartão, sem trocar de tela:
  - o endereço completo, com "Abrir no mapa" (abre o mapa do celular numa aba nova);
  - a descrição da tarefa, quando há;
  - as observações do imóvel (senha do portão, onde fica a chave), quando há.
- **Leitor de tela:** o cartão é um `<article>` com o título como nome; o botão é descrito pelo título ("Começar limpeza, Limpeza · Casa da Praia").

## 3. Avanço de estado (lote B §12, com os tempos da v0.4)

- **Ao tocar:** o botão vira "Começando…" ou "Concluindo…" com o indicador, sem mudar de largura; toques repetidos são ignorados até a resposta.
- **Com a resposta, a gema se lapida:** pendente → em andamento em `dur-moderate` (300ms, `ease-entrance`); em andamento → concluída em `dur-slow` (400ms), com o brilho que atravessa uma vez; no fim, um pulo de escala (`ease-pop`).
- **Aviso:** "Limpeza da Casa da Praia em andamento." ou "… concluída.", com "Desfazer" por 10s. Desfazer volta o estado anterior com um fade simples, sem o pulo.
- **Ao concluir:** o celular vibra 15ms (Android; o iPhone ignora).
- **Foco e região viva:**
  - em andamento: o foco fica no botão, que agora diz "Concluir limpeza"; a região viva anuncia "Limpeza da Casa da Praia em andamento";
  - concluída: o botão sai e o foco vai para a linha "Concluída às 12:40" (`tabindex="-1"`); a região viva anuncia "Limpeza da Casa da Praia concluída".
- **Se falhar:** a gema não muda, o botão volta ao normal e o cartão mostra a faixa "Não deu para salvar. Confira a internet." com "Tentar de novo".
- **Movimento reduzido:** a gema troca de estado com um fade de 140ms (`dur-fast`), sem desenho e sem pulo.

## 4. Estados da tela

| Situação | O que aparece |
|---|---|
| Carregando | esqueleto facetado no formato de dois cartões |
| Dia sem tarefas (hoje) | gema lapidada + "Nenhuma tarefa para hoje." + "Quando alguém marcar uma tarefa para você, ela aparece aqui." |
| Dia sem tarefas (outro dia) | "Nenhuma tarefa em sáb, 14 nov." |
| Tudo concluído | a linha de contexto diz "Tudo pronto por hoje."; as concluídas ficam no grupo recolhido, aberto |
| Erro ao carregar | faixa "Não deu para carregar suas tarefas." + "Tentar de novo"; o que já estava na tela fica |
| Sem internet | a faixa global de sempre ("Sem internet…"); o Avanço tenta e, se falhar, mostra a faixa do cartão |
| Sessão expirada | o aviso de sessão expirada do admin, que leva de volta para Entrar |

## 5. Tamanhos

| Faixa | Layout |
|---|---|
| Celular (≤760px) | margem de 16px; cartões na largura toda, 12px entre eles; o topo rola junto (não fica preso) |
| Tablet e computador (≥761px) | a mesma tela numa coluna central de 560px; o seletor de dia vai para a direita da saudação |

- **Nível de efeitos:** no máximo Padrão (cartão de vidro leve); no Leve, o cartão é sólido. O Completo não vale no app da equipe.

## 6. Checagem rápida pelas heurísticas

- **Estado do sistema à vista:** a gema, o chip e a linha de estado dizem onde cada tarefa está; o botão diz o próximo passo com verbo e objeto.
- **Prevenir erro e desfazer:** sem diálogo de confirmação; o Desfazer de 10s cobre o toque errado.
- **Reconhecer em vez de lembrar:** endereço e observações a um toque, no próprio cartão.
- **Alvos e sol:** 48px, contraste do Quartzo (texto 18,5:1), status com forma e rótulo, nunca só cor.

## 7. Decisões para o sim

1. Uma tela só (Minhas tarefas), com o detalhe aberto no próprio cartão. Sem barra inferior por enquanto.
2. A tarefa concluída fica no lugar até a próxima carga, para o foco e o Desfazer.
3. O seletor de dia deixa ver ontem e amanhã.
4. "Abrir no mapa" usa o endereço do imóvel num link de mapa, numa aba nova.
5. O modo sem internet fica para depois da entrega de 17/11: por enquanto, o Avanço tenta e mostra a falha.
