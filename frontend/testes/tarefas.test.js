process.env.TZ = "America/Sao_Paulo";
import {test} from "node:test";
import assert from "node:assert/strict";
import {acaoDoAvanco, contextoDoDia, fraseDaMudanca, linhaDoEstado, saudacao} from "../estaticos/js/nucleo/tarefas.js";
import {agruparTarefas, cargaNoDia, filaDeGemas, fraseDoDesativar, fraseDoDia, fraseDoRegistro, inicioSugerido, linhaDoAgora,
  passagensDoAdmin} from "../estaticos/js/nucleo/tarefas.js";
import {lerData, linkDoTelefone, linkDoWhatsapp, quandoFoi} from "../estaticos/js/nucleo/formatos.js";

test("atrasada só antes de começar", () => {
  const g = agruparTarefas([
    {id: 1, status: "pendente", atrasada: true, agendada_para: "2026-11-05T09:00"},
    {id: 2, status: "em_andamento", atrasada: true, agendada_para: "2026-11-05T11:00"},
    {id: 3, status: "pendente", atrasada: false, agendada_para: "2026-11-05T08:00"},
    {id: 4, status: "concluida", atrasada: false, agendada_para: "2026-11-05T07:00"}]);
  assert.deepEqual([g.atrasadas, g.em_andamento, g.pendentes, g.concluidas].map((l) => l.map((t) => t.id)), [[1], [2], [3], [4]]);
});

test("cada grupo por horário", () => {
  const g = agruparTarefas([
    {id: 7, status: "pendente", atrasada: false, agendada_para: "2026-11-05T14:00"},
    {id: 5, status: "pendente", atrasada: false, agendada_para: "2026-11-05T09:00"},
    {id: 6, status: "pendente", atrasada: false, agendada_para: "2026-11-05T09:00"}]);
  assert.deepEqual(g.pendentes.map((t) => t.id), [5, 6, 7]);
});

test("passagens do admin", () => {
  assert.deepEqual(passagensDoAdmin("pendente"), ["em_andamento", "concluida"]);
  assert.deepEqual(passagensDoAdmin("em_andamento"), ["concluida"]);
  assert.deepEqual(passagensDoAdmin("concluida"), ["pendente"]);
});

test("frase do histórico: o primeiro nome e o verbo da mudança", () => {
  const pessoa = {usuario: {id: 5, nome: "Marcos Teixeira"}};
  assert.equal(fraseDoRegistro({...pessoa, status_anterior: null, status_novo: "pendente"}), "Marcos criou");
  assert.equal(fraseDoRegistro({...pessoa, status_anterior: "pendente", status_novo: "em_andamento"}), "Marcos começou");
  assert.equal(fraseDoRegistro({...pessoa, status_anterior: "em_andamento", status_novo: "concluida"}), "Marcos concluiu");
  assert.equal(fraseDoRegistro({...pessoa, status_anterior: "concluida", status_novo: "pendente"}), "Marcos reabriu");
});

test("carga do dia de quem pode pegar a tarefa", () => {
  assert.equal(cargaNoDia(0, true), "nenhuma tarefa hoje");
  assert.equal(cargaNoDia(1, true), "1 tarefa hoje");
  assert.equal(cargaNoDia(3, false), "3 tarefas neste dia");
});

test("fila de gemas: no máximo 6 e o resto em número", () => {
  assert.deepEqual(filaDeGemas(["concluida", "pendente"]), {gemas: ["concluida", "pendente"], resto: 0});
  const oito = filaDeGemas(Array(8).fill("pendente"));
  assert.deepEqual([oito.gemas.length, oito.resto], [6, 2]);
});

test("quando foi: agora, minutos, hora, ontem e o dia", () => {
  const agora = lerData("2026-11-05T15:30");
  assert.equal(quandoFoi("2026-11-05T15:30", agora), "agora");
  assert.equal(quandoFoi("2026-11-05T15:25", agora), "há 5 min");
  assert.equal(quandoFoi("2026-11-05T10:42", agora), "10:42");
  assert.equal(quandoFoi("2026-11-04T18:20", agora), "ontem, 18:20");
  assert.equal(quandoFoi("2026-11-02T09:00", agora), "seg, 2 nov");
});

