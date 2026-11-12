import {test} from "node:test";
import assert from "node:assert/strict";
import {partesDoNumero} from "../estaticos/js/componentes/tambor.js";

test("partesDoNumero separa os dígitos do resto", () => {
  assert.deepEqual(partesDoNumero("40%"), [{digito: 4}, {digito: 0}, {texto: "%"}]);
  assert.deepEqual(partesDoNumero("R$ 4.560,00").map((p) => p.digito ?? p.texto),
    ["R$ ", 4, ".", 5, 6, 0, ",", 0, 0]);
});

test("partesDoNumero junta o texto seguido e aceita texto sem dígitos", () => {
  assert.deepEqual(partesDoNumero("dom, 8 nov"), [{texto: "dom, "}, {digito: 8}, {texto: " nov"}]);
  assert.deepEqual(partesDoNumero("—"), [{texto: "—"}]);
  assert.deepEqual(partesDoNumero(""), []);
});
