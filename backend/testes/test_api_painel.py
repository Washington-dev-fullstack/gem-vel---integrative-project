"""API: a visão geral do mês (indicadores, receita dos 12 meses e o painel Hoje) e a busca geral
do topo (banco de verdade)."""

import calendar
from datetime import date, datetime, time

from testes.apoio import CasoApi, apagar_depois, consultar, executar


def _mes(dia):
    return f"{dia:%Y-%m}"


class TestVisaoGeral(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def visao_geral(self, mes):
        resposta = self.cliente.get(f"/api/visao-geral?mes={mes}")
        self.assertEqual(resposta.status_code, 200, resposta.get_data(as_text=True))
        return resposta.get_json()

    def test_visao_geral_conta_as_reservas_do_mes(self):
        hoje = date.today()
        inicio, fim = hoje.replace(day=1), hoje.replace(day=calendar.monthrange(hoje.year, hoje.month)[1])
        esperado = consultar("SELECT COUNT(*) AS n FROM reserva r JOIN imovel i ON i.id = r.imovel_id"
                             " WHERE i.administrador_id = 1 AND r.status <> 'cancelada'"
                             " AND r.data_entrada <= %s AND r.data_saida > %s", (fim, inicio))[0]["n"]
        corpo = self.visao_geral(_mes(hoje))
        self.assertGreater(esperado, 0)
        self.assertEqual((corpo["mes"], corpo["indicadores"]["reservas"]), (_mes(hoje), esperado))

    def test_receita_por_mes_tem_12_meses_terminando_no_pedido(self):
        corpo = self.visao_geral("2026-03")
        self.assertEqual([m["mes"] for m in corpo["receita_por_mes"]],
                         ["2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11",
                          "2025-12", "2026-01", "2026-02", "2026-03"])
        self.assertEqual(corpo["receita_por_mes"][-1]["receita"], corpo["indicadores"]["receita"])

    def test_mes_invalido_da_422(self):
        self.confere_erro(self.cliente.get("/api/visao-geral?mes=2026-13"), 422, {"mes": "Mês inválido."})

    def test_hoje_traz_as_chegadas(self):
        esperado = [l["id"] for l in consultar(
            "SELECT r.id FROM reserva r JOIN imovel i ON i.id = r.imovel_id WHERE i.administrador_id = 1"
            " AND r.status = 'confirmada' AND r.data_entrada = %s ORDER BY r.id", (date.today(),))]
        self.assertTrue(esperado)
        corpo = self.visao_geral(_mes(date.today()))
        self.assertEqual(sorted(r["id"] for r in corpo["hoje"]["chegadas"]), esperado)

    def test_hoje_traz_as_saidas_do_dia(self):
        # A reserva que sai hoje não "toca" o dia de hoje (a noite de hoje já é de outra): o painel
        # precisa dela mesmo assim.
        esperado = [l["id"] for l in consultar(
            "SELECT r.id FROM reserva r JOIN imovel i ON i.id = r.imovel_id WHERE i.administrador_id = 1"
            " AND r.status = 'confirmada' AND r.data_saida = %s ORDER BY r.id", (date.today(),))]
        self.assertTrue(esperado)
        corpo = self.visao_geral(_mes(date.today()))
        self.assertEqual(sorted(r["id"] for r in corpo["hoje"]["saidas"]), esperado)

    def test_atencao_junta_atrasadas_e_limpezas_de_hoje_sem_responsavel(self):
        sem_ninguem = executar("INSERT INTO tarefa (imovel_id, tipo, titulo, agendada_para, status)"
                               " VALUES (3, 'limpeza', 'Limpeza sem responsável', %s, 'pendente')",
                               (datetime.combine(date.today(), time(23, 30)),))
        apagar_depois(self, "tarefa", sem_ninguem)
        atrasadas = [t["id"] for t in self.cliente.get("/api/tarefas").get_json()["tarefas"] if t["atrasada"]]
        corpo = self.visao_geral(_mes(date.today()))
        self.assertEqual(sorted(t["id"] for t in corpo["hoje"]["atencao"]), sorted(atrasadas + [sem_ninguem]))

    def test_visao_geral_e_so_do_admin(self):
        cliente = self.app.test_client()
        self.entrar("cida@gemovel.test", cliente)
        self.confere_erro(cliente.get("/api/visao-geral"), 403)


class TestBusca(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def buscar(self, termo, cliente=None):
        resposta = (cliente or self.cliente).get("/api/busca", query_string={"q": termo})
        self.assertEqual(resposta.status_code, 200, resposta.get_data(as_text=True))
        return resposta.get_json()

    def test_busca_acha_hospede_reserva_e_imovel(self):
        carla = self.buscar("carla")
        self.assertIn(12, [h["id"] for h in carla["hospedes"]])
        self.assertIn(12, [r["id"] for r in carla["reservas"]])  # a reserva também, pelo nome do hóspede
        self.assertIn(12, [r["id"] for r in self.buscar("RSV-0012")["reservas"]])
        self.assertIn(3, [i["id"] for i in self.buscar("IMV-003")["imoveis"]])

    def test_busca_curta_volta_vazia(self):
        self.assertEqual(self.buscar("a"), {"imoveis": [], "reservas": [], "hospedes": []})

    def test_busca_nao_mostra_dados_de_outro_admin(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        corpo = self.buscar("carla", paulo)
        self.assertEqual((corpo["hospedes"], corpo["reservas"]), ([], []))
