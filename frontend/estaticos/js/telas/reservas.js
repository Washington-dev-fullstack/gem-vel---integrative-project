// Tela Reservas (web-admin.md §4 e §10): a lista do período com os filtros na URL, a aba Hóspedes
// e as gavetas da reserva, do hóspede e do bloqueio.

import {api} from "../nucleo/api.js";
import {data, dataCurta, dinheiro, intervalo} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {abrirGaveta, aoMudar, cliqueComum, lerEstado, trocarFiltro, trocarFiltros} from "../nucleo/url.js";
import {ligarAbas} from "../componentes/abas.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {escolhas, ligarFiltro} from "../componentes/filtro.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {ligarMenu} from "../componentes/menu.js";
import {icone} from "../componentes/pecas.js";
import {seletorDatas} from "../componentes/seletor-datas.js";
import {cabecalhosDasReservas, enderecoDaGaveta, itensDaReserva, linhaDaReserva, ordenarReservas} from "../componentes/tabela-reservas.js";
import {iniciarCasca} from "../componentes/shell.js";
import {gavetaBloqueio} from "../gavetas/bloqueio.js";
import {excluirHospede, gavetaHospede, itensDoHospede} from "../gavetas/hospede.js";
import {SITUACOES, cancelarReserva, carregarImoveis, gavetaReserva} from "../gavetas/reserva.js";
import {gavetaTarefa} from "../gavetas/tarefa.js";

const POR_VEZ = 50;
const ESTADOS_PADRAO = ["futura", "em_curso", "concluida"];
const ATALHOS = [{valor: "este", rotulo: "Este mês", desloca: 0}, {valor: "proximo", rotulo: "Próximo mês", desloca: 1},
  {valor: "passado", rotulo: "Mês passado", desloca: -1}];

const area = document.querySelector("[data-lista-reservas]");
const areaHospedes = document.querySelector("[data-lista-hospedes]");
const contexto = document.querySelector("[data-contexto]");
const botaoLimpar = document.querySelector("[data-limpar]");
const buscaHospede = document.querySelector("[data-busca-hospede]");

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ehData = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto ?? "");
const semAcento = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function mes(desloca) {
  const hoje = new Date();
  return {de: iso(new Date(hoje.getFullYear(), hoje.getMonth() + desloca, 1)),
    ate: iso(new Date(hoje.getFullYear(), hoje.getMonth() + desloca + 1, 0))};
}

/** "nov 2026" quando o período é um mês inteiro; senão "4 a 7 nov". */
function nomeDoPeriodo(de, ate) {
  const [ano, numero] = de.split("-").map(Number);
  const mesInteiro = de.endsWith("-01") && ate === iso(new Date(ano, numero, 0));
  return mesInteiro ? `${dataCurta(de).split(" ")[1]} ${ano}` : intervalo(de, ate);
}

/** Os filtros da URL, com os padrões: este mês e os três primeiros estados. */
function filtros() {
  const f = lerEstado().filtros;
  const valido = ehData(f.de) && ehData(f.ate) && f.de <= f.ate;
  const {de, ate} = valido ? {de: f.de, ate: f.ate} : mes(0);
  const estados = f.estado === undefined ? ESTADOS_PADRAO : f.estado.split(",").filter((e) => e in SITUACOES);
  return {
    de, ate, estados,
    atalho: ATALHOS.find((a) => mes(a.desloca).de === de && mes(a.desloca).ate === ate)?.valor ?? null,
    imoveis: (f.imoveis ?? "").split(",").map(Number).filter(Boolean),
  };
}

const mesmosEstados = (estados) => estados.length === ESTADOS_PADRAO.length && ESTADOS_PADRAO.every((e) => estados.includes(e));
const filtrosAtivos = (f) => f.atalho !== "este" || f.imoveis.length > 0 || !mesmosEstados(f.estados);
const limparFiltros = () => trocarFiltros({de: null, ate: null, imoveis: null, estado: null});
const novaReserva = () => abrirGaveta("reserva", "nova");