test("link do WhatsApp com o 55 do Brasil", () => {
  assert.equal(linkDoWhatsapp("(11) 98505-6060"), "https://wa.me/5511985056060");
  assert.equal(linkDoWhatsapp("1234"), null);
  assert.equal(linkDoWhatsapp(null), null);
});

test("link do telefone com o +55", () => {
  assert.equal(linkDoTelefone("(11) 98505-6060"), "tel:+5511985056060");
  assert.equal(linkDoTelefone("+55 11 98505-6060"), "tel:+5511985056060");
  assert.equal(linkDoTelefone(""), null);
});

test("o dia da pessoa no cartão", () => {
  assert.equal(fraseDoDia({total: 3, concluidas: 2}), "2 de 3 concluídas");
  assert.equal(fraseDoDia({total: 1, concluidas: 0}), "0 de 1 concluída");
});

test("linha do agora: em andamento, próxima (hoje ou outro dia) ou dia livre", () => {
  const casa = {id: 7, nome: "Casa da Praia"};
  assert.equal(linhaDoAgora({funcao: "limpeza", agora: {id: 1, titulo: "Limpeza", imovel: casa}, proxima: null}, "2026-11-05"),
    "Agora: limpando Casa da Praia");
  assert.equal(linhaDoAgora({funcao: "manutencao", agora: {id: 1, titulo: "Torneira", imovel: casa}, proxima: null}, "2026-11-05"),
    "Agora: manutenção em Casa da Praia");
  assert.equal(linhaDoAgora({agora: null, proxima: {agendada_para: "2026-11-05T14:00", imovel: casa}}, "2026-11-05"),
    "Próxima: 14:00 · Casa da Praia");
  assert.equal(linhaDoAgora({agora: null, proxima: {agendada_para: "2026-11-08T09:00", imovel: casa}}, "2026-11-05"),
    "Próxima: dom, 8 nov · Casa da Praia");
  assert.equal(linhaDoAgora({agora: null, proxima: null}, "2026-11-05"), "Dia livre");
});

test("aviso de desativar, sem gênero e com as tarefas que ficaram sem responsável", () => {
  assert.equal(fraseDoDesativar({nome: "Cida Ramos", futuras_pendentes: 4}),
    "Acesso de Cida desativado. 4 tarefas futuras ficaram sem responsável.");
  assert.equal(fraseDoDesativar({nome: "Cida Ramos", futuras_pendentes: 1}),
    "Acesso de Cida desativado. 1 tarefa futura ficou sem responsável.");
  assert.equal(fraseDoDesativar({nome: "Cida Ramos", futuras_pendentes: 0}), "Acesso de Cida desativado.");
});

test("início sugerido da nova tarefa: a próxima hora cheia hoje, 9h nos outros dias", () => {
  const agora = lerData("2026-11-05T15:20");
  assert.equal(inicioSugerido("2026-11-05", agora), "2026-11-05T16:00");
  assert.equal(inicioSugerido(null, agora), "2026-11-05T16:00");
  assert.equal(inicioSugerido("2026-11-06", agora), "2026-11-06T09:00");
  assert.equal(inicioSugerido(null, lerData("2026-11-05T06:10")), "2026-11-05T09:00");
  assert.equal(inicioSugerido(null, lerData("2026-11-05T23:30")), "2026-11-06T09:00");
});

test("app da equipe: saudação pela hora, com o primeiro nome", () => {
  assert.equal(saudacao("Cida Ramos", new Date(2026, 10, 13, 8, 0)), "Bom dia, Cida.");
  assert.equal(saudacao("Cida Ramos", new Date(2026, 10, 13, 12, 0)), "Boa tarde, Cida.");
  assert.equal(saudacao("Cida Ramos", new Date(2026, 10, 13, 18, 30)), "Boa noite, Cida.");
  assert.equal(saudacao("Cida Ramos", new Date(2026, 10, 13, 3, 0)), "Boa noite, Cida.");
});

