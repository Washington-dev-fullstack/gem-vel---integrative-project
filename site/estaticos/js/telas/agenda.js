// Agenda (DESIGN.md §4; protótipo em design/exploracoes/admin.*): um mês por vez, uma linha por imóvel
// ativo, a reserva como faceta (entrada 15:00, saída 11:00), os bloqueios listrados, as tarefas abertas
// como gemas e a linha do agora. Arrastar numa linha vazia abre a nova reserva já preenchida; "Nova
// reserva" no cabeçalho é o caminho pelo teclado. A tabela equivalente mostra os mesmos dados.

import {api} from "../nucleo/api.js";
import {data, dataCurta, dinheiro, dinheiroSemCentavos, horario, intervalo, isoDoDia} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {podeAnimar, primeiraVisita} from "../nucleo/nivel.js";
import {barraNaAgenda, diasDoMes, mesPorExtenso, periodoDoArraste, posicaoNoTempo} from "../nucleo/painel.js";
import {primeiroNome} from "../nucleo/tarefas.js";
import {abrirGaveta, aoMudar, cliqueComum, lerEstado, trocarFiltro} from "../nucleo/url.js";
import {avisar} from "../componentes/aviso.js";
import {ligarDicas} from "../componentes/dica.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {estadoVisivel, gema, ROTULO_DO_ESTADO} from "../componentes/pecas.js";
import {conflitoDe, contarNoites, fraseConflito, noitesPorExtenso} from "../componentes/seletor-datas.js";
import {seletorPeriodo} from "../componentes/seletor-periodo.js";
import {iniciarCasca} from "../componentes/shell.js";
import {enderecoDaGaveta} from "../componentes/tabela-reservas.js";
import {gavetaBloqueio} from "../gavetas/bloqueio.js";
import {gavetaHospede} from "../gavetas/hospede.js";
import {carregarImoveis, gavetaReserva, pilulaDaSituacao, SITUACOES} from "../gavetas/reserva.js";
import {gavetaTarefa} from "../gavetas/tarefa.js";
import {ir} from "../nucleo/enderecos.js";

const pagina = document.querySelector("[data-pagina]");
const $ = (seletor) => pagina.querySelector(seletor);
const secao = $("[data-agenda]");
const rolagem = $("[data-rolagem]");
const areaTabela = $("[data-tabela]");
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const CLASSE_DA_SITUACAO = {em_curso: "estadia", futura: "futura", concluida: "passada"};
const CORTE = "cubic-bezier(.16, 1, .3, 1)"; // ease-entrance, 400ms (DESIGN.md §10, corte de faceta)
const LARGURA_DOS_IMOVEIS = 220;
const abertura = podeAnimar() && primeiraVisita();
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const porcento = (fracao) => `${(fracao * 100).toFixed(4)}%`;
const doisDigitos = (n) => String(n).padStart(2, "0");

// Estado da tela.
let pedido = 0;
let mesPedido = null;
let vista = null; // {mes, dias, ativos, nomes, reservas, bloqueios, tarefas}
let arraste = null;

const mesAtual = () => isoDoDia().slice(0, 7);

function mesDaUrl() {
  const mes = lerEstado().filtros.mes;
  return MES.test(mes ?? "") ? mes : mesAtual();
}

