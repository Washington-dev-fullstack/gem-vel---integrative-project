// Menu de ações (lote B §13): botão de menu da APG, num popover que cresce a partir do botão.

import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";

let contador = 0;
let escutandoTamanho = false;
const seguindo = new WeakMap();

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

/**
 * Prende um popover ao botão que o abriu: embaixo e à esquerda; vira para cima ou para a direita sem espaço.
 * Aberto, ele segue o botão quando a página ou a gaveta rola (o topo sai do lugar no celular e abaixo da
 * faixa da demonstração), deslizando até ele em 200ms (o translate do menu.css); se o botão sai da tela, fecha.
 */
export function posicionarJunto(menu, botao) {
  seguindo.get(menu)?.abort();
  menu.style.translate = "";
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

  const parar = new AbortController();
  seguindo.set(menu, parar);
  let quadro = 0;
  const seguir = () => {
    quadro ||= requestAnimationFrame(() => {
      quadro = 0;
      const agora = botao.getBoundingClientRect();
      if (!botao.isConnected || agora.bottom < 0 || agora.top > innerHeight) {
        if (menu.matches(":popover-open")) menu.hidePopover();
        return;
      }
      menu.style.translate = `${Math.round(agora.left - caixa.left)}px ${Math.round(agora.top - caixa.top)}px`;
    });
  };
  document.addEventListener("scroll", seguir, {capture: true, passive: true, signal: parar.signal});
  menu.addEventListener("toggle", (evento) => {
    if (evento.newState !== "closed") return;
    parar.abort();
    cancelAnimationFrame(quadro);
  }, {signal: parar.signal});
}

export function ligarMenu(botao, itensIniciais) {
  let itens = itensIniciais;
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.id = `menu-${++contador}`;
  menu.setAttribute("role", "menu");
  menu.popover = "auto";
  // Dentro de uma gaveta (dialog modal), o menu mora nela: fora, ele ficaria inerte. Os menus de
  // botões que já saíram da tela (a lista foi redesenhada) saem junto.
  const lugar = botao.closest("dialog") ?? document.body;
  for (const velho of lugar.querySelectorAll(":scope > .menu")) {
    if (!document.querySelector(`[aria-controls="${velho.id}"]`)) velho.remove();
  }
  lugar.append(menu);
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
    if (!aberto && menu.contains(document.activeElement)) botao.focus({preventScroll: true});
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
  if (!escutandoTamanho) {
    escutandoTamanho = true;
    addEventListener("resize", () => document.querySelectorAll(".menu:popover-open").forEach((aberto) => aberto.hidePopover()));
  }

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
