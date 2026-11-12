// Conversa com a API do Flask. Todo erro vira ErroApi, com a mensagem pronta para a tela.

const SEM_SERVIDOR = "Não deu para falar com o servidor. Confira a internet e tente de novo.";
const ERRO_NOSSO = "Algo deu errado do nosso lado. Tente de novo.";
const ESPERA_MAXIMA = 15000;

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
    resposta = await fetch(caminho, opcoes);
  } catch {
    throw new ErroApi(0, SEM_SERVIDOR);
  }
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
  post: (caminho, dados) => pedir("POST", caminho, {dados}),
  patch: (caminho, dados) => pedir("PATCH", caminho, {dados}),
  delete: (caminho, {keepalive = false} = {}) => pedir("DELETE", caminho, {keepalive}),
};
