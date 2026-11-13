// Demonstração do GitHub Pages: o servidor simulado (as regras principais da API) e o tradutor de endereços.

import {test} from "node:test";
import assert from "node:assert/strict";
import {criarServidor, deslocarDatas} from "../estaticos/js/demo/servidor.js";
import {destinoDaGuarda, paraArquivo, paraCaminho} from "../estaticos/js/nucleo/enderecos.js";

const AGORA = new Date(2026, 10, 13, 10, 0, 0); // sex, 13 nov 2026, 10:00

function exemplo() {
  return {
    usuarios: [
      {id: 1, nome: "Marina Duarte", email: "marina@gemovel.test", telefone: null, perfil: "administrador", ativo: true},
      {id: 2, nome: "Cida Rocha", email: "cida@gemovel.test", telefone: "(11) 90000-0000", perfil: "funcionario",
        ativo: true, administrador_id: 1, funcao: "limpeza"},
    ],
    imoveis: [{id: 1, administrador_id: 1, nome: "Casa da Praia", logradouro: "Rua A", numero: "10", complemento: null,
      bairro: "Centro", cidade: "Ubatuba", uf: "SP", cep: "11680-000", capacidade: 4, valor_diaria: "300.00",
      horario_entrada: "15:00", horario_saida: "11:00", observacoes: null, ativo: true}],
    hospedes: [{id: 1, administrador_id: 1, nome: "Ana Lima", telefone: "(11) 98888-0000", email: null, documento: null,
      observacoes: null}],
    reservas: [{id: 1, imovel_id: 1, hospede_id: 1, data_entrada: "2026-11-15", data_saida: "2026-11-18", num_hospedes: 2,
      valor_diaria: "300.00", valor_total: "900.00", status: "confirmada", observacoes: null}],
    bloqueios: [],
    tarefas: [{id: 1, imovel_id: 1, reserva_id: null, funcionario_id: 2, tipo: "limpeza", titulo: "Limpeza de saída",
      descricao: null, agendada_para: "2026-11-13T08:00:00", prazo: "2026-11-13T09:00:00", status: "pendente",
      iniciada_em: null, concluida_em: null}],
    historico: [{id: 1, tarefa_id: 1, usuario_id: 1, status_anterior: null, status_novo: "pendente", observacao: null,
      registrado_em: "2026-11-12T18:00:00"}],
    sessao: null,
  };
}

function servidor() {
  let relogio = AGORA;
  const s = criarServidor(exemplo(), {agora: () => relogio});
  s.passar = (segundos) => { relogio = new Date(relogio.getTime() + segundos * 1000); };
  return s;
}

const entrar = (s, email) => s.responder("POST", "/api/sessao", {email, senha: "qualquer"});

test("demo: Entrar aceita qualquer senha das contas de exemplo e recusa o resto", () => {
  const s = servidor();
  assert.equal(s.responder("POST", "/api/sessao", {email: "x@y.com", senha: "1"}).status, 401);
  assert.equal(s.responder("POST", "/api/sessao", {email: "marina@gemovel.test", senha: ""}).corpo.erro.campos.senha,
    "Preencha este campo.");
  const resposta = entrar(s, "Marina@gemovel.test");
  assert.equal(resposta.status, 200);
  assert.deepEqual(resposta.corpo.usuario, {id: 1, nome: "Marina Duarte", email: "marina@gemovel.test", perfil: "administrador"});
  assert.equal(s.responder("GET", "/api/sessao").corpo.usuario.id, 1);
});

test("demo: sem sessão é 401, e a equipe não abre rota do admin (403)", () => {
  const s = servidor();
  assert.equal(s.responder("GET", "/api/imoveis").status, 401);
  entrar(s, "cida@gemovel.test");
  assert.equal(s.responder("GET", "/api/imoveis").status, 403);
  assert.equal(s.responder("GET", "/api/tarefas/1").status, 403);
  assert.equal(s.responder("DELETE", "/api/sessao").status, 204);
  assert.equal(s.responder("GET", "/api/minhas-tarefas").status, 401);
});

