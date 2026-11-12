import {test} from "node:test";
import assert from "node:assert/strict";
import {trocarTexto} from "../estaticos/js/componentes/pecas.js";

function comAnimacao(t) {
  const antes = {document: globalThis.document, matchMedia: globalThis.matchMedia};
  globalThis.document = {documentElement: {dataset: {tier: "completo"}}};
  globalThis.matchMedia = () => ({matches: false});
  t.after(() => Object.assign(globalThis, antes));
}

const elementoFalso = (texto) => ({textContent: texto, animate: () => ({finished: Promise.resolve()})});

test("trocarTexto fica com o último texto pedido quando duas trocas se cruzam", async (t) => {
  comAnimacao(t);
  const rotulo = elementoFalso("Entrar");
  const ida = trocarTexto(rotulo, "Entrando…");
  const volta = trocarTexto(rotulo, "Entrar");
  await Promise.all([ida, volta]);
  assert.equal(rotulo.textContent, "Entrar");
});

test("trocarTexto troca o texto quando anima", async (t) => {
  comAnimacao(t);
  const rotulo = elementoFalso("Salvar reserva");
  await trocarTexto(rotulo, "Salvando…");
  assert.equal(rotulo.textContent, "Salvando…");
});
