// Busca (lote B §4) nas duas variantes: no formulário, a caixa de combinação da APG que acha por nome
// ou telefone, com a última opção para cadastrar ali mesmo (lacuna 1 de web-admin.md); e a geral, no
// topo do admin, aberta com Ctrl/⌘ K, que acha imóveis, reservas e hóspedes e oferece as ações.

import {api} from "../nucleo/api.js";
import {gruposDaBusca, juntarRecente, semAcento} from "../nucleo/busca.js";
import {html, renderizar} from "../nucleo/html.js";
import {abrirGaveta, destinoSeguro} from "../nucleo/url.js";
import {acaoNoErro, atualizarAcaoDoErro, limparErro, marcarErro} from "./formulario.js";
import {temGaveta} from "./gaveta.js";
import {icone} from "./pecas.js";
import {ir, paginaAtual} from "../nucleo/enderecos.js";

const ESPERA = 200;
let contador = 0;

/** O trecho que combina com a busca fica em <mark>, sem diferença de acento nem de maiúscula. */
function destacar(texto, termo) {
  const i = texto ? semAcento(texto).indexOf(semAcento(termo)) : -1;
  if (i < 0) return texto ?? "";
  return html`${texto.slice(0, i)}<mark>${texto.slice(i, i + termo.length)}</mark>${texto.slice(i + termo.length)}`;
}

/**
 * Liga a busca ao campo de texto de `campo`. `buscar(termo)` devolve a promessa dos itens;
 * `rotular(item)` dá {titulo, detalhe}; `criar(termo)`, quando existe, vira a última opção da lista e
 * o botão logo abaixo de todo erro do campo ("Cadastrar “Ana”"; com o campo vazio, o rótulo `novo`).
 * Quando a busca não acha ninguém, a lista nem abre: o aviso `semResultado` aparece na hora embaixo
 * do campo, já com esse botão.
 */