// Estado da tela.
let lista = null;
let imoveis = [];
let chaveCarregada = "";
let chaveDesenhada = "";
let limite = POR_VEZ;
let ordem = {coluna: "entrada", sentido: 1};
let pedido = 0;
let destaque = null;
let jaTemReserva = null;
const escondidas = new Set();
let hospedes = null;
const hospedesEscondidos = new Set();

// Filtros.

const filtroPeriodo = ligarFiltro(document.querySelector('[data-filtro="periodo"]'), {rotulo: "Período", montar: montarPeriodo});
const filtroImovel = ligarFiltro(document.querySelector('[data-filtro="imovel"]'), {rotulo: "Imóvel", montar: montarImovel});
const filtroEstado = ligarFiltro(document.querySelector('[data-filtro="estado"]'), {rotulo: "Estado", montar: montarEstado});

function montarPeriodo(painel) {
  const f = filtros();
  renderizar(painel, html`${escolhas({nome: "periodo", legenda: "Período", tipo: "radio", marcadas: [f.atalho ?? "datas"],
    opcoes: [...ATALHOS, {valor: "datas", rotulo: "Escolher datas…"}]})}
    <div class="campo painel-filtro__datas" data-datas ${f.atalho ? "hidden" : ""}></div>`);
  const campo = painel.querySelector("[data-datas]");
  seletorDatas(campo, {nomes: null, rotulo: "Período", rotulos: ["Início", "Fim"], entrada: f.atalho ? null : f.de,
    saida: f.atalho ? null : f.ate, aoMudar: ({entrada, saida}) => {
      if (!entrada || !saida) return;
      filtroPeriodo.fechar();
      trocarFiltros({de: entrada, ate: saida});
    }});
  // O atalho vale na hora e o painel fica aberto: com as setas, a pessoa passa pelos rádios sem perder o lugar.
  painel.querySelector("fieldset").addEventListener("change", (evento) => {
    const atalho = ATALHOS.find((a) => a.valor === evento.target.value);
    campo.hidden = Boolean(atalho);
    if (!atalho) {
      campo.querySelector(".datas").click();
      return;
    }
    trocarFiltros(atalho.valor === "este" ? {de: null, ate: null} : mes(atalho.desloca));
  });
}

/** As reservas do período que passam pelos filtros, menos `ignorar` (para contar as opções). */
function filtradas(f, ignorar = null) {
  return (lista ?? []).filter((r) => !escondidas.has(r.id)
    && (ignorar === "estado" || f.estados.includes(r.situacao))
    && (ignorar === "imovel" || !f.imoveis.length || f.imoveis.includes(r.imovel.id)));
}

function montarImovel(painel) {
  const f = filtros();
  const base = filtradas(f, "imovel");
  renderizar(painel, html`${escolhas({nome: "imovel", legenda: "Imóveis", marcadas: f.imoveis.map(String),
    opcoes: imoveis.map((i) => ({valor: i.id, rotulo: i.nome, contagem: base.filter((r) => r.imovel.id === i.id).length}))})}
    <div class="painel-filtro__rodape"><button type="button" class="botao botao--fantasma botao--sm" data-todos>Todos</button></div>`);
  painel.querySelector("fieldset").addEventListener("change", () => {
    const marcados = [...painel.querySelectorAll("input:checked")].map((caixa) => caixa.value);
    trocarFiltro("imoveis", marcados.join(",") || null);
  });
  painel.querySelector("[data-todos]").addEventListener("click", () => {
    filtroImovel.fechar();
    trocarFiltro("imoveis", null);
  });
}

function montarEstado(painel) {
  const f = filtros();
  const base = filtradas(f, "estado");
  renderizar(painel, html`${escolhas({nome: "estado", legenda: "Estados", marcadas: f.estados,
    opcoes: Object.entries(SITUACOES).map(([valor, rotulo]) => ({valor, rotulo, contagem: base.filter((r) => r.situacao === valor).length}))})}
    <div class="painel-filtro__rodape"><button type="button" class="botao botao--fantasma botao--sm" data-padrao>Voltar ao padrão</button></div>`);
  painel.querySelector("fieldset").addEventListener("change", () => {
    const marcados = [...painel.querySelectorAll("input:checked")].map((caixa) => caixa.value);
    trocarFiltro("estado", mesmosEstados(marcados) ? null : marcados.join(",") || "nenhum");
  });
  painel.querySelector("[data-padrao]").addEventListener("click", () => {
    filtroEstado.fechar();
    trocarFiltro("estado", null);
  });
}

