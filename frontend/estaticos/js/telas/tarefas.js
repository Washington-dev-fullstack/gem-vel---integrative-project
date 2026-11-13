// Tela Tarefas (web-admin.md §6): as tarefas de um dia em grupos (Atrasadas, Em andamento, Pendentes
// e as concluídas recolhidas), o dia e os filtros na URL, e o menu de cada tarefa.

import {api} from "../nucleo/api.js";
import {data, isoDoDia} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {agruparTarefas} from "../nucleo/tarefas.js";
import {abrirGaveta, aoMudar, cliqueComum, lerEstado, trocarFiltro, trocarFiltros} from "../nucleo/url.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {escolhas, ligarFiltro} from "../componentes/filtro.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {ligarMenu} from "../componentes/menu.js";
import {chip, estadoVisivel, gema, icone} from "../componentes/pecas.js";
import {seletorPeriodo} from "../componentes/seletor-periodo.js";
import {iniciarCasca} from "../componentes/shell.js";
import {carregarEquipe} from "../gavetas/pessoa.js";
import {carregarImoveis, gavetaReserva} from "../gavetas/reserva.js";
import {TIPOS, excluirTarefa, gavetaTarefa, horarioDaTarefa, itensDaTarefa, marcarTarefa, responsavelDaTarefa}
  from "../gavetas/tarefa.js";

const area = document.querySelector("[data-lista]");
const contexto = document.querySelector("[data-contexto]");
const botaoLimpar = document.querySelector("[data-limpar]");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const GRUPOS = [["atrasadas", "Atrasadas"], ["em_andamento", "Em andamento"], ["pendentes", "Pendentes"]];
const ID = /^\d+$/;

// Estado da tela.
let tarefas = null; // as do dia carregado
let diaCarregado = null;
let equipe = [];
let imoveis = [];
let pedido = 0;
let chaveDesenhada = "";
let concluidasAbertas = false;
const excluindo = new Set(); // no prazo do Desfazer, a tarefa já sumiu da tela

function filtros() {
  const f = lerEstado().filtros;
  return {
    dia: /^\d{4}-\d{2}-\d{2}$/.test(f.dia ?? "") ? f.dia : isoDoDia(),
    tipo: Object.hasOwn(TIPOS, f.tipo ?? "") ? f.tipo : null,
    responsavel: f.responsavel === "nenhum" || ID.test(f.responsavel ?? "") ? f.responsavel : null,
    imovel: ID.test(f.imovel ?? "") ? Number(f.imovel) : null,
  };
}

const filtrosAtivos = (f) => Boolean(f.tipo || f.responsavel || f.imovel);
const limparFiltros = () => trocarFiltros({tipo: null, responsavel: null, imovel: null});
const doResponsavel = (t, r) => (r === "nenhum" ? !t.responsavel : t.responsavel?.id === Number(r));

/** As tarefas do dia que passam pelos filtros, menos `ignorar` (para contar as opções do painel). */
function visiveis(f, ignorar = null) {
  return (tarefas ?? []).filter((t) => !excluindo.has(t.id)
    && (ignorar === "tipo" || !f.tipo || t.tipo === f.tipo)
    && (ignorar === "responsavel" || !f.responsavel || doResponsavel(t, f.responsavel))
    && (ignorar === "imovel" || !f.imovel || t.imovel.id === f.imovel));
}

// Filtros.

const filtroTipo = ligarFiltro(document.querySelector('[data-filtro="tipo"]'), {rotulo: "Tipo", montar: montarTipo});
const filtroResponsavel = ligarFiltro(document.querySelector('[data-filtro="responsavel"]'),
  {rotulo: "Responsável", montar: montarResponsavel});
const filtroImovel = ligarFiltro(document.querySelector('[data-filtro="imovel"]'), {rotulo: "Imóvel", montar: montarImovel});

function painelDeEscolha(painel, nome, legenda, marcada, opcoes) {
  renderizar(painel, escolhas({nome, legenda, tipo: "radio", marcadas: [marcada ?? ""], opcoes}));
  painel.querySelector("fieldset").addEventListener("change", (evento) => trocarFiltro(nome, evento.target.value || null));
}

function montarTipo(painel) {
  const f = filtros();
  const base = visiveis(f, "tipo");
  painelDeEscolha(painel, "tipo", "Tipo", f.tipo, [{valor: "", rotulo: "Todos", contagem: base.length},
    ...Object.entries(TIPOS).map(([valor, rotulo]) => ({valor, rotulo, contagem: base.filter((t) => t.tipo === valor).length}))]);
}

