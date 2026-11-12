// Busca no formulário (lote B §4, variante "no formulário"; lacuna 1 de web-admin.md): a caixa
// de combinação da APG que acha por nome ou telefone, com a última opção para cadastrar ali mesmo.

import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";

const ESPERA = 200;
let contador = 0;

const semAcento = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O trecho que combina com a busca fica em <mark>, sem diferença de acento nem de maiúscula. */
function destacar(texto, termo) {
  const i = texto ? semAcento(texto).indexOf(semAcento(termo)) : -1;
  if (i < 0) return texto ?? "";
  return html`${texto.slice(0, i)}<mark>${texto.slice(i, i + termo.length)}</mark>${texto.slice(i + termo.length)}`;
}

/**
 * Liga a busca ao campo de texto de `campo`. `buscar(termo)` devolve a promessa dos itens;
 * `rotular(item)` dá {titulo, detalhe}; `criar(termo)`, quando existe, vira a última opção.
 */
export function buscaNoFormulario(campo, {buscar, rotular, criar = null, aoEscolher = () => {}, aoDigitar = () => {}}) {
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
    fechar();
    if (opcao.criar) {
      criar(opcao.criar);
      return;
    }
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
      return;
    }
    espera = setTimeout(async () => {
      const meu = ++pedido;
      campo.dataset.buscando = "";
      try {
        const itens = await buscar(termo);
        if (meu === pedido) mostrar(itens, termo);
      } catch {
        if (meu === pedido) {
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
    },
  };
}
