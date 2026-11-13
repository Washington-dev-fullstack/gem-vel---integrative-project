process.env.TZ = "America/Sao_Paulo";
import {test} from "node:test";
import assert from "node:assert/strict";
import {barraNaAgenda, diasDoMes, escalaDoEixo, mesAbreviado, mesPorExtenso, periodoDoArraste, posicaoNoTempo, saudacao}
  from "../estaticos/js/nucleo/painel.js";

const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("saudação pela hora: tarde a partir das 12h, noite a partir das 18h", () => {
  assert.equal(saudacao(new Date(2026, 10, 13, 9)), "Bom dia");
  assert.equal(saudacao(new Date(2026, 10, 13, 12)), "Boa tarde");
  assert.equal(saudacao(new Date(2026, 10, 13, 17, 59)), "Boa tarde");
  assert.equal(saudacao(new Date(2026, 10, 13, 18)), "Boa noite");
});

test("escala do eixo sobe até um passo redondo", () => {
  assert.deepEqual(escalaDoEixo(12340), {topo: 15000, marcas: [0, 5000, 10000, 15000]});
  assert.deepEqual(escalaDoEixo(3800), {topo: 4000, marcas: [0, 1000, 2000, 3000, 4000]});
  assert.deepEqual(escalaDoEixo(15000), {topo: 15000, marcas: [0, 5000, 10000, 15000]});
  assert.deepEqual(escalaDoEixo(0), {topo: 1000, marcas: [0, 250, 500, 750, 1000]});
});

test("nome do mês no eixo e por extenso", () => {
  assert.equal(mesAbreviado("2026-11"), "nov");
  assert.equal(mesPorExtenso("2027-01"), "janeiro de 2027");
});

test("dias do mês, com o fevereiro bissexto", () => {
  const nov = diasDoMes("2026-11");
  assert.equal(nov.length, 30);
  assert.deepEqual([nov[0], nov[29]], ["2026-11-01", "2026-11-30"]);
  assert.equal(diasDoMes("2028-02").length, 29);
});

test("barra da reserva na agenda: entra às 15:00 e sai às 11:00", () => {
  const barra = barraNaAgenda({entrada: "2026-11-09", saida: "2026-11-13"}, "2026-11-01", 30);
  perto(barra.esquerda, (8 + 15 / 24) / 30);
  perto(barra.largura, (12 + 11 / 24 - (8 + 15 / 24)) / 30);
  assert.deepEqual([barra.cortadaAntes, barra.cortadaDepois], [false, false]);
});

test("barra cortada na virada do mês, a ponta da manhã e a reserva fora do mês", () => {
  const virada = barraNaAgenda({entrada: "2026-10-30", saida: "2026-11-03"}, "2026-11-01", 30);
  assert.equal(virada.esquerda, 0);
  assert.equal(virada.cortadaAntes, true);
  const ponta = barraNaAgenda({entrada: "2026-10-28", saida: "2026-11-01"}, "2026-11-01", 30);
  perto(ponta.largura, 11 / 24 / 30);
  const fim = barraNaAgenda({entrada: "2026-11-29", saida: "2026-12-02"}, "2026-11-01", 30);
  perto(fim.esquerda + fim.largura, 1);
  assert.equal(fim.cortadaDepois, true);
  assert.equal(barraNaAgenda({entrada: "2026-10-20", saida: "2026-10-25"}, "2026-11-01", 30), null);
});

test("arrastar de um dia a outro dá a entrada e a saída no dia seguinte ao último", () => {
  assert.deepEqual(periodoDoArraste("2026-11-01", 29, 27), {entrada: "2026-11-28", saida: "2026-12-01"});
  assert.deepEqual(periodoDoArraste("2026-11-01", 4, 4), {entrada: "2026-11-05", saida: "2026-11-06"});
});

test("a gema da tarefa fica na hora agendada; fora do mês, null", () => {
  perto(posicaoNoTempo("2026-11-05T13:00", "2026-11-01", 30), (4 + 13 / 24) / 30);
  assert.equal(posicaoNoTempo("2026-12-01T09:00", "2026-11-01", 30), null);
  assert.equal(posicaoNoTempo("2026-10-31T23:00", "2026-11-01", 30), null);
});
