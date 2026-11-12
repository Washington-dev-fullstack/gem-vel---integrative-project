// Dica flutuante rica (lote B §16): um detalhe ao apontar (depois de 300ms) ou ao focar (na hora).
// Com uma dica à vista, ou até 600ms depois dela, a vizinha aparece sem espera. Some com Esc, ao
// tirar o mouse (100ms de folga) ou quando o foco sai. O texto vem do atributo data-dica.

let dica = null;
let alvo = null;
let relogioMostrar = 0;
let relogioEsconder = 0;
let escondidaEm = 0;

const aberta = () => Boolean(dica?.matches(":popover-open"));

function posicionar() {
  const caixa = alvo.getBoundingClientRect();
  const {offsetWidth: largura, offsetHeight: altura} = dica;
  let topo = caixa.top - altura - 8;
  dica.dataset.lado = topo < 8 ? "baixo" : "cima";
  if (topo < 8) topo = caixa.bottom + 8;
  const esquerda = Math.min(Math.max(8, caixa.left + caixa.width / 2 - largura / 2), innerWidth - largura - 8);
  dica.style.top = `${Math.round(topo)}px`;
  dica.style.left = `${Math.round(esquerda)}px`;
}

function mostrar(elemento) {
  clearTimeout(relogioEsconder);
  if (!dica) {
    dica = document.createElement("div");
    dica.className = "dica";
    dica.id = "dica-flutuante";
    dica.setAttribute("role", "tooltip");
    dica.popover = "manual";
    document.body.append(dica);
  }
  alvo?.removeAttribute("aria-describedby");
  alvo = elemento;
  dica.textContent = elemento.dataset.dica;
  // Quando o rótulo já diz o mesmo, a dica não é lida de novo.
  if (!elemento.hasAttribute("aria-label")) elemento.setAttribute("aria-describedby", dica.id);
  if (!aberta()) dica.showPopover();
  posicionar();
}

function esconder() {
  clearTimeout(relogioMostrar);
  if (!aberta()) return;
  dica.hidePopover();
  alvo?.removeAttribute("aria-describedby");
  alvo = null;
  escondidaEm = Date.now();
}

export function ligarDicas(container) {
  container.addEventListener("pointerover", (evento) => {
    const elemento = evento.target.closest?.("[data-dica]");
    if (evento.pointerType !== "mouse" || !elemento || elemento === alvo) return;
    clearTimeout(relogioMostrar);
    clearTimeout(relogioEsconder);
    const espera = aberta() || Date.now() - escondidaEm < 600 ? 0 : 300;
    relogioMostrar = setTimeout(() => mostrar(elemento), espera);
  });
  container.addEventListener("pointerout", (evento) => {
    const elemento = evento.target.closest?.("[data-dica]");
    if (!elemento || elemento.contains(evento.relatedTarget)) return;
    clearTimeout(relogioMostrar);
    relogioEsconder = setTimeout(esconder, 100);
  });
  container.addEventListener("focusin", (evento) => {
    const elemento = evento.target.closest?.("[data-dica]");
    if (elemento) mostrar(elemento);
  });
  container.addEventListener("focusout", (evento) => {
    if (evento.target.closest?.("[data-dica]")) esconder();
  });
}

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") esconder();
});
addEventListener("scroll", esconder, {passive: true, capture: true});