function diaDaSemana(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

function diaAnterior(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return isoDoDia(new Date(ano, mes - 1, dia - 1));
}

function agoraNaVista(inicio, dias) {
  const agora = new Date();
  return posicaoNoTempo(`${isoDoDia(agora)}T${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`, inicio, dias);
}

// As peças da linha do tempo.

function estiloDaBarra(posicao) {
  return `left: ${porcento(posicao.esquerda)}; width: ${porcento(posicao.largura)};`
    + `${posicao.cortadaAntes ? " --sl: 0px;" : ""}${posicao.cortadaDepois ? " --sr: 0px;" : ""}`;
}

const curta = (posicao, dias) => (posicao.largura * dias < 1.2 ? " barra--curta" : "");

function barraDaReserva(r, inicio, dias) {
  const posicao = barraNaAgenda({entrada: r.data_entrada, saida: r.data_saida}, inicio, dias);
  if (!posicao) return "";
  const descricao = `${r.hospede.nome} · ${intervalo(r.data_entrada, r.data_saida)} · ${noitesPorExtenso(r.noites)} · ${SITUACOES[r.situacao]}`;
  return html`<a class="barra barra--${CLASSE_DA_SITUACAO[r.situacao]}${curta(posicao, dias)}" style="${estiloDaBarra(posicao)}"
    href="${enderecoDaGaveta("reserva", r.id)}" data-reserva="${r.id}" aria-label="${descricao}" data-dica="${descricao}">
    <span class="barra__nome">${r.hospede.nome}</span></a>`;
}

function barraDoBloqueio(b, inicio, dias) {
  const posicao = barraNaAgenda({entrada: b.data_inicio, saida: b.data_fim}, inicio, dias);
  if (!posicao) return "";
  const descricao = `Bloqueio · ${intervalo(b.data_inicio, b.data_fim)} · ${b.motivo}`;
  return html`<a class="barra barra--bloqueio${curta(posicao, dias)}" style="${estiloDaBarra(posicao)}" href="/imoveis/${b.imovel_id}"
    aria-label="${descricao}" data-dica="${descricao}"><span class="barra__nome">${b.motivo}</span></a>`;
}

/** A gema fica no meio da janela da tarefa quando o prazo é no mesmo dia (a limpeza, entre 11:00 e 15:00). */
function gemaDaTarefa(t, inicio, dias) {
  const agendada = posicaoNoTempo(t.agendada_para, inicio, dias);
  const mesmoDia = t.prazo && t.prazo.slice(0, 10) === t.agendada_para.slice(0, 10);
  const prazo = mesmoDia ? posicaoNoTempo(t.prazo, inicio, dias) : null;
  const x = agendada !== null && prazo !== null ? (agendada + prazo) / 2 : agendada;
  if (x === null) return "";
  const estado = estadoVisivel(t);
  const descricao = `${t.titulo} · ${ROTULO_DO_ESTADO[estado]} · ${dataCurta(t.agendada_para)}, ${horario(t.agendada_para)}`;
  return html`<a class="agenda__gema" style="left: ${porcento(x)}" href="${enderecoDaGaveta("tarefa", t.id)}" data-tarefa="${t.id}"
    aria-label="${descricao}" data-dica="${descricao}">${gema(estado)}</a>`;
}

function linhaDoImovel(imovel, inicio, dias) {
  const {reservas, bloqueios, tarefas} = vista;
  return html`<div class="agenda__linha" role="group" aria-label="${imovel.nome}">
    <div class="agenda__imovel"><a class="agenda__nome" href="/imoveis/${imovel.id}">${imovel.nome}</a>
      <small class="numero">${imovel.bairro} · ${dinheiroSemCentavos(imovel.valor_diaria)}/noite</small></div>
    <div class="agenda__pista" data-imovel="${imovel.id}">
      ${reservas.filter((r) => r.imovel.id === imovel.id).map((r) => barraDaReserva(r, inicio, dias))}
      ${bloqueios.filter((b) => b.imovel_id === imovel.id).map((b) => barraDoBloqueio(b, inicio, dias))}
      ${tarefas.filter((t) => t.imovel.id === imovel.id).map((t) => gemaDaTarefa(t, inicio, dias))}
    </div>
  </div>`;
}

/** Noites ocupadas em cada dia do mês: o número e um medidor (ocupados ÷ ativos que não estão bloqueados). */
function ocupacaoDaNoite(dia) {
  const {ativos, reservas, bloqueios} = vista;
  const ocupados = new Set(reservas.filter((r) => r.data_entrada <= dia && dia < r.data_saida).map((r) => r.imovel.id));
  const bloqueados = new Set(bloqueios.filter((b) => b.data_inicio <= dia && dia < b.data_fim && !ocupados.has(b.imovel_id))
    .map((b) => b.imovel_id));
  const quantos = ativos.filter((i) => ocupados.has(i.id)).length;
  const livres = ativos.filter((i) => !bloqueados.has(i.id)).length;
  return html`<div class="agenda__noite"><span class="numero">${quantos}</span>
    <span class="medidor medidor--fino"><span class="medidor__valor" style="--valor: ${livres ? quantos / livres : 0}"></span></span></div>`;
}

function desenharLinhaDoTempo() {
  const {dias, ativos} = vista;
  const inicio = dias[0];
  const hoje = isoDoDia();
  const marcas = (dia) => html`${[0, 6].includes(diaDaSemana(dia)) ? html`data-fds` : ""} ${dia === hoje ? html`data-hoje` : ""}`;
  const agora = agoraNaVista(inicio, dias.length);
  renderizar(rolagem, html`<div class="agenda__grade" style="--dias: ${dias.length}; --esquerda: ${LARGURA_DOS_IMOVEIS}px">
    <div class="agenda__cabeca" aria-hidden="true"><div class="agenda__canto">Imóveis</div>
      <div class="agenda__dias">${dias.map((dia) => html`<div class="agenda__dia" ${marcas(dia)}>
        <span>${SEMANA[diaDaSemana(dia)]}</span><b class="numero">${Number(dia.slice(8))}</b></div>`)}</div></div>
    <div class="agenda__linhas">
      <div class="agenda__fundo" aria-hidden="true">${dias.map((dia) => html`<i ${marcas(dia)}></i>`)}</div>
      ${ativos.map((imovel) => linhaDoImovel(imovel, inicio, dias.length))}
      ${agora === null ? "" : html`<div class="agenda__agora" style="--x: ${agora}" aria-hidden="true"></div>`}
    </div>
    <div class="agenda__pe" aria-hidden="true"><div class="agenda__canto">Ocupação</div>
      <div class="agenda__dias">${dias.map(ocupacaoDaNoite)}</div></div>
  </div>`);
}

// A tabela equivalente: as mesmas reservas e os mesmos bloqueios, pela data de entrada.

function desenharTabela() {
  const {mes, dias, ativos, nomes, reservas, bloqueios} = vista;
  const visiveis = new Set(ativos.map((i) => i.id));
  const inicio = dias[0];
  const naVista = (entrada, saida) => barraNaAgenda({entrada, saida}, inicio, dias.length) !== null;
  const linhas = [
    ...reservas.filter((r) => visiveis.has(r.imovel.id) && naVista(r.data_entrada, r.data_saida))
      .map((r) => ({entrada: r.data_entrada, id: r.id, trecho: html`<tr>
        <td><a class="tabela__link" href="${enderecoDaGaveta("reserva", r.id)}" data-reserva="${r.id}">${r.hospede.nome}</a></td>
        <td>${r.imovel.nome}</td><td class="numero">${data(r.data_entrada)}</td><td class="numero">${data(r.data_saida)}</td>
        <td class="numero" data-alinhar="direita">${r.noites}</td>
        <td class="numero" data-alinhar="direita"><span class="valor">${dinheiro(r.valor_total)}</span></td>
        <td>${pilulaDaSituacao(r.situacao)}</td></tr>`})),
    ...bloqueios.filter((b) => visiveis.has(b.imovel_id) && naVista(b.data_inicio, b.data_fim))
      .map((b) => ({entrada: b.data_inicio, id: 0, trecho: html`<tr>
        <td><a class="tabela__link" href="/imoveis/${b.imovel_id}">Bloqueio · ${b.motivo}</a></td>
        <td>${nomes.get(b.imovel_id)}</td><td class="numero">${data(b.data_inicio)}</td><td class="numero">${data(b.data_fim)}</td>
        <td class="numero" data-alinhar="direita">${contarNoites(b.data_inicio, b.data_fim)}</td>
        <td class="numero" data-alinhar="direita">–</td><td><span class="pilula">Bloqueio</span></td></tr>`})),
  ].sort((a, b) => a.entrada.localeCompare(b.entrada) || a.id - b.id);
  if (!linhas.length) {
    vazio(areaTabela, {texto: "Nenhuma reserva neste mês.", detalhe: "Arraste numa linha da agenda ou use Nova reserva.",
      acao: {rotulo: "Nova reserva", fazer: () => abrirGaveta("reserva", "nova")}});
    return;
  }
  renderizar(areaTabela, html`<div class="tabela-cartao"><table class="tabela">
    <caption class="visualmente-oculto">Reservas e bloqueios de ${mesPorExtenso(mes)}</caption>
    <thead><tr><th scope="col">Hóspede</th><th scope="col">Imóvel</th><th scope="col">Entrada</th><th scope="col">Saída</th>
      <th scope="col" data-alinhar="direita">Noites</th><th scope="col" data-alinhar="direita">Valor</th><th scope="col">Situação</th></tr></thead>
    <tbody>${linhas.map((l) => l.trecho)}</tbody></table></div>`);
}

// O corte de faceta (DESIGN.md §10, item 1): na primeira visita da sessão e quando a barra nasce.
function lapidar(barras, gemas = []) {
  barras.forEach((barra, i) => barra.animate([{"--rv": 0}, {"--rv": 1}],
    {duration: 400, delay: 80 + Math.min(i, 30) * 14, easing: CORTE, fill: "backwards"}));
  gemas.forEach((g, i) => g.animate([{opacity: 0, transform: "scale(.8)"}, {opacity: 1, transform: "none"}],
    {duration: 300, delay: 360 + Math.min(i, 20) * 20, easing: CORTE, fill: "backwards"}));
}

function desenhar(anterior) {
  const {mes, dias, ativos} = vista;
  const noMes = vista.reservas.filter((r) => ativos.some((i) => i.id === r.imovel.id)
    && r.data_entrada <= dias.at(-1) && r.data_saida > dias[0]).length;
  $("[data-contexto]").textContent = `${plural(ativos.length, "imóvel", "imóveis")} · ${plural(noMes, "reserva", "reservas")} em ${mesPorExtenso(mes)}`;
  desenharTabela();
  if (!ativos.length) {
    vazio(rolagem, {texto: "Nenhum imóvel ativo.", detalhe: "A agenda mostra uma linha por imóvel ativo.",
      acao: {rotulo: "Novo imóvel", fazer: () => ir("/imoveis?imovel=novo")}});
    return;
  }
  desenharLinhaDoTempo();
  if (anterior?.mes !== mes) {
    // Mês novo: o dia de hoje à vista quando a grade é mais larga que a tela.
    const agora = agoraNaVista(dias[0], dias.length);
    const pistas = rolagem.scrollWidth - LARGURA_DOS_IMOVEIS;
    rolagem.scrollLeft = agora === null ? 0 : Math.max(0, agora * pistas - (rolagem.clientWidth - LARGURA_DOS_IMOVEIS) / 3);
  }
  if (!podeAnimar()) return;
  if (!anterior && abertura) lapidar(rolagem.querySelectorAll(".barra"), rolagem.querySelectorAll(".agenda__gema"));
  else if (anterior?.mes === mes) {
    const ja = new Set(anterior.reservas.map((r) => r.id));
    lapidar(vista.reservas.filter((r) => !ja.has(r.id)).map((r) => rolagem.querySelector(`[data-reserva="${r.id}"]`)).filter(Boolean));
  }
}

async function carregar() {
  const meu = ++pedido;
  const mes = mesDaUrl();
  mesPedido = mes;
  const dias = diasDoMes(mes);
  if (!vista) esqueleto(rolagem, 6);
  pagina.setAttribute("aria-busy", "true");
  try {
    // Desde a véspera do dia 1: a ponta da manhã de quem sai no dia 1 aparece.
    const periodo = {de: diaAnterior(dias[0]), ate: dias.at(-1)};
    const [imoveis, {reservas}, {bloqueios}, {tarefas}] = await Promise.all([carregarImoveis({deNovo: true}),
      api.get("/api/reservas", periodo), api.get("/api/bloqueios", periodo), api.get("/api/tarefas")]);
    if (meu !== pedido) return;
    const anterior = vista;
    vista = {mes, dias, ativos: imoveis.filter((i) => i.ativo), nomes: new Map(imoveis.map((i) => [i.id, i.nome])),
      reservas: reservas.filter((r) => r.status !== "cancelada"), bloqueios, tarefas};
    esconderFaixa(pagina);
    desenhar(anterior);
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    rolagem.querySelector(":scope > .esqueleto")?.remove();
    erro(pagina, {mensagem: "Não deu para carregar a agenda.", tentarDeNovo: carregar});
  } finally {
    if (meu === pedido) pagina.removeAttribute("aria-busy");
  }
}

// Arrastar numa linha vazia: o rascunho mostra as noites e o valor, ou o conflito.

function diaNoPonto(pista, x) {
  const caixa = pista.getBoundingClientRect();
  const dias = vista.dias.length;
  return Math.min(Math.max(Math.floor(((x - caixa.left) / caixa.width) * dias), 0), dias - 1);
}

function atualizarRascunho() {
  const {imovel, de, ate, rascunho} = arraste;
  const inicio = vista.dias[0];
  const periodo = periodoDoArraste(inicio, de, ate);
  const posicao = barraNaAgenda(periodo, inicio, vista.dias.length);
  rascunho.style.left = porcento(posicao.esquerda);
  rascunho.style.width = porcento(posicao.largura);
  const conflito = conflitoDe(periodo, vista.reservas.filter((r) => r.imovel.id === imovel.id),
    vista.bloqueios.filter((b) => b.imovel_id === imovel.id));
  const noites = contarNoites(periodo.entrada, periodo.saida);
  rascunho.toggleAttribute("data-conflito", Boolean(conflito));
  rascunho.textContent = !conflito ? `${noitesPorExtenso(noites)} · ${dinheiroSemCentavos(Number(imovel.valor_diaria) * noites)}`
    : conflito.tipo === "reserva" ? `Conflito com ${primeiroNome(conflito.reserva.hospede.nome)}` : "Bloqueado";
  Object.assign(arraste, {periodo, conflito});
}

function largarRascunho() {
  arraste?.rascunho.remove();
  arraste = null;
}

rolagem.addEventListener("pointerdown", (evento) => {
  const pista = evento.target.closest(".agenda__pista");
  if (!pista || !vista || evento.button !== 0 || evento.target.closest(".barra, .agenda__gema")) return;
  evento.preventDefault();
  const rascunho = document.createElement("div");
  rascunho.className = "agenda__fantasma";
  rascunho.setAttribute("aria-hidden", "true");
  pista.append(rascunho);
  pista.setPointerCapture(evento.pointerId);
  const dia = diaNoPonto(pista, evento.clientX);
  arraste = {pista, rascunho, ponteiro: evento.pointerId, de: dia, ate: dia,
    imovel: vista.ativos.find((i) => i.id === Number(pista.dataset.imovel))};
  atualizarRascunho();
});

rolagem.addEventListener("pointermove", (evento) => {
  if (!arraste || evento.pointerId !== arraste.ponteiro) return;
  const dia = diaNoPonto(arraste.pista, evento.clientX);
  if (dia === arraste.ate) return;
  arraste.ate = dia;
  atualizarRascunho();
});

rolagem.addEventListener("pointerup", (evento) => {
  if (!arraste || evento.pointerId !== arraste.ponteiro) return;
  const {rascunho, conflito, periodo, imovel} = arraste;
  arraste = null;
  if (!conflito) {
    rascunho.remove();
    abrirGaveta("reserva", "nova", {preencher: {imovelId: imovel.id, ...periodo}});
    return;
  }
  avisar(fraseConflito(conflito));
  if (podeAnimar()) {
    rascunho.animate([{transform: "none"}, {transform: "translateX(-5px)"}, {transform: "translateX(5px)"},
      {transform: "translateX(-3px)"}, {transform: "none"}], {duration: 320, easing: "ease-out"});
  }
  setTimeout(() => rascunho.remove(), 650);
});

rolagem.addEventListener("pointercancel", largarRascunho);

// Ligações da página.

const seletor = seletorPeriodo($("[data-periodo]"), {modo: "mes", valor: mesDaUrl(),
  aoMudar: (novo) => trocarFiltro("mes", novo === mesAtual() ? null : novo)});

const alternar = $("[data-alternar]");
alternar.addEventListener("click", () => {
  const aberta = alternar.getAttribute("aria-pressed") !== "true";
  alternar.setAttribute("aria-pressed", String(aberta));
  secao.hidden = aberta;
  areaTabela.hidden = !aberta;
  $(".agenda-dica").hidden = aberta;
});

pagina.addEventListener("click", (evento) => {
  const link = evento.target.closest("[data-reserva], [data-tarefa]");
  if (!link || !cliqueComum(evento)) return;
  evento.preventDefault();
  if (link.dataset.reserva) abrirGaveta("reserva", Number(link.dataset.reserva));
  else abrirGaveta("tarefa", Number(link.dataset.tarefa));
});
$("[data-nova]").addEventListener("click", () => abrirGaveta("reserva", "nova"));
$("[data-bloquear]").addEventListener("click", () => abrirGaveta("bloqueio", "novo"));

ligarDicas(secao);
ligarGavetas({
  reserva: gavetaReserva({depois: carregar}),
  hospede: gavetaHospede({depois: carregar}),
  tarefa: gavetaTarefa({depois: carregar}),
  bloqueio: gavetaBloqueio({depois: carregar}),
});

aoMudar(() => {
  const mes = mesDaUrl();
  seletor.definir(mes);
  if (mes !== mesPedido) carregar();
});

iniciarCasca({recarregar: carregar});
carregar();
