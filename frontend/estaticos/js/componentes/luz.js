// Luz do ponteiro (DESIGN.md §10, item 11): um brilho radial segue o mouse nos cartões de imóvel e de
// pessoa. Só com mouse, nos níveis Completo e Padrão, e nunca com movimento reduzido (§6). O CSS
// desenha o brilho; aqui só se escreve --luz-x e --luz-y, uma vez por quadro.

import {movimentoReduzido, nivelAtual} from "../nucleo/nivel.js";

export function ligarLuz(container, seletor) {
  if (!container || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (!["completo", "padrao"].includes(nivelAtual()) || movimentoReduzido()) return;
  let alvo = null;
  let x = 0;
  let y = 0;
  let quadro = 0;
  const aplicar = () => {
    quadro = 0;
    if (!alvo?.isConnected) return;
    const caixa = alvo.getBoundingClientRect();
    alvo.style.setProperty("--luz-x", `${Math.round(x - caixa.left)}px`);
    alvo.style.setProperty("--luz-y", `${Math.round(y - caixa.top)}px`);
  };
  container.addEventListener("pointermove", (evento) => {
    if (evento.pointerType !== "mouse") return;
    const cartao = evento.target.closest?.(seletor);
    if (!cartao || !container.contains(cartao)) return;
    alvo = cartao;
    x = evento.clientX;
    y = evento.clientY;
    quadro ||= requestAnimationFrame(aplicar);
  });
}
