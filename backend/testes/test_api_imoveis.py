"""API: os imóveis de cada administrador (listar, ver um e cadastrar), com banco de verdade."""

import unittest

from testes.apoio import CasoApi, apagar_depois

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
                                   "horario_entrada", "horario_saida", "observacoes", "ativo"])
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


if __name__ == "__main__":
    unittest.main()
