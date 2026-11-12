"""API: as reservas (listar o período e cadastrar com a limpeza da saída), com banco de verdade."""

import calendar
import threading
import unittest
from datetime import date

from config import carregar_config
from gemovel.conexao import Conexao
from gemovel.dao.base import hora
from gemovel.rotas.formato_json import periodo
from testes.apoio import (DIA, CasoApi, apagar_depois, apagar_reservas_depois, consultar, datas_livres, executar,
                          imovel_temporario, linha)


class TestReservas(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def reserva(self, **mudar):
        """Um corpo válido: imóvel 6, hóspede 11, 2 hóspedes, em datas livres do imóvel."""
        entrada, saida = datas_livres(mudar.get("imovel_id", 6))
        return {"imovel_id": 6, "hospede_id": 11, "num_hospedes": 2, "data_entrada": entrada, "data_saida": saida,
                **mudar}

    def criar(self, corpo, cliente=None):
        """Cria a reserva (201 esperado) e a apaga, com a limpeza, no fim do teste."""
        r = (cliente or self.cliente).post("/api/reservas", json=corpo)
        self.assertEqual(r.status_code, 201, r.get_json())
        apagar_depois(self, "reserva", r.get_json()["id"])
        return r.get_json()

    def test_lista_o_mes_atual_por_padrao(self):
        hoje = date.today()
        de, ate = hoje.replace(day=1), hoje.replace(day=calendar.monthrange(hoje.year, hoje.month)[1])
        padrao = self.cliente.get("/api/reservas")
        self.assertEqual(padrao.status_code, 200)  # duas respostas de erro iguais também seriam "iguais"
        self.assertEqual(padrao.get_json(), self.cliente.get(f"/api/reservas?de={de}&ate={ate}").get_json())

    def test_lista_inclui_canceladas_e_so_do_administrador(self):
        r14 = linha("SELECT data_entrada, data_saida FROM reserva WHERE id = 14")
        url = f"/api/reservas?de={r14['data_entrada']}&ate={r14['data_saida']}"
        marina = self.cliente.get(url).get_json()["reservas"]
        self.assertIn(("RSV-0014", "cancelada"), [(x["codigo"], x["status"]) for x in marina])
        self.assertNotIn("RSV-0016", [x["codigo"] for x in marina])
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.assertEqual([x["codigo"] for x in paulo.get(url).get_json()["reservas"]], ["RSV-0016"])

    def test_formato_da_reserva(self):
        r12 = linha("SELECT data_entrada FROM reserva WHERE id = 12")
        reservas = self.cliente.get(f"/api/reservas?de={r12['data_entrada']}&ate={r12['data_entrada']}").get_json()
        r = next(x for x in reservas["reservas"] if x["codigo"] == "RSV-0012")
        self.assertEqual(list(r), ["id", "codigo", "imovel", "hospede", "data_entrada", "data_saida", "noites",
                                   "num_hospedes", "valor_diaria", "valor_total", "status", "situacao", "observacoes"])
        self.assertEqual((r["imovel"], r["hospede"], r["noites"], r["num_hospedes"], r["valor_diaria"], r["valor_total"],
                          r["status"]),
                         ({"id": 6, "codigo": "IMV-006", "nome": "Apto Jardins"}, {"id": 12, "nome": "Carla Nogueira"},
                          4, 3, "450.00", "1620.00", "confirmada"))

    def test_periodo_invalido_da_422(self):
        self.confere_erro(self.cliente.get("/api/reservas?de=2026-02-30"), 422, {"de": "Data inválida."})
        self.confere_erro(self.cliente.get("/api/reservas?de=2026-11-10&ate=2026-11-09"), 422,
                          {"ate": "O fim não pode ser antes do início."})

    def test_cria_reserva_com_limpeza_e_historico(self):  # entre a RSV-0011 e a RSV-0012: sai e entra no mesmo dia, dos dois lados
        entrada = linha("SELECT data_saida FROM reserva WHERE id = 11")["data_saida"]
        saida = linha("SELECT data_entrada FROM reserva WHERE id = 12")["data_entrada"]
        dados = self.criar(self.reserva(data_entrada=entrada, data_saida=saida))
        noites = (saida - entrada).days
        self.assertEqual((dados["codigo"], dados["noites"], dados["valor_diaria"], dados["valor_total"]),
                         (f"RSV-{dados['id']:04d}", noites, "450.00", f"{450 * noites}.00"))
        l = dados["limpeza"]
        self.assertEqual((l["titulo"], l["reserva_id"], l["responsavel"], l["status"], l["agendada_para"], l["prazo"]),
                         ("Limpeza de saída", dados["id"], None, "pendente", f"{saida}T11:00", f"{saida}T15:00"))
        self.assertEqual(consultar("SELECT usuario_id, status_anterior, status_novo FROM historico_tarefa "
                                   "WHERE tarefa_id = %s", (l["id"],)),
                         [{"usuario_id": 1, "status_anterior": None, "status_novo": "pendente"}])

    def test_hospede_novo_e_criado_junto(self):
        corpo = self.reserva(imovel_id=7, hospede_novo={"nome": "Hóspede Novo Teste", "telefone": "(11) 90000-0000"})
        del corpo["hospede_id"]
        r = self.cliente.post("/api/reservas", json=corpo)
        self.assertEqual(r.status_code, 201)
        dados = r.get_json()
        apagar_depois(self, "hospede", dados["hospede"]["id"])
        apagar_depois(self, "reserva", dados["id"])
        self.assertEqual(dados["hospede"]["nome"], "Hóspede Novo Teste")
        self.assertEqual(consultar("SELECT administrador_id FROM hospede WHERE id = %s", (dados["hospede"]["id"],)),
                         [{"administrador_id": 1}])

    def test_hospede_novo_invalido_ou_ausente(self):
        corpo = self.reserva(hospede_novo={"nome": ""})
        del corpo["hospede_id"]
        self.confere_erro(self.cliente.post("/api/reservas", json=corpo), 422,
                          {"hospede_novo.nome": "Preencha este campo."})
        del corpo["hospede_novo"]
        self.confere_erro(self.cliente.post("/api/reservas", json=corpo), 422, {"hospede_id": "Preencha este campo."})

    def test_total_editado_fica(self):
        self.assertEqual(self.criar(self.reserva(valor_total="800.00"))["valor_total"], "800.00")

    def test_conflito_com_reserva_da_409(self):
        r2 = linha("SELECT data_entrada, data_saida FROM reserva WHERE id = 2")
        frase = f"Conflita com RSV-0002 (Mariana Costa, {periodo(r2['data_entrada'], r2['data_saida'])}). Escolha outras datas."
        r = self.cliente.post("/api/reservas", json=self.reserva(imovel_id=1, data_entrada=r2["data_entrada"] + DIA,
                                                                 data_saida=r2["data_saida"]))
        self.confere_erro(r, 409, {"data_entrada": frase}, frase)

    def test_conflito_com_bloqueio_da_409(self):
        b1 = linha("SELECT data_inicio, data_fim FROM bloqueio WHERE id = 1")
        frase = f"O imóvel está bloqueado de {periodo(b1['data_inicio'], b1['data_fim'])} (troca do aquecedor)."
        r = self.cliente.post("/api/reservas", json=self.reserva(imovel_id=8, data_entrada=b1["data_inicio"] + DIA,
                                                                 data_saida=b1["data_fim"]))
        self.confere_erro(r, 409, {"data_entrada": frase}, frase)

    def test_reserva_cancelada_nao_ocupa_as_datas(self):
        r14 = linha("SELECT data_entrada, data_saida FROM reserva WHERE id = 14")
        self.criar(self.reserva(imovel_id=7, data_entrada=r14["data_entrada"], data_saida=r14["data_saida"]))

    def test_capacidade(self):
        self.confere_erro(self.cliente.post("/api/reservas", json=self.reserva(num_hospedes=5)), 422,
                          {"num_hospedes": "Apto Jardins recebe até 4 hóspedes."})

    def test_imovel_e_hospede_de_outro_dono(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.confere_erro(paulo.post("/api/reservas", json=self.reserva(imovel_id=1)), 422,
                          {"imovel_id": "Imóvel não encontrado."})
        self.confere_erro(paulo.post("/api/reservas", json=self.reserva(imovel_id=9, hospede_id=1)), 422,
                          {"hospede_id": "Hóspede não encontrado."})

    def test_imovel_desativado(self):
        corpo = self.reserva(imovel_id=imovel_temporario(self, ativo=0))
        self.confere_erro(self.cliente.post("/api/reservas", json=corpo), 422,
                          {"imovel_id": "Este imóvel está desativado."})

    def horarios_do_imovel(self, imovel_id):
        """Os horários de saída e de entrada do imóvel, como a API escreve: ("11:00", "15:00")."""
        h = linha("SELECT horario_saida, horario_entrada FROM imovel WHERE id = %s", (imovel_id,))
        return hora(h["horario_saida"]).strftime("%H:%M"), hora(h["horario_entrada"]).strftime("%H:%M")

    def test_uma_reserva_traz_o_hospede_e_a_limpeza(self):
        r = self.cliente.get("/api/reservas/5")
        self.assertEqual(r.status_code, 200, r.get_json())
        dados = r.get_json()
        self.assertEqual(list(dados["hospede"]), ["id", "nome", "telefone", "email", "documento", "observacoes"])
        limpeza = consultar("SELECT id FROM tarefa WHERE reserva_id = 5 AND tipo = 'limpeza'")
        self.assertEqual(dados["limpeza"]["id"], limpeza[0]["id"])

    def test_reserva_de_outro_admin_da_404(self):
        self.assertEqual(self.cliente.get("/api/reservas/5").status_code, 200)
        corpo = self.reserva()
        criada = self.criar(corpo)
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.confere_erro(paulo.get("/api/reservas/5"), 404)
        self.confere_erro(paulo.patch(f"/api/reservas/{criada['id']}", json=corpo), 404)
        self.confere_erro(paulo.post(f"/api/reservas/{criada['id']}/cancelar", json={}), 404)
        self.assertEqual(linha("SELECT status FROM reserva WHERE id = %s", (criada["id"],))["status"], "confirmada")

    def test_editar_muda_as_datas_e_leva_a_limpeza_pendente(self):
        corpo = self.reserva()
        criada = self.criar(corpo)
        nova_saida = corpo["data_saida"] + DIA
        r = self.cliente.patch(f"/api/reservas/{criada['id']}", json={**corpo, "data_saida": nova_saida})
        self.assertEqual(r.status_code, 200, r.get_json())
        editada = r.get_json()
        saida, entrada = self.horarios_do_imovel(6)
        self.assertEqual((editada["data_saida"], editada["noites"], editada["valor_total"]),
                         (nova_saida.isoformat(), 3, "1350.00"))  # sem valor_total, recalcula (R2)
        limpeza = editada["limpeza"]
        self.assertEqual((limpeza["id"], limpeza["agendada_para"], limpeza["prazo"]),
                         (criada["limpeza"]["id"], f"{nova_saida}T{saida}", f"{nova_saida}T{entrada}"))

    def test_limpeza_que_ja_comecou_fica_como_esta(self):  # decisões 3 e 4 de web-admin.md
        corpo = self.reserva()
        criada = self.criar(corpo)
        executar("UPDATE tarefa SET status = 'em_andamento', iniciada_em = NOW() WHERE id = %s",
                 (criada["limpeza"]["id"],))
        r = self.cliente.patch(f"/api/reservas/{criada['id']}", json={**corpo, "data_saida": corpo["data_saida"] + DIA})
        self.assertEqual(r.status_code, 200, r.get_json())
        self.assertEqual(r.json["limpeza"]["agendada_para"], criada["limpeza"]["agendada_para"])
        r = self.cliente.post(f"/api/reservas/{criada['id']}/cancelar", json={})
        self.assertEqual(r.status_code, 200, r.get_json())
        self.assertEqual(r.json["limpeza"]["id"], criada["limpeza"]["id"])

    def test_editar_com_conflito_da_409(self):
        primeira = self.reserva()
        criada = self.criar(primeira)
        segunda = self.criar(self.reserva())
        nome = linha("SELECT nome FROM hospede WHERE id = 11")["nome"]
        frase = (f"Conflita com {criada['codigo']} ({nome}, {periodo(primeira['data_entrada'], primeira['data_saida'])})."
                 " Escolha outras datas.")
        corpo = {**primeira, "data_entrada": primeira["data_entrada"] + DIA, "data_saida": primeira["data_saida"] + DIA}
        self.confere_erro(self.cliente.patch(f"/api/reservas/{segunda['id']}", json=corpo), 409,
                          {"data_entrada": frase}, frase)

    def test_editar_reserva_cancelada_da_409(self):
        corpo = self.reserva()
        criada = self.criar(corpo)
        self.assertEqual(self.cliente.post(f"/api/reservas/{criada['id']}/cancelar", json={}).status_code, 200)
        self.confere_erro(self.cliente.patch(f"/api/reservas/{criada['id']}", json=corpo), 409,
                          mensagem="Esta reserva está cancelada.")

    def test_cancelar_apaga_a_limpeza_pendente(self):
        criada = self.criar(self.reserva())
        r = self.cliente.post(f"/api/reservas/{criada['id']}/cancelar", json={})
        self.assertEqual(r.status_code, 200, r.get_json())
        self.assertEqual((r.json["status"], r.json["situacao"], r.json["limpeza"]), ("cancelada", "cancelada", None))
        self.assertEqual(consultar("SELECT id FROM tarefa WHERE reserva_id = %s", (criada["id"],)), [])
        self.assertEqual(consultar("SELECT id FROM historico_tarefa WHERE tarefa_id = %s",
                                   (criada["limpeza"]["id"],)), [])

    def test_cancelar_de_novo_da_422(self):
        criada = self.criar(self.reserva())
        self.cliente.post(f"/api/reservas/{criada['id']}/cancelar", json={})
        self.confere_erro(self.cliente.post(f"/api/reservas/{criada['id']}/cancelar", json={}), 422,
                          {"status": "Esta reserva já está cancelada."})

    def test_cancelar_sem_json_da_400(self):
        criada = self.criar(self.reserva())
        self.confere_erro(self.cliente.post(f"/api/reservas/{criada['id']}/cancelar"), 400)

    def test_reservas_ao_mesmo_tempo_so_uma_grava(self):
        corpo, resultado = self.reserva(), {}
        apagar_reservas_depois(self, 6, corpo["data_entrada"])
        outro = self.app.test_client()
        self.entrar("marina@gemovel.test", outro)
        segundo = threading.Thread(target=lambda: resultado.update(r=outro.post("/api/reservas", json=corpo)))
        self.addCleanup(lambda: segundo.is_alive() and segundo.join(10))  # roda antes de apagar as reservas
        with Conexao(carregar_config()).transacao() as t:  # alguém reservando as mesmas datas neste instante
            t.consultar("SELECT id FROM imovel WHERE id = 6 FOR UPDATE")
            t.executar("INSERT INTO reserva (imovel_id, hospede_id, data_entrada, data_saida, num_hospedes, "
                       "valor_diaria, valor_total) VALUES (6, 11, %s, %s, 2, 450, 900)",
                       (corpo["data_entrada"], corpo["data_saida"]))
            segundo.start()
            segundo.join(0.5)
            self.assertTrue(segundo.is_alive(), "o segundo pedido devia esperar o primeiro terminar")
        segundo.join(10)
        self.assertEqual(resultado["r"].status_code, 409)


if __name__ == "__main__":
    unittest.main()
