import {test} from "node:test";
import assert from "node:assert/strict";
import {conflitoDe, fraseConflito} from "../estaticos/js/componentes/seletor-datas.js";

const mariana = {id: 2, codigo: "RSV-0002", hospede: {nome: "Mariana Costa"}, data_entrada: "2026-11-04", data_saida: "2026-11-07", status: "confirmada"};
const aquecedor = {id: 1, data_inicio: "2026-11-08", data_fim: "2026-11-11", motivo: "Troca do aquecedor"};

test("entrar no dia da saída não conflita; cruzar uma noite conflita", () => {
  assert.equal(conflitoDe({entrada: "2026-11-07", saida: "2026-11-08"}, [mariana], []), null);
  assert.deepEqual(conflitoDe({entrada: "2026-11-06", saida: "2026-11-08"}, [mariana], []), {tipo: "reserva", reserva: mariana});
});

test("a própria reserva e a cancelada não conflitam", () => {
  assert.equal(conflitoDe({entrada: "2026-11-05", saida: "2026-11-06"}, [mariana], [], 2), null);
  assert.equal(conflitoDe({entrada: "2026-11-05", saida: "2026-11-06"}, [{...mariana, status: "cancelada"}], []), null);
});

test("o bloqueio segue a mesma regra: entrar no dia do fim não conflita", () => {
  assert.equal(conflitoDe({entrada: "2026-11-11", saida: "2026-11-12"}, [], [aquecedor]), null);
  assert.deepEqual(conflitoDe({entrada: "2026-11-10", saida: "2026-11-12"}, [], [aquecedor]), {tipo: "bloqueio", bloqueio: aquecedor});
});

test("as frases do formulário", () => {
  assert.equal(fraseConflito({tipo: "reserva", reserva: mariana}), "Conflita com RSV-0002 (Mariana Costa, 4 a 7 nov). Escolha outras datas.");
  assert.equal(fraseConflito({tipo: "bloqueio", bloqueio: aquecedor}), "O imóvel está bloqueado de 8 a 11 nov (troca do aquecedor).");
});

test("as frases do formulário de bloqueio, iguais às do servidor", () => {
  assert.equal(fraseConflito({tipo: "reserva", reserva: mariana}, "bloqueio"), "Já há a reserva RSV-0002 (Mariana Costa, 4 a 7 nov) nessas datas.");
  assert.equal(fraseConflito({tipo: "bloqueio", bloqueio: aquecedor}, "bloqueio"), "Já há um bloqueio de 8 a 11 nov (troca do aquecedor) nessas datas.");
});
