// Seletor de período (DESIGN.md §4 e lacuna 2 do web-admin.md): anterior · rótulo · próximo. A variante
// "dia" ganha "Hoje", e o rótulo abre o campo de data do sistema (lacuna 3).

import {data, isoDoDia, lerData} from "../nucleo/formatos.js";
import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
  "novembro", "dezembro"];

function somar(modo, valor, passos) {
  if (modo === "dia") {
    const dia = lerData(valor);
    dia.setDate(dia.getDate() + passos);
    return isoDoDia(dia);
  }
  const [ano, mes] = valor.split("-").map(Number);
  return isoDoDia(new Date(ano, mes - 1 + passos, 1)).slice(0, 7);
}

function rotulo(modo, valor) {
  if (modo === "dia") return data(valor);
  const [ano, mes] = valor.split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

/**
 * Desenha o seletor em `elemento`. `valor` é "2026-11-05" (dia) ou "2026-11" (mês); `aoMudar(novo)`
 * roda a cada troca. Devolve {valor(), definir(novo)} para a tela acompanhar a URL.
 */
export function seletorPeriodo(elemento, {modo = "dia", valor, aoMudar = () => {}}) {
  const unidade = modo === "dia" ? {anterior: "Dia anterior", proximo: "Próximo dia", grupo: "Dia"}
    : {anterior: "Mês anterior", proximo: "Próximo mês", grupo: "Mês"};
  let atual = valor;
  elemento.classList.add("periodo");
  elemento.setAttribute("role", "group");
  elemento.setAttribute("aria-label", unidade.grupo);
  renderizar(elemento, html`
    <button type="button" class="botao botao--icone botao--secundario botao--sm" data-passo="-1" aria-label="${unidade.anterior}">${icone("anterior")}</button>
    ${modo === "dia" ? html`<button type="button" class="botao botao--secundario botao--sm" data-hoje>Hoje</button>` : ""}
    ${modo === "dia"
      ? html`<span class="periodo__dia"><button type="button" class="botao botao--fantasma botao--sm periodo__rotulo numero" data-rotulo></button>
          <input type="date" class="periodo__data" tabindex="-1" aria-hidden="true" data-campo></span>`
      : html`<span class="periodo__rotulo numero" data-rotulo aria-live="polite"></span>`}
    <button type="button" class="botao botao--icone botao--secundario botao--sm" data-passo="1" aria-label="${unidade.proximo}">${icone("proximo")}</button>`);
  const textoDoRotulo = elemento.querySelector("[data-rotulo]");
  const campo = elemento.querySelector("[data-campo]");

  function mostrar() {
    const texto = rotulo(modo, atual);
    textoDoRotulo.textContent = texto;
    if (campo) {
      campo.value = atual;
      textoDoRotulo.setAttribute("aria-label", `${texto}, escolher outro dia`);
    }
  }

  function trocar(novo) {
    if (!novo || novo === atual) return;
    atual = novo;
    mostrar();
    aoMudar(atual);
  }

  for (const botao of elemento.querySelectorAll("[data-passo]")) {
    botao.addEventListener("click", () => trocar(somar(modo, atual, Number(botao.dataset.passo))));
  }
  elemento.querySelector("[data-hoje]")?.addEventListener("click", () => trocar(isoDoDia()));
  if (campo) {
    textoDoRotulo.addEventListener("click", () => {
      try {
        campo.showPicker();
      } catch {
        campo.focus(); // sem showPicker (navegador antigo): o campo recebe o foco e abre pelo teclado
      }
    });
    campo.addEventListener("change", () => trocar(campo.value));
  }
  mostrar();
  return {
    valor: () => atual,
    definir(novo) {
      atual = novo;
      mostrar();
    },
  };
}
