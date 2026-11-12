// O endereço guarda o estado da tela: os filtros na query, a aba no hash e a gaveta aberta
// (?reserva=12, ?imovel=novo, com &editar). Assim, voltar, recarregar e mandar o link funcionam.

export const TIPOS_DE_GAVETA = ["reserva", "hospede", "imovel", "bloqueio", "tarefa", "pessoa"];

function lerId(texto) {
  return /^\d+$/.test(texto) ? Number(texto) : texto;
}

export function estadoDe(url) {
  const filtros = {};
  let gaveta = null;
  for (const [nome, valor] of url.searchParams) {
    if (nome === "editar") continue;
    if (TIPOS_DE_GAVETA.includes(nome)) {
      if (!gaveta && valor) gaveta = {tipo: nome, id: lerId(valor), editar: url.searchParams.has("editar")};
    } else {
      filtros[nome] = valor;
    }
  }
  return {filtros, aba: url.hash ? decodeURIComponent(url.hash.slice(1)) : null, gaveta};
}

function montarBusca(pares) {
  // Chave sem valor sai sozinha ("&editar"), como a pessoa leria no endereço.
  const partes = pares.map(([nome, valor]) =>
    valor === "" ? encodeURIComponent(nome) : `${encodeURIComponent(nome)}=${encodeURIComponent(valor).replace(/%2C/g, ",")}`);
  return partes.length ? `?${partes.join("&")}` : "";
}

export function urlCom(url, {filtros, gaveta} = {}) {
  let pares = [...url.searchParams];
  if (filtros) {
    for (const [nome, valor] of Object.entries(filtros)) {
      const vazio = valor === null || valor === undefined || valor === "";
      const i = pares.findIndex(([n]) => n === nome);
      if (vazio) pares = pares.filter(([n]) => n !== nome);
      else if (i >= 0) pares[i] = [nome, String(valor)];
      else pares.push([nome, String(valor)]);
    }
  }
  if (gaveta !== undefined) {
    pares = pares.filter(([n]) => n !== "editar" && !TIPOS_DE_GAVETA.includes(n));
    if (gaveta) {
      pares.push([gaveta.tipo, String(gaveta.id)]);
      if (gaveta.editar) pares.push(["editar", ""]);
    }
  }
  const nova = new URL(url);
  nova.search = montarBusca(pares);
  return nova;
}

export function destinoSeguro(volta) {
  if (!volta || !volta.startsWith("/") || volta.startsWith("//") || volta.includes("\\")) return null;
  return volta;
}

// Com o history do navegador.

const EVENTO = "gemovel:url";

export function lerEstado() {
  return estadoDe(new URL(location.href));
}

/** O que veio para preencher o formulário da gaveta aberta ({imovelId, entrada, saida…}), ou null.
 * Fica no history.state da gaveta: sobrevive a recarregar e a voltar, e some quando ela fecha. */
export function preenchimento() {
  return history.state?.preencher ?? null;
}

function avisarMudanca() {
  globalThis.dispatchEvent(new Event(EVENTO));
}

/** Troca vários filtros de uma vez (um só aviso de mudança): {de, ate} ou o Limpar filtros. */
export function trocarFiltros(filtros) {
  history.replaceState(history.state, "", urlCom(new URL(location.href), {filtros}));
  avisarMudanca();
}

export function trocarFiltro(nome, valor) {
  trocarFiltros({[nome]: valor});
}

export function abrirGaveta(tipo, id, {editar = false, preencher = null} = {}) {
  const atual = lerEstado().gaveta;
  const destino = urlCom(new URL(location.href), {gaveta: {tipo, id, editar}});
  // Trocar de gaveta (do detalhe para editar) não empilha mais um passo no Voltar.
  if (atual) history.replaceState({...history.state, preencher}, "", destino);
  else history.pushState({gaveta: true, preencher}, "", destino);
  avisarMudanca();
}

export function fecharGaveta() {
  if (history.state?.gaveta) {
    history.back();
    return;
  }
  history.replaceState(null, "", urlCom(new URL(location.href), {gaveta: null}));
  avisarMudanca();
}

export function aoMudar(funcao) {
  const chamar = () => funcao(lerEstado());
  globalThis.addEventListener("popstate", chamar);
  globalThis.addEventListener(EVENTO, chamar);
  return () => {
    globalThis.removeEventListener("popstate", chamar);
    globalThis.removeEventListener(EVENTO, chamar);
  };
}
