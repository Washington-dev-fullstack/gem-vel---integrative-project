// Visão geral (web-admin.md §9; DESIGN.md §4 e §5): a saudação, o painel Hoje, o desempenho do mês
// (com o mês na URL), os dois gráficos com a tabela equivalente e a atividade recente. A abertura
// coreografada roda só na primeira visita da sessão; depois, a tela aparece pronta.

import {api} from "../nucleo/api.js";
import {data, dataCurta, dinheiro, dinheiroSemCentavos, horario, isoDoDia, quandoFoi} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {podeAnimar, primeiraVisita} from "../nucleo/nivel.js";
import {escalaDoEixo, mesAbreviado, mesPorExtenso, saudacao} from "../nucleo/painel.js";
import {fraseDoRegistro, primeiroNome} from "../nucleo/tarefas.js";
import {abrirGaveta, aoMudar, cliqueComum, lerEstado, trocarFiltro} from "../nucleo/url.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {avatar, gema} from "../componentes/pecas.js";
import {seletorPeriodo} from "../componentes/seletor-periodo.js";
import {iniciarCasca} from "../componentes/shell.js";
import {tambor} from "../componentes/tambor.js";
import {gavetaHospede} from "../gavetas/hospede.js";
import {prontidaoDe} from "../gavetas/imovel.js";
import {carregarImoveis, gavetaReserva} from "../gavetas/reserva.js";
import {gavetaTarefa} from "../gavetas/tarefa.js";
import {ir} from "../nucleo/enderecos.js";

const painel = document.querySelector("[data-painel]");
const $ = (seletor) => painel.querySelector(seletor);
const areaReceita = $('[data-grafico="receita"]');
const areaOcupacao = $('[data-grafico="ocupacao"]');
const areaAtividade = $("[data-atividade]");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const primeiraMaiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
const duasCasas = (n) => Math.round(n * 100) / 100;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const COMPACTO = new Intl.NumberFormat("pt-BR", {notation: "compact", maximumFractionDigits: 1});
const SUBIR = "cubic-bezier(.215, .61, .355, 1)"; // power3.out (DESIGN.md §10, cascata e "o dado cresce")
const abertura = podeAnimar() && primeiraVisita();

// Estado da tela.
let pedido = 0;
let dados = null;
let imoveis = new Map();
let larguraDesenhada = 0;
let cresceu = false;

const mesAtual = () => isoDoDia().slice(0, 7);

function mesDaUrl() {
  const mes = lerEstado().filtros.mes;
  return MES.test(mes ?? "") ? mes : mesAtual();
}

// Hoje: chegadas, saídas e o que precisa de atenção.

function linhaDaReserva(reserva, tipo) {
  const imovel = imoveis.get(reserva.imovel.id);
  const hora = imovel ? horario(tipo === "chegada" ? imovel.horario_entrada : imovel.horario_saida) : "";
  return html`<li class="hoje__item">
    <span class="hoje__hora numero">${hora}</span>
    <div class="hoje__quem"><a class="hoje__link" href="?reserva=${reserva.id}" data-reserva="${reserva.id}">${reserva.hospede.nome}</a>
      <span class="hoje__detalhe">${reserva.imovel.nome} · ${plural(reserva.noites, "noite", "noites")}</span></div>
    ${imovel ? prontidaoDe(imovel) : ""}
  </li>`;
}

function linhaDeAtencao(tarefa, hoje) {
  const limite = tarefa.prazo ?? tarefa.agendada_para;
  const quando = tarefa.atrasada
    ? html`<span class="texto-atraso">${limite.slice(0, 10) === hoje ? `venceu às ${horario(limite)}` : `venceu em ${dataCurta(limite)}`}</span>`
    : horario(tarefa.agendada_para);
  return html`<li class="hoje__item hoje__item--atencao">${gema(tarefa.atrasada ? "atrasada" : "pendente")}
    <div class="hoje__quem"><a class="hoje__link" href="?tarefa=${tarefa.id}" data-tarefa="${tarefa.id}">${tarefa.titulo}</a>
      <span class="hoje__detalhe">${tarefa.imovel.nome} · ${tarefa.responsavel?.nome ?? "sem responsável"} · ${quando}</span></div>
    ${tarefa.responsavel ? "" : html`<a class="botao botao--secundario botao--sm acima" href="/tarefas?responsavel=nenhum&dia=${hoje}">Atribuir</a>`}
  </li>`;
}

function contagem(nome, valor, alerta = false) {
  const numero = $(`[data-contagem="${nome}"]`);
  tambor(numero, String(valor));
  numero.parentElement.toggleAttribute("data-alerta", alerta);
}

