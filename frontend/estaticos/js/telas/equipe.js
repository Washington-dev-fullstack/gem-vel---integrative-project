// Tela Equipe (web-admin.md §7): a grade de cartões de pessoa (lote B §11) com o dia de cada uma, a
// função e as desativadas na URL, e o menu de cada pessoa.

import {isoDoDia} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {filaDeGemas, fraseDoDia, linhaDoAgora} from "../nucleo/tarefas.js";
import {abrirGaveta, aoMudar, cliqueComum, lerEstado, trocarFiltro, trocarFiltros} from "../nucleo/url.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {esconderFaixa} from "../componentes/faixa.js";
import {escolhas, ligarFiltro} from "../componentes/filtro.js";
import {ligarGavetas} from "../componentes/gaveta.js";
import {ligarLuz} from "../componentes/luz.js";
import {ligarMenu} from "../componentes/menu.js";
import {avatar, gema, icone} from "../componentes/pecas.js";
import {iniciarCasca} from "../componentes/shell.js";
import {FUNCOES, carregarEquipe, contatosDaPessoa, desativarPessoa, gavetaPessoa, itensDaPessoa, reativarPessoa}
  from "../gavetas/pessoa.js";
import {gavetaReserva} from "../gavetas/reserva.js";
import {gavetaTarefa} from "../gavetas/tarefa.js";

const area = document.querySelector("[data-lista]");
const contexto = document.querySelector("[data-contexto]");
const botaoLimpar = document.querySelector("[data-limpar]");
const interruptor = document.querySelector("[data-desativadas]");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Estado da tela.
let equipe = null;
let hoje = isoDoDia();
let pedido = 0;
let chaveDesenhada = "";
const desativando = new Set(); // no prazo do Desfazer, a pessoa já aparece desativada

function filtros() {
  const f = lerEstado().filtros;
  return {funcao: Object.hasOwn(FUNCOES, f.funcao ?? "") ? f.funcao : null, desativadas: f.desativadas === "1"};
}

const limparFiltros = () => trocarFiltros({funcao: null});
const comDesativando = () => (equipe ?? []).map((p) => (desativando.has(p.id) ? {...p, ativo: false} : p));

/** As pessoas que passam pelos filtros, menos `ignorar` (para contar as opções do painel). */
function visiveis(f, ignorar = null) {
  return comDesativando().filter((p) => (f.desativadas || p.ativo) && (ignorar === "funcao" || !f.funcao || p.funcao === f.funcao));
}

const filtroFuncao = ligarFiltro(document.querySelector('[data-filtro="funcao"]'), {rotulo: "Função", montar: montarFuncao});

function montarFuncao(painel) {
  const f = filtros();
  const base = visiveis(f, "funcao");
  renderizar(painel, escolhas({nome: "funcao", legenda: "Função", tipo: "radio", marcadas: [f.funcao ?? ""],
    opcoes: [{valor: "", rotulo: "Todas", contagem: base.length},
      ...Object.entries(FUNCOES).map(([valor, rotulo]) => ({valor, rotulo, contagem: base.filter((p) => p.funcao === valor).length}))]}));
  painel.querySelector("fieldset").addEventListener("change", (evento) => trocarFiltro("funcao", evento.target.value || null));
}

// Cartões.

function diaDaPessoa(p) {
  if (!p.dia.total) return html`<span class="cartao-pessoa__conta">Nenhuma tarefa</span>`;
  const {gemas, resto} = filaDeGemas(p.dia.estados);
  // A fila é só desenho: o leitor de tela lê o texto ao lado (lote B §11).
  return html`<span class="fila-gemas" aria-hidden="true">${gemas.map((estado) => gema(estado))}${resto
      ? html`<span class="fila-gemas__resto numero">+${resto}</span>` : ""}</span>
    <span class="cartao-pessoa__conta numero">${fraseDoDia(p.dia)}</span>`;
}

function cartao(p) {
  return html`<li class="cartao cartao--luz cartao-pessoa" data-id="${p.id}" ${p.ativo ? "" : html`data-desativado`}>
    <div class="cartao-pessoa__topo">
      ${avatar(p.nome, {tamanho: "lg"})}
      <div class="cartao-pessoa__quem">
        <h2 class="cartao-pessoa__nome"><a class="cartao-pessoa__link" href="?pessoa=${p.id}" data-pessoa="${p.id}">${p.nome}</a></h2>
        <p class="cartao-pessoa__funcao"><span class="pilula">${FUNCOES[p.funcao]}</span>${p.ativo ? ""
          : html`<span class="pilula">Acesso desativado</span>`}</p>
      </div>
      <button type="button" class="botao botao--icone botao--fantasma botao--sm cartao-pessoa__acoes" data-acoes="${p.id}"
        aria-label="Ações de ${p.nome}">${icone("acoes")}</button>
    </div>
    <p class="cartao-pessoa__contato">${p.telefone ? contatosDaPessoa(p) : "Sem telefone"}</p>
    ${p.ativo ? html`<p class="cartao-pessoa__dia"><span class="cartao-pessoa__rotulo">Hoje</span>${diaDaPessoa(p)}</p>
      <p class="cartao-pessoa__agora">${linhaDoAgora(p, hoje)}</p>` : ""}
  </li>`;
}

