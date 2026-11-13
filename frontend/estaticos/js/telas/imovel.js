// Detalhe do imóvel (web-admin.md §5 e §10): cabeçalho com a prontidão, a faixa de KPIs com o tambor
// e as abas Reservas (a tabela da tela Reservas, só deste imóvel), Tarefas (por dia) e Dados (com os
// bloqueios). O imóvel desativado ganha a faixa com "Reativar"; o que não existe, o estado de não encontrado.

import {api} from "../nucleo/api.js";
import {data, dataCurta, dinheiro, dinheiroSemCentavos, horario, intervalo} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {abrirGaveta, aoMudar, cliqueComum, lerEstado} from "../nucleo/url.js";
import {ligarAbas} from "../componentes/abas.js";
import {adiarEnvio, avisar} from "../componentes/aviso.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {ligarMenu} from "../componentes/menu.js";
import {chip, estadoVisivel, gema, icone} from "../componentes/pecas.js";
import {iniciarCasca} from "../componentes/shell.js";
import {cabecalhosDasReservas, itensDaReserva, linhaDaReserva, ordenarReservas} from "../componentes/tabela-reservas.js";
import {tambor} from "../componentes/tambor.js";
import {gavetaBloqueio} from "../gavetas/bloqueio.js";
import {desativarImovel, gavetaImovel, itensDoImovel, localDoImovel, prontidaoDe, proximaEntrada, reativarImovel} from "../gavetas/imovel.js";
import {cancelarReserva, carregarImoveis, gavetaReserva} from "../gavetas/reserva.js";
import {gavetaTarefa} from "../gavetas/tarefa.js";

const POR_VEZ = 50;
const TIPO = {limpeza: "Limpeza", manutencao: "Manutenção"};
const id = Number(location.pathname.match(/^\/imoveis\/(\d+)/)?.[1]);

const pagina = document.querySelector("[data-pagina]");
const nome = document.querySelector("[data-nome]");
const lugarDaProntidao = document.querySelector("[data-prontidao]");
const contexto = document.querySelector("[data-contexto]");
const acoesDoCabecalho = document.querySelector("[data-acoes-cabecalho]");
const lugarDaFaixa = document.querySelector("[data-faixa-desativado]");
const kpis = document.querySelector("[data-kpis]");
const areaReservas = document.querySelector("[data-lista-reservas]");
const contagemReservas = document.querySelector("[data-contagem-reservas]");
const botaoNovaReserva = document.querySelector("[data-nova-reserva]");
const areaTarefas = document.querySelector("[data-lista-tarefas]");
const areaDados = document.querySelector("[data-dados]");

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const hoje = new Date();
const hojeIso = iso(hoje);
const amanhaIso = iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1));
const mesCurto = dataCurta(hoje).split(" ")[1];

// Estado da tela.
let imovel = null;
let reservas = null;
let ordem = {coluna: "entrada", sentido: -1};
let limite = POR_VEZ;
let destaque = null;
const reservasEscondidas = new Set();
let tarefas = null;
let temMaisTarefas = false;
let bloqueios = null;
const bloqueiosEscondidos = new Set();

const menuDoCabecalho = ligarMenu(document.querySelector("[data-mais-acoes]"), []);

// Cabeçalho, faixa e KPIs.

function desenharCabecalho() {
  document.title = `${imovel.nome} · Gemóvel`;
  nome.textContent = imovel.nome;
  renderizar(lugarDaProntidao, prontidaoDe(imovel));
  contexto.textContent = `${imovel.codigo} · ${localDoImovel(imovel)} · Diária ${dinheiro(imovel.valor_diaria)}`;
  acoesDoCabecalho.hidden = false;
  menuDoCabecalho.atualizar(itensDoImovel(imovel, {aoDesativar: desativarAqui, aoReativar: reativarAqui, comEditar: false}));
  botaoNovaReserva.hidden = !imovel.ativo;
  renderizar(lugarDaFaixa, imovel.ativo ? html`` : html`<div class="faixa faixa--info" role="status">${icone("info")}
    <p class="faixa__texto">Este imóvel está desativado e não aparece para novas reservas.</p>
    <button type="button" class="botao botao--sm botao--secundario" data-reativar>Reativar</button></div>`);
  lugarDaFaixa.querySelector("[data-reativar]")?.addEventListener("click", () => reativarAqui(imovel));
}

