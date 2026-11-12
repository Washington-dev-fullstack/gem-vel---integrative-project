// Tela Imóveis (web-admin.md §5 e §10): a lista em tabela ou em cartões, com a prontidão, a ocupação
// do mês e a próxima entrada de cada imóvel. Os filtros ficam na URL; a vista, no navegador.

import {dinheiro, dataCurta} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {abrirGaveta, aoMudar, lerEstado, trocarFiltro, trocarFiltros} from "../nucleo/url.js";
import {ligarDicas} from "../componentes/dica.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {escolhas, ligarFiltro} from "../componentes/filtro.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {ligarLuz} from "../componentes/luz.js";
import {ligarMenu} from "../componentes/menu.js";
import {icone} from "../componentes/pecas.js";
import {iniciarCasca} from "../componentes/shell.js";
import {gavetaBloqueio} from "../gavetas/bloqueio.js";
import {PRONTIDAO, desativarImovel, gavetaImovel, itensDoImovel, localDoImovel, medidorDeOcupacao, prontidaoDe,
  proximaEntrada, reativarImovel} from "../gavetas/imovel.js";
import {carregarImoveis} from "../gavetas/reserva.js";

const CHAVE_DA_VISTA = "gemovel:imoveis-vista";
const area = document.querySelector("[data-lista]");
const contexto = document.querySelector("[data-contexto]");
const botaoLimpar = document.querySelector("[data-limpar]");
const botaoCidade = document.querySelector('[data-filtro="cidade"]');
const interruptor = document.querySelector("[data-desativados]");
const botoesDaVista = [...document.querySelectorAll("[data-vista]")];

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const mesCurto = dataCurta(new Date()).split(" ")[1];

function lerVista() {
  try {
    return localStorage.getItem(CHAVE_DA_VISTA) === "tabela" ? "tabela" : "cartoes";
  } catch {
    return "cartoes";
  }
}

function gravarVista(valor) {
  try {
    localStorage.setItem(CHAVE_DA_VISTA, valor);
  } catch {
    // Sem armazenamento (janela anônima, bloqueio): a escolha vale só nesta visita.
  }
}

// Estado da tela.
let imoveis = null;
let vista = lerVista();
let pedido = 0;
let chaveDesenhada = "";
const desativando = new Set(); // no prazo do Desfazer, o imóvel já aparece desativado

function filtros() {
  const f = lerEstado().filtros;
  return {
    prontidao: (f.prontidao ?? "").split(",").filter((p) => p in PRONTIDAO),
    cidade: f.cidade || null,
    desativados: f.desativados === "1",
  };
}

