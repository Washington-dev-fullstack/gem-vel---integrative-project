// Abas (lote B §3): padrão da APG com ativação automática; a aba ativa fica no endereço (#tarefas).

import {podeAnimar} from "../nucleo/nivel.js";

function deslizar(de, para) {
  if (!podeAnimar() || !para.animate) return;
  const a = de.getBoundingClientRect();
  const b = para.getBoundingClientRect();
  para.animate([{transform: `translateX(${a.left - b.left}px) scaleX(${a.width / b.width})`}, {transform: "none"}],
    {duration: 400, easing: "cubic-bezier(.16, 1, .3, 1)", pseudoElement: "::after"});
}

export function ligarAbas(lista, {aoTrocar} = {}) {
  const abas = [...lista.querySelectorAll('[role="tab"]')];

  const ativar = (aba, {focar = false, animar = true} = {}) => {
    const anterior = abas.find((a) => a.getAttribute("aria-selected") === "true");
    for (const a of abas) {
      const escolhida = a === aba;
      a.setAttribute("aria-selected", String(escolhida));
      a.tabIndex = escolhida ? 0 : -1;
      const painel = document.getElementById(a.getAttribute("aria-controls"));
      if (painel) painel.hidden = !escolhida;
    }
    if (focar) aba.focus();
    if (animar && anterior && anterior !== aba) deslizar(anterior, aba);
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${aba.dataset.aba}`);
    aoTrocar?.(aba.dataset.aba);
  };

  lista.addEventListener("click", (evento) => {
    const aba = evento.target.closest('[role="tab"]');
    if (aba) ativar(aba);
  });
  lista.addEventListener("keydown", (evento) => {
    const atual = abas.indexOf(document.activeElement);
    if (atual < 0) return;
    const destino = {ArrowRight: atual + 1, ArrowLeft: atual - 1, Home: 0, End: abas.length - 1}[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    ativar(abas[(destino + abas.length) % abas.length], {focar: true});
  });

  const pedida = abas.find((a) => `#${a.dataset.aba}` === location.hash) ?? abas[0];
  ativar(pedida, {animar: false});
  return {
    ativar: (nome) => {
      const aba = abas.find((a) => a.dataset.aba === nome);
      if (aba) ativar(aba);
    },
  };
}