function desenharKpis() {
  const {percentual, noites, noites_mes: noitesMes} = imovel.ocupacao_mes;
  const proxima = proximaEntrada(imovel);
  if (kpis.hidden) {
    renderizar(kpis, html`<div class="kpi"><span class="kpi__rotulo">Ocupação em ${mesCurto}</span>
        <span class="kpi__valor" data-kpi="ocupacao"></span><span class="kpi__legenda numero" data-legenda="ocupacao"></span></div>
      <div class="kpi"><span class="kpi__rotulo">Receita em ${mesCurto}</span>
        <span class="kpi__valor" data-kpi="receita"></span><span class="kpi__legenda numero" data-legenda="receita"></span></div>
      <div class="kpi"><span class="kpi__rotulo">Próxima entrada</span>
        <span class="kpi__valor kpi__valor--texto numero" data-kpi="proxima"></span><span class="kpi__legenda" data-legenda="proxima"></span></div>`);
    kpis.hidden = false;
  }
  tambor(kpis.querySelector('[data-kpi="ocupacao"]'), `${percentual}%`);
  tambor(kpis.querySelector('[data-kpi="receita"]'), dinheiroSemCentavos(imovel.receita_mes));
  kpis.querySelector('[data-kpi="proxima"]').textContent = proxima?.quando ?? "–";
  kpis.querySelector('[data-legenda="ocupacao"]').textContent = `${noites} de ${noitesMes} noites`;
  kpis.querySelector('[data-legenda="receita"]').textContent = plural(noites, "noite", "noites");
  kpis.querySelector('[data-legenda="proxima"]').textContent = proxima?.hospede ?? "Nenhuma marcada";
}

function naoEncontrado() {
  document.title = "Imóvel não encontrado · Gemóvel";
  nome.textContent = "Imóvel não encontrado";
  contexto.textContent = "";
  vazio(pagina, {texto: "Este imóvel não existe ou não está nesta conta.", detalhe: "Confira o endereço ou volte para a lista de imóveis.",
    acao: {rotulo: "Ver imóveis", fazer: () => location.assign("/imoveis")}});
}

async function carregarImovel() {
  try {
    imovel = await api.get(`/api/imoveis/${id}`);
    esconderFaixa(pagina);
    desenharCabecalho();
    desenharKpis();
    return true;
  } catch (falha) {
    if (falha?.status === 404 || !id) naoEncontrado();
    else if (falha?.status !== 401) erro(pagina, {mensagem: "Não deu para carregar o imóvel.", tentarDeNovo: recarregar});
    return false;
  }
}

// Aba Reservas: a tabela da tela Reservas, sem a coluna Imóvel, das mais novas para as mais antigas.

function desenharReservas() {
  if (!reservas) return;
  const lista = ordenarReservas(reservas.filter((r) => !reservasEscondidas.has(r.id)), ordem);
  contagemReservas.textContent = plural(lista.length, "reserva", "reservas");
  if (!lista.length) {
    vazio(areaReservas, {texto: "Nenhuma reserva neste imóvel.", acao: imovel?.ativo ? {rotulo: "Nova reserva", fazer: novaReserva} : null});
    return;
  }
  const mostradas = lista.slice(0, limite);
  renderizar(areaReservas, html`<div class="tabela-cartao"><table class="tabela">
      <caption class="visualmente-oculto">Reservas de ${imovel?.nome ?? "este imóvel"}</caption>
      <thead>${cabecalhosDasReservas(ordem, {comImovel: false})}</thead>
      <tbody>${mostradas.map((r) => linhaDaReserva(r, {destaque, comImovel: false}))}</tbody>
    </table></div>
    <div class="tabela-rodape"><span class="numero">${mostradas.length} de ${lista.length}</span>
      ${lista.length > mostradas.length ? html`<button type="button" class="botao botao--secundario botao--sm" data-mais>Carregar mais</button>` : ""}</div>`);
  const porId = new Map(mostradas.map((r) => [r.id, r]));
  for (const botao of areaReservas.querySelectorAll("[data-acoes]")) {
    ligarMenu(botao, itensDaReserva(porId.get(Number(botao.dataset.acoes)), {cancelar: cancelarDaTabela}));
  }
  marcarAberta();
  areaReservas.querySelector("tr[data-destaque]")?.scrollIntoView({block: "nearest"});
  destaque = null;
}

