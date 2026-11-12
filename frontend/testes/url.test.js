import {test} from "node:test";
import assert from "node:assert/strict";
import {estadoDe, urlCom, destinoSeguro} from "../estaticos/js/nucleo/url.js";

test("estadoDe lê filtros, aba e gaveta", () => {
  assert.deepEqual(estadoDe(new URL("http://x/reservas?estado=futura&reserva=12&editar#hospedes")),
    {filtros: {estado: "futura"}, aba: "hospedes", gaveta: {tipo: "reserva", id: 12, editar: true}});
  assert.deepEqual(estadoDe(new URL("http://x/imoveis?imovel=novo")).gaveta, {tipo: "imovel", id: "novo", editar: false});
  assert.deepEqual(estadoDe(new URL("http://x/reservas?imoveis=3,5")), {filtros: {imoveis: "3,5"}, aba: null, gaveta: null});
});
test("urlCom troca filtro e gaveta sem mexer no resto", () => {
  const u = urlCom(new URL("http://x/reservas?estado=futura#hospedes"), {gaveta: {tipo: "hospede", id: 3}});
  assert.equal(u.pathname + u.search + u.hash, "/reservas?estado=futura&hospede=3#hospedes");
  assert.equal(urlCom(u, {gaveta: null}).search, "?estado=futura");
  assert.equal(urlCom(u, {filtros: {estado: null}}).search, "?hospede=3");
  assert.equal(urlCom(u, {gaveta: {tipo: "reserva", id: 12, editar: true}}).search, "?estado=futura&reserva=12&editar");
});
test("destinoSeguro", () => {
  for (const [volta, esperado] of [["/reservas?mes=2026-11", "/reservas?mes=2026-11"], ["//evil.com", null],
       ["/\\evil.com", null], ["https://evil.com", null], ["", null], [null, null]])
    assert.equal(destinoSeguro(volta), esperado);
});
