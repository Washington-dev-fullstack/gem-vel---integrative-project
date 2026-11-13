process.env.TZ = "America/Sao_Paulo";
import {test} from "node:test";
import assert from "node:assert/strict";
import {acoesDaBusca, gruposDaBusca, juntarRecente} from "../estaticos/js/nucleo/busca.js";

test("sem texto, as cinco ações; com texto, até três que combinam, sem diferença de acento", () => {
  assert.deepEqual(acoesDaBusca("").map((a) => a.rotulo), ["Nova reserva", "Novo imóvel", "Nova tarefa", "Nova pessoa", "Bloquear datas"]);
  assert.deepEqual(acoesDaBusca("imovel").map((a) => a.rotulo), ["Novo imóvel"]);
  assert.deepEqual(acoesDaBusca("nov").map((a) => a.rotulo), ["Nova reserva", "Novo imóvel", "Nova tarefa"]);
  assert.deepEqual(acoesDaBusca("carla"), []);
});

test("cada ação abre a gaveta na página dona dela", () => {
  assert.deepEqual(acoesDaBusca("bloquear")[0], {rotulo: "Bloquear datas", tipo: "bloqueio", id: "novo", endereco: "/agenda?bloqueio=novo"});
  assert.equal(acoesDaBusca("pessoa")[0].endereco, "/equipe?pessoa=nova");
});

test("os resultados viram grupos com título, detalhe e endereço; o grupo vazio some", () => {
  const grupos = gruposDaBusca({
    imoveis: [{id: 3, codigo: "IMV-003", nome: "Casa Lapa", bairro: "Lapa", ativo: true},
      {id: 9, codigo: "IMV-009", nome: "Casa Velha", bairro: "Sé", ativo: false}],
    reservas: [{id: 12, codigo: "RSV-0012", hospede: {id: 12, nome: "Carla Nogueira"}, imovel: {id: 1, codigo: "IMV-001", nome: "Apto Jardins"},
      data_entrada: "2026-11-15", data_saida: "2026-11-18", status: "confirmada"},
    {id: 7, codigo: "RSV-0007", hospede: {id: 7, nome: "Caio Lima"}, imovel: {id: 1, codigo: "IMV-001", nome: "Apto Jardins"},
      data_entrada: "2026-10-30", data_saida: "2026-11-02", status: "cancelada"}],
    hospedes: [],
  }, "casa");
  assert.deepEqual(grupos.map((g) => g.nome), ["Imóveis", "Reservas"]);
  assert.deepEqual(grupos[0].itens[0], {tipo: "imovel", id: 3, titulo: "Casa Lapa", detalhe: "IMV-003 · Lapa", endereco: "/imoveis/3"});
  assert.equal(grupos[0].itens[1].detalhe, "IMV-009 · Sé · desativado");
  assert.deepEqual(grupos[1].itens[0], {tipo: "reserva", id: 12, titulo: "RSV-0012 · Carla Nogueira", detalhe: "15 a 18 nov · Apto Jardins",
    endereco: "/reservas?reserva=12"});
  assert.equal(grupos[1].itens[1].detalhe, "30 out a 2 nov · Apto Jardins · cancelada");
});

test("o hóspede abre a aba Hóspedes com a gaveta; as ações que combinam vêm primeiro", () => {
  const grupos = gruposDaBusca({imoveis: [], reservas: [], hospedes: [{id: 4, nome: "Nova Silva", telefone: "(11) 98888-0000"}]}, "nova");
  assert.deepEqual(grupos.map((g) => g.nome), ["Ações", "Hóspedes"]);
  assert.equal(grupos[0].itens.length, 3);
  assert.deepEqual(grupos[0].itens[0], {tipo: "acao", titulo: "Nova reserva", detalhe: null, gaveta: {tipo: "reserva", id: "nova"},
    endereco: "/reservas?reserva=nova"});
  assert.deepEqual(grupos[1].itens[0], {tipo: "hospede", id: 4, titulo: "Nova Silva", detalhe: "(11) 98888-0000",
    endereco: "/reservas?hospede=4#hospedes"});
});

test("recentes: o escolhido vai para o topo, sem repetir, no máximo cinco", () => {
  const item = (id) => ({tipo: "imovel", id, titulo: `Imóvel ${id}`, detalhe: "", endereco: `/imoveis/${id}`});
  let lista = [1, 2, 3, 4, 5].map(item);
  lista = juntarRecente(lista, item(3));
  assert.deepEqual(lista.map((i) => i.id), [3, 1, 2, 4, 5]);
  lista = juntarRecente(lista, item(6));
  assert.deepEqual(lista.map((i) => i.id), [6, 3, 1, 2, 4]);
  assert.deepEqual(juntarRecente(lista, {...item(2), tipo: "reserva"}).map((i) => `${i.tipo}${i.id}`),
    ["reserva2", "imovel6", "imovel3", "imovel1", "imovel2"]);
});