export function buscaNoFormulario(campo, {buscar, rotular, criar = null, semResultado = "Nada encontrado.",
  novo = "Cadastrar novo", aoEscolher = () => {}, aoDigitar = () => {}}) {
  const entrada = campo.querySelector("input:not([type=hidden])");
  const id = `busca-${++contador}`;
  const lista = document.createElement("ul");
  lista.className = "busca-lista";
  lista.id = `${id}-lista`;
  lista.setAttribute("role", "listbox");
  lista.hidden = true;
  if (entrada.labels?.[0]) {
    entrada.labels[0].id ||= `${id}-rotulo`;
    lista.setAttribute("aria-labelledby", entrada.labels[0].id);
  }
  const leitor = document.createElement("p");
  leitor.className = "visualmente-oculto";
  leitor.setAttribute("role", "status");
  entrada.after(lista);
  campo.append(leitor);
  Object.entries({role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": lista.id,
    autocomplete: "off", spellcheck: "false"}).forEach(([nome, valor]) => entrada.setAttribute(nome, valor));

  let opcoes = [];
  let ativa = -1;
  let espera = null;
  let pedido = 0;

  function fechar() {
    lista.hidden = true;
    entrada.setAttribute("aria-expanded", "false");
    entrada.removeAttribute("aria-activedescendant");
    ativa = -1;
  }

  // O botão de cadastrar leva o texto de agora, no aviso de sem resultado e no erro do envio
  // ("Escolha um hóspede da lista ou cadastre um novo.").
  if (criar) {
    acaoNoErro(entrada, () => {
      const termo = entrada.value.trim();
      return {icone: "mais", rotulo: termo ? `Cadastrar “${termo}”` : novo, fazer: () => cadastrar(termo)};
    });
  }

  function cadastrar(termo) {
    fechar();
    limparErro(entrada);
    criar(termo);
  }

  function marcar(indice) {
    ativa = indice;
    lista.querySelectorAll('[role="option"]').forEach((opcao, i) => opcao.setAttribute("aria-selected", String(i === indice)));
    const escolhida = lista.querySelector(`#${id}-${indice}`);
    if (!escolhida) return;
    entrada.setAttribute("aria-activedescendant", escolhida.id);
    escolhida.scrollIntoView({block: "nearest"});
  }

  function mostrar(itens, termo) {
    opcoes = [...itens.map((item) => ({item})), ...(criar ? [{criar: termo}] : [])];
    renderizar(lista, html`${opcoes.map((opcao, i) => {
      if (opcao.criar) {
        return html`<li role="option" id="${id}-${i}" class="busca-lista__opcao busca-lista__criar" aria-selected="false">
          ${icone("mais")}<span>Cadastrar “${opcao.criar}”</span></li>`;
      }
      const {titulo, detalhe} = rotular(opcao.item);
      return html`<li role="option" id="${id}-${i}" class="busca-lista__opcao" aria-selected="false">
        <span class="busca-lista__titulo">${destacar(titulo, termo)}</span>
        ${detalhe ? html`<span class="busca-lista__detalhe">${destacar(detalhe, termo)}</span>` : ""}</li>`;
    })}`);
    leitor.textContent = itens.length ? `${itens.length} ${itens.length === 1 ? "resultado" : "resultados"}.` : "Nenhum resultado.";
    lista.hidden = !opcoes.length;
    entrada.setAttribute("aria-expanded", String(!lista.hidden));
    ativa = -1;
  }

  function escolher(indice) {
    const opcao = opcoes[indice];
    if (!opcao) return;
    if (opcao.criar) {
      cadastrar(opcao.criar);
      return;
    }
    fechar();
    limparErro(entrada);
    entrada.value = rotular(opcao.item).titulo;
    aoEscolher(opcao.item);
  }

  entrada.addEventListener("input", () => {
    aoDigitar();
    clearTimeout(espera);
    const termo = entrada.value.trim();
    if (termo.length < 2) {
      pedido += 1;
      fechar();
      limparErro(entrada);
      return;
    }
    // O aviso de sem resultado fica até a próxima busca dizer outra coisa; o botão já leva o texto novo.
    atualizarAcaoDoErro(entrada);
    espera = setTimeout(async () => {
      const meu = ++pedido;
      campo.dataset.buscando = "";
      try {
        const itens = await buscar(termo);
        if (meu !== pedido) return;
        if (!itens.length && criar) {
          // Ninguém com esse texto: no lugar da lista, o aviso e o botão de cadastrar, embaixo do campo.
          opcoes = [];
          fechar();
          marcarErro(entrada, semResultado, {invalido: false});
          leitor.textContent = semResultado;
        } else {
          limparErro(entrada);
          mostrar(itens, termo);
        }
      } catch {
        if (meu === pedido) {
          limparErro(entrada);
          mostrar([], termo);
          leitor.textContent = "Não deu para buscar agora.";
        }
      } finally {
        if (meu === pedido) delete campo.dataset.buscando;
      }
    }, ESPERA);
  });

  entrada.addEventListener("keydown", (evento) => {
    const aberta = !lista.hidden;
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      if (!opcoes.length) return;
      evento.preventDefault();
      if (!aberta) {
        lista.hidden = false;
        entrada.setAttribute("aria-expanded", "true");
      }
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      marcar(ativa < 0 && passo < 0 ? opcoes.length - 1 : (ativa + passo + opcoes.length) % opcoes.length);
    } else if (evento.key === "Enter" && aberta && ativa >= 0) {
      evento.preventDefault();
      escolher(ativa);
    } else if (evento.key === "Escape" && (aberta || entrada.value)) {
      // O primeiro Esc fecha a lista; o segundo limpa o texto. Nenhum dos dois fecha a gaveta.
      evento.preventDefault();
      evento.stopPropagation();
      if (aberta) {
        fechar();
      } else {
        entrada.value = "";
        aoDigitar();
        limparErro(entrada);
      }
    }
  });
  entrada.addEventListener("blur", () => setTimeout(fechar, 0));
  lista.addEventListener("mousedown", (evento) => evento.preventDefault());
  lista.addEventListener("click", (evento) => {
    const opcao = evento.target.closest('[role="option"]');
    if (opcao) escolher(Number(opcao.id.slice(id.length + 1)));
  });

  return {
    definir(item) {
      entrada.value = item ? rotular(item).titulo : "";
      limparErro(entrada);
    },
  };
}

// Busca geral do topo (lote B §4; web-admin.md §8): o gatilho abre, ancorado nele, um painel com o
// campo e os resultados por grupo. Sem texto, os recentes e as ações; a partir de 2 letras, 200ms
// depois da última tecla, o que /api/busca achar. Esc limpa o texto e o segundo Esc fecha.

const RECENTES = "gemovel:busca-recentes";
const ICONE_DO_TIPO = {acao: "mais", imovel: "imoveis", reserva: "reservas", hospede: "equipe"};

function lerRecentes() {
  try {
    const lista = JSON.parse(localStorage.getItem(RECENTES) ?? "[]");
    return Array.isArray(lista) ? lista.filter((item) => item && destinoSeguro(item.endereco) && ICONE_DO_TIPO[item.tipo]) : [];
  } catch {
    return [];
  }
}

function guardarRecente(item) {
  try {
    localStorage.setItem(RECENTES, JSON.stringify(juntarRecente(lerRecentes(), item)));
  } catch {
    // Sem armazenamento no navegador, a busca só não lembra dos recentes.
  }
}