function desenharHoje({chegadas, saidas, atencao}) {
  const hoje = isoDoDia();
  const listas = [["[data-chegadas]", chegadas, "Nenhuma chegada hoje.", "chegada"], ["[data-saidas]", saidas, "Nenhuma saída hoje.", "saida"]];
  for (const [seletor, reservas, semNada, tipo] of listas) {
    renderizar($(seletor), reservas.length ? html`${reservas.map((r) => linhaDaReserva(r, tipo))}`
      : html`<li class="hoje__vazio">${semNada}</li>`);
  }
  renderizar($("[data-atencao]"), atencao.length ? html`${atencao.map((t) => linhaDeAtencao(t, hoje))}`
    : html`<li class="hoje__vazio">${gema("concluida")}Nada pedindo atenção agora.</li>`);
  const atrasadas = atencao.filter((t) => t.atrasada).length;
  contagem("chegadas", chegadas.length);
  contagem("saidas", saidas.length);
  contagem("atrasadas", atrasadas, atrasadas > 0);
  contagem("sem-responsavel", atencao.filter((t) => !t.responsavel).length);
  $("[data-resumo]").textContent = `${primeiraMaiuscula(data(hoje))} · ${plural(chegadas.length, "chegada", "chegadas")} e `
    + `${plural(saidas.length, "saída", "saídas")} hoje`;
}

// Desempenho: a faixa de KPIs e os dois gráficos.

function desenharKpis({receita, ocupacao, reservas, diaria_media: diaria}, mes) {
  tambor($('[data-kpi="receita"]'), dinheiroSemCentavos(receita));
  tambor($('[data-kpi="ocupacao"]'), `${ocupacao.percentual}%`);
  tambor($('[data-kpi="reservas"]'), String(reservas));
  tambor($('[data-kpi="diaria"]'), diaria === null ? "–" : dinheiroSemCentavos(diaria));
  $("[data-medidor]").style.setProperty("--valor", String(ocupacao.percentual / 100));
  $('[data-legenda="receita"]').textContent = primeiraMaiuscula(mesPorExtenso(mes));
  $('[data-legenda="ocupacao"]').textContent = `${ocupacao.noites} de ${ocupacao.noites_possiveis} noites`;
}

function colunaArredondada(x, topo, largura, altura, raio) {
  const r = Math.min(raio, largura / 2, altura);
  const base = topo + altura;
  return [`M${x} ${base}V${topo + r}Q${x} ${topo} ${x + r} ${topo}`,
    `H${x + largura - r}Q${x + largura} ${topo} ${x + largura} ${topo + r}V${base}Z`].join("");
}

const rotuloDoEixo = (valor) => (valor ? `R$ ${COMPACTO.format(valor)}` : "R$ 0");
const nomeDoMes = (mes) => `${mesAbreviado(mes)} ${mes.slice(0, 4)}`;

function graficoDeReceita(meses, escolhido) {
  const largura = Math.max(areaReceita.clientWidth, 320);
  larguraDesenhada = largura;
  const altura = 240;
  const margem = {esquerda: 56, direita: 4, topo: 24, base: 36};
  const util = {largura: largura - margem.esquerda - margem.direita, altura: altura - margem.topo - margem.base};
  const {topo, marcas} = escalaDoEixo(Math.max(...meses.map((m) => Number(m.receita))));
  const passo = util.largura / meses.length;
  const coluna = Math.min(32, passo * 0.58);
  const y = (valor) => duasCasas(margem.topo + util.altura - (valor / topo) * util.altura);
  const atual = mesAtual();
  renderizar(areaReceita, html`<svg class="grafico-receita" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}"
      aria-hidden="true" focusable="false">
    ${marcas.map((valor) => html`<line class="${valor ? "grafico-receita__grade" : "grafico-receita__base"}" x1="${margem.esquerda}"
        x2="${largura - margem.direita}" y1="${y(valor)}" y2="${y(valor)}"></line>
      <text x="${margem.esquerda - 10}" y="${y(valor) + 4}" text-anchor="end">${rotuloDoEixo(valor)}</text>`)}
    ${meses.map((item, i) => {
      const valor = Number(item.receita);
      const x = duasCasas(margem.esquerda + passo * i + (passo - coluna) / 2);
      const centro = duasCasas(x + coluna / 2);
      const alturaDaColuna = duasCasas((valor / topo) * util.altura);
      const previsto = item.mes > atual ? " grafico-receita__coluna--previsto" : "";
      return html`<g class="grafico-receita__mes${item.mes === escolhido ? " grafico-receita__mes--escolhido" : ""}">
        <rect class="grafico-receita__alvo" x="${duasCasas(margem.esquerda + passo * i)}" y="${margem.topo}" width="${duasCasas(passo)}"
          height="${util.altura}"></rect>
        ${alturaDaColuna > 0 ? html`<path class="grafico-receita__coluna${previsto}" d="${colunaArredondada(x, y(valor), coluna, alturaDaColuna, 4)}"></path>` : ""}
        <text class="grafico-receita__valor" x="${centro}" y="${y(valor) - 8}" text-anchor="middle">${dinheiroSemCentavos(valor)}</text>
        <text class="grafico-receita__rotulo" x="${centro}" y="${altura - margem.base + 17}" text-anchor="middle">${mesAbreviado(item.mes)}</text>
        ${i === 0 || item.mes.endsWith("-01")
          ? html`<text class="grafico-receita__ano" x="${centro}" y="${altura - margem.base + 30}" text-anchor="middle">${item.mes.slice(0, 4)}</text>` : ""}
      </g>`;
    })}
  </svg>`);
}

