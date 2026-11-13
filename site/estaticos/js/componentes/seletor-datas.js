// Seletor de datas (lote A, 08): entrada e saída num calendário que mostra as noites ocupadas
// do imóvel. As funções do conflito (R1) são puras; nada aqui toca no documento ao importar.

import {api} from "../nucleo/api.js";
import {data, intervalo, lerData} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {limparErro} from "./formulario.js";
import {icone} from "./pecas.js";

/** O que já ocupa as datas: a reserva confirmada que cruza uma noite, senão o bloqueio. */
export function conflitoDe({entrada, saida}, reservas, bloqueios, ignorarId = null) {
  // As datas vêm em ISO ("2026-11-04"): comparadas como texto, ficam na ordem certa.
  const reserva = reservas.find((r) => r.status === "confirmada" && r.id !== ignorarId
    && r.data_entrada < saida && entrada < r.data_saida);
  if (reserva) return {tipo: "reserva", reserva};
  const bloqueio = bloqueios.find((b) => b.data_inicio < saida && entrada < b.data_fim);
  return bloqueio ? {tipo: "bloqueio", bloqueio} : null;
}

/** A frase do conflito, igual à do servidor; `criando` é "reserva" ou "bloqueio". */
export function fraseConflito(conflito, criando = "reserva") {
  if (conflito.tipo === "reserva") {
    const r = conflito.reserva;
    const qual = `${r.codigo} (${r.hospede.nome}, ${intervalo(r.data_entrada, r.data_saida)})`;
    return criando === "reserva" ? `Conflita com ${qual}. Escolha outras datas.` : `Já há a reserva ${qual} nessas datas.`;
  }
  const b = conflito.bloqueio;
  const qual = `${intervalo(b.data_inicio, b.data_fim)} (${b.motivo.charAt(0).toLowerCase()}${b.motivo.slice(1)})`;
  return criando === "reserva" ? `O imóvel está bloqueado de ${qual}.` : `Já há um bloqueio de ${qual} nessas datas.`;
}

// Datas como texto ISO, contadas no fuso de quem usa.

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
  "novembro", "dezembro"];
const SEMANA = [["D", "domingo"], ["S", "segunda"], ["T", "terça"], ["Q", "quarta"], ["Q", "quinta"], ["S", "sexta"],
  ["S", "sábado"]];

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function somarDias(texto, dias) {
  const d = lerData(texto);
  d.setDate(d.getDate() + dias);
  return iso(d);
}

function somarMeses(texto, meses) {
  const d = lerData(texto);
  const alvo = new Date(d.getFullYear(), d.getMonth() + meses, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d.getDate(), ultimo));
  return iso(alvo);
}

const primeiroDoMes = (texto) => `${texto.slice(0, 7)}-01`;

export function contarNoites(entrada, saida) {
  return Math.round((lerData(saida) - lerData(entrada)) / 86400000);
}

export const noitesPorExtenso = (n) => `${n} ${n === 1 ? "noite" : "noites"}`;

function noitesOcupadas(reservas, bloqueios, ignorarId) {
  const noites = new Map();
  const marcar = (de, ate, tipo) => {
    for (let d = de; d < ate; d = somarDias(d, 1)) if (!noites.has(d)) noites.set(d, tipo);
  };
  for (const r of reservas) if (r.status === "confirmada" && r.id !== ignorarId) marcar(r.data_entrada, r.data_saida, "reserva");
  for (const b of bloqueios) marcar(b.data_inicio, b.data_fim, "bloqueio");
  return noites;
}

let contador = 0;

/**
 * Monta o seletor dentro de `campo` (um .campo vazio do formulário). Sem imóvel, o calendário
 * fica livre (o filtro de período). `nomes` são os campos escondidos que o formulário envia;
 * o erro do servidor neles aparece no botão das datas.
 */
