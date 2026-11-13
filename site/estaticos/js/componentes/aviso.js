// Aviso (toast) e o envio adiado do "Desfazer em vez de confirmar" (lote B §17).
// Nada aqui toca no document ao ser importado: o Node também importa este módulo.

import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";

const MAXIMO = 3;
const SIMPLES = 5000;
const COM_ACAO = 10000;
const visiveis = [];
let atalhoLigado = false;

function regiao(seletor, criar) {
  let elemento = document.querySelector(seletor);
  if (!elemento) {
    elemento = criar();
    document.body.append(elemento);
  }
  return elemento;
}

function pilha() {
  return regiao("[data-avisos]", () => {
    const caixa = document.createElement("div");
    caixa.className = "avisos";
    caixa.dataset.avisos = "";
    caixa.popover = "manual";
    return caixa;
  });
}

// A pilha é um popover manual: fica na camada de cima, por cima até da gaveta aberta. Com um
// diálogo aberto, reabre para passar à frente dele.
function mostrarPilha(caixa) {
  if (!caixa.showPopover) return;
  const aberta = caixa.matches(":popover-open");
  if (aberta && !document.querySelector("dialog[open]")) return;
  if (aberta) caixa.hidePopover();
  caixa.showPopover();
}

function esconderPilhaVazia(caixa) {
  if (!caixa.querySelector(".aviso:not(.aviso--saindo)") && caixa.matches?.(":popover-open")) caixa.hidePopover();
}

function leitor() {
  return regiao("[data-avisos-leitor]", () => {
    const p = document.createElement("p");
    p.className = "visualmente-oculto";
    p.setAttribute("role", "status");
    p.dataset.avisosLeitor = "";
    return p;
  });
}

// ⌘/Ctrl Z desfaz o aviso mais novo que tem "Desfazer", fora dos campos de texto.
function ligarAtalho() {
  if (atalhoLigado) return;
  atalhoLigado = true;
  document.addEventListener("keydown", (evento) => {
    if (!(evento.ctrlKey || evento.metaKey) || evento.key.toLowerCase() !== "z" || evento.shiftKey) return;
    if (evento.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const ultimo = [...visiveis].reverse().find((aviso) => aviso.desfazer);
    if (!ultimo) return;
    evento.preventDefault();
    ultimo.desfazer();
  });
}

/**
 * Mostra um aviso. Simples some em 5s e pausa ao apontar ou focar; com ação ("Desfazer") some em
 * 10s, junto com o envio adiado, e por isso não pausa; `fixo` fica até a pessoa agir.
 */
export function avisar(texto, {acao = null, tom = null, fixo = false} = {}) {
  ligarAtalho();
  const elemento = document.createElement("div");
  elemento.className = tom ? `aviso aviso--${tom}` : "aviso";
  const duracao = fixo ? null : acao ? COM_ACAO : SIMPLES;
  renderizar(elemento, html`
    <p class="aviso__texto">${texto}</p>
    ${acao ? html`<button type="button" class="botao botao--sm botao--fantasma aviso__acao">${acao.rotulo}</button>` : ""}
    <button type="button" class="botao botao--sm botao--icone botao--fantasma aviso__fechar" aria-label="Fechar aviso">${icone("fechar")}</button>
    ${acao && duracao ? html`<span class="aviso__tempo" style="--duracao: ${duracao}ms" aria-hidden="true"></span>` : ""}`);

  let restante = duracao;
  let inicio = 0;
  let relogio = null;
  const correr = () => {
    if (!restante || relogio) return;
    inicio = Date.now();
    relogio = setTimeout(fechar, restante);
  };
  const pausar = () => {
    if (!relogio) return;
    clearTimeout(relogio);
    relogio = null;
    restante -= Date.now() - inicio;
  };
  const aoEsconderAba = () => (document.hidden ? pausar() : correr());

  const registro = {fechar, desfazer: null};
  function fechar() {
    clearTimeout(relogio);
    relogio = null;
    document.removeEventListener("visibilitychange", aoEsconderAba);
    const i = visiveis.indexOf(registro);
    if (i >= 0) visiveis.splice(i, 1);
    elemento.classList.add("aviso--saindo");
    setTimeout(() => {
      const caixa = elemento.parentElement;
      elemento.remove();
      if (caixa) esconderPilhaVazia(caixa);
    }, 240);
  }

  if (acao) {
    registro.desfazer = () => {
      fechar();
      acao.fazer();
    };
    elemento.querySelector(".aviso__acao").addEventListener("click", registro.desfazer);
  } else if (duracao) {
    elemento.addEventListener("pointerenter", pausar);
    elemento.addEventListener("pointerleave", correr);
    elemento.addEventListener("focusin", pausar);
    elemento.addEventListener("focusout", correr);
    document.addEventListener("visibilitychange", aoEsconderAba);
  }
  elemento.querySelector(".aviso__fechar").addEventListener("click", fechar);

  const caixa = pilha();
  caixa.append(elemento);
  mostrarPilha(caixa);
  visiveis.push(registro);
  if (visiveis.length > MAXIMO) visiveis[0].fechar();
  leitor().textContent = acao ? `${texto} ${acao.rotulo} disponível.` : texto;
  correr();
  return registro;
}

/**
 * Adia um envio por `espera` ms. Se a página fechar antes, envia na hora com keepalive;
 * desfazer() cancela. Nunca envia duas vezes.
 */
export function adiarEnvio(funcao, {espera = COM_ACAO, alvo = globalThis} = {}) {
  let feito = false;
  let relogio = null;
  const encerrar = () => {
    feito = true;
    clearTimeout(relogio);
    alvo.removeEventListener("pagehide", aoSair);
  };
  const enviar = (keepalive) => {
    if (feito) return;
    encerrar();
    funcao({keepalive});
  };
  function aoSair() {
    enviar(true);
  }
  relogio = setTimeout(() => enviar(false), espera);
  alvo.addEventListener("pagehide", aoSair);
  return {
    desfazer() {
      if (feito) return false;
      encerrar();
      return true;
    },
  };
}
