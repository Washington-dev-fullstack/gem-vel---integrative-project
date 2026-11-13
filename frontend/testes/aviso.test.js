import {test} from "node:test";
import assert from "node:assert/strict";
import {adiarEnvio, desfazPeloAtalho} from "../estaticos/js/componentes/aviso.js";

test("envia uma vez no fim da espera, sem keepalive", (t) => {
  t.mock.timers.enable({apis: ["setTimeout"]});
  const alvo = new EventTarget();
  const chamadas = [];
  adiarEnvio((o) => chamadas.push(o), {alvo});
  t.mock.timers.tick(9999);
  assert.equal(chamadas.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(chamadas, [{keepalive: false}]);
});

test("desfazer cancela", (t) => {
  t.mock.timers.enable({apis: ["setTimeout"]});
  const alvo = new EventTarget();
  const chamadas = [];
  const envio = adiarEnvio((o) => chamadas.push(o), {alvo});
  envio.desfazer();
  t.mock.timers.tick(10000);
  alvo.dispatchEvent(new Event("pagehide"));
  assert.deepEqual(chamadas, []);
});

test("pagehide envia na hora, com keepalive, e não envia de novo", (t) => {
  t.mock.timers.enable({apis: ["setTimeout"]});
  const alvo = new EventTarget();
  const chamadas = [];
  adiarEnvio((o) => chamadas.push(o), {alvo});
  alvo.dispatchEvent(new Event("pagehide"));
  assert.deepEqual(chamadas, [{keepalive: true}]);
  t.mock.timers.tick(10000);
  alvo.dispatchEvent(new Event("pagehide"));
  assert.equal(chamadas.length, 1);
});

test("⌘/Ctrl Z só serve ao aviso com Desfazer, não a Ver na agenda nem a Entrar de novo", () => {
  assert.equal(desfazPeloAtalho({rotulo: "Desfazer", fazer() {}}), true);
  for (const rotulo of ["Ver na agenda", "Ver no dia", "Ver imóvel", "Entrar de novo"])
    assert.equal(desfazPeloAtalho({rotulo, fazer() {}}), false, rotulo);
  assert.equal(desfazPeloAtalho(null), false);
});
