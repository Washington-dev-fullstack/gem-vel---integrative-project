process.env.TZ = "America/Sao_Paulo";
import {test} from "node:test";
import assert from "node:assert/strict";
import {dinheiro, dinheiroSemCentavos, data, dataCurta, intervalo, periodo, horario, lerData, paraDinheiroApi} from "../estaticos/js/nucleo/formatos.js";

const hoje = lerData("2026-11-05");

test("dinheiro", () => {
  assert.equal(dinheiro("1620.00"), "R$ 1.620,00");
  assert.equal(dinheiro("780"), "R$ 780,00");
});
test("data com o ano só fora do ano corrente", () => {
  assert.equal(data("2026-11-06", {hoje}), "sex, 6 nov");
  assert.equal(data("2027-01-02", {hoje}), "sáb, 2 jan 2027");
});
test("lerData não puxa para o dia anterior", () => {
  const d = lerData("2026-11-06");
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 10, 6, 0]);
  const virada = lerData("2027-01-01T00:30");
  assert.deepEqual([virada.getFullYear(), virada.getMonth(), virada.getDate(), virada.getHours()], [2027, 0, 1, 0]);
});
test("periodo, horario e dataCurta", () => {
  assert.equal(periodo("2026-11-03", "2026-11-08", {hoje}), "ter, 3 nov → dom, 8 nov");
  assert.equal(horario("2026-11-05T15:00"), "15:00");
  assert.equal(horario("09:30"), "09:30");
  assert.equal(horario("23:59:00"), "23:59");
  assert.equal(dataCurta("2026-11-06"), "6 nov");
  assert.equal(data("2026-12-31T23:30", {hoje}), "qui, 31 dez");
});
test("paraDinheiroApi", () => {
  assert.equal(paraDinheiroApi("1.620,00"), "1620.00");
  assert.equal(paraDinheiroApi("450"), "450.00");
  assert.equal(paraDinheiroApi("R$ 1.620,5"), "1620.50");
  assert.equal(paraDinheiroApi("450.5"), "450.50");
  assert.equal(paraDinheiroApi("abc"), null);
  assert.equal(paraDinheiroApi(""), null);
});

test("intervalo no mesmo mês e na virada", () => {
  assert.equal(intervalo("2026-11-04", "2026-11-07"), "4 a 7 nov");
  assert.equal(intervalo("2026-10-30", "2026-11-02"), "30 out a 2 nov");
  assert.equal(intervalo("2026-12-28", "2027-01-02"), "28 dez 2026 a 2 jan 2027");
});

test("dinheiroSemCentavos: os KPIs mostram o real inteiro (DESIGN.md §3)", () => {
  const sem = (valor) => dinheiroSemCentavos(valor).replace(/\s/g, " ");
  assert.equal(sem("4560.00"), "R$ 4.560");
  assert.equal(sem("1234.50"), "R$ 1.235");
  assert.equal(sem(0), "R$ 0");
});