test("demo: reserva em datas ocupadas dá 409 com a frase do conflito (R1)", () => {
  const s = servidor();
  entrar(s, "marina@gemovel.test");
  const {status, corpo} = s.responder("POST", "/api/reservas",
    {imovel_id: 1, hospede_id: 1, data_entrada: "2026-11-17", data_saida: "2026-11-20", num_hospedes: 2});
  assert.equal(status, 409);
  assert.equal(corpo.erro.mensagem, "Conflita com RSV-0001 (Ana Lima, 15 a 18 nov). Escolha outras datas.");
  assert.equal(corpo.erro.campos.data_entrada, corpo.erro.mensagem);
});

test("demo: a reserva nova usa a diária do imóvel, soma o total (R2) e cria a limpeza de saída", () => {
  const s = servidor();
  entrar(s, "marina@gemovel.test");
  const {status, corpo} = s.responder("POST", "/api/reservas",
    {imovel_id: 1, hospede_id: 1, data_entrada: "2026-11-20", data_saida: "2026-11-22", num_hospedes: 2});
  assert.equal(status, 201);
  assert.equal(corpo.codigo, "RSV-0002");
  assert.equal(corpo.valor_diaria, "300.00");
  assert.equal(corpo.valor_total, "600.00");
  assert.equal(corpo.noites, 2);
  assert.equal(corpo.situacao, "futura");
  assert.equal(corpo.limpeza.titulo, "Limpeza de saída");
  assert.equal(corpo.limpeza.agendada_para, "2026-11-22T11:00");
  assert.equal(corpo.limpeza.prazo, "2026-11-22T15:00");
  assert.equal(corpo.limpeza.responsavel, null);
  const capacidade = s.responder("POST", "/api/reservas",
    {imovel_id: 1, hospede_id: 1, data_entrada: "2026-12-01", data_saida: "2026-12-02", num_hospedes: 9});
  assert.equal(capacidade.corpo.erro.campos.num_hospedes, "Casa da Praia recebe até 4 hóspedes.");
});

test("demo: a tarefa que passou do prazo vem atrasada (R7), com o endereço para a equipe", () => {
  const s = servidor();
  entrar(s, "marina@gemovel.test");
  assert.equal(s.responder("GET", "/api/tarefas").corpo.tarefas[0].atrasada, true);
  entrar(s, "cida@gemovel.test");
  const [tarefa] = s.responder("GET", "/api/minhas-tarefas?dia=2026-11-13").corpo.tarefas;
  assert.equal(tarefa.imovel.endereco, "Rua A, 10 · Centro, Ubatuba/SP");
  assert.equal(tarefa.responsavel.nome, "Cida Rocha");
});

test("demo: começar e desfazer em até 10s; depois disso, não dá mais", () => {
  const s = servidor();
  entrar(s, "cida@gemovel.test");
  const comecou = s.responder("POST", "/api/tarefas/1/estado", {status: "em_andamento"});
  assert.equal(comecou.status, 200);
  assert.equal(comecou.corpo.status, "em_andamento");
  assert.equal(comecou.corpo.iniciada_em, "2026-11-13T10:00");
  const desfeita = s.responder("POST", "/api/tarefas/1/desfazer", {});
  assert.equal(desfeita.corpo.status, "pendente");
  assert.equal(desfeita.corpo.iniciada_em, null);
  s.responder("POST", "/api/tarefas/1/estado", {status: "em_andamento"});
  s.passar(11);
  const tarde = s.responder("POST", "/api/tarefas/1/desfazer", {});
  assert.equal(tarde.status, 422);
  assert.equal(tarde.corpo.erro.campos.status, "Não dá mais para desfazer.");
});

test("demo: a equipe não conclui sem começar (409) nem reabre (R5)", () => {
  const s = servidor();
  entrar(s, "cida@gemovel.test");
  const cedo = s.responder("POST", "/api/tarefas/1/estado", {status: "concluida"});
  assert.equal(cedo.status, 409);
  assert.equal(cedo.corpo.erro.mensagem, "Comece a tarefa antes de concluir.");
  s.responder("POST", "/api/tarefas/1/estado", {status: "em_andamento"});
  assert.equal(s.responder("POST", "/api/tarefas/1/estado", {status: "concluida"}).corpo.status, "concluida");
  const reabrir = s.responder("POST", "/api/tarefas/1/estado", {status: "pendente"});
  assert.equal(reabrir.status, 422);
  assert.equal(reabrir.corpo.erro.campos.status, "Só quem administra pode reabrir uma tarefa.");
});

