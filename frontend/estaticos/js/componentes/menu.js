// Menu de ações (lote B §13): botão de menu da APG, num popover que cresce a partir do botão.

import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";

let contador = 0;

function montar(menu, itens) {
  renderizar(menu, html`${itens.map((item, i) => {
    if (item.separador) return html`<div class="menu__separador" role="separator"></div>`;
    if (item.cabecalho) return html`<div class="menu__cabecalho">${item.cabecalho}</div>`;
    const classes = item.perigo ? "menu__item menu__item--perigo" : "menu__item";
    const rotulo = item.desabilitado ? `${item.rotulo} (${item.desabilitado})` : item.rotulo;
    return html`<button type="button" role="menuitem" class="${classes}" data-indice="${i}" tabindex="-1"
      ${item.desabilitado ? html`aria-disabled="true"` : ""}>${item.icone ? icone(item.icone) : ""}<span>${rotulo}</span></button>`;
  })}`);
}

/** Prende um popover ao botão que o abriu: embaixo e à esquerda; vira para cima ou para a direita sem espaço. */
export function posicionarJunto(menu, botao) {
  const caixa = botao.getBoundingClientRect();
  const largura = menu.offsetWidth;
  const altura = menu.offsetHeight;
  const margem = 8;
  const alinharDireita = caixa.left + largura > innerWidth - margem;
  const abrirParaCima = caixa.bottom + 4 + altura > innerHeight - margem && caixa.top - 4 - altura > margem;
  const esquerda = alinharDireita ? Math.max(margem, caixa.right - largura) : caixa.left;
  const topo = abrirParaCima ? caixa.top - 4 - altura : caixa.bottom + 4;
  Object.assign(menu.style, {left: `${Math.round(esquerda)}px`, top: `${Math.round(topo)}px`});
  menu.style.setProperty("--origem", `${alinharDireita ? "right" : "left"} ${abrirParaCima ? "bottom" : "top"}`);
  menu.style.setProperty("--desloca", abrirParaCima ? "4px" : "-4px");
}

export function ligarMenu(botao, itensIniciais) {
  let itens = itensIniciais;
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.id = `menu-${++contador}`;
  menu.setAttribute("role", "menu");
  menu.popover = "auto";
  document.body.append(menu);
  botao.setAttribute("aria-haspopup", "menu");
  botao.setAttribute("aria-expanded", "false");
  botao.setAttribute("aria-controls", menu.id);
  montar(menu, itens);

  const opcoes = () => [...menu.querySelectorAll('[role="menuitem"]')];
  const focar = (i) => {
    const lista = opcoes();
    if (!lista.length) return;
    lista[(i + lista.length) % lista.length].focus();
  };
  const abrir = (onde = 0) => {
    if (!menu.matches(":popover-open")) {
      menu.showPopover();
      posicionarJunto(menu, botao);
    }
    botao.setAttribute("aria-expanded", "true");
    focar(onde === "ultimo" ? -1 : onde);
  };
  const fechar = ({devolverFoco = true} = {}) => {
    if (menu.matches(":popover-open")) menu.hidePopover();
    botao.setAttribute("aria-expanded", "false");
    if (devolverFoco) botao.focus();
  };

  // O toggle cobre o fechar por fora (clique fora, outro popover); lê o estado de agora, não o do evento.
  menu.addEventListener("toggle", () => {
    const aberto = menu.matches(":popover-open");
    botao.setAttribute("aria-expanded", String(aberto));
    if (!aberto && menu.contains(document.activeElement)) botao.focus();
  });
  botao.addEventListener("click", () => (menu.matches(":popover-open") ? fechar() : abrir(0)));
  botao.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowDown") { evento.preventDefault(); abrir(0); }
    if (evento.key === "ArrowUp") { evento.preventDefault(); abrir("ultimo"); }
  });
  menu.addEventListener("keydown", (evento) => {
    const lista = opcoes();
    const atual = lista.indexOf(document.activeElement);
    if (evento.key === "ArrowDown") { evento.preventDefault(); focar(atual + 1); }
    else if (evento.key === "ArrowUp") { evento.preventDefault(); focar(atual - 1); }
    else if (evento.key === "Home") { evento.preventDefault(); focar(0); }
    else if (evento.key === "End") { evento.preventDefault(); focar(-1); }
    else if (evento.key === "Escape") { evento.preventDefault(); fechar(); }
    else if (evento.key === "Tab") { fechar({devolverFoco: false}); }
    else if (evento.key.length === 1 && /\S/.test(evento.key)) {
      const letra = evento.key.toLocaleLowerCase("pt-BR");
      const ordem = [...lista.slice(atual + 1), ...lista.slice(0, atual + 1)];
      ordem.find((item) => item.textContent.trim().toLocaleLowerCase("pt-BR").startsWith(letra))?.focus();
    }
  });
  menu.addEventListener("click", (evento) => {
    const botaoItem = evento.target.closest('[role="menuitem"]');
    if (!botaoItem || botaoItem.getAttribute("aria-disabled") === "true") return;
    const item = itens[Number(botaoItem.dataset.indice)];
    fechar();
    item.fazer?.();
  });
  addEventListener("resize", () => fechar({devolverFoco: false}));

  return {
    elemento: menu,
    abrir,
    fechar,
    atualizar(novos) {
      itens = novos;
      montar(menu, itens);
    },
  };
}