async function carregarReservas() {
  if (!reservas) esqueleto(areaReservas);
  try {
    // A lista da API é por período; o detalhe pede o histórico inteiro e fica com as deste imóvel.
    const resposta = await api.get("/api/reservas", {de: "2000-01-01", ate: "2099-12-31"});
    reservas = resposta.reservas.filter((r) => r.imovel.id === id);
    esconderFaixa(areaReservas);
    desenharReservas();
  } catch (falha) {
    if (falha?.status !== 401) erro(areaReservas, {mensagem: "Não deu para carregar as reservas.", tentarDeNovo: carregarReservas});
  }
}

const novaReserva = () => abrirGaveta("reserva", "nova", {preencher: {imovelId: id}});

function cancelarDaTabela(r) {
  cancelarReserva(r, {
    esconder: () => {
      reservasEscondidas.add(r.id);
      desenharReservas();
      (areaReservas.querySelector(".tabela__link") ?? document.querySelector("#aba-reservas")).focus();
    },
    mostrar: () => {
      reservasEscondidas.delete(r.id);
      desenharReservas();
    },
    depois: () => {
      reservasEscondidas.delete(r.id);
      recarregar();
    },
  });
}

function marcarAberta() {
  const gaveta = lerEstado().gaveta;
  for (const aberta of areaReservas.querySelectorAll("tr[data-aberta]")) aberta.removeAttribute("data-aberta");
  if (gaveta?.tipo === "reserva" && typeof gaveta.id === "number") {
    areaReservas.querySelector(`tr[data-id="${gaveta.id}"]`)?.setAttribute("data-aberta", "");
  }
}

areaReservas.addEventListener("click", (evento) => {
  const ordenarPor = evento.target.closest("[data-ordenar]");
  if (ordenarPor) {
    const coluna = ordenarPor.dataset.ordenar;
    ordem = {coluna, sentido: ordem.coluna === coluna ? -ordem.sentido : 1};
    desenharReservas();
    areaReservas.querySelector(`[data-ordenar="${coluna}"]`).focus();
    return;
  }
  if (evento.target.closest("[data-mais]")) {
    const antes = limite;
    limite += POR_VEZ;
    desenharReservas();
    areaReservas.querySelectorAll(".tabela__link")[antes]?.focus();
    return;
  }
  const link = evento.target.closest("[data-abrir]");
  if (link && cliqueComum(evento)) {
    evento.preventDefault();
    abrirGaveta("reserva", Number(link.dataset.id));
  }
});

// Aba Tarefas: a partir de hoje, agrupadas por dia, 30 por vez.

function tituloDoDia(dia) {
  if (dia === hojeIso) return `Hoje, ${data(dia)}`;
  if (dia === amanhaIso) return `Amanhã, ${data(dia)}`;
  const texto = data(dia);
  return texto[0].toUpperCase() + texto.slice(1);
}

function desenharTarefas() {
  if (!tarefas.length) {
    vazio(areaTarefas, {texto: "Nenhuma tarefa marcada."});
    return;
  }
  const dias = new Map();
  for (const t of tarefas) {
    const dia = t.agendada_para.slice(0, 10);
    if (!dias.has(dia)) dias.set(dia, []);
    dias.get(dia).push(t);
  }
  renderizar(areaTarefas, html`${[...dias].map(([dia, doDia]) => html`<section class="tarefas-dia" aria-labelledby="dia-${dia}">
      <h2 class="tarefas-dia__titulo numero" id="dia-${dia}">${tituloDoDia(dia)}</h2>
      <ul class="lista" role="list">${doDia.map((t) => html`<li class="linha">
        <div class="linha__inicio">${gema(estadoVisivel(t), {tamanho: 20})}</div>
        <div class="linha__meio"><a class="linha__titulo linha__link" href="?tarefa=${t.id}" data-tarefa="${t.id}">${t.titulo}</a>
          <span class="linha__meta numero">${horario(t.agendada_para)} · ${TIPO[t.tipo] ?? t.tipo} · ${t.responsavel?.nome ?? "Sem responsável"}</span></div>
        <div class="linha__fim">${chip(estadoVisivel(t))}</div></li>`)}</ul></section>`)}
    ${temMaisTarefas ? html`<div class="tabela-rodape"><button type="button" class="botao botao--secundario botao--sm" data-mais-tarefas>Carregar mais</button></div>` : ""}`);
}