test("demo: campos obrigatórios dão 422 com uma frase por campo", () => {
  const s = servidor();
  entrar(s, "marina@gemovel.test");
  const {status, corpo} = s.responder("POST", "/api/imoveis", {});
  assert.equal(status, 422);
  assert.equal(corpo.erro.mensagem, "Confira os campos destacados.");
  assert.equal(corpo.erro.campos.nome, "Preencha este campo.");
  assert.equal(corpo.erro.campos.valor_diaria, "Preencha este campo.");
});

test("demo: a visão geral soma as noites do mês e lista o que precisa de atenção", () => {
  const s = servidor();
  entrar(s, "marina@gemovel.test");
  const {corpo} = s.responder("GET", "/api/visao-geral?mes=2026-11");
  assert.deepEqual(corpo.indicadores, {receita: "900.00", reservas: 1, diaria_media: "300.00",
    ocupacao: {percentual: 10, noites: 3, noites_possiveis: 30}});
  assert.equal(corpo.receita_por_mes.length, 12);
  assert.deepEqual(corpo.receita_por_mes.at(-1), {mes: "2026-11", receita: "900.00"});
  assert.deepEqual(corpo.hoje.atencao.map((t) => t.id), [1]);
});

test("demo: as datas andam até hoje, sem mexer no resto", () => {
  const dados = deslocarDatas(exemplo(), 2);
  assert.equal(dados.reservas[0].data_entrada, "2026-11-17");
  assert.equal(dados.tarefas[0].agendada_para, "2026-11-15T08:00:00");
  assert.equal(dados.imoveis[0].cep, "11680-000");
  assert.equal(dados.imoveis[0].horario_entrada, "15:00");
  assert.equal(deslocarDatas(exemplo(), -13).reservas[0].data_saida, "2026-11-05");
});

test("tradutor: o caminho do Flask vira o arquivo da demonstração e volta", () => {
  assert.equal(paraArquivo("/"), "visao-geral.html");
  assert.equal(paraArquivo("/entrar?volta=%2Fagenda"), "index.html?volta=%2Fagenda");
  assert.equal(paraArquivo("/agenda?mes=2026-11"), "agenda.html?mes=2026-11");
  assert.equal(paraArquivo("/imoveis/3?reserva=2#tarefas"), "imovel.html?id=3&reserva=2#tarefas");
  assert.equal(paraArquivo("/imoveis?imovel=novo"), "imoveis.html?imovel=novo");
  assert.equal(paraArquivo("https://www.google.com/maps"), "https://www.google.com/maps");
  assert.equal(paraCaminho("imovel.html", "?id=3&reserva=2", "#tarefas"), "/imoveis/3?reserva=2#tarefas");
  assert.equal(paraCaminho("visao-geral.html", "", ""), "/");
  assert.equal(paraCaminho("reservas.html", "?reserva=4", ""), "/reservas?reserva=4");
});

test("guarda da demonstração: sem sessão vai para Entrar, e cada perfil fica na sua tela", () => {
  assert.equal(destinoDaGuarda("agenda.html", "?mes=2026-11", null), "index.html?volta=%2Fagenda%3Fmes%3D2026-11");
  assert.equal(destinoDaGuarda("agenda.html", "", "funcionario"), "minhas-tarefas.html");
  assert.equal(destinoDaGuarda("agenda.html", "", "administrador"), null);
  assert.equal(destinoDaGuarda("minhas-tarefas.html", "", "administrador"), "visao-geral.html");
  assert.equal(destinoDaGuarda("index.html", "", "funcionario"), "minhas-tarefas.html");
  assert.equal(destinoDaGuarda("index.html", "?saiu=1", null), null);
});
