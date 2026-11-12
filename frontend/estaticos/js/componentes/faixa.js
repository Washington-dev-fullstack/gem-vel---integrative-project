// Faixa de aviso dentro da página: erro com "Tentar de novo", e a faixa fixa de sem internet.

import {html, renderizar} from "../nucleo/html.js";
import {icone} from "./pecas.js";

const ICONE_DO_TOM = {erro: "erro", atencao: "alerta", info: "info", sucesso: "ok"};

export function criarFaixa({mensagem, tentarDeNovo = null, tom = "erro", fechar = false}) {
  const faixa = document.createElement("div");
  faixa.className = `faixa faixa--${tom}`;
  faixa.dataset.faixa = "";
  faixa.setAttribute("role", tom === "erro" ? "alert" : "status");
  renderizar(faixa, html`${icone(ICONE_DO_TOM[tom])}<p class="faixa__texto">${mensagem}</p>
    ${tentarDeNovo ? html`<button type="button" class="botao botao--sm botao--secundario" data-tentar>Tentar de novo</button>` : ""}
    ${fechar ? html`<button type="button" class="botao botao--sm botao--icone botao--fantasma" data-fechar aria-label="Fechar aviso">${icone("fechar")}</button>` : ""}`);
  faixa.querySelector("[data-tentar]")?.addEventListener("click", () => {
    faixa.remove();
    tentarDeNovo();
  });
  faixa.querySelector("[data-fechar]")?.addEventListener("click", () => faixa.remove());
  return faixa;
}

export function mostrarFaixa(area, opcoes) {
  esconderFaixa(area);
  const faixa = criarFaixa(opcoes);
  area.prepend(faixa);
  return faixa;
}

export function esconderFaixa(area) {
  area.querySelector(":scope > [data-faixa]")?.remove();
}

let semInternetLigada = false;

export function ligarFaixaSemInternet() {
  if (semInternetLigada) return;
  semInternetLigada = true;
  let faixa = null;
  const mostrar = () => {
    if (faixa) return;
    faixa = criarFaixa({tom: "atencao", mensagem: "Sem internet. O que está na tela continua aqui; as mudanças voltam a funcionar quando a conexão voltar."});
    faixa.classList.add("faixa--fixa");
    document.body.prepend(faixa);
  };
  const esconder = () => {
    faixa?.remove();
    faixa = null;
  };
  addEventListener("offline", mostrar);
  addEventListener("online", esconder);
  if (navigator.onLine === false) mostrar();
}