const filtrosAtivos = (f) => f.prontidao.length > 0 || f.cidade !== null;
const limparFiltros = () => trocarFiltros({prontidao: null, cidade: null});
const comDesativando = () => (imoveis ?? []).map((i) => (desativando.has(i.id) ? {...i, ativo: false} : i));
const cidades = () => [...new Set((imoveis ?? []).map((i) => i.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR"));

/** Os imóveis que passam pelos filtros, menos `ignorar` (para contar as opções do painel). */
function visiveis(f, ignorar = null) {
  return comDesativando().filter((i) => (f.desativados || i.ativo)
    && (ignorar === "prontidao" || !f.prontidao.length || (i.ativo && f.prontidao.includes(i.prontidao.estado)))
    && (ignorar === "cidade" || !f.cidade || i.cidade === f.cidade));
}

// Filtros.

const filtroProntidao = ligarFiltro(document.querySelector('[data-filtro="prontidao"]'), {rotulo: "Prontidão", montar: montarProntidao});
const filtroCidade = ligarFiltro(botaoCidade, {rotulo: "Cidade", montar: montarCidade});

function montarProntidao(painel) {
  const f = filtros();
  const base = visiveis(f, "prontidao").filter((i) => i.ativo);
  renderizar(painel, html`${escolhas({nome: "prontidao", legenda: "Prontidão", marcadas: f.prontidao,
    opcoes: Object.entries(PRONTIDAO).map(([valor, rotulo]) => ({valor, rotulo, contagem: base.filter((i) => i.prontidao.estado === valor).length}))})}
    <div class="painel-filtro__rodape"><button type="button" class="botao botao--fantasma botao--sm" data-todas>Todas</button></div>`);
  painel.querySelector("fieldset").addEventListener("change", () => {
    const marcadas = [...painel.querySelectorAll("input:checked")].map((caixa) => caixa.value);
    trocarFiltro("prontidao", marcadas.join(",") || null);
  });
  painel.querySelector("[data-todas]").addEventListener("click", () => {
    filtroProntidao.fechar();
    trocarFiltro("prontidao", null);
  });
}

function montarCidade(painel) {
  const f = filtros();
  const base = visiveis(f, "cidade");
  renderizar(painel, html`${escolhas({nome: "cidade", legenda: "Cidade", tipo: "radio", marcadas: [f.cidade ?? ""],
    opcoes: [{valor: "", rotulo: "Todas", contagem: base.length},
      ...cidades().map((c) => ({valor: c, rotulo: c, contagem: base.filter((i) => i.cidade === c).length}))]})}`);
  painel.querySelector("fieldset").addEventListener("change", (evento) => trocarFiltro("cidade", evento.target.value || null));
}

function rotularFiltros(f) {
  const nomes = f.prontidao.map((p) => PRONTIDAO[p]);
  filtroProntidao.rotular(nomes.length === 0 ? "Todas" : nomes.length === 1 ? nomes[0] : String(nomes.length), nomes.length > 0);
  filtroCidade.rotular(f.cidade ?? "Todas", Boolean(f.cidade));
  botaoCidade.hidden = cidades().length < 2 && !f.cidade;
  botaoLimpar.hidden = !filtrosAtivos(f);
  interruptor.checked = f.desativados;
}

// Lista.

function linha(i) {
  const proxima = proximaEntrada(i);
  return html`<tr data-id="${i.id}" ${i.ativo ? "" : html`data-desativado`}>
    <td class="numero">${i.codigo}</td>
    <td><a class="tabela__link" href="/imoveis/${i.id}">${i.nome}</a></td>
    <td class="coluna-p2">${localDoImovel(i)}</td>
    <td class="numero" data-alinhar="direita">${dinheiro(i.valor_diaria)}</td>
    <td>${prontidaoDe(i)}</td>
    <td class="numero">${proxima && i.ativo ? proxima.quando : "–"}</td>
    <td class="coluna-p3">${i.ativo ? html`<span class="acima">${medidorDeOcupacao(i)}</span>` : "–"}</td>
    <td class="tabela__acoes"><button type="button" class="botao botao--icone botao--fantasma botao--sm" data-acoes="${i.id}"
      aria-label="Ações de ${i.nome}">${icone("acoes")}</button></td>
  </tr>`;
}

function cartao(i) {
  const proxima = i.ativo ? proximaEntrada(i) : null;
  return html`<li class="cartao cartao--luz cartao-imovel" data-id="${i.id}" ${i.ativo ? "" : html`data-desativado`}>
    <div class="cartao-imovel__topo">
      <h2 class="cartao-imovel__nome"><a class="cartao-imovel__link" href="/imoveis/${i.id}">${i.nome}</a></h2>
      <button type="button" class="botao botao--icone botao--fantasma botao--sm cartao-imovel__acoes" data-acoes="${i.id}"
        aria-label="Ações de ${i.nome}">${icone("acoes")}</button>
    </div>
    <p class="cartao-imovel__local"><span class="numero">${i.codigo}</span> · ${localDoImovel(i)}</p>
    <div>${prontidaoDe(i)}</div>
    ${i.ativo ? medidorDeOcupacao(i) : ""}
    <p class="cartao-imovel__proxima">${proxima
      ? html`Próxima entrada · <span class="numero">${proxima.dia}</span><br><span class="numero">${proxima.hora}</span> · <span class="cartao-imovel__hospede">${proxima.hospede}</span>`
      : i.ativo ? "Sem próxima entrada" : "Fora das novas reservas"}</p>
    <p class="cartao-imovel__diaria">Diária <span class="numero">${dinheiro(i.valor_diaria)}</span></p>
  </li>`;
}

function desenharVazio(f) {
  if (!imoveis.length) {
    vazio(area, {texto: "Nenhum imóvel ainda. Cadastre o primeiro para começar a receber reservas.",
      acao: {rotulo: "Novo imóvel", fazer: () => abrirGaveta("imovel", "novo")}});
  } else if (filtrosAtivos(f)) {
    vazio(area, {texto: "Nenhum imóvel com esses filtros.", acao: {rotulo: "Limpar filtros", fazer: limparFiltros}});
  } else {
    vazio(area, {texto: "Nenhum imóvel ativo.", acao: {rotulo: "Mostrar desativados", fazer: () => trocarFiltro("desativados", "1")}});
  }
}

function desenhar() {
  const f = filtros();
  chaveDesenhada = JSON.stringify([f, vista, [...desativando]]);
  rotularFiltros(f);
  for (const botao of botoesDaVista) botao.setAttribute("aria-pressed", String(botao.dataset.vista === vista));
  const lista = visiveis(f);
  const ativos = lista.filter((i) => i.ativo);
  contexto.textContent = imoveis.length
    ? `${plural(ativos.length, "imóvel", "imóveis")} · ${plural(ativos.filter((i) => i.prontidao.estado === "pronto").length, "pronto", "prontos")}`
    : "";
  if (!lista.length) {
    desenharVazio(f);
    return;
  }
  renderizar(area, vista === "tabela"
    ? html`<div class="tabela-cartao"><table class="tabela">
        <caption class="visualmente-oculto">Imóveis</caption>
        <thead><tr><th scope="col">Código</th><th scope="col">Nome</th><th scope="col" class="coluna-p2">Bairro, cidade</th>
          <th scope="col" data-alinhar="direita">Diária</th><th scope="col">Prontidão</th><th scope="col">Próx. entrada</th>
          <th scope="col" class="coluna-p3">Ocupação ${mesCurto}</th><th scope="col"><span class="visualmente-oculto">Ações</span></th></tr></thead>
        <tbody>${lista.map(linha)}</tbody></table></div>`
    : html`<ul class="grade-imoveis" role="list">${lista.map(cartao)}</ul>`);
  const porId = new Map(lista.map((i) => [i.id, i]));
  for (const botao of area.querySelectorAll("[data-acoes]")) {
    ligarMenu(botao, itensDoImovel(porId.get(Number(botao.dataset.acoes)), {aoDesativar: desativarDaLista, aoReativar: reativarDaLista}));
  }
}

async function carregar({forcar = false} = {}) {
  const meu = ++pedido;
  if (!imoveis) esqueleto(area);
  area.setAttribute("aria-busy", "true");
  try {
    const lista = await carregarImoveis({deNovo: forcar});
    if (meu !== pedido) return;
    imoveis = lista;
    esconderFaixa(area);
    desenhar();
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    erro(area, {mensagem: "Não deu para carregar os imóveis.", tentarDeNovo: () => carregar({forcar: true})});
  } finally {
    if (meu === pedido) area.removeAttribute("aria-busy");
  }
}

function desativarDaLista(imovel) {
  desativarImovel(imovel, {
    esconder: () => {
      desativando.add(imovel.id);
      desenhar();
      (area.querySelector(`[data-id="${imovel.id}"] a`) ?? document.querySelector("[data-novo]")).focus();
    },
    mostrar: () => {
      desativando.delete(imovel.id);
      desenhar();
    },
    depois: async () => {
      await carregar({forcar: true});
      desativando.delete(imovel.id);
    },
  });
}

const reativarDaLista = (imovel) => reativarImovel(imovel, {depois: () => carregar({forcar: true})});

// Ligações da página.

for (const botao of botoesDaVista) {
  botao.addEventListener("click", () => {
    if (vista === botao.dataset.vista) return;
    vista = botao.dataset.vista;
    gravarVista(vista);
    desenhar();
  });
}
interruptor.addEventListener("change", () => trocarFiltro("desativados", interruptor.checked ? "1" : null));
botaoLimpar.addEventListener("click", limparFiltros);
document.querySelector("[data-novo]").addEventListener("click", () => abrirGaveta("imovel", "novo"));
ligarLuz(area, ".cartao--luz");
ligarDicas(area);

ligarGavetas({
  imovel: gavetaImovel({depois: () => carregar({forcar: true})}),
  bloqueio: gavetaBloqueio(),
});

aoMudar(() => {
  if (imoveis && JSON.stringify([filtros(), vista, [...desativando]]) !== chaveDesenhada) desenhar();
});

iniciarCasca({recarregar: () => carregar({forcar: true})});
carregar();