async function carregarTarefas({mais = false} = {}) {
  if (!tarefas) esqueleto(areaTarefas, 5);
  try {
    const resposta = await api.get("/api/tarefas", {imovel_id: id, de: hojeIso, pular: mais ? tarefas.length : 0});
    const antes = mais ? tarefas.length : 0;
    tarefas = mais ? [...tarefas, ...resposta.tarefas] : resposta.tarefas;
    temMaisTarefas = resposta.tem_mais;
    esconderFaixa(areaTarefas);
    desenharTarefas();
    if (mais) areaTarefas.querySelectorAll(".linha__link")[antes]?.focus();
  } catch (falha) {
    if (falha?.status !== 401) erro(areaTarefas, {mensagem: "Não deu para carregar as tarefas.", tentarDeNovo: () => carregarTarefas({mais})});
  }
}

areaTarefas.addEventListener("click", (evento) => {
  if (evento.target.closest("[data-mais-tarefas]")) carregarTarefas({mais: true});
  const link = evento.target.closest("[data-tarefa]");
  if (link && cliqueComum(evento)) {
    evento.preventDefault();
    abrirGaveta("tarefa", Number(link.dataset.tarefa));
  }
});

// Aba Dados: endereço, hospedagem, instruções e bloqueios.

function desenharDados() {
  if (!imovel || !bloqueios) return;
  const visiveis = bloqueios.filter((b) => !bloqueiosEscondidos.has(b.id));
  renderizar(areaDados, html`<div class="dados-imovel">
    <section class="cartao dados-imovel__grupo"><div class="dados-imovel__topo"><h2 class="dados-imovel__titulo">Endereço</h2>
      <button type="button" class="botao botao--secundario botao--sm" data-editar-dados>Editar</button></div>
      <p class="dados-imovel__texto">${imovel.endereco}</p></section>
    <section class="cartao dados-imovel__grupo"><h2 class="dados-imovel__titulo">Hospedagem</h2>
      <dl class="dados"><dt>Capacidade</dt><dd>${plural(imovel.capacidade, "hóspede", "hóspedes")}</dd>
        <dt>Diária</dt><dd class="numero">${dinheiro(imovel.valor_diaria)}</dd>
        <dt>Entrada</dt><dd class="numero">${imovel.horario_entrada}</dd>
        <dt>Saída</dt><dd class="numero">${imovel.horario_saida}</dd></dl></section>
    <section class="cartao dados-imovel__grupo dados-imovel__grupo--largo"><h2 class="dados-imovel__titulo">Instruções para a equipe</h2>
      <p class="dados-imovel__texto">${imovel.observacoes ?? "Nenhuma instrução ainda."}</p></section>
    <section class="cartao dados-imovel__grupo dados-imovel__grupo--largo"><div class="dados-imovel__topo"><h2 class="dados-imovel__titulo">Bloqueios</h2>
      ${imovel.ativo ? html`<button type="button" class="botao botao--secundario botao--sm" data-bloquear>Bloquear datas</button>` : ""}</div>
      ${visiveis.length ? html`<ul class="lista" role="list">${visiveis.map((b) => html`<li class="linha">
          <div class="linha__meio"><span class="linha__titulo numero">${intervalo(b.data_inicio, b.data_fim)}</span>
            <span class="linha__meta">${b.motivo}</span></div>
          <div class="linha__fim"><button type="button" class="botao botao--icone botao--fantasma botao--sm" data-acoes-bloqueio="${b.id}"
            aria-label="Ações do bloqueio de ${intervalo(b.data_inicio, b.data_fim)}">${icone("acoes")}</button></div></li>`)}</ul>`
        : html`<p class="dados__secundario">Nenhuma data bloqueada.</p>`}</section>
  </div>`);
  areaDados.querySelector("[data-editar-dados]").addEventListener("click", () => abrirGaveta("imovel", id, {editar: true}));
  areaDados.querySelector("[data-bloquear]")?.addEventListener("click", bloquearDatas);
  const porId = new Map(visiveis.map((b) => [b.id, b]));
  for (const botao of areaDados.querySelectorAll("[data-acoes-bloqueio]")) {
    const bloqueio = porId.get(Number(botao.dataset.acoesBloqueio));
    ligarMenu(botao, [{rotulo: "Excluir", perigo: true, fazer: () => excluirBloqueio(bloqueio)}]);
  }
}