function desenharReceita(meses, escolhido) {
  graficoDeReceita(meses, escolhido);
  const total = meses.reduce((soma, m) => soma + Number(m.receita), 0);
  const periodo = `${nomeDoMes(meses[0].mes)} – ${nomeDoMes(meses.at(-1).mes)}`;
  $("[data-receita-sub]").textContent = `${periodo} · ${dinheiroSemCentavos(total)} em 12 meses`;
  $("[data-legenda-receita]").hidden = !meses.some((m) => m.mes > mesAtual());
  renderizar($('[data-tabela="receita"]'), html`<table class="tabela"><caption class="visualmente-oculto">Receita por mês, ${periodo}</caption>
    <thead><tr><th scope="col">Mês</th><th scope="col" data-alinhar="direita">Receita</th></tr></thead>
    <tbody>${meses.map((m) => html`<tr ${m.mes === escolhido ? html`aria-current="true"` : ""}>
      <th scope="row">${primeiraMaiuscula(mesPorExtenso(m.mes))}</th><td data-alinhar="direita">${dinheiro(m.receita)}</td></tr>`)}</tbody></table>`);
}

function desenharOcupacao(linhas, media) {
  $("[data-ocupacao-sub]").textContent = `Noites ocupadas ÷ noites do mês · média de ${media}%`;
  if (!linhas.length) {
    vazio(areaOcupacao, {texto: "Nenhum imóvel ativo neste mês.", acao: {rotulo: "Novo imóvel", fazer: () => ir("/imoveis?imovel=novo")}});
    renderizar($('[data-tabela="ocupacao"]'), html``);
    return;
  }
  // O desenho é para quem vê; o leitor de tela lê a tabela, sem links escondidos no caminho do Tab.
  renderizar(areaOcupacao, html`<ul class="ocupacao" role="list" style="--media: ${media / 100}" aria-hidden="true">
    ${linhas.map((l) => html`<li class="ocupacao__linha">
      <a class="ocupacao__nome" href="/imoveis/${l.imovel.id}" tabindex="-1">${l.imovel.nome}</a>
      <span class="medidor ocupacao__barra"><span class="medidor__valor" style="--valor: ${l.percentual / 100}"></span></span>
      <span class="ocupacao__valor numero">${l.percentual}%</span></li>`)}</ul>`);
  renderizar($('[data-tabela="ocupacao"]'), html`<table class="tabela"><caption class="visualmente-oculto">Ocupação por imóvel, média de ${media}%</caption>
    <thead><tr><th scope="col">Imóvel</th><th scope="col" data-alinhar="direita">Noites</th><th scope="col" data-alinhar="direita">Ocupação</th></tr></thead>
    <tbody>${linhas.map((l) => html`<tr><th scope="row">${l.imovel.nome}</th><td data-alinhar="direita">${l.noites}</td>
      <td data-alinhar="direita">${l.percentual}%</td></tr>`)}</tbody></table>`);
}

// "O dado cresce" (DESIGN.md §10, item 4): só na primeira visita da sessão.
function crescer() {
  areaReceita.querySelectorAll(".grafico-receita__coluna").forEach((coluna, i) => coluna.animate(
    [{transform: "scaleY(0)"}, {transform: "scaleY(1)"}], {duration: 900, delay: 160 + i * 38, easing: SUBIR, fill: "backwards"}));
  areaOcupacao.querySelectorAll(".medidor__valor").forEach((barra, i) => {
    const valor = barra.style.getPropertyValue("--valor") || "0";
    barra.animate([{transform: "scaleX(0)"}, {transform: `scaleX(${valor})`}], {duration: 900, delay: 160 + i * 38, easing: SUBIR, fill: "backwards"});
  });
}

function desenhar() {
  const {mes, indicadores, receita_por_mes: meses, ocupacao_por_imovel: ocupacao, hoje} = dados;
  desenharHoje(hoje);
  desenharKpis(indicadores, mes);
  desenharReceita(meses, mes);
  desenharOcupacao(ocupacao, indicadores.ocupacao.percentual);
  if (abertura && !cresceu) crescer();
  cresceu = true;
}

