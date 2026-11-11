"""API: as tarefas abertas, o cadastro, as tarefas de cada pessoa da equipe e a atividade
recente (banco de verdade)."""

import unittest
from datetime import date

from testes.apoio import CasoApi, apagar_depois, consultar

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


if __name__ == "__main__":
    unittest.main()
