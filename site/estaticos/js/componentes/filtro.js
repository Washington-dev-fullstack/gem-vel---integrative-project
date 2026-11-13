// Filtro com painel (lote B §5): o botão abre um popover com as escolhas, e cada mudança vale na
// hora. O botão é o invocador nativo do popover: abre, fecha e devolve o foco sem código nosso.

import {html} from "../nucleo/html.js";
import {posicionarJunto} from "./menu.js";

let contador = 0;

/**
 * Liga um botão `.filtro` ao painel. `montar(painel)` desenha o conteúdo toda vez que ele abre,
 * para mostrar sempre o que está na URL. Devolve {painel, fechar(), rotular(valor, ativo)}.
 */
export function ligarFiltro(botao, {rotulo, montar}) {
  const painel = document.createElement("div");
  painel.className = "painel-filtro";
  painel.id = `filtro-${++contador}`;
  painel.popover = "auto";
  painel.setAttribute("role", "dialog");
  painel.setAttribute("aria-label", rotulo);
  document.body.append(painel);
  botao.popoverTargetElement = painel;
  painel.addEventListener("beforetoggle", (evento) => {
    if (evento.newState === "open") montar(painel);
  });
  painel.addEventListener("toggle", (evento) => {
    if (evento.newState !== "open") return;
    posicionarJunto(painel, botao);
    (painel.querySelector("input:checked") ?? painel.querySelector("input, button"))?.focus();
  });
  return {
    painel,
    fechar() {
      if (painel.matches(":popover-open")) painel.hidePopover();
    },
    rotular(valor, ativo) {
      botao.querySelector(".filtro__valor").textContent = valor;
      botao.toggleAttribute("data-ativo", ativo);
    },
  };
}

/** As escolhas do painel: caixas (várias) ou rádios (uma), com a contagem à direita. */
export function escolhas({nome, legenda, opcoes, marcadas, tipo = "checkbox"}) {
  return html`<fieldset class="painel-filtro__opcoes"><legend class="visualmente-oculto">${legenda}</legend>
    ${opcoes.map((opcao) => html`<label class="escolha">
      <input type="${tipo}" name="${nome}" value="${opcao.valor}" ${marcadas.includes(String(opcao.valor)) ? "checked" : ""}>
      <span>${opcao.rotulo}</span>
      ${opcao.contagem === undefined ? "" : html`<span class="escolha__contagem numero">${opcao.contagem}</span>`}</label>`)}
  </fieldset>`;
}