function rotularFiltros(f) {
  filtroPeriodo.rotular(f.atalho ? ATALHOS.find((a) => a.valor === f.atalho).rotulo : intervalo(f.de, f.ate), f.atalho !== "este");
  const nomeDoImovel = f.imoveis.length === 1 ? imoveis.find((i) => i.id === f.imoveis[0])?.nome : null;
  filtroImovel.rotular(!f.imoveis.length ? "Todos" : nomeDoImovel ?? String(f.imoveis.length), f.imoveis.length > 0);
  filtroEstado.rotular(f.estados.length === 1 ? SITUACOES[f.estados[0]] : String(f.estados.length), !mesmosEstados(f.estados));
  botaoLimpar.hidden = !filtrosAtivos(f);
}

// Lista de reservas.

function escreverContexto(reservas, f) {
  const centavos = reservas.filter((r) => r.status !== "cancelada")
    .reduce((soma, r) => soma + Math.round(Number(r.valor_total) * 100), 0);
  contexto.textContent = `${nomeDoPeriodo(f.de, f.ate)} · ${plural(reservas.length, "reserva", "reservas")} · ${dinheiro(centavos / 100)}`;
}

function temAlgumaReserva() {
  jaTemReserva ??= api.get("/api/reservas", {de: "2000-01-01", ate: "2099-12-31"}).then(({reservas}) => reservas.length > 0);
  jaTemReserva.catch(() => {
    jaTemReserva = null;
  });
  return jaTemReserva;
}

async function desenharVazio(f) {
  const minha = chaveDesenhada;
  if (!imoveis.length) {
    vazio(area, {texto: "Cadastre um imóvel antes da primeira reserva.",
      acao: {rotulo: "Novo imóvel", fazer: () => location.assign("/imoveis?imovel=novo")}});
    return;
  }
  const primeiroUso = !filtrosAtivos(f) && !(await temAlgumaReserva().catch(() => true));
  if (minha !== chaveDesenhada) return;
  if (primeiroUso) {
    vazio(area, {texto: "Nenhuma reserva ainda. Cadastre a primeira: ela aparece aqui e na agenda.",
      acao: {rotulo: "Nova reserva", fazer: novaReserva}});
    return;
  }
  vazio(area, {texto: "Nenhuma reserva com esses filtros.",
    acao: filtrosAtivos(f) ? {rotulo: "Limpar filtros", fazer: limparFiltros} : {rotulo: "Nova reserva", fazer: novaReserva}});
}

function desenhar() {
  const f = filtros();
  chaveDesenhada = JSON.stringify([f, ordem, limite, [...escondidas], lista?.length]);
  rotularFiltros(f);
  const reservas = ordenarReservas(filtradas(f), ordem);
  escreverContexto(reservas, f);
  if (!reservas.length) {
    desenharVazio(f);
    return;
  }
  const mostradas = reservas.slice(0, limite);
  renderizar(area, html`<div class="tabela-cartao"><table class="tabela">
      <caption class="visualmente-oculto">Reservas de ${nomeDoPeriodo(f.de, f.ate)}</caption>
      <thead>${cabecalhosDasReservas(ordem)}</thead>
      <tbody>${mostradas.map((r) => linhaDaReserva(r, {destaque}))}</tbody>
    </table></div>
    <div class="tabela-rodape"><span class="numero">${mostradas.length} de ${reservas.length}</span>
      ${reservas.length > mostradas.length ? html`<button type="button" class="botao botao--secundario botao--sm" data-mais>Carregar mais</button>` : ""}</div>`);
  const porId = new Map(mostradas.map((r) => [r.id, r]));
  for (const botao of area.querySelectorAll("[data-acoes]")) ligarMenu(botao, itensDaReserva(porId.get(Number(botao.dataset.acoes)), {cancelar: cancelarDaLista}));
  marcarAberta();
}

