import {test} from "node:test";
import assert from "node:assert/strict";
import {umEnvioPorVez} from "../estaticos/js/componentes/formulario.js";

test("umEnvioPorVez ignora o segundo clique enquanto o primeiro espera", async () => {
  let n = 0;
  let soltar;
  const enviar = umEnvioPorVez(() => {
    n += 1;
    return new Promise((r) => { soltar = r; });
  });
  const a = enviar();
  const b = enviar();
  assert.equal(n, 1);
  assert.equal(a, b);
  soltar();
  await a;
  enviar();
  assert.equal(n, 2);
});

test("umEnvioPorVez libera de novo quando o envio falha", async () => {
  let n = 0;
  const enviar = umEnvioPorVez(async () => {
    n += 1;
    throw new Error("falhou");
  });
  await assert.rejects(enviar());
  await assert.rejects(enviar());
  assert.equal(n, 2);
});
