"""API: as tarefas abertas, o cadastro, as tarefas de cada pessoa da equipe e a atividade
recente (banco de verdade)."""

import unittest
from datetime import date

from testes.apoio import CasoApi, apagar_depois, consultar, executar, imovel_temporario

MANUT = {"tipo": "manutencao", "imovel_id": 3, "titulo": "Teste", "agendada_para": "2030-01-10T09:00"}


class TestTarefas(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def abertas(self):
        return self.cliente.get("/api/tarefas").get_json()["tarefas"]

    def test_lista_as_abertas_por_horario(self):
        self.assertEqual([t["id"] for t in self.abertas()], [16, 5, 11, 2, 17, 7, 9, 10, 12, 3, 6, 4, 13])

    def test_formato_da_tarefa(self):
        t = next(t for t in self.abertas() if t["id"] == 5)
        saida = consultar("SELECT data_saida FROM reserva WHERE id = 5")[0]["data_saida"]
        self.assertEqual(list(t), ["id", "tipo", "titulo", "descricao", "imovel", "reserva_id", "responsavel",
                                   "agendada_para", "prazo", "status", "atrasada", "iniciada_em", "concluida_em"])
        self.assertEqual((t["imovel"], t["responsavel"], t["reserva_id"], t["status"], t["agendada_para"], t["prazo"]),
                         ({"id": 2, "codigo": "IMV-002", "nome": "Cobertura Moema"}, {"id": 5, "nome": "Marcos Teixeira"},
                          5, "em_andamento", f"{saida}T11:00", f"{saida}T15:00"))
        self.assertIsInstance(t["atrasada"], bool)

    def test_cria_manutencao_com_responsavel_e_historico(self):
        r = self.cliente.post("/api/tarefas", json={**MANUT, "titulo": "Trocar a lâmpada da sala",
                                                    "prazo": "2030-01-10T12:00", "funcionario_id": 6})
        self.assertEqual(r.status_code, 201)
        t = r.get_json()
        apagar_depois(self, "tarefa", t["id"])
        self.assertEqual((t["responsavel"], t["status"], t["reserva_id"], t["prazo"]),
                         ({"id": 6, "nome": "Rafael Souza"}, "pendente", None, "2030-01-10T12:00"))
        self.assertEqual(consultar("SELECT usuario_id, status_anterior, status_novo FROM historico_tarefa "
                                   "WHERE tarefa_id = %s", (t["id"],)),
                         [{"usuario_id": 1, "status_anterior": None, "status_novo": "pendente"}])

    def test_regras_do_cadastro(self):
        casos = [({**MANUT, "funcionario_id": 3}, {"funcionario_id": "Esta pessoa não faz este tipo de tarefa."}),
                 ({**MANUT, "reserva_id": 7}, {"reserva_id": "Só a limpeza pode ficar ligada a uma reserva."}),
                 ({**MANUT, "tipo": "limpeza", "reserva_id": 2}, {"reserva_id": "Esta reserva é de outro imóvel."}),
                 ({**MANUT, "prazo": "2030-01-10T08:00"}, {"prazo": "O prazo não pode ser antes do início."}),
                 ({**MANUT, "imovel_id": 9}, {"imovel_id": "Imóvel não encontrado."})]
        for corpo, campos in casos:
            self.confere_erro(self.cliente.post("/api/tarefas", json=corpo), 422, campos)

    def test_paulo_nao_usa_pessoa_nem_reserva_da_marina(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        limpeza = {**MANUT, "tipo": "limpeza", "imovel_id": 9}
        self.confere_erro(paulo.post("/api/tarefas", json={**limpeza, "funcionario_id": 3}), 422,
                          {"funcionario_id": "Pessoa não encontrada."})
        self.confere_erro(paulo.post("/api/tarefas", json={**limpeza, "reserva_id": 2}), 422,
                          {"reserva_id": "Reserva não encontrada."})

    def test_minhas_tarefas_so_as_da_pessoa(self):  # a tarefa 9 é da Cida; no mesmo dia há a 10, da Júlia
        dia = consultar("SELECT DATE(agendada_para) AS dia FROM tarefa WHERE id = 9")[0]["dia"]
        cida = self.app.test_client()
        self.entrar("cida@gemovel.test", cida)
        tarefas = cida.get(f"/api/minhas-tarefas?dia={dia}").get_json()["tarefas"]
        self.assertEqual([t["id"] for t in tarefas], [9])
        self.assertEqual(tarefas[0]["responsavel"], {"id": 3, "nome": "Cida Ramos"})
        self.assertEqual(list(tarefas[0]["imovel"]), ["id", "codigo", "nome", "endereco", "observacoes"])

    def test_minhas_tarefas_traz_as_abertas_de_dias_anteriores(self):  # Rafael: a 16 (pendente, antes) e a 17; a 18 está concluída
        dia = consultar("SELECT DATE(agendada_para) AS dia FROM tarefa WHERE id = 17")[0]["dia"]
        rafael = self.app.test_client()
        self.entrar("rafael@gemovel.test", rafael)
        self.assertEqual([t["id"] for t in rafael.get(f"/api/minhas-tarefas?dia={dia}").get_json()["tarefas"]],
                         [16, 17])

    def test_minhas_tarefas_padrao_e_hoje(self):
        rafael = self.app.test_client()
        self.entrar("rafael@gemovel.test", rafael)
        padrao = rafael.get("/api/minhas-tarefas")
        self.assertEqual(padrao.status_code, 200)  # duas respostas de erro iguais também seriam "iguais"
        self.assertEqual(padrao.get_json(), rafael.get(f"/api/minhas-tarefas?dia={date.today()}").get_json())

    def test_minhas_tarefas_dia_invalido(self):
        rafael = self.app.test_client()
        self.entrar("rafael@gemovel.test", rafael)
        self.confere_erro(rafael.get("/api/minhas-tarefas?dia=2026-13-01"), 422, {"dia": "Data inválida."})

    def test_atividade(self):
        a = self.cliente.get("/api/atividade").get_json()["atividade"]
        self.assertEqual(len(a), 8)
        self.assertEqual(list(a[0]), ["id", "registrado_em", "status_anterior", "status_novo", "observacao", "usuario",
                                      "tarefa", "imovel"])
        self.assertEqual([x["registrado_em"] for x in a], sorted((x["registrado_em"] for x in a), reverse=True))

    def test_atividade_do_paulo(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        [linha] = paulo.get("/api/atividade?limite=50").get_json()["atividade"]
        self.assertEqual((linha["status_anterior"], linha["status_novo"], linha["usuario"], linha["tarefa"],
                          linha["imovel"]),
                         (None, "pendente", {"id": 2, "nome": "Paulo Mendes"}, {"id": 15, "titulo": "Limpeza de saída"},
                          {"id": 9, "nome": "Casa do Lago"}))

    def test_limite_fora_da_faixa(self):
        for limite in ("0", "51", "abc"):
            self.confere_erro(self.cliente.get(f"/api/atividade?limite={limite}"), 422,
                              {"limite": "Use um número de 1 a 50."})


class TestTarefasDoImovel(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def test_tarefas_do_imovel_a_partir_do_dia(self):
        id = imovel_temporario(self, ativo=1)
        self.addCleanup(executar, "DELETE FROM tarefa WHERE imovel_id = %s", (id,))
        datas = [f"2030-01-{dia:02d} 09:00" for dia in range(31, 1, -1)] + ["2029-12-31 09:00", "2029-12-30 09:00"]
        for n, quando in enumerate(datas):  # 30 a partir do dia pedido, em ordem trocada, e 2 antes dele
            executar("INSERT INTO tarefa (imovel_id, tipo, titulo, agendada_para) VALUES (%s, 'manutencao', %s, %s)",
                     (id, f"T{n}", quando))
        r = self.cliente.get(f"/api/tarefas?imovel_id={id}&de=2030-01-01").get_json()
        horarios = [t["agendada_para"] for t in r["tarefas"]]
        self.assertEqual((len(horarios), r["tem_mais"]), (30, False))
        self.assertEqual(horarios, sorted(horarios))
        self.assertTrue(all(h >= "2030-01-01" for h in horarios))
        executar("INSERT INTO tarefa (imovel_id, tipo, titulo, agendada_para) VALUES (%s, 'manutencao', 'Extra', '2030-02-01 09:00')", (id,))
        r = self.cliente.get(f"/api/tarefas?imovel_id={id}&de=2030-01-01").get_json()
        self.assertEqual((len(r["tarefas"]), r["tem_mais"]), (30, True))
        r = self.cliente.get(f"/api/tarefas?imovel_id={id}&de=2030-01-01&pular=30").get_json()
        self.assertEqual(([t["titulo"] for t in r["tarefas"]], r["tem_mais"]), (["Extra"], False))


class TestUmaTarefa(CasoApi):
    """Uma tarefa: o dia, o histórico, editar, mudar o estado, desfazer e excluir."""

    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def nova(self, **mudar):
        r = self.cliente.post("/api/tarefas", json={**MANUT, **mudar})
        self.assertEqual(r.status_code, 201, r.get_data(as_text=True))
        id = r.get_json()["id"]
        apagar_depois(self, "tarefa", id)
        return id

    def registros(self, id):
        return consultar("SELECT COUNT(*) AS n FROM historico_tarefa WHERE tarefa_id = %s", (id,))[0]["n"]

    def status(self, id):
        return consultar("SELECT status FROM tarefa WHERE id = %s", (id,))[0]["status"]

    def marcos(self):
        marcos = self.app.test_client()
        self.entrar("marcos@gemovel.test", marcos)
        return marcos

    def test_tarefas_do_dia_incluem_as_concluidas(self):
        concluida = consultar("SELECT t.id, DATE(t.agendada_para) AS dia FROM tarefa t JOIN imovel i ON i.id = t.imovel_id"
                              " WHERE i.administrador_id = 1 AND t.status = 'concluida' ORDER BY t.id LIMIT 1")[0]
        esperado = consultar("SELECT t.id FROM tarefa t JOIN imovel i ON i.id = t.imovel_id WHERE i.administrador_id = 1"
                             " AND DATE(t.agendada_para) = %s ORDER BY t.agendada_para, t.id", (concluida["dia"],))
        ids = [t["id"] for t in self.cliente.get(f"/api/tarefas?dia={concluida['dia']}").get_json()["tarefas"]]
        self.assertEqual(ids, [x["id"] for x in esperado])
        self.assertIn(concluida["id"], ids)
        self.confere_erro(self.cliente.get("/api/tarefas?dia=2026-13-01"), 422, {"dia": "Data inválida."})

    def test_uma_tarefa_com_o_historico(self):
        r = self.cliente.get("/api/tarefas/5").get_json()
        historico = r["historico"]
        self.assertEqual(len(historico), self.registros(5))
        self.assertEqual(list(historico[0]), ["registrado_em", "status_anterior", "status_novo", "observacao", "usuario"])
        self.assertEqual((historico[0]["status_anterior"], historico[0]["status_novo"]), (None, "pendente"))
        self.assertEqual([h["registrado_em"] for h in historico], sorted(h["registrado_em"] for h in historico))
        saida = consultar("SELECT data_saida FROM reserva WHERE id = 5")[0]["data_saida"]
        self.assertEqual(r["reserva"], {"id": 5, "codigo": "RSV-0005", "data_saida": str(saida)})
        self.assertEqual((r["id"], r["status"]), (5, "em_andamento"))
        self.confere_erro(self.cliente.get("/api/tarefas/15"), 404)  # a tarefa 15 é do Paulo

    def test_editar_tarefa(self):
        id = self.nova()
        r = self.cliente.patch(f"/api/tarefas/{id}", json={**MANUT, "titulo": "Trocar o chuveiro", "status": "concluida",
                                                           "prazo": "2030-01-10T12:00", "funcionario_id": 6})
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        t = r.get_json()
        self.assertEqual((t["titulo"], t["prazo"], t["responsavel"], t["status"], t["reserva"]),
                         ("Trocar o chuveiro", "2030-01-10T12:00", {"id": 6, "nome": "Rafael Souza"}, "pendente", None))
        self.assertEqual(len(t["historico"]), 1)
        self.confere_erro(self.cliente.patch(f"/api/tarefas/{id}", json={**MANUT, "funcionario_id": 3}), 422,
                          {"funcionario_id": "Esta pessoa não faz este tipo de tarefa."})
        self.confere_erro(self.cliente.patch(f"/api/tarefas/{id}", json={**MANUT, "prazo": "2030-01-10T08:00"}), 422,
                          {"prazo": "O prazo não pode ser antes do início."})
        self.assertEqual((self.registros(id), self.status(id)), (1, "pendente"))

    def test_admin_comeca_e_desfaz(self):
        id = self.nova()
        antes = self.registros(id)
        r = self.cliente.post(f"/api/tarefas/{id}/estado", json={"status": "em_andamento"})
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertEqual(r.get_json()["status"], "em_andamento")
        self.assertIsNotNone(r.get_json()["iniciada_em"])
        self.assertEqual(self.registros(id), antes + 1)
        self.assertEqual(consultar("SELECT usuario_id, status_anterior, status_novo FROM historico_tarefa"
                                   " WHERE tarefa_id = %s ORDER BY id DESC LIMIT 1", (id,)),
                         [{"usuario_id": 1, "status_anterior": "pendente", "status_novo": "em_andamento"}])
        r = self.cliente.post(f"/api/tarefas/{id}/desfazer", json={})
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertEqual((r.get_json()["status"], r.get_json()["iniciada_em"]), ("pendente", None))
        self.assertEqual((self.registros(id), self.status(id)), (antes, "pendente"))
        self.confere_erro(self.cliente.post(f"/api/tarefas/{id}/desfazer", json={}), 422,
                          {"status": "Não dá mais para desfazer."})
        self.confere_erro(self.cliente.post(f"/api/tarefas/{id}/estado", json={"status": "feita"}), 422,
                          {"status": "Escolha uma das opções."})

    def test_pessoa_da_equipe_comeca_a_propria(self):
        id = self.nova(tipo="limpeza", funcionario_id=5)
        marcos = self.marcos()
        r = marcos.post(f"/api/tarefas/{id}/estado", json={"status": "em_andamento"})
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertEqual(r.get_json()["status"], "em_andamento")
        r = marcos.post(f"/api/tarefas/{id}/estado", json={"status": "concluida", "observacao": " Faltava sabonete "})
        self.assertEqual(r.get_json()["status"], "concluida")
        self.assertEqual(consultar("SELECT usuario_id, observacao FROM historico_tarefa WHERE tarefa_id = %s"
                                   " ORDER BY id DESC LIMIT 1", (id,)), [{"usuario_id": 5, "observacao": "Faltava sabonete"}])
        self.confere_erro(marcos.post(f"/api/tarefas/{id}/estado", json={"status": "pendente"}), 422,
                          {"status": "Só quem administra pode reabrir uma tarefa."})

    def test_pessoa_da_equipe_nao_mexe_na_tarefa_de_outra(self):
        id = self.nova(tipo="limpeza", funcionario_id=3)  # da Cida
        marcos = self.marcos()
        self.confere_erro(marcos.post(f"/api/tarefas/{id}/estado", json={"status": "em_andamento"}), 404)
        self.confere_erro(marcos.post(f"/api/tarefas/{id}/desfazer", json={}), 404)
        self.assertEqual(self.status(id), "pendente")

    def test_pessoa_da_equipe_nao_pula_etapa(self):
        id = self.nova(tipo="limpeza", funcionario_id=5)
        self.confere_erro(self.marcos().post(f"/api/tarefas/{id}/estado", json={"status": "concluida"}), 409,
                          mensagem="Comece a tarefa antes de concluir.")
        self.assertEqual((self.status(id), self.registros(id)), ("pendente", 1))

    def test_excluir_tarefa_leva_o_historico(self):
        id = self.nova()
        self.cliente.post(f"/api/tarefas/{id}/estado", json={"status": "em_andamento"})
        self.assertEqual(self.cliente.delete(f"/api/tarefas/{id}").status_code, 204)
        self.assertEqual(consultar("SELECT COUNT(*) AS n FROM tarefa WHERE id = %s", (id,)), [{"n": 0}])
        self.assertEqual(self.registros(id), 0)
        self.confere_erro(self.cliente.delete(f"/api/tarefas/{id}"), 404)


if __name__ == "__main__":
    unittest.main()
