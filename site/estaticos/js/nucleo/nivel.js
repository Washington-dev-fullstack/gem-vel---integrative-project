// Nível de efeito (DESIGN.md §6). O script em linha do base.html decide o nível antes do CSS
// e o grava em <html data-tier>; aqui ficam as perguntas que as telas fazem a ele.

export function nivelAtual() {
  return document.documentElement.dataset.tier || "leve";
}

export function movimentoReduzido() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function podeAnimar() {
  return nivelAtual() !== "leve" && !movimentoReduzido();
}

let gsapCarregando = null;

// O GSAP só é baixado quando a tela vai animar; sem ele, a tela aparece pronta.
export function carregarGsap() {
  if (!podeAnimar()) return Promise.resolve(null);
  if (globalThis.gsap) return Promise.resolve(globalThis.gsap);
  gsapCarregando ??= new Promise((resolver) => {
    const script = document.createElement("script");
    script.src = new URL("../../lib/gsap.min.js", import.meta.url).href;
    script.onload = () => resolver(globalThis.gsap ?? null);
    script.onerror = () => resolver(null);
    document.head.append(script);
  });
  return gsapCarregando;
}

// A abertura coreografada roda só na primeira tela da sessão.
export function primeiraVisita() {
  try {
    if (sessionStorage.getItem("gemovel:abertura")) return false;
    sessionStorage.setItem("gemovel:abertura", "1");
    return true;
  } catch {
    return false;
  }
}