async function carregar({forcar = false} = {}) {
  const f = filtros();
  const chave = `${f.de}|${f.ate}`;
  if (!forcar && lista && chave === chaveCarregada) {
    desenhar();
    return;
  }
  const meu = ++pedido;
  if (!lista) esqueleto(area);
  area.setAttribute("aria-busy", "true");
  try {
    const [resposta, todos] = await Promise.all([api.get("/api/reservas", {de: f.de, ate: f.ate}),
      carregarImoveis({deNovo: forcar})]);
    if (meu !== pedido) return;
    if (chave !== chaveCarregada) limite = POR_VEZ;
    lista = resposta.reservas;
    imoveis = todos;
    chaveCarregada = chave;
    esconderFaixa(area);
    desenhar();
    area.querySelector("tr[data-destaque]")?.scrollIntoView({block: "nearest"});
    destaque = null;
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    erro(area, {mensagem: "Não deu para carregar as reservas.", tentarDeNovo: () => carregar({forcar: true})});
  } finally {
    if (meu === pedido) area.removeAttribute("aria-busy");
  }
}

function cancelarDaLista(r) {
  let seguinte = null;
  cancelarReserva(r, {
    esconder: () => {
      const linhaAtual = area.querySelector(`tr[data-id="${r.id}"]`);
      seguinte = (linhaAtual?.nextElementSibling ?? linhaAtual?.previousElementSibling)?.dataset.id ?? null;
      escondidas.add(r.id);
      desenhar();
      (area.querySelector(`tr[data-id="${seguinte}"] .tabela__link`) ?? document.querySelector("[data-nova]")).focus();
    },
    mostrar: () => {
      escondidas.delete(r.id);
      desenhar();
    },
    depois: () => {
      escondidas.delete(r.id);
      jaTemReserva = null;
      carregar({forcar: true});
    },
  });
}

function aposSalvarReserva(salva) {
  destaque = salva.id;
  jaTemReserva = null;
  hospedes = null; // um hóspede novo pode ter nascido junto
  carregar({forcar: true});
  if (!document.querySelector("#painel-hospedes").hidden) carregarHospedes();
}

area.addEventListener("click", (evento) => {
  const ordenarPor = evento.target.closest("[data-ordenar]");
  if (ordenarPor) {
    const coluna = ordenarPor.dataset.ordenar;
    ordem = {coluna, sentido: ordem.coluna === coluna ? -ordem.sentido : 1};
    desenhar();
    area.querySelector(`[data-ordenar="${coluna}"]`).focus();
    return;
  }
  if (evento.target.closest("[data-mais]")) {
    const antes = limite;
    limite += POR_VEZ;
    desenhar();
    area.querySelectorAll(".tabela__link")[antes]?.focus();
  }
});

// Abrir a gaveta pela linha (com Ctrl ou o botão do meio, o link abre em outra aba).
for (const lugar of [area, areaHospedes]) {
  lugar.addEventListener("click", (evento) => {
    const link = evento.target.closest("[data-abrir]");
    if (!link || !cliqueComum(evento)) return;
    evento.preventDefault();
    abrirGaveta(link.dataset.abrir, Number(link.dataset.id));
  });
}

function marcarAberta() {
  const gaveta = lerEstado().gaveta;
  for (const aberta of document.querySelectorAll("tr[data-aberta]")) aberta.removeAttribute("data-aberta");
  const onde = {reserva: area, hospede: areaHospedes}[gaveta?.tipo];
  if (onde && typeof gaveta.id === "number") onde.querySelector(`tr[data-id="${gaveta.id}"]`)?.setAttribute("data-aberta", "");
}

// Aba Hóspedes.

