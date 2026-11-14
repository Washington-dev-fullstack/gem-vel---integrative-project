// Casca do admin: conta e Sair, aviso de sessão expirada, topo fosco ao rolar, contador de
// atrasadas e a recarga ao voltar para a aba (spec do front §8).

import {api, ultimaEscrita} from "../nucleo/api.js";
import {html, renderizar} from "../nucleo/html.js";
import {avatar, iniciais} from "./pecas.js";
import {ligarMenu} from "./menu.js";
import {avisar} from "./aviso.js";
import {ligarBuscaGeral} from "./busca.js";
import {ligarFaixaSemInternet} from "./faixa.js";
import {enderecoAtual, ir, irSubstituindo} from "../nucleo/enderecos.js";

const CINCO_MINUTOS = 5 * 60 * 1000;
const TRINTA_SEGUNDOS = 30 * 1000;

// A conta e o contador ficam na sessão da aba: o script da base-admin.html os põe já no primeiro quadro
// da próxima página, e a casca só confere e atualiza. Assim o nome não pisca a cada troca de página.
const CHAVE_CASCA = "gemovel:casca";

function lembrarCasca(mudanca) {
  try {
    sessionStorage.setItem(CHAVE_CASCA, JSON.stringify({...JSON.parse(sessionStorage.getItem(CHAVE_CASCA) ?? "{}"), ...mudanca}));
  } catch {
    // Sem a sessão da aba, a conta só aparece um instante depois.
  }
}

function esquecerCasca() {
  try {
    sessionStorage.removeItem(CHAVE_CASCA);
  } catch {
    // Sem a sessão da aba, não há o que esquecer.
  }
}

function ligarTopo() {
  const topo = document.querySelector(".topo");
  if (!topo) return;
  const conferir = () => topo.toggleAttribute("data-rolou", scrollY > 8);
  addEventListener("scroll", conferir, {passive: true});
  conferir();
}

function ligarSessaoExpirada() {
  addEventListener("gemovel:sessao-expirada", () => {
    avisar("Sua sessão expirou.", {
      fixo: true,
      acao: {rotulo: "Entrar de novo", fazer: () => ir(`/entrar?volta=${encodeURIComponent(enderecoAtual())}`)},
    });
  });
}

function ligarVolta(recarregar) {
  let escondidaEm = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      escondidaEm = Date.now();
    } else if (escondidaEm && Date.now() - escondidaEm > CINCO_MINUTOS) {
      escondidaEm = null;
      recarregar?.();
      atualizarContador();
    }
  });
}

// Página pré-carregada (as speculation rules da base-admin.html) ou guardada pelo Voltar do navegador:
// se algo foi gravado enquanto ela esperava, ou se a pré-carga passou de 30s, os dados recarregam quando ela aparece.
function ligarPaginaGuardada(recarregar) {
  const atualizar = () => {
    recarregar?.();
    atualizarContador();
  };
  let marca = ultimaEscrita();
  if (document.prerendering) {
    const desde = Date.now();
    document.addEventListener("prerenderingchange", () => {
      if (ultimaEscrita() !== marca || Date.now() - desde > TRINTA_SEGUNDOS) atualizar();
    }, {once: true});
  }
  addEventListener("pagehide", () => { marca = ultimaEscrita(); });
  addEventListener("pageshow", (evento) => {
    if (evento.persisted && ultimaEscrita() !== marca) atualizar();
  });
}

// O item da navegação tocado acende na hora, enquanto a próxima página chega; voltar pelo cache apaga.
function ligarIda() {
  document.querySelector(".lateral")?.addEventListener("click", (evento) => {
    const link = evento.target.closest("a[href]");
    if (!link || link.hasAttribute("aria-current") || evento.defaultPrevented || evento.button || evento.ctrlKey ||
      evento.metaKey || evento.shiftKey || evento.altKey) return;
    link.dataset.indo = "";
  });
  addEventListener("pageshow", (evento) => {
    if (evento.persisted) for (const link of document.querySelectorAll("[data-indo]")) delete link.dataset.indo;
  });
}

function ajustarAtalho() {
  const mac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform ?? navigator.platform ?? "");
  for (const tecla of document.querySelectorAll("[data-atalho-k]")) tecla.textContent = mac ? "⌘ K" : "Ctrl K";
}

async function sair() {
  try {
    await api.delete("/api/sessao");
  } finally {
    esquecerCasca();
    ir("/entrar?saiu=1");
  }
}

async function carregarConta() {
  const botao = document.querySelector("[data-conta]");
  try {
    const {usuario} = await api.get("/api/sessao");
    if (botao) {
      renderizar(botao.querySelector("[data-conta-avatar]"), avatar(usuario.nome));
      botao.querySelector("[data-conta-nome]").textContent = usuario.nome;
      botao.setAttribute("aria-label", `Conta de ${usuario.nome}`);
      ligarMenu(botao, [
        {cabecalho: html`<strong>${usuario.nome}</strong><span>${usuario.email}</span>`},
        {separador: true},
        {rotulo: "Sair", icone: "sair", fazer: sair},
      ]);
    }
    lembrarCasca({nome: usuario.nome, iniciais: iniciais(usuario.nome)});
    return usuario;
  } catch (erro) {
    if (erro.status === 401) {
      esquecerCasca();
      irSubstituindo(`/entrar?volta=${encodeURIComponent(enderecoAtual())}`);
    }
    return null;
  }
}

/** Atualiza o contador de tarefas atrasadas na navegação; salta quando o número muda. */
export async function atualizarContador() {
  const contador = document.querySelector("[data-contador-tarefas]");
  if (!contador) return;
  try {
    const {tarefas} = await api.get("/api/tarefas");
    const atrasadas = tarefas.filter((t) => t.atrasada).length;
    const antes = contador.textContent;
    contador.textContent = atrasadas ? String(atrasadas) : "";
    contador.hidden = !atrasadas;
    lembrarCasca({atrasadas});
    const item = contador.closest("a");
    item?.setAttribute("aria-label", atrasadas ? `Tarefas, ${atrasadas} ${atrasadas === 1 ? "atrasada" : "atrasadas"}` : "Tarefas");
    if (antes && antes !== contador.textContent) {
      contador.classList.remove("lateral__contador--salta");
      void contador.offsetWidth;
      contador.classList.add("lateral__contador--salta");
    }
  } catch {
    // Sem contador não é erro que a pessoa precise ver.
  }
}

export async function iniciarCasca({recarregar} = {}) {
  ligarFaixaSemInternet();
  ligarTopo();
  ligarSessaoExpirada();
  ligarVolta(recarregar);
  ligarPaginaGuardada(recarregar);
  ligarIda();
  ajustarAtalho();
  const gatilho = document.querySelector("[data-busca]");
  if (gatilho) ligarBuscaGeral(gatilho);
  const usuario = await carregarConta();
  if (usuario) atualizarContador();
  return usuario;
}
