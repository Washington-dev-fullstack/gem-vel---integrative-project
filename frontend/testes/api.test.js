import {test} from "node:test";
import assert from "node:assert/strict";
import {api, ErroApi} from "../estaticos/js/nucleo/api.js";

// O aviso de sessão sai em globalThis, como no navegador.
const alvo = new EventTarget();
globalThis.addEventListener = alvo.addEventListener.bind(alvo);
globalThis.removeEventListener = alvo.removeEventListener.bind(alvo);
globalThis.dispatchEvent = alvo.dispatchEvent.bind(alvo);

let pedidos = [];
function responder(fabrica) {
  pedidos = [];
  globalThis.fetch = async (url, opcoes) => { pedidos.push({url: String(url), opcoes}); return fabrica(url, opcoes); };
}
const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), {status, headers: {"Content-Type": "application/json"}});
const erro = (status, mensagem, campos = {}) => json({erro: {mensagem, campos}}, status);

test("devolve os dados, e null no 204", async () => {
  responder(() => json({reservas: [1]}));
  assert.deepEqual(await api.get("/api/reservas"), {reservas: [1]});
  responder(() => new Response(null, {status: 204}));
  assert.equal(await api.delete("/api/hospedes/3"), null);
});

test("escrita manda JSON, mesmo sem campos, e o keepalive quando pedido", async () => {
  responder(() => new Response(null, {status: 204}));
  await api.post("/api/reservas/3/cancelar");
  await api.delete("/api/hospedes/3", {keepalive: true});
  assert.deepEqual(pedidos.map((p) => [p.opcoes.method, p.opcoes.body, p.opcoes.headers["Content-Type"], p.opcoes.keepalive]),
    [["POST", "{}", "application/json", false], ["DELETE", "{}", "application/json", true]]);
});

test("erro da API vira ErroApi com status, mensagem e campos", async () => {
  responder(() => erro(422, "Confira os campos destacados.", {nome: "Informe o nome."}));
  await assert.rejects(api.post("/api/hospedes", {}), (e) =>
    e instanceof ErroApi && e.status === 422 && e.mensagem === "Confira os campos destacados." && e.campos.nome === "Informe o nome.");
});

test("401 fora do login avisa uma vez; 401 do /api/sessao não avisa", async () => {
  let avisos = 0;
  const contar = () => { avisos += 1; };
  globalThis.addEventListener("gemovel:sessao-expirada", contar);
  responder(() => erro(401, "E-mail ou senha não conferem."));
  await assert.rejects(api.post("/api/sessao", {email: "x", senha: "y"}), (e) => e.status === 401);
  assert.equal(avisos, 0);
  responder(() => erro(401, "Entre de novo para continuar."));
  await assert.rejects(api.post("/api/reservas", {}), (e) => e.status === 401);
  await assert.rejects(api.get("/api/imoveis"), (e) => e.status === 401);
  globalThis.removeEventListener("gemovel:sessao-expirada", contar);
  assert.equal(avisos, 1);
});

test("sem resposta vira ErroApi com status 0", async () => {
  responder(() => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(api.get("/api/imoveis"), (e) =>
    e instanceof ErroApi && e.status === 0 && e.mensagem === "Não deu para falar com o servidor. Confira a internet e tente de novo.");
});

test("resposta sem JSON vira o erro genérico", async () => {
  responder(() => new Response("<h1>erro</h1>", {status: 500, headers: {"Content-Type": "text/html"}}));
  await assert.rejects(api.get("/api/imoveis"), (e) => e.status === 500 && e.mensagem === "Algo deu errado do nosso lado. Tente de novo.");
});

test("parâmetro vazio não vai para o endereço", async () => {
  responder(() => json({}));
  await api.get("/api/reservas", {de: "2026-11-01", ate: null, imoveis: undefined, estado: ""});
  assert.equal(pedidos[0].url, "/api/reservas?de=2026-11-01");
});