async function carregarBloqueios() {
  try {
    bloqueios = (await api.get(`/api/imoveis/${id}/bloqueios`)).bloqueios;
    esconderFaixa(areaDados);
    desenharDados();
  } catch (falha) {
    if (falha?.status !== 401) erro(areaDados, {mensagem: "Não deu para carregar os bloqueios.", tentarDeNovo: carregarBloqueios});
  }
}

const bloquearDatas = () => abrirGaveta("bloqueio", "novo", {preencher: {imovelId: id}});

function excluirBloqueio(bloqueio) {
  const periodo = intervalo(bloqueio.data_inicio, bloqueio.data_fim);
  const mostrar = () => {
    bloqueiosEscondidos.delete(bloqueio.id);
    desenharDados();
  };
  bloqueiosEscondidos.add(bloqueio.id);
  desenharDados();
  areaDados.querySelector("[data-bloquear]")?.focus();
  const envio = adiarEnvio(({keepalive}) => api.delete(`/api/bloqueios/${bloqueio.id}`, {keepalive}).then(() => {
    bloqueiosEscondidos.delete(bloqueio.id);
    carregarBloqueios();
  }, (falha) => {
    mostrar();
    if (falha?.status !== 401) avisar(falha?.mensagem ?? "Não deu para excluir o bloqueio.");
  }));
  avisar(`Bloqueio de ${periodo} excluído.`, {acao: {rotulo: "Desfazer", fazer: () => {
    envio.desfazer();
    mostrar();
  }}});
}

// Desativar e reativar.

function desativarAqui(atual) {
  desativarImovel(atual, {
    esconder: () => {
      imovel = {...imovel, ativo: false};
      desenharCabecalho();
      desenharDados();
      document.querySelector("[data-editar]").focus();
    },
    mostrar: () => {
      imovel = {...imovel, ativo: true};
      desenharCabecalho();
      desenharDados();
    },
    depois: recarregar,
  });
}

const reativarAqui = (atual) => reativarImovel(atual, {depois: recarregar});

// Ligações da página.

async function recarregar() {
  carregarImoveis({deNovo: true}).catch(() => {});
  if (!(await carregarImovel())) return;
  carregarReservas();
  carregarBloqueios();
  if (tarefas) carregarTarefas();
}

document.querySelector("[data-editar]").addEventListener("click", () => abrirGaveta("imovel", id, {editar: true}));
botaoNovaReserva.addEventListener("click", novaReserva);

ligarGavetas({
  reserva: gavetaReserva({depois: (salva) => {
    destaque = salva.id;
    recarregar();
  }, aoCancelar: cancelarDaTabela}),
  imovel: gavetaImovel({depois: recarregar}),
  bloqueio: gavetaBloqueio({depois: carregarBloqueios}),
  tarefa: gavetaTarefa({depois: () => carregarTarefas()}),
});

aoMudar(marcarAberta);

ligarAbas(document.querySelector('[role="tablist"]'), {aoTrocar: (aba) => {
  if (aba === "tarefas" && !tarefas && imovel) carregarTarefas();
}});

iniciarCasca({recarregar});

if (await carregarImovel()) {
  carregarReservas();
  carregarBloqueios();
  if (!document.querySelector("#painel-tarefas").hidden) carregarTarefas();
}