// As opções por nome: as ativas e as que aparecem nas tarefas do dia (uma pessoa desativada, um
// imóvel parado).
function porNome(ativos, daTarefa) {
  const nomes = new Map(ativos.map((item) => [item.id, item.nome]));
  for (const t of tarefas ?? []) {
    const item = daTarefa(t);
    if (item) nomes.set(item.id, item.nome);
  }
  return [...nomes].map(([id, nome]) => ({id, nome})).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
const pessoasDoFiltro = () => porNome(equipe.filter((p) => p.ativo), (t) => t.responsavel);
const imoveisDoFiltro = () => porNome(imoveis.filter((i) => i.ativo), (t) => t.imovel);

function montarResponsavel(painel) {
  const f = filtros();
  const base = visiveis(f, "responsavel");
  painelDeEscolha(painel, "responsavel", "Responsável", f.responsavel, [{valor: "", rotulo: "Todos", contagem: base.length},
    {valor: "nenhum", rotulo: "Sem responsável", contagem: base.filter((t) => !t.responsavel).length},
    ...pessoasDoFiltro().map((p) => ({valor: String(p.id), rotulo: p.nome,
      contagem: base.filter((t) => t.responsavel?.id === p.id).length}))]);
}

function montarImovel(painel) {
  const f = filtros();
  const base = visiveis(f, "imovel");
  painelDeEscolha(painel, "imovel", "Imóvel", f.imovel === null ? null : String(f.imovel),
    [{valor: "", rotulo: "Todos", contagem: base.length},
      ...imoveisDoFiltro().map((i) => ({valor: String(i.id), rotulo: i.nome, contagem: base.filter((t) => t.imovel.id === i.id).length}))]);
}

function rotularFiltros(f) {
  filtroTipo.rotular(f.tipo ? TIPOS[f.tipo] : "Todos", Boolean(f.tipo));
  const pessoa = f.responsavel === "nenhum" ? "Sem responsável"
    : pessoasDoFiltro().find((p) => p.id === Number(f.responsavel))?.nome ?? "1 pessoa";
  filtroResponsavel.rotular(f.responsavel ? pessoa : "Todos", Boolean(f.responsavel));
  filtroImovel.rotular(f.imovel ? imoveisDoFiltro().find((i) => i.id === f.imovel)?.nome ?? "1 imóvel" : "Todos", Boolean(f.imovel));
  botaoLimpar.hidden = !filtrosAtivos(f);
}

// Lista.

function linhaDaTarefa(t) {
  const estado = estadoVisivel(t);
  return html`<li class="linha linha-tarefa" data-id="${t.id}">
    <span class="linha__inicio">${gema(estado)}</span>
    <p class="linha-tarefa__titulo"><a class="linha__link" href="?tarefa=${t.id}" data-tarefa="${t.id}">${t.titulo}</a><span
      class="linha-tarefa__imovel"> · <a class="acima" href="/imoveis/${t.imovel.id}">${t.imovel.nome}</a></span></p>
    <div class="linha-tarefa__info">
      <span class="linha-tarefa__responsavel">${responsavelDaTarefa(t)}</span>
      <span class="linha-tarefa__horario numero">${horarioDaTarefa(t)}${t.status === "em_andamento" && t.atrasada
        ? html`<span class="texto-atraso"> · atrasada</span>` : ""}</span>
    </div>
    <span class="linha-tarefa__estado">${chip(estado)}</span>
    <button type="button" class="botao botao--icone botao--fantasma botao--sm acima" data-acoes="${t.id}"
      aria-label="Ações de ${t.titulo}, ${t.imovel.nome}">${icone("acoes")}</button>
  </li>`;
}

const grupo = (chave, titulo, lista) => html`<section class="grupo-tarefas" aria-labelledby="grupo-${chave}">
    <h2 class="grupo-tarefas__titulo" id="grupo-${chave}">${titulo} <span class="grupo-tarefas__contagem numero">${lista.length}</span></h2>
    <ul class="lista" role="list">${lista.map(linhaDaTarefa)}</ul>
  </section>`;

const concluidas = (lista) => html`<details class="grupo-tarefas grupo-tarefas--concluidas" ${concluidasAbertas ? "open" : ""}>
    <summary class="grupo-tarefas__titulo">${icone("proximo")}${plural(lista.length, "concluída", "concluídas")}</summary>
    <ul class="lista" role="list">${lista.map(linhaDaTarefa)}</ul>
  </details>`;

function novaTarefa() {
  const f = filtros();
  abrirGaveta("tarefa", "nova", {preencher: {dia: f.dia >= isoDoDia() ? f.dia : null, tipo: f.tipo, imovelId: f.imovel,
    funcionarioId: ID.test(f.responsavel ?? "") ? Number(f.responsavel) : null}});
}

function desenhar() {
  const f = filtros();
  chaveDesenhada = JSON.stringify([f, [...excluindo]]);
  rotularFiltros(f);
  const lista = visiveis(f);
  const atrasadas = lista.filter((t) => t.atrasada).length;
  contexto.textContent = [data(f.dia), ...(lista.length ? [plural(lista.length, "tarefa", "tarefas")] : []),
    ...(atrasadas ? [plural(atrasadas, "atrasada", "atrasadas")] : [])].join(" · ");
  if (!lista.length) {
    if (filtrosAtivos(f) && visiveis({...f, tipo: null, responsavel: null, imovel: null}).length) {
      vazio(area, {texto: "Nenhuma tarefa com esses filtros neste dia.", acao: {rotulo: "Limpar filtros", fazer: limparFiltros}});
    } else {
      vazio(area, {texto: `Dia livre: nenhuma tarefa marcada para ${data(f.dia)}.`, acao: {rotulo: "Nova tarefa", fazer: novaTarefa}});
    }
    return;
  }
  const g = agruparTarefas(lista);
  renderizar(area, html`${GRUPOS.filter(([chave]) => g[chave].length).map(([chave, titulo]) => grupo(chave, titulo, g[chave]))}
    ${g.concluidas.length ? concluidas(g.concluidas) : ""}`);
  const porId = new Map(lista.map((t) => [t.id, t]));
  for (const botao of area.querySelectorAll("[data-acoes]")) {
    ligarMenu(botao, itensDaTarefa(porId.get(Number(botao.dataset.acoes)), {aoMarcar: marcarDaLista, aoExcluir: excluirDaLista}));
  }
  area.querySelector("details")?.addEventListener("toggle", (evento) => {
    concluidasAbertas = evento.target.open;
  });
}

async function carregar() {
  const f = filtros();
  const meu = ++pedido;
  if (f.dia !== diaCarregado) {
    tarefas = null;
    contexto.textContent = data(f.dia);
    esqueleto(area);
  }
  area.setAttribute("aria-busy", "true");
  try {
    const resposta = await api.get("/api/tarefas", {dia: f.dia});
    if (meu !== pedido) return;
    tarefas = resposta.tarefas;
    diaCarregado = f.dia;
    esconderFaixa(area);
    desenhar();
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    erro(area, {mensagem: "Não deu para carregar as tarefas.", tentarDeNovo: carregar});
  } finally {
    if (meu === pedido) area.removeAttribute("aria-busy");
  }
}

const marcarDaLista = (tarefa, novo) => marcarTarefa(tarefa, novo, {depois: carregar});

function excluirDaLista(tarefa) {
  excluirTarefa(tarefa, {
    esconder: () => {
      const linhas = [...area.querySelectorAll(".linha-tarefa")];
      const i = linhas.findIndex((linha) => Number(linha.dataset.id) === tarefa.id);
      const vizinha = linhas[i + 1] ?? linhas[i - 1];
      excluindo.add(tarefa.id);
      desenhar();
      (vizinha && area.querySelector(`[data-id="${vizinha.dataset.id}"] .linha__link`) || document.querySelector("[data-novo]")).focus();
    },
    mostrar: () => {
      excluindo.delete(tarefa.id);
      desenhar();
    },
    depois: async () => {
      await carregar();
      excluindo.delete(tarefa.id);
    },
  });
}

// Ligações da página.

const seletor = seletorPeriodo(document.querySelector("[data-periodo]"), {modo: "dia", valor: filtros().dia,
  aoMudar: (novo) => trocarFiltro("dia", novo === isoDoDia() ? null : novo)});
botaoLimpar.addEventListener("click", limparFiltros);
document.querySelector("[data-novo]").addEventListener("click", novaTarefa);
area.addEventListener("click", (evento) => {
  const link = evento.target.closest("[data-tarefa]");
  if (!link || !cliqueComum(evento)) return;
  evento.preventDefault();
  abrirGaveta("tarefa", Number(link.dataset.tarefa));
});

// Os nomes dos filtros Responsável e Imóvel; a lista não espera por eles.
carregarEquipe().then((lista) => {
  equipe = lista;
  rotularFiltros(filtros());
}, () => {});
carregarImoveis().then((lista) => {
  imoveis = lista;
  rotularFiltros(filtros());
}, () => {});

ligarGavetas({
  tarefa: gavetaTarefa({depois: carregar, aoExcluir: excluirDaLista}),
  reserva: gavetaReserva(),
});

aoMudar(() => {
  const f = filtros();
  seletor.definir(f.dia);
  if (f.dia !== diaCarregado) carregar();
  else if (tarefas && JSON.stringify([f, [...excluindo]]) !== chaveDesenhada) desenhar();
});

iniciarCasca({recarregar: carregar});
carregar();