async function carregar() {
  const meu = ++pedido;
  const mes = mesDaUrl();
  painel.setAttribute("aria-busy", "true");
  try {
    const [resposta, lista] = await Promise.all([api.get("/api/visao-geral", {mes}),
      carregarImoveis({deNovo: true}).catch(() => null)]);
    if (meu !== pedido) return;
    if (lista) imoveis = new Map(lista.map((imovel) => [imovel.id, imovel]));
    dados = resposta;
    esconderFaixa(painel);
    desenhar();
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    erro(painel, {mensagem: "Não deu para carregar a visão geral.", tentarDeNovo: carregar});
  } finally {
    if (meu === pedido) painel.removeAttribute("aria-busy");
  }
}

// Atividade recente: as 8 últimas mudanças de estado nas tarefas.

function linhaDaAtividade(registro) {
  const nome = primeiroNome(registro.usuario?.nome);
  return html`<li class="atividade__linha">${avatar(registro.usuario?.nome, {tamanho: "sm"})}
    <p class="atividade__frase"><strong>${nome}</strong>${fraseDoRegistro(registro).slice(nome.length)}
      <a class="link" href="?tarefa=${registro.tarefa.id}" data-tarefa="${registro.tarefa.id}">${registro.tarefa.titulo}</a>
      · ${registro.imovel.nome}</p>
    <time class="atividade__hora numero" datetime="${registro.registrado_em}">${quandoFoi(registro.registrado_em)}</time></li>`;
}

async function carregarAtividade() {
  try {
    const {atividade} = await api.get("/api/atividade", {limite: 8});
    esconderFaixa(areaAtividade);
    renderizar(areaAtividade, atividade.length ? html`<ul class="atividade" role="list">${atividade.map(linhaDaAtividade)}</ul>`
      : html`<p class="hoje__vazio">Nenhuma mudança nas tarefas ainda.</p>`);
  } catch (falha) {
    if (falha?.status !== 401) erro(areaAtividade, {mensagem: "Não deu para carregar a atividade.", tentarDeNovo: carregarAtividade});
  }
}

// Ligações da página.

const titulo = $("[data-saudacao]");
titulo.textContent = `${saudacao()}.`;

const seletor = seletorPeriodo($("[data-periodo]"), {modo: "mes", valor: mesDaUrl(),
  aoMudar: (novo) => trocarFiltro("mes", novo === mesAtual() ? null : novo)});

for (const botao of painel.querySelectorAll("[data-alternar]")) {
  botao.addEventListener("click", () => {
    const aberta = botao.getAttribute("aria-pressed") !== "true";
    const cartao = botao.closest(".grafico");
    botao.setAttribute("aria-pressed", String(aberta));
    cartao.toggleAttribute("data-tabela-aberta", aberta);
    cartao.querySelector(".grafico__tabela").classList.toggle("visualmente-oculto", !aberta);
    if (!aberta && dados && cartao.contains(areaReceita)) graficoDeReceita(dados.receita_por_mes, dados.mes);
  });
}

painel.addEventListener("click", (evento) => {
  const link = evento.target.closest("[data-reserva], [data-tarefa]");
  if (!link || !cliqueComum(evento)) return;
  evento.preventDefault();
  if (link.dataset.reserva) abrirGaveta("reserva", Number(link.dataset.reserva));
  else abrirGaveta("tarefa", Number(link.dataset.tarefa));
});
$("[data-nova-reserva]").addEventListener("click", () => abrirGaveta("reserva", "nova"));

// O gráfico de receita é desenhado na largura de verdade (texto nítido); muda junto com o cartão.
new ResizeObserver(() => {
  const largura = areaReceita.clientWidth;
  if (dados && largura && Math.abs(largura - larguraDesenhada) > 1) graficoDeReceita(dados.receita_por_mes, dados.mes);
}).observe(areaReceita);

const recarregarTudo = () => {
  carregar();
  carregarAtividade();
};

ligarGavetas({
  reserva: gavetaReserva({depois: carregar}),
  hospede: gavetaHospede({depois: carregar}),
  tarefa: gavetaTarefa({depois: recarregarTudo}),
});

aoMudar(() => {
  const mes = mesDaUrl();
  seletor.definir(mes);
  if (dados && mes !== dados.mes) carregar();
});

if (abertura) {
  painel.querySelectorAll("[data-bloco]").forEach((bloco, i) => bloco.animate(
    [{opacity: 0, transform: "translateY(14px)"}, {opacity: 1, transform: "none"}],
    {duration: 650, delay: i * 45, easing: SUBIR, fill: "backwards"}));
}

esqueleto(areaAtividade, 4);
iniciarCasca({recarregar: recarregarTudo}).then((usuario) => {
  if (usuario) titulo.textContent = `${saudacao()}, ${primeiroNome(usuario.nome)}.`;
});
carregar();
carregarAtividade();