export function seletorDatas(campo, {imovelId = null, ignorarReserva = null, entrada = null, saida = null,
  horarios = null, nomes = ["data_entrada", "data_saida"], rotulo = "Entrada e saída",
  rotulos = ["Entrada", "Saída"], criando = "reserva", aoMudar = () => {}} = {}) {
  const id = `datas-${++contador}`;
  const hoje = iso(new Date());
  const estado = {imovelId, horarios, entrada, saida, mes: primeiroDoMes(entrada ?? hoje), foco: entrada ?? hoje,
    reservas: [], bloqueios: [], noites: new Map(), conflito: null, aviso: ""};
  let pedido = 0;
  let reservasDaConta = null;

  renderizar(campo, html`
    <span class="campo__rotulo" id="${id}-rotulo">${rotulo}</span>
    <button type="button" class="datas" id="${id}" aria-expanded="false" aria-controls="${id}-calendario"
      aria-labelledby="${id}-rotulo ${id}">
      <span class="datas__parte"><span class="datas__nome">${rotulos[0]}</span><span class="datas__valor" data-valor="0"></span></span>
      ${icone("proximo", {classe: "datas__seta"})}
      <span class="datas__parte"><span class="datas__nome">${rotulos[1]}</span><span class="datas__valor" data-valor="1"></span></span>
      ${icone("agenda", {classe: "datas__icone"})}
    </button>
    ${nomes ? nomes.map((nome) => html`<input type="hidden" name="${nome}" data-erro-em="#${id}" required data-obrigatorio="Escolha as datas.">`) : ""}
    <div class="calendario" id="${id}-calendario" hidden>
      <div class="calendario__topo">
        <button type="button" class="botao botao--icone botao--fantasma botao--sm" data-mes="-1" aria-label="Mês anterior">${icone("anterior")}</button>
        <h3 class="calendario__titulo" id="${id}-titulo" aria-live="polite"></h3>
        <button type="button" class="botao botao--icone botao--fantasma botao--sm" data-mes="1" aria-label="Próximo mês">${icone("proximo")}</button>
      </div>
      <table class="calendario__grade" role="grid" aria-labelledby="${id}-titulo" aria-describedby="${id}-ajuda">
        <thead><tr>${SEMANA.map(([letra, nome]) => html`<th scope="col" abbr="${nome}">${letra}</th>`)}</tr></thead>
        <tbody></tbody>
      </table>
      <p class="calendario__estado" role="status"></p>
      <div class="calendario__rodape">
        ${imovelId !== null || nomes ? html`<ul class="calendario__legenda" aria-label="Legenda do calendário">
          <li><i class="calendario__marca calendario__marca--reserva" aria-hidden="true"></i>Reservado</li>
          <li><i class="calendario__marca calendario__marca--bloqueio" aria-hidden="true"></i>Bloqueado</li>
          <li><i class="calendario__marca calendario__marca--escolha" aria-hidden="true"></i>Sua escolha</li>
        </ul>` : html`<span></span>`}
        <button type="button" class="botao botao--fantasma botao--sm" data-limpar>Limpar</button>
      </div>
      <p class="visualmente-oculto" id="${id}-ajuda">Setas andam pelos dias. Page Up e Page Down trocam o mês. Enter escolhe. Esc fecha.</p>
    </div>
    <p class="campo__dica" data-resumo></p>
    <p class="campo__aviso" data-conflito hidden></p>`);

  const botao = campo.querySelector(`#${id}`);
  const calendario = campo.querySelector(".calendario");
  const corpo = calendario.querySelector("tbody");
  const titulo = calendario.querySelector(".calendario__titulo");
  const status = calendario.querySelector(".calendario__estado");
  const escondidos = nomes ? nomes.map((nome) => campo.querySelector(`input[name="${nome}"]`)) : [];
  const avisoConflito = campo.querySelector("[data-conflito]");

  const escolhendoSaida = () => estado.entrada && !estado.saida;
  const livre = (de, ate) => {
    for (let n = de; n < ate; n = somarDias(n, 1)) if (estado.noites.has(n)) return false;
    return true;
  };
  // Pode começar a estadia num dia de noite livre; a saída precisa de todas as noites livres até ela.
  const podeEscolher = (dia) => (escolhendoSaida() && dia > estado.entrada
    ? livre(estado.entrada, dia) : !estado.noites.has(dia));

  function rotuloDoDia(dia) {
    const partes = [data(dia)];
    if (dia === estado.entrada) partes.push(rotulos[0].toLowerCase());
    if (dia === estado.saida) partes.push(rotulos[1].toLowerCase());
    const noite = estado.noites.get(dia);
    if (noite) partes.push(noite === "reserva" ? "noite reservada" : "noite bloqueada");
    if (dia === hoje) partes.push("hoje");
    return partes.join(", ");
  }

  function desenharMes() {
    const inicio = lerData(estado.mes);
    titulo.textContent = `${MESES[inicio.getMonth()]} de ${inicio.getFullYear()}`;
    let dia = somarDias(estado.mes, -inicio.getDay());
    const semanas = [];
    while (dia.slice(0, 7) <= estado.mes.slice(0, 7)) {
      const semana = [];
      for (let i = 0; i < 7; i += 1, dia = somarDias(dia, 1)) semana.push(dia);
      semanas.push(semana);
    }
    renderizar(corpo, html`${semanas.map((semana) => html`<tr>${semana.map((d) => {
      if (d.slice(0, 7) !== estado.mes.slice(0, 7)) return html`<td role="gridcell"></td>`;
      const classes = ["dia"];
      const manha = estado.noites.get(somarDias(d, -1));
      const noite = estado.noites.get(d);
      if (manha) classes.push(`dia--manha-${manha}`);
      if (noite) classes.push(`dia--noite-${noite}`);
      if (d === hoje) classes.push("dia--hoje");
      if (d === estado.entrada) classes.push("dia--entrada");
      if (d === estado.saida) classes.push("dia--saida");
      if (estado.entrada && estado.saida && d > estado.entrada && d < estado.saida) classes.push("dia--meio");
      const escolhido = d === estado.entrada || d === estado.saida;
      return html`<td role="gridcell" aria-selected="${String(escolhido)}"><button type="button" class="${classes.join(" ")}"
        data-dia="${d}" tabindex="${d === estado.foco ? "0" : "-1"}" aria-label="${rotuloDoDia(d)}"
        ${podeEscolher(d) ? "" : html`aria-disabled="true"`}>${Number(d.slice(8))}</button></td>`;
    })}</tr>`)}`);
  }

  function resumo() {
    if (!estado.entrada || !estado.saida) return "";
    if (!nomes) return intervalo(estado.entrada, estado.saida);
    const noites = noitesPorExtenso(contarNoites(estado.entrada, estado.saida));
    return estado.horarios ? `${noites} · entrada ${estado.horarios.entrada}, saída ${estado.horarios.saida}` : noites;
  }

  function atualizar({avisar = true} = {}) {
    botao.querySelector('[data-valor="0"]').textContent = estado.entrada ? data(estado.entrada) : "Escolha";
    botao.querySelector('[data-valor="1"]').textContent = estado.saida ? data(estado.saida) : "–";
    escondidos.forEach((campoEscondido, i) => {
      campoEscondido.value = (i === 0 ? estado.entrada : estado.saida) ?? "";
    });
    campo.querySelector("[data-resumo]").textContent = resumo();
    estado.conflito = estado.entrada && estado.saida && estado.imovelId !== null
      ? conflitoDe({entrada: estado.entrada, saida: estado.saida}, estado.reservas, estado.bloqueios, ignorarReserva)
      : null;
    avisoConflito.hidden = !estado.conflito;
    if (estado.conflito) renderizar(avisoConflito, html`${icone("alerta")}<span>${fraseConflito(estado.conflito, criando)}</span>`);
    if (!calendario.hidden) desenharMes();
    if (!avisar) return;
    if (botao.getAttribute("aria-invalid") === "true") limparErro(botao);
    aoMudar({entrada: estado.entrada, saida: estado.saida, conflito: estado.conflito});
  }

  function focarDia() {
    corpo.querySelector(`[data-dia="${estado.foco}"]`)?.focus();
  }

  function abrir() {
    calendario.hidden = false;
    botao.setAttribute("aria-expanded", "true");
    estado.foco = estado.saida ?? estado.entrada ?? (estado.mes.slice(0, 7) === hoje.slice(0, 7) ? hoje : estado.mes);
    estado.mes = primeiroDoMes(estado.foco);
    status.textContent = estado.aviso || (escolhendoSaida() ? `Agora escolha a ${rotulos[1].toLowerCase()}.` : `Escolha a ${rotulos[0].toLowerCase()}.`);
    desenharMes();
    focarDia();
  }

  function fechar({focar = true} = {}) {
    calendario.hidden = true;
    botao.setAttribute("aria-expanded", "false");
    if (focar) botao.focus();
  }

  function escolher(dia) {
    if (!podeEscolher(dia)) {
      status.textContent = estado.noites.get(dia) === "bloqueio" || !escolhendoSaida()
        ? "Esta noite já está ocupada." : "Há uma noite ocupada antes deste dia.";
      return;
    }
    estado.foco = dia;
    if (!estado.entrada || estado.saida || dia <= estado.entrada) {
      estado.entrada = dia;
      estado.saida = null;
      status.textContent = `${rotulos[0]} ${data(dia)}. Agora escolha a ${rotulos[1].toLowerCase()}.`;
      atualizar();
      focarDia();
      return;
    }
    estado.saida = dia;
    atualizar();
    fechar();
  }

  botao.addEventListener("click", () => (calendario.hidden ? abrir() : fechar()));
  calendario.addEventListener("click", (evento) => {
    const dia = evento.target.closest("[data-dia]");
    if (dia) {
      escolher(dia.dataset.dia);
      return;
    }
    const mes = evento.target.closest("[data-mes]");
    if (mes) {
      estado.mes = somarMeses(estado.mes, Number(mes.dataset.mes));
      estado.foco = estado.mes;
      desenharMes();
      return;
    }
    if (evento.target.closest("[data-limpar]")) {
      estado.entrada = null;
      estado.saida = null;
      status.textContent = `Escolha a ${rotulos[0].toLowerCase()}.`;
      atualizar();
      focarDia();
    }
  });
  calendario.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      // Fecha só o calendário: sem isto, o Esc também pediria para fechar a gaveta.
      evento.preventDefault();
      evento.stopPropagation();
      fechar();
      return;
    }
    if (!evento.target.closest("[data-dia]")) return;
    const semana = lerData(estado.foco).getDay();
    const destino = {
      ArrowLeft: () => somarDias(estado.foco, -1), ArrowRight: () => somarDias(estado.foco, 1),
      ArrowUp: () => somarDias(estado.foco, -7), ArrowDown: () => somarDias(estado.foco, 7),
      Home: () => somarDias(estado.foco, -semana), End: () => somarDias(estado.foco, 6 - semana),
      PageUp: () => somarMeses(estado.foco, evento.shiftKey ? -12 : -1),
      PageDown: () => somarMeses(estado.foco, evento.shiftKey ? 12 : 1),
    }[evento.key];
    if (!destino) return;
    evento.preventDefault();
    estado.foco = destino();
    estado.mes = primeiroDoMes(estado.foco);
    desenharMes();
    focarDia();
  });

  // Na montagem não avisa quem usa o seletor: a tela ainda está ligando os outros campos.
  async function carregar({avisar = true} = {}) {
    const meu = ++pedido;
    estado.aviso = "";
    if (estado.imovelId === null) {
      Object.assign(estado, {reservas: [], bloqueios: [], noites: new Map()});
      atualizar({avisar});
      return;
    }
    // Uma busca só por formulário: as reservas da conta de 2 meses antes a um ano e meio depois.
    const base = estado.entrada && estado.entrada < hoje ? estado.entrada : hoje;
    reservasDaConta ??= api.get("/api/reservas", {de: somarDias(base, -60), ate: somarDias(hoje, 548)});
    try {
      const [{reservas}, {bloqueios}] = await Promise.all([reservasDaConta,
        api.get(`/api/imoveis/${estado.imovelId}/bloqueios`)]);
      if (meu !== pedido) return;
      estado.reservas = reservas.filter((r) => r.imovel.id === estado.imovelId);
      estado.bloqueios = bloqueios;
    } catch {
      if (meu !== pedido) return;
      reservasDaConta = null;
      Object.assign(estado, {reservas: [], bloqueios: [], aviso: "Não deu para carregar as noites ocupadas."});
    }
    estado.noites = noitesOcupadas(estado.reservas, estado.bloqueios, ignorarReserva);
    atualizar();
  }

  atualizar({avisar: false});
  carregar({avisar: false});

  return {
    botao,
    valor: () => ({entrada: estado.entrada, saida: estado.saida}),
    conflito: () => estado.conflito,
    trocarImovel(novoId, novosHorarios = null) {
      estado.imovelId = novoId;
      estado.horarios = novosHorarios;
      carregar();
    },
    definir({entrada: novaEntrada = null, saida: novaSaida = null}) {
      Object.assign(estado, {entrada: novaEntrada, saida: novaSaida});
      if (novaEntrada) estado.mes = primeiroDoMes(novaEntrada);
      atualizar();
    },
    fechar: () => fechar({focar: false}),
  };
}
