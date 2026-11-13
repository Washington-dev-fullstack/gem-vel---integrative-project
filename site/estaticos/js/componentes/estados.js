// Estados de dados: esqueleto na primeira carga, vazio com a primeira ação e erro em faixa.

import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";
import {mostrarFaixa} from "./faixa.js";

export function esqueleto(area, linhas = 8) {
  renderizar(area, html`<div class="esqueleto" role="status">
    <span class="visualmente-oculto">Carregando…</span>
    ${Array.from({length: linhas}, (_, i) => html`<div class="esqueleto__linha" style="--i: ${i}"><span></span><span></span><span></span></div>`)}
  </div>`);
}

export function vazio(area, {texto, detalhe = null, acao = null}) {
  renderizar(area, html`<div class="vazio">
    ${icone("gema-bruta", {tamanho: 24, classe: "vazio__gema"})}
    <p class="vazio__texto">${texto}</p>
    ${detalhe ? html`<p class="vazio__detalhe">${detalhe}</p>` : ""}
    ${acao ? html`<button type="button" class="botao botao--secundario vazio__acao">${acao.rotulo}</button>` : ""}
  </div>`);
  if (acao) area.querySelector(".vazio__acao").addEventListener("click", acao.fazer);
}

// O erro não apaga o que já está na tela: a faixa entra por cima. Só o esqueleto sai.
export function erro(area, {mensagem, tentarDeNovo}) {
  area.querySelector(":scope > .esqueleto")?.remove();
  return mostrarFaixa(area, {mensagem, tentarDeNovo});
}