function desenharVazio(f) {
  if (!equipe.length) {
    vazio(area, {texto: "Ninguém na equipe ainda. Cadastre quem faz a limpeza e a manutenção para atribuir as tarefas.",
      acao: {rotulo: "Nova pessoa", fazer: () => abrirGaveta("pessoa", "nova")}});
  } else if (f.funcao && visiveis({...f, funcao: null}).length) {
    vazio(area, {texto: "Ninguém com essa função.", acao: {rotulo: "Limpar filtros", fazer: limparFiltros}});
  } else {
    vazio(area, {texto: "Ninguém com acesso ativo.", acao: {rotulo: "Mostrar desativadas", fazer: () => trocarFiltro("desativadas", "1")}});
  }
}

function desenhar() {
  const f = filtros();
  chaveDesenhada = JSON.stringify([f, [...desativando]]);
  filtroFuncao.rotular(f.funcao ? FUNCOES[f.funcao] : "Todas", Boolean(f.funcao));
  botaoLimpar.hidden = !f.funcao;
  interruptor.checked = f.desativadas;
  const lista = visiveis(f);
  const ativas = lista.filter((p) => p.ativo);
  contexto.textContent = equipe.length
    ? `${plural(ativas.length, "pessoa", "pessoas")} · ${ativas.filter((p) => p.dia.total > 0).length} com tarefas hoje` : "";
  if (!lista.length) {
    desenharVazio(f);
    return;
  }
  renderizar(area, html`<ul class="grade-equipe" role="list">${lista.map(cartao)}</ul>`);
  const porId = new Map(lista.map((p) => [p.id, p]));
  for (const botao of area.querySelectorAll("[data-acoes]")) {
    ligarMenu(botao, itensDaPessoa(porId.get(Number(botao.dataset.acoes)), {aoDesativar: desativarDaLista, aoReativar: reativarDaLista}));
  }
}

async function carregar() {
  const meu = ++pedido;
  hoje = isoDoDia();
  if (!equipe) esqueleto(area);
  area.setAttribute("aria-busy", "true");
  try {
    const lista = await carregarEquipe(hoje);
    if (meu !== pedido) return;
    equipe = lista;
    esconderFaixa(area);
    desenhar();
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    erro(area, {mensagem: "Não deu para carregar a equipe.", tentarDeNovo: carregar});
  } finally {
    if (meu === pedido) area.removeAttribute("aria-busy");
  }
}

function desativarDaLista(pessoa) {
  desativarPessoa(pessoa, {
    esconder: () => {
      const cartoes = [...area.querySelectorAll(".cartao-pessoa")];
      const i = cartoes.findIndex((c) => Number(c.dataset.id) === pessoa.id);
      const vizinho = cartoes[i + 1] ?? cartoes[i - 1];
      desativando.add(pessoa.id);
      desenhar();
      (area.querySelector(`[data-id="${pessoa.id}"] .cartao-pessoa__link`)
        ?? (vizinho && area.querySelector(`[data-id="${vizinho.dataset.id}"] .cartao-pessoa__link`))
        ?? document.querySelector("[data-novo]")).focus();
    },
    mostrar: () => {
      desativando.delete(pessoa.id);
      desenhar();
    },
    depois: async () => {
      await carregar();
      desativando.delete(pessoa.id);
    },
  });
}

const reativarDaLista = (pessoa) => reativarPessoa(pessoa, {depois: carregar});

// Ligações da página.

interruptor.addEventListener("change", () => trocarFiltro("desativadas", interruptor.checked ? "1" : null));
botaoLimpar.addEventListener("click", limparFiltros);
document.querySelector("[data-novo]").addEventListener("click", () => abrirGaveta("pessoa", "nova", {preencher: {funcao: filtros().funcao}}));
area.addEventListener("click", (evento) => {
  const link = evento.target.closest("[data-pessoa]");
  if (!link || !cliqueComum(evento)) return;
  evento.preventDefault();
  abrirGaveta("pessoa", Number(link.dataset.pessoa));
});
ligarLuz(area, ".cartao--luz");

ligarGavetas({
  pessoa: gavetaPessoa({depois: carregar, aoDesativar: desativarDaLista}),
  tarefa: gavetaTarefa({depois: carregar}),
  reserva: gavetaReserva(),
});

aoMudar(() => {
  if (equipe && JSON.stringify([filtros(), [...desativando]]) !== chaveDesenhada) desenhar();
});

iniciarCasca({recarregar: carregar});
carregar();