export function ligarBuscaGeral(gatilho) {
  const painel = document.createElement("div");
  painel.className = "busca-geral";
  painel.popover = "manual";
  renderizar(painel, html`<search class="busca-geral__campo">${icone("buscar")}
      <input type="search" class="busca-geral__entrada" role="combobox" aria-autocomplete="list" aria-expanded="false"
        aria-controls="busca-geral-lista" aria-label="Buscar imóvel, reserva ou hóspede" placeholder="Buscar imóvel, reserva ou hóspede"
        autocomplete="off" spellcheck="false" enterkeyhint="go">
      <span class="busca-geral__carregando" aria-hidden="true"></span>
      <button type="button" class="busca-geral__fechar"><span class="busca-geral__cancelar">Cancelar</span><kbd class="atalho" aria-hidden="true">Esc</kbd></button></search>
    <div class="busca-geral__lista" id="busca-geral-lista" role="listbox" aria-label="Resultados da busca"></div>
    <div class="busca-geral__aviso" hidden></div>
    <p class="visualmente-oculto" role="status"></p>`);
  document.body.append(painel);
  const entrada = painel.querySelector("input");
  const lista = painel.querySelector('[role="listbox"]');
  const aviso = painel.querySelector(".busca-geral__aviso");
  const leitor = painel.querySelector('[role="status"]');
  gatilho.setAttribute("aria-expanded", "false");

  let itens = [];
  let ativa = -1;
  let espera = 0;
  let pedido = 0;
  // No celular a busca ocupa a tela: abrir empilha um passo no history, e o Voltar do aparelho a fecha
  // (como fecha a gaveta) em vez de sair da página.
  let noHistorico = false;

  const aberta = () => painel.matches(":popover-open");
  const celular = () => matchMedia("(max-width: 760px)").matches;

  function marcar(indice) {
    ativa = indice;
    for (const opcao of lista.querySelectorAll('[role="option"]')) opcao.setAttribute("aria-selected", String(Number(opcao.dataset.indice) === indice));
    const escolhida = lista.querySelector(`#busca-geral-opcao-${indice}`);
    if (!escolhida) {
      entrada.removeAttribute("aria-activedescendant");
      return;
    }
    entrada.setAttribute("aria-activedescendant", escolhida.id);
    escolhida.scrollIntoView({block: "nearest"});
  }

  function opcao(item, indice, termo) {
    const marcado = (texto) => (termo ? destacar(texto, termo) : texto);
    return html`<div role="option" class="busca-geral__opcao" id="busca-geral-opcao-${indice}" data-indice="${indice}" aria-selected="false">
      ${icone(ICONE_DO_TIPO[item.tipo])}<span class="busca-geral__textos"><span class="busca-geral__titulo">${marcado(item.titulo)}</span>
      ${item.detalhe ? html`<span class="busca-geral__detalhe">${marcado(item.detalhe)}</span>` : ""}</span></div>`;
  }

  function desenhar(grupos, termo = "", {mensagem = null, primeira = false} = {}) {
    itens = grupos.flatMap((grupo) => grupo.itens);
    let indice = 0;
    renderizar(lista, html`${grupos.map((grupo, n) => html`<div role="group" aria-labelledby="busca-geral-grupo-${n}">
      <div class="busca-geral__grupo" id="busca-geral-grupo-${n}" role="presentation">${grupo.nome}</div>
      ${grupo.itens.map((item) => opcao(item, indice++, termo))}</div>`)}`);
    lista.hidden = !itens.length;
    renderizar(aviso, mensagem ?? html``);
    aviso.hidden = !mensagem;
    entrada.setAttribute("aria-expanded", String(itens.length > 0));
    marcar(primeira && itens.length ? 0 : -1);
  }

  function inicial() {
    const recentes = lerRecentes();
    desenhar([...(recentes.length ? [{nome: "Recentes", itens: recentes}] : []), ...gruposDaBusca({}, "")]);
    leitor.textContent = "";
  }

  async function buscar(termo) {
    const meu = ++pedido;
    painel.dataset.buscando = "";
    try {
      const resposta = await api.get("/api/busca", {q: termo});
      if (meu !== pedido) return;
      const grupos = gruposDaBusca(resposta, termo);
      desenhar(grupos, termo, {primeira: true, mensagem: grupos.length ? null
        : html`Nada encontrado para “${termo}”. Confira a grafia ou busque pelo código, como IMV-003.`});
      leitor.textContent = itens.length ? `${itens.length} ${itens.length === 1 ? "resultado" : "resultados"}` : "Nenhum resultado";
    } catch {
      if (meu !== pedido) return;
      // As ações que combinam continuam à mão.
      desenhar(gruposDaBusca({}, termo), termo, {mensagem: html`Não deu para buscar agora.
        <button type="button" class="link" data-tentar>Tentar de novo</button>`});
      leitor.textContent = "Não deu para buscar agora.";
    } finally {
      if (meu === pedido) delete painel.dataset.buscando;
    }
  }

  function posicionar() {
    if (celular()) { // no celular a busca abre em tela cheia (celular.css)
      painel.style.top = painel.style.left = "";
      return;
    }
    const caixa = gatilho.getBoundingClientRect();
    painel.style.top = `${Math.round(caixa.top - 4)}px`;
    painel.style.left = `${Math.round(Math.max(16, Math.min(caixa.left - 4, innerWidth - painel.offsetWidth - 16)))}px`;
  }

  function abrir() {
    if (document.querySelector("dialog:modal")) return; // com uma gaveta aberta, a busca espera
    if (!aberta()) {
      entrada.value = "";
      inicial();
      painel.showPopover();
      posicionar();
      gatilho.setAttribute("aria-expanded", "true");
      if (celular()) {
        history.pushState({busca: true}, "");
        noHistorico = true;
      }
    }
    entrada.focus();
  }

  function fechar({focar = null, desempilhar = true} = {}) {
    if (!aberta()) return;
    clearTimeout(espera);
    pedido += 1;
    delete painel.dataset.buscando;
    painel.hidePopover();
    gatilho.setAttribute("aria-expanded", "false");
    focar?.focus();
    if (noHistorico) {
      noHistorico = false;
      if (desempilhar) history.back();
    }
  }

  function escolher(item) {
    if (!item) return;
    if (item.tipo !== "acao") guardarRecente(item);
    // Com o passo da busca no history, o destino espera o Voltar terminar: senão ele fecharia a gaveta
    // aberta agora.
    const voltando = noHistorico;
    if (voltando) addEventListener("popstate", () => seguir(item), {once: true});
    fechar();
    if (!voltando) seguir(item);
  }

  function seguir(item) {
    // A ação abre a gaveta na própria tela quando ela a conhece; o resultado vai para a tela dele
    // (web-admin.md §8), a não ser que a pessoa já esteja em Reservas.
    const alvo = item.tipo === "acao" ? item.gaveta : {tipo: item.tipo, id: item.id};
    const aqui = item.tipo === "acao" ? temGaveta(alvo.tipo)
      : item.tipo !== "imovel" && paginaAtual() === "/reservas" && temGaveta(alvo.tipo);
    if (aqui) abrirGaveta(alvo.tipo, alvo.id);
    else if (destinoSeguro(item.endereco)) ir(item.endereco);
  }

  entrada.addEventListener("input", () => {
    clearTimeout(espera);
    const termo = entrada.value.trim();
    if (termo.length < 2) {
      pedido += 1;
      delete painel.dataset.buscando;
      inicial();
      return;
    }
    espera = setTimeout(() => buscar(termo), ESPERA);
  });

  entrada.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      if (!itens.length) return;
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      marcar(ativa < 0 ? (passo > 0 ? 0 : itens.length - 1) : (ativa + passo + itens.length) % itens.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (ativa >= 0) escolher(itens[ativa]);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      if (entrada.value) {
        entrada.value = "";
        clearTimeout(espera);
        pedido += 1;
        delete painel.dataset.buscando;
        inicial();
      } else {
        fechar({focar: gatilho});
      }
    } else if (evento.key === "Tab") {
      // O painel mora no fim da página: o Tab segue a partir do gatilho, como se o campo estivesse no topo.
      evento.preventDefault();
      fechar({focar: evento.shiftKey ? gatilho : gatilho.nextElementSibling ?? gatilho});
    }
  });

  lista.addEventListener("mousedown", (evento) => evento.preventDefault());
  lista.addEventListener("click", (evento) => {
    const escolhida = evento.target.closest('[role="option"]');
    if (escolhida) escolher(itens[Number(escolhida.dataset.indice)]);
  });
  aviso.addEventListener("click", (evento) => {
    if (!evento.target.closest("[data-tentar]")) return;
    entrada.focus();
    buscar(entrada.value.trim());
  });

  painel.querySelector(".busca-geral__fechar").addEventListener("click", () => fechar({focar: gatilho}));
  addEventListener("popstate", () => {
    if (noHistorico) fechar({desempilhar: false});
  });

  gatilho.addEventListener("click", abrir);
  document.addEventListener("keydown", (evento) => {
    if (evento.key?.toLowerCase() !== "k" || !(evento.ctrlKey || evento.metaKey) || evento.altKey || evento.shiftKey) return;
    evento.preventDefault();
    abrir();
  });
  document.addEventListener("pointerdown", (evento) => {
    if (aberta() && !painel.contains(evento.target) && !gatilho.contains(evento.target)) fechar();
  });
  painel.addEventListener("focusout", (evento) => {
    if (evento.relatedTarget && !painel.contains(evento.relatedTarget)) fechar();
  });
  addEventListener("resize", () => {
    if (aberta()) posicionar();
  });
}
