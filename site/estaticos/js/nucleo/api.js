// Conversa com a API do Flask. Todo erro vira ErroApi, com a mensagem pronta para a tela.

import {modoDemo} from "./enderecos.js";

const SEM_SERVIDOR = "Não deu para falar com o servidor. Confira a internet e tente de novo.";
const ERRO_NOSSO = "Algo deu errado do nosso lado. Tente de novo.";
const ESPERA_MAXIMA = 15000;

// Na demonstração do GitHub Pages (sem Flask), quem responde é o servidor simulado, no próprio navegador.
async function responderNaDemo(metodo, caminho, dados) {
  const {responder} = await import("../demo/navegador.js");
  return responder(metodo, caminho, dados);
}

export class ErroApi extends Error {
  constructor(status, mensagem, campos = {}) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.mensagem = mensagem;
    this.campos = campos;
  }
}

// O aviso de sessão expirada sai uma vez só por página: depois do primeiro 401, todo pedido
// também daria 401, e a pessoa veria o mesmo aviso repetido.
let sessaoAvisada = false;

// Cada escrita que deu certo troca esta marca. Ela fica no localStorage, que as abas e as páginas
// pré-carregadas dividem: a página que esperou guardada confere a marca quando aparece (shell.js).
const MARCA_ESCRITA = "gemovel:escritas";

/** A marca da última escrita que deu certo, em qualquer aba (null se nada foi gravado ainda). */
export function ultimaEscrita() {
  try {
    return globalThis.localStorage?.getItem(MARCA_ESCRITA) ?? null;
  } catch {
    return null;
  }
}

function marcarEscrita() {
  try {
    globalThis.localStorage?.setItem(MARCA_ESCRITA, String(Number(ultimaEscrita() ?? 0) + 1));
  } catch {
    // Sem armazenamento, a página guardada só não fica sabendo da mudança.
  }
}

function enderecoCom(caminho, parametros) {
  const pares = Object.entries(parametros ?? {})
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== "")
    .map(([nome, valor]) => [nome, Array.isArray(valor) ? valor.join(",") : String(valor)]);
  return pares.length ? `${caminho}?${new URLSearchParams(pares)}` : caminho;
}

async function pedir(metodo, caminho, {dados, keepalive = false} = {}) {
  const opcoes = {method: metodo, headers: {Accept: "application/json"}, keepalive};
  if (metodo !== "GET") {
    // Escrita sempre em JSON, mesmo sem campos: o Flask recusa o resto (proteção contra CSRF).
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(dados ?? {});
  }
  if (!keepalive && typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    opcoes.signal = AbortSignal.timeout(ESPERA_MAXIMA);
  }

  let resposta;
  try {
    resposta = modoDemo() ? await responderNaDemo(metodo, caminho, dados) : await fetch(caminho, opcoes);
  } catch {
    throw new ErroApi(0, SEM_SERVIDOR);
  }
  if (resposta.ok && metodo !== "GET") marcarEscrita();
  if (resposta.status === 204) return null;

  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }
  if (resposta.ok) {
    if (corpo === null) throw new ErroApi(resposta.status, ERRO_NOSSO);
    return corpo;
  }

  if (resposta.status === 401 && !caminho.startsWith("/api/sessao") && !sessaoAvisada) {
    sessaoAvisada = true;
    globalThis.dispatchEvent(new Event("gemovel:sessao-expirada"));
  }
  const erro = corpo?.erro;
  if (!erro || typeof erro.mensagem !== "string") throw new ErroApi(resposta.status, ERRO_NOSSO);
  throw new ErroApi(resposta.status, erro.mensagem, erro.campos ?? {});
}

export const api = {
  get: (caminho, parametros) => pedir("GET", enderecoCom(caminho, parametros)),
  post: (caminho, dados, {keepalive = false} = {}) => pedir("POST", caminho, {dados, keepalive}),
  patch: (caminho, dados) => pedir("PATCH", caminho, {dados}),
  delete: (caminho, {keepalive = false} = {}) => pedir("DELETE", caminho, {keepalive}),
};
