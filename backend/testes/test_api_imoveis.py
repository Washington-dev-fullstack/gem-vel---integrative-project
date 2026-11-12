"""API: os imóveis de cada administrador (listar, ver um e cadastrar), com banco de verdade."""

import re
import unittest
from datetime import date, timedelta

from testes.apoio import CasoApi, apagar_depois, consultar, executar, imovel_temporario

NOVO = {"nome": "Casa Teste", "logradouro": "Rua Teste", "numero": "s/n", "bairro": "Centro",
        "cidade": "Atibaia", "uf": "sp", "valor_diaria": 450.1}


class TestImoveis(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def test_lista_os_imoveis_da_marina_por_nome(self):
        nomes = [i["nome"] for i in self.cliente.get("/api/imoveis").get_json()["imoveis"]]
        self.assertEqual(nomes, ["Apto Jardins", "Casa da Praia", "Casa Lapa", "Chalé da Serra", "Cobertura Moema",
                                 "Loft Pinheiros", "Loft Vila Mariana", "Studio Vila Madalena"])

    def test_formato_do_imovel(self):
        i = self.cliente.get("/api/imoveis/6").get_json()
        self.assertEqual(list(i), ["id", "codigo", "administrador_id", "nome", "endereco", "logradouro", "numero",
                                   "complemento", "bairro", "cidade", "uf", "cep", "capacidade", "valor_diaria",
                                   "horario_entrada", "horario_saida", "observacoes", "ativo", "prontidao",
                                   "proxima_entrada", "ocupacao_mes", "reservas_futuras", "receita_mes"])
        self.assertRegex(i["receita_mes"], r"^\d+\.\d{2}$")
        self.assertEqual((i["codigo"], i["endereco"], i["valor_diaria"], i["horario_entrada"], i["horario_saida"],
                          i["ativo"]),
                         ("IMV-006", "Rua Haddock Lobo, 900, ap. 33 · Jardins, São Paulo/SP", "450.00", "15:00",
                          "11:00", True))

    def test_paulo_so_ve_a_casa_do_lago(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.assertEqual([i["id"] for i in paulo.get("/api/imoveis").get_json()["imoveis"]], [9])
        self.confere_erro(paulo.get("/api/imoveis/1"), 404)

    def test_cria_imovel_com_os_padroes(self):
        r = self.cliente.post("/api/imoveis", json=NOVO)
        self.assertEqual(r.status_code, 201)
        i = r.get_json()
        apagar_depois(self, "imovel", i["id"])
        self.assertEqual((i["codigo"], i["administrador_id"], i["uf"], i["cep"], i["capacidade"], i["valor_diaria"],
                          i["horario_entrada"], i["horario_saida"]),
                         (f"IMV-{i['id']:03d}", 1, "SP", None, 2, "450.10", "15:00", "11:00"))

    def test_campos_invalidos_dao_422(self):
        casos = [({**NOVO, "nome": "", "uf": "XX", "horario_entrada": "11:00", "horario_saida": "12:00"},
                  {"nome": "Preencha este campo.", "uf": "Escolha uma das opções.",
                   "horario_saida": "A saída precisa ser antes da entrada, para caber a limpeza."}),
                 ({**NOVO, "capacidade": "muitos", "valor_diaria": "abc"},
                  {"capacidade": "Número inválido.", "valor_diaria": "Valor inválido."})]
        for corpo, campos in casos:
            self.confere_erro(self.cliente.post("/api/imoveis", json=corpo), 422, campos)


class TestImoveisIndicadores(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def reserva_futura(self, imovel_id, dias):
        entrada = date.today() + timedelta(days=dias)
        id = executar("INSERT INTO reserva (imovel_id, hospede_id, data_entrada, data_saida, num_hospedes, valor_diaria, "
                      "valor_total, status) VALUES (%s, 1, %s, %s, 2, 100, 200, 'confirmada')",
                      (imovel_id, entrada, entrada + timedelta(days=2)))
        apagar_depois(self, "reserva", id)
        return id

    def test_imovel_traz_prontidao_ocupacao_e_reservas_futuras(self):
        estados = {"hospedes", "limpando", "limpeza_atrasada", "limpeza_pendente", "pronto"}
        for i in self.cliente.get("/api/imoveis").get_json()["imoveis"]:
            with self.subTest(imovel=i["nome"]):
                self.assertIn(i["prontidao"]["estado"], estados)
                self.assertTrue(0 <= i["ocupacao_mes"]["percentual"] <= 100)
                self.assertIn(i["ocupacao_mes"]["noites_mes"], (28, 29, 30, 31))
                futuras = consultar("SELECT COUNT(*) AS n FROM reserva r JOIN imovel i ON i.id = r.imovel_id "
                                    "WHERE r.imovel_id = %s AND r.status = 'confirmada' "
                                    "AND TIMESTAMP(r.data_saida, i.horario_saida) > NOW()", (i["id"],))[0]["n"]
                self.assertEqual(i["reservas_futuras"], futuras)
                if i["proxima_entrada"] is not None:
                    self.assertRegex(i["proxima_entrada"]["data_hora"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")
                    self.assertEqual(set(i["proxima_entrada"]["hospede"]), {"id", "nome"})

    def test_editar_imovel(self):
        id = imovel_temporario(self, ativo=1)
        corpo = {**NOVO, "nome": "Casa Editada", "valor_diaria": "500", "capacidade": 6, "horario_entrada": "14:00"}
        r = self.cliente.patch(f"/api/imoveis/{id}", json=corpo)
        self.assertEqual(r.status_code, 200)
        i = r.get_json()
        self.assertEqual((i["nome"], i["valor_diaria"], i["capacidade"], i["horario_entrada"], i["uf"], i["ativo"]),
                         ("Casa Editada", "500.00", 6, "14:00", "SP", True))
        self.assertEqual(self.cliente.get(f"/api/imoveis/{id}").get_json()["nome"], "Casa Editada")
        self.confere_erro(self.cliente.patch(f"/api/imoveis/{id}", json={**corpo, "uf": "XX"}), 422,
                          {"uf": "Escolha uma das opções."})

    def test_desativar_com_reservas_futuras_da_409(self):
        id = imovel_temporario(self, ativo=1)
        primeira = self.reserva_futura(id, 10)
        self.reserva_futura(id, 20)
        self.confere_erro(self.cliente.post(f"/api/imoveis/{id}/desativar", json={}), 409,
                          mensagem="Há 2 reservas futuras neste imóvel.")
        executar("DELETE FROM reserva WHERE id = %s", (primeira,))
        self.confere_erro(self.cliente.post(f"/api/imoveis/{id}/desativar", json={}), 409,
                          mensagem="Há 1 reserva futura neste imóvel.")
        self.assertTrue(self.cliente.get(f"/api/imoveis/{id}").get_json()["ativo"])

    def test_desativar_e_reativar(self):
        id = imovel_temporario(self, ativo=1)
        r = self.cliente.post(f"/api/imoveis/{id}/desativar", json={})
        self.assertEqual((r.status_code, r.get_json()["ativo"]), (200, False))
        r = self.cliente.post(f"/api/imoveis/{id}/reativar", json={})
        self.assertEqual((r.status_code, r.get_json()["ativo"]), (200, True))

    def test_imovel_de_outro_admin_da_404(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.confere_erro(paulo.patch("/api/imoveis/1", json=NOVO), 404)
        self.confere_erro(paulo.post("/api/imoveis/1/desativar", json={}), 404)
        self.confere_erro(paulo.post("/api/imoveis/1/reativar", json={}), 404)
        self.confere_erro(paulo.get("/api/tarefas?imovel_id=1"), 404)
        self.assertTrue(self.cliente.get("/api/imoveis/1").get_json()["ativo"])


if __name__ == "__main__":
    unittest.main()