test("app da equipe: o contexto do dia conta as tarefas e as concluídas", () => {
  const t = (status) => ({status});
  assert.equal(contextoDoDia([t("pendente"), t("em_andamento"), t("concluida")], "2026-11-13", "2026-11-13"), "Sex, 13 nov · 3 tarefas, 1 concluída");
  assert.equal(contextoDoDia([t("pendente"), t("pendente")], "2026-11-13", "2026-11-13"), "Sex, 13 nov · 2 tarefas");
  assert.equal(contextoDoDia([t("concluida"), t("concluida")], "2026-11-13", "2026-11-13"), "Sex, 13 nov · Tudo pronto por hoje.");
  assert.equal(contextoDoDia([t("concluida")], "2026-11-12", "2026-11-13"), "Qui, 12 nov · 1 tarefa, 1 concluída");
  assert.equal(contextoDoDia([], "2026-11-14", "2026-11-13"), "Sáb, 14 nov · nenhuma tarefa");
});

test("app da equipe: a linha de estado do cartão", () => {
  const hoje = "2026-11-13";
  assert.equal(linhaDoEstado({status: "pendente", atrasada: false}, hoje), null);
  assert.deepEqual(linhaDoEstado({status: "pendente", atrasada: true, agendada_para: "2026-11-13T09:00", prazo: "2026-11-13T12:00"}, hoje),
    {texto: "Atrasada · o prazo era 12:00", tom: "atrasada"});
  assert.deepEqual(linhaDoEstado({status: "pendente", atrasada: true, agendada_para: "2026-11-12T09:00", prazo: "2026-11-12T12:00"}, hoje),
    {texto: "Atrasada · o prazo era qui, 12 nov 12:00", tom: "atrasada"});
  assert.deepEqual(linhaDoEstado({status: "pendente", atrasada: true, agendada_para: "2026-11-13T09:00", prazo: null}, hoje),
    {texto: "Atrasada · era para 09:00", tom: "atrasada"});
  assert.deepEqual(linhaDoEstado({status: "em_andamento", atrasada: false, iniciada_em: "2026-11-13T11:05"}, hoje), {texto: "Começou às 11:05", tom: null});
  assert.deepEqual(linhaDoEstado({status: "em_andamento", atrasada: true, iniciada_em: "2026-11-13T11:05"}, hoje),
    {texto: "Começou às 11:05 · atrasada", tom: "atrasada"});
  assert.deepEqual(linhaDoEstado({status: "concluida", concluida_em: "2026-11-13T12:40"}, hoje), {texto: "Concluída às 12:40", tom: null});
});

test("app da equipe: o Avanço diz o próximo passo com verbo e objeto", () => {
  assert.deepEqual(acaoDoAvanco({tipo: "limpeza", status: "pendente"}), {rotulo: "Começar limpeza", espera: "Começando…", proximo: "em_andamento"});
  assert.deepEqual(acaoDoAvanco({tipo: "manutencao", status: "em_andamento"}), {rotulo: "Concluir manutenção", espera: "Concluindo…", proximo: "concluida"});
  assert.equal(acaoDoAvanco({tipo: "limpeza", status: "concluida"}), null);
});

test("app da equipe: a frase do aviso e do anúncio, sem artigo antes do imóvel", () => {
  const t = {tipo: "limpeza", imovel: {nome: "Casa da Praia"}};
  assert.equal(fraseDaMudanca({...t, status: "em_andamento"}), "Limpeza em andamento: Casa da Praia.");
  assert.equal(fraseDaMudanca({...t, status: "concluida"}), "Limpeza concluída: Casa da Praia.");
  assert.equal(fraseDaMudanca({...t, status: "pendente"}), "Limpeza pendente: Casa da Praia.");
  assert.equal(fraseDaMudanca({tipo: "manutencao", imovel: {nome: "Studio Vila Madalena"}, status: "concluida"}), "Manutenção concluída: Studio Vila Madalena.");
});
