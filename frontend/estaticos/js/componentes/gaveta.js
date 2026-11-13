// Gaveta (lote B §14): detalhe e formulário num <dialog>, aberta e fechada pelo endereço.

import {html, renderizar} from "../nucleo/html.js";
import {abrirGaveta, aoMudar, fecharGaveta, lerEstado, preenchimento} from "../nucleo/url.js";
import {icone} from "./pecas.js";
import {esqueleto} from "./estados.js";
import {mostrarFaixa} from "./faixa.js";

let dialogo = null;
let tipos = {};
let versao = 0;
let mudou = false;
let quemAbriu = null;
let descarte = null;

function partes() {
  return {
    voltar: dialogo.querySelector("[data-gaveta-voltar]"),
    titulo: dialogo.querySelector("#gaveta-titulo"),
    contexto: dialogo.querySelector("[data-gaveta-contexto]"),
    ferramentas: dialogo.querySelector("[data-gaveta-ferramentas]"),
    corpo: dialogo.querySelector("[data-gaveta-corpo]"),
  };
}

function criarDialogo() {
  const d = document.createElement("dialog");
  d.className = "gaveta";
  d.setAttribute("aria-labelledby", "gaveta-titulo");
  renderizar(d, html`
    <header class="gaveta__cabecalho">
      <div class="gaveta__titulos">
        <div data-gaveta-voltar></div>
        <h2 class="gaveta__titulo display-md" id="gaveta-titulo" tabindex="-1"></h2>
        <div class="gaveta__contexto" data-gaveta-contexto></div>
      </div>
      <div class="gaveta__ferramentas" data-gaveta-ferramentas></div>
      <button type="button" class="botao botao--icone botao--fantasma" data-gaveta-fechar aria-label="Fechar">${icone("fechar", {tamanho: 20})}</button>
    </header>
    <div class="gaveta__corpo" data-gaveta-corpo></div>`);
  document.body.append(d);
  d.addEventListener("cancel", (evento) => {
    evento.preventDefault();
    pedirFechar();
  });
  d.addEventListener("click", (evento) => {
    if (evento.target.closest("[data-gaveta-fechar]")) {
      pedirFechar();
      return;
    }
    if (evento.target !== d) return;
    const caixa = d.getBoundingClientRect();
    const fora = evento.clientX < caixa.left || evento.clientX > caixa.right || evento.clientY < caixa.top || evento.clientY > caixa.bottom;
    if (fora) pedirFechar();
  });
  d.addEventListener("input", () => {
    if (d.querySelector("form")) mudou = true;
  });
  d.addEventListener("gemovel:salvo", () => {
    mudou = false;
  });
  return d;
}

function criarDescarte() {
  const d = document.createElement("dialog");
  d.className = "dialogo";
  d.setAttribute("role", "alertdialog");
  d.setAttribute("aria-labelledby", "descartar-titulo");
  d.setAttribute("aria-describedby", "descartar-texto");
  renderizar(d, html`<form method="dialog">
    <h2 class="dialogo__titulo" id="descartar-titulo">Descartar as mudanças?</h2>
    <p class="dialogo__texto" id="descartar-texto">O que você preencheu neste formulário vai se perder.</p>
    <div class="dialogo__botoes">
      <button class="botao botao--perigo" value="descartar">Descartar</button>
      <button class="botao botao--primario" value="continuar" autofocus>Continuar editando</button>
    </div>
  </form>`);
  document.body.append(d);
  return d;
}

function confirmarDescarte() {
  descarte ??= criarDescarte();
  return new Promise((resolver) => {
    descarte.returnValue = "continuar";
    descarte.addEventListener("close", () => resolver(descarte.returnValue === "descartar"), {once: true});
    descarte.showModal();
  });
}

export async function pedirFechar() {
  if (mudou && !(await confirmarDescarte())) return;
  mudou = false;
  fecharGaveta();
}

function fecharDialogo() {
  dialogo.dataset.chave = "";
  mudou = false;
  if (!dialogo.open) return;
  dialogo.close();
  if (quemAbriu?.isConnected) quemAbriu.focus();
  else document.querySelector("#conteudo")?.focus();
  quemAbriu = null;
}

