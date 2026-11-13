// Minhas tarefas (design/telas/app-equipe.md): as tarefas da pessoa no dia, por grupo, cada uma com o
// Avanço de estado. A tarefa que muda fica no lugar até a próxima carga, para o foco e o Desfazer.

import {api} from "../nucleo/api.js";
import {data, isoDoDia} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {TIPOS, acaoDoAvanco, agruparTarefas, contextoDoDia, horarioDaTarefa, linhaDoEstado, saudacao} from "../nucleo/tarefas.js";
import {aoMudar, lerEstado, trocarFiltro} from "../nucleo/url.js";
import {lapidarGema, ligarAvanco} from "../componentes/avanco.js";
import {erro, esqueleto, vazio} from "../componentes/estados.js";
import {ROTULO_DO_ESTADO, estadoVisivel, gema, icone} from "../componentes/pecas.js";
import {seletorPeriodo} from "../componentes/seletor-periodo.js";
import {iniciarCasca} from "../componentes/shell.js";

const GRUPOS = [["atrasadas", "Atrasadas"], ["em_andamento", "Em andamento"], ["pendentes", "Pendentes"]];

const titulo = document.querySelector("[data-saudacao]");
const contexto = document.querySelector("[data-contexto]");
const lista = document.querySelector("[data-lista]");

let tarefas = [];
let dia = diaDaUrl();
let pedido = 0;

function diaDaUrl() {
  const valor = lerEstado().filtros.dia ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : isoDoDia();
}

const mapa = (endereco) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

function cartao(t) {
  const estado = estadoVisivel(t);
  const linha = linhaDoEstado(t, isoDoDia());
  const acao = acaoDoAvanco(t);
  const id = `tarefa-${t.id}-titulo`;
  const {endereco, observacoes} = t.imovel;
  return html`<article class="cartao cartao-tarefa" aria-labelledby="${id}" data-cartao="${t.id}">
    <div class="cartao-tarefa__topo">${gema(estado, {tamanho: 24})}<span class="cartao-tarefa__rotulo">${ROTULO_DO_ESTADO[estado]}</span>
      <span class="cartao-tarefa__janela">${horarioDaTarefa(t)}</span></div>
    <h3 class="cartao-tarefa__titulo" id="${id}">${TIPOS[t.tipo]} · ${t.imovel.nome}</h3>
    <p class="cartao-tarefa__subtitulo">${t.titulo}</p>
    ${linha ? html`<p class="cartao-tarefa__estado" data-tom="${linha.tom ?? ""}" data-linha tabindex="-1">${linha.texto}</p>` : ""}
    <div data-falha></div>
    ${acao ? html`<button type="button" class="botao botao--primario botao--lg botao--largo avanco" data-avanco aria-describedby="${id}">
      ${icone(acao.proximo === "concluida" ? "ok" : "comecar")}<span class="avanco__girando" aria-hidden="true"></span><span data-rotulo>${acao.rotulo}</span>
    </button>` : ""}
    <details class="cartao-tarefa__detalhes"><summary>Ver detalhes ${icone("abrir")}</summary><dl>
      ${endereco ? html`<div><dt>Endereço</dt><dd>${endereco}<br><a href="${mapa(endereco)}" target="_blank" rel="noopener">Abrir no mapa</a></dd></div>` : ""}
      ${t.descricao ? html`<div><dt>Descrição</dt><dd>${t.descricao}</dd></div>` : ""}
      ${observacoes ? html`<div><dt>Observações do imóvel</dt><dd>${observacoes}</dd></div>` : ""}
    </dl></details>
  </article>`;
}

function ligar(t) {
  ligarAvanco(lista.querySelector(`[data-cartao="${t.id}"]`), t, {aoMudar: (nova, {como}) => trocar(t.id, nova, como)});
}

// A tarefa que mudou: só o cartão dela é redesenhado, no mesmo lugar (app-equipe.md §1).
function trocar(id, nova, como) {
  const indice = tarefas.findIndex((t) => t.id === id);
  const atual = tarefas[indice];
  const t = {...atual, ...nova, imovel: {...atual.imovel, ...nova.imovel}};
  tarefas[indice] = t;
  const antigo = lista.querySelector(`[data-cartao="${id}"]`);
  const caixa = document.createElement("div");
  renderizar(caixa, cartao(t));
  const novo = caixa.firstElementChild;
  novo.querySelector("details").open = antigo.querySelector("details").open;
  antigo.replaceWith(novo);
  ligar(t);
  lapidarGema(novo.querySelector(".cartao-tarefa__topo > .gema"), como);
  (como === "concluida" ? novo.querySelector("[data-linha]") : novo.querySelector("[data-avanco]"))?.focus();
  contexto.textContent = contextoDoDia(tarefas, dia, isoDoDia());
}

function desenhar() {
  const grupos = agruparTarefas(tarefas);
  const feitas = grupos.concluidas.length;
  renderizar(lista, html`${GRUPOS.filter(([chave]) => grupos[chave].length).map(([chave, nome]) => html`
    <section class="minhas-tarefas__grupo" aria-labelledby="grupo-${chave}">
      <h2 class="minhas-tarefas__titulo-grupo" id="grupo-${chave}">${nome}</h2>${grupos[chave].map(cartao)}
    </section>`)}
    ${feitas ? html`<details class="minhas-tarefas__concluidas">
      <summary class="minhas-tarefas__titulo-grupo">${feitas} ${feitas === 1 ? "concluída" : "concluídas"} ${icone("abrir")}</summary>
      ${grupos.concluidas.map(cartao)}
    </details>` : ""}`);
  // Com tudo concluído, o grupo das concluídas já vem aberto (app-equipe.md §4).
  const recolhidas = lista.querySelector(".minhas-tarefas__concluidas");
  if (recolhidas) recolhidas.open = feitas === tarefas.length;
  for (const t of tarefas) ligar(t);
}

async function carregar({limpar = false} = {}) {
  const meu = ++pedido;
  dia = diaDaUrl();
  if (limpar || !tarefas.length) esqueleto(lista, 2);
  try {
    const resposta = await api.get("/api/minhas-tarefas", {dia});
    if (meu !== pedido) return;
    tarefas = resposta.tarefas;
    contexto.textContent = contextoDoDia(tarefas, dia, isoDoDia());
    if (tarefas.length) desenhar();
    else if (dia === isoDoDia()) {
      vazio(lista, {texto: "Nenhuma tarefa para hoje.", detalhe: "Quando alguém marcar uma tarefa para você, ela aparece aqui."});
    } else vazio(lista, {texto: `Nenhuma tarefa em ${data(dia)}.`});
  } catch (falha) {
    if (meu !== pedido || falha?.status === 401) return;
    erro(lista, {mensagem: "Não deu para carregar suas tarefas.", tentarDeNovo: () => carregar()});
  }
}

const seletor = seletorPeriodo(document.querySelector("[data-dia]"), {modo: "dia", valor: dia,
  aoMudar: (novo) => trocarFiltro("dia", novo === isoDoDia() ? null : novo)});

aoMudar(() => {
  const novo = diaDaUrl();
  seletor.definir(novo);
  if (novo !== dia) carregar({limpar: true});
});

iniciarCasca({recarregar: () => carregar()}).then((usuario) => {
  if (usuario) titulo.textContent = saudacao(usuario.nome);
});
carregar();
