// Peças pequenas que todas as telas montam: ícone, gema, chip, avatar e a troca de texto com desfoque.

import {html} from "../nucleo/html.js";
import {podeAnimar} from "../nucleo/nivel.js";

const SPRITE = "/estaticos/icones.svg";

export function icone(id, {tamanho = 16, classe = ""} = {}) {
  const classes = ["icone", tamanho === 16 ? "" : `icone--${tamanho}`, classe].filter(Boolean).join(" ");
  return html`<svg class="${classes}" aria-hidden="true" focusable="false"><use href="${SPRITE}#${id}"></use></svg>`;
}

const DESENHO_DA_GEMA = {pendente: "gema-bruta", em_andamento: "gema-lapidando", concluida: "gema-lapidada", atrasada: "gema-atrasada"};

export const ROTULO_DO_ESTADO = {pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", atrasada: "Atrasada"};

// O estado que a pessoa vê: a tarefa pendente que passou do horário aparece como atrasada (R7).
export function estadoVisivel(tarefa) {
  return tarefa.status === "pendente" && tarefa.atrasada ? "atrasada" : tarefa.status;
}

export function gema(estado, {tamanho = 16} = {}) {
  return icone(DESENHO_DA_GEMA[estado] ?? "gema-bruta", {tamanho, classe: `gema gema--${estado}`});
}

export function chip(estado, rotulo = ROTULO_DO_ESTADO[estado]) {
  return html`<span class="chip chip--${estado}">${gema(estado)}<span class="chip__rotulo">${rotulo}</span></span>`;
}

export function iniciais(nome) {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  const [primeira, ...resto] = partes;
  return (primeira[0] + (resto.length ? resto[resto.length - 1][0] : "")).toUpperCase();
}

export function avatar(nome, {tamanho = "md"} = {}) {
  return html`<span class="avatar avatar--${tamanho}" aria-hidden="true">${iniciais(nome)}</span>`;
}

// O texto que cada elemento deve mostrar no fim da troca em andamento.
const textoPedido = new WeakMap();

// O texto velho sai subindo com desfoque e o novo entra de baixo (DESIGN.md §10, item 8).
// Uma troca pedida no meio de outra só atualiza o destino: vale sempre o último texto pedido.
export async function trocarTexto(elemento, texto) {
  if (!elemento) return;
  const emAndamento = textoPedido.has(elemento);
  textoPedido.set(elemento, texto);
  if (emAndamento) return;
  if (elemento.textContent === texto || !podeAnimar() || !elemento.animate) {
    elemento.textContent = texto;
    textoPedido.delete(elemento);
    return;
  }
  const curva = "cubic-bezier(.23, 1, .32, 1)";
  await elemento.animate([{opacity: 1, transform: "none", filter: "blur(0)"},
    {opacity: 0, transform: "translateY(-4px)", filter: "blur(4px)"}], {duration: 100, easing: curva}).finished.catch(() => {});
  elemento.textContent = textoPedido.get(elemento);
  textoPedido.delete(elemento);
  elemento.animate([{opacity: 0, transform: "translateY(4px)", filter: "blur(4px)"},
    {opacity: 1, transform: "none", filter: "blur(0)"}], {duration: 100, easing: curva});
}