function desenharHospedes() {
  if (!hospedes) return;
  const texto = buscaHospede.value.trim();
  const termo = semAcento(texto);
  const digitos = texto.replace(/\D/g, "");
  const achados = hospedes
    .filter((h) => !hospedesEscondidos.has(h.id))
    .filter((h) => !termo || semAcento(h.nome).includes(termo)
      || (digitos.length >= 2 && (h.telefone ?? "").replace(/\D/g, "").includes(digitos)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (!achados.length) {
    vazio(areaHospedes, {texto: hospedes.length > hospedesEscondidos.size
      ? "Nenhum hóspede com esse nome ou telefone." : "Os hóspedes aparecem aqui quando você cadastra uma reserva."});
    return;
  }
  renderizar(areaHospedes, html`<div class="tabela-cartao"><table class="tabela">
      <caption class="visualmente-oculto">Hóspedes</caption>
      <thead><tr><th scope="col">Nome</th><th scope="col">Telefone</th><th scope="col">E-mail</th>
        <th scope="col" data-alinhar="direita">Reservas</th><th scope="col">Última reserva</th>
        <th scope="col"><span class="visualmente-oculto">Ações</span></th></tr></thead>
      <tbody>${achados.map((h) => html`<tr data-id="${h.id}">
        <td><a class="tabela__link" href="${enderecoDaGaveta("hospede", h.id)}" data-abrir="hospede" data-id="${h.id}">${h.nome}</a></td>
        <td class="numero">${h.telefone ?? "–"}</td>
        <td>${h.email ?? "–"}</td>
        <td class="numero" data-alinhar="direita">${h.num_reservas}</td>
        <td class="numero">${h.ultima_reserva ? data(h.ultima_reserva) : "–"}</td>
        <td class="tabela__acoes"><button type="button" class="botao botao--icone botao--fantasma botao--sm" data-acoes="${h.id}"
          aria-label="Ações de ${h.nome}">${icone("acoes")}</button></td></tr>`)}</tbody>
    </table></div>
    <div class="tabela-rodape"><span class="numero">${achados.length} de ${hospedes.length - hospedesEscondidos.size}</span></div>`);
  const porId = new Map(achados.map((h) => [h.id, h]));
  for (const botao of areaHospedes.querySelectorAll("[data-acoes]")) {
    ligarMenu(botao, itensDoHospede(porId.get(Number(botao.dataset.acoes)), {aoExcluir: excluirDaLista}));
  }
  marcarAberta();
}

async function carregarHospedes() {
  if (!hospedes) esqueleto(areaHospedes, 6);
  try {
    hospedes = (await api.get("/api/hospedes")).hospedes;
    esconderFaixa(areaHospedes);
    desenharHospedes();
  } catch (falha) {
    if (falha?.status !== 401) erro(areaHospedes, {mensagem: "Não deu para carregar os hóspedes.", tentarDeNovo: carregarHospedes});
  }
}

function excluirDaLista(hospede) {
  excluirHospede(hospede, {
    esconder: () => {
      hospedesEscondidos.add(hospede.id);
      desenharHospedes();
      buscaHospede.focus();
    },
    mostrar: () => {
      hospedesEscondidos.delete(hospede.id);
      desenharHospedes();
    },
    depois: () => {
      hospedesEscondidos.delete(hospede.id);
      carregarHospedes();
    },
  });
}

buscaHospede.addEventListener("input", desenharHospedes);
document.querySelector("[data-novo-hospede]").addEventListener("click", () => abrirGaveta("hospede", "novo"));

// Ligações da página.

document.querySelector("[data-nova]").addEventListener("click", novaReserva);
document.querySelector("[data-bloquear]").addEventListener("click", () => abrirGaveta("bloqueio", "novo"));
botaoLimpar.addEventListener("click", limparFiltros);

ligarGavetas({
  reserva: gavetaReserva({depois: aposSalvarReserva, aoCancelar: cancelarDaLista}),
  hospede: gavetaHospede({depois: () => {
    carregarHospedes();
    carregar({forcar: true});
  }, aoExcluir: excluirDaLista}),
  bloqueio: gavetaBloqueio(),
  tarefa: gavetaTarefa(),
});

aoMudar(() => {
  const f = filtros();
  if (JSON.stringify([f.de, f.ate]) !== JSON.stringify(chaveCarregada.split("|"))) {
    carregar();
  } else if (lista) {
    const antes = chaveDesenhada;
    const agora = JSON.stringify([f, ordem, limite, [...escondidas], lista.length]);
    if (antes !== agora) desenhar();
  }
  marcarAberta();
});

ligarAbas(document.querySelector('[role="tablist"]'), {aoTrocar: (aba) => {
  if (aba === "hospedes" && !hospedes) carregarHospedes();
}});

iniciarCasca({recarregar: () => {
  carregar({forcar: true});
  if (hospedes) carregarHospedes();
}});
carregar();