function focarInicio(formulario) {
  const {titulo, corpo} = partes();
  // No detalhe o foco vai ao título; `false ?? titulo` daria false, por isso o ternário.
  const primeiro = formulario ? corpo.querySelector("input:not([type=hidden]):not([disabled]), select, textarea") : null;
  (primeiro ?? titulo).focus();
}

async function sincronizar(gaveta, {forcar = false} = {}) {
  const chave = gaveta ? `${gaveta.tipo}:${gaveta.id}:${gaveta.editar}` : "";
  if (!forcar && chave === (dialogo.dataset.chave ?? "")) return;
  const minha = ++versao;
  const definicao = gaveta && tipos[gaveta.tipo];
  if (!definicao) {
    fecharDialogo();
    return;
  }
  const formulario = gaveta.editar || gaveta.id === "nova" || gaveta.id === "novo";
  const {voltar, titulo, contexto, ferramentas, corpo} = partes();
  dialogo.dataset.chave = chave;
  dialogo.dataset.tipo = gaveta.tipo;
  mudou = false;
  if (!dialogo.open) {
    quemAbriu = document.activeElement;
    dialogo.showModal();
  }
  voltar.textContent = "";
  titulo.textContent = "";
  contexto.textContent = "";
  ferramentas.textContent = "";
  esqueleto(corpo, 6);
  try {
    const preencher = preenchimento() ?? {};
    const conteudo = await (formulario ? definicao.formulario(gaveta.id, preencher) : definicao.detalhe(gaveta.id, preencher));
    if (minha !== versao) return;
    // De uma gaveta para outra ("← Reserva RSV-0012"): {tipo, id, rotulo} em preencher.voltarPara.
    const volta = conteudo.voltarPara ?? preencher.voltarPara;
    if (volta) {
      renderizar(voltar, html`<a class="gaveta__voltar" href="?${volta.tipo}=${volta.id}">${icone("voltar")}${volta.rotulo}</a>`);
      voltar.firstElementChild.addEventListener("click", (evento) => {
        evento.preventDefault();
        abrirGaveta(volta.tipo, volta.id);
      });
    }
    titulo.textContent = conteudo.titulo;
    if (conteudo.contexto) renderizar(contexto, conteudo.contexto);
    if (conteudo.ferramentas) renderizar(ferramentas, conteudo.ferramentas);
    renderizar(corpo, conteudo.trecho);
    conteudo.ligar?.(dialogo);
    focarInicio(formulario);
  } catch (erro) {
    if (minha !== versao) return;
    if (erro?.status === 404) {
      titulo.textContent = "Não encontrado";
      renderizar(corpo, html`<div class="vazio">${icone("gema-rachada", {tamanho: 24, classe: "vazio__gema"})}
        <p class="vazio__texto">Este item não existe mais.</p>
        <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button></div>`);
      titulo.focus();
      return;
    }
    if (erro?.status === 401) return;
    corpo.textContent = "";
    mostrarFaixa(corpo, {mensagem: erro?.mensagem ?? "Algo deu errado do nosso lado. Tente de novo.",
      tentarDeNovo: () => sincronizar(lerEstado().gaveta, {forcar: true})});
    titulo.focus();
  }
}

/** Liga as gavetas da tela: `definicoes` é {tipo: {detalhe(id, preencher), formulario(id, preencher)}}. */
export function ligarGavetas(definicoes) {
  tipos = definicoes;
  dialogo ??= criarDialogo();
  aoMudar((estado) => sincronizar(estado.gaveta));
  addEventListener("beforeunload", (evento) => {
    if (mudou && dialogo.open) {
      evento.preventDefault();
      evento.returnValue = "";
    }
  });
  sincronizar(lerEstado().gaveta);
  return {recarregar: () => sincronizar(lerEstado().gaveta, {forcar: true})};
}

/** Se a tela ligou a gaveta deste tipo (a busca geral abre ali mesmo, sem trocar de página). */
export const temGaveta = (tipo) => Boolean(tipos[tipo]);

/** Desenha de novo a gaveta aberta (depois de mudar o estado da tarefa que ela mostra, por exemplo). */
export function recarregarGaveta() {
  if (dialogo?.open) sincronizar(lerEstado().gaveta, {forcar: true});
}
