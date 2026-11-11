"""API: os hóspedes de cada administrador (buscar e cadastrar), com banco de verdade."""

import unittest

from testes.apoio import CasoApi, apagar_depois, executar


class TestHospedes(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def nomes(self, url, cliente=None):
        """Os nomes dos hóspedes que a busca devolve."""
        cliente = cliente if cliente is not None else self.cliente
        return [h["nome"] for h in cliente.get(url).get_json()["hospedes"]]

    def test_sem_termo_traz_todos_da_marina_por_nome(self):
        nomes = self.nomes("/api/hospedes")
        self.assertEqual((len(nomes), nomes[0]), (14, "André Barros"))

    def test_busca_sem_acento(self):
        self.assertEqual(self.nomes("/api/hospedes?busca=leticia"), ["Letícia Araújo"])

    def test_busca_por_telefone(self):
        self.assertEqual(self.nomes("/api/hospedes?busca=99110"), ["Helena Duarte"])

    def test_busca_por_telefone_sem_a_mascara(self):
        # O cadastro guarda "(11) 99110-1001"; quem busca pode digitar só os números ou outro espaçamento.
        for termo in ("11991101001", "11%2099110"):
            with self.subTest(termo=termo):
                self.assertEqual(self.nomes(f"/api/hospedes?busca={termo}"), ["Helena Duarte"])

    def test_busca_com_letras_nao_compara_so_os_digitos(self):
        # "Helena 1" não vira uma busca pelo dígito 1, que traria quase todo mundo.
        self.assertEqual(self.nomes("/api/hospedes?busca=Helena%201"), [])

    def test_busca_com_porcento_ou_sublinhado_nao_traz_todos(self):
        for termo in ("%25", "_"):
            self.assertEqual(self.nomes(f"/api/hospedes?busca={termo}"), [])

    def test_busca_traz_no_maximo_20(self):
        executar("INSERT INTO hospede (administrador_id, nome) VALUES " + ", ".join(["(2, %s)"] * 21),
                 tuple(f"Lote Teste {n:02d}" for n in range(21)))
        self.addCleanup(executar, "DELETE FROM hospede WHERE administrador_id = 2 AND nome LIKE %s", ("Lote Teste %",))
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.assertEqual(len(self.nomes("/api/hospedes?busca=Lote", paulo)), 20)

    def test_paulo_so_ve_o_hospede_dele(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.assertEqual(self.nomes("/api/hospedes", paulo), ["Ricardo Nunes"])
        self.assertEqual(self.nomes("/api/hospedes?busca=Helena", paulo), [])

    def test_cria_hospede(self):
        r = self.cliente.post("/api/hospedes", json={"nome": "Hóspede Teste", "telefone": "",
                                                     "email": "Teste@Example.com"})
        self.assertEqual(r.status_code, 201)
        h = r.get_json()
        apagar_depois(self, "hospede", h["id"])
        self.assertEqual(h, {"id": h["id"], "nome": "Hóspede Teste", "telefone": None, "email": "teste@example.com",
                             "documento": None, "observacoes": None})

    def test_email_invalido_da_422(self):
        self.confere_erro(self.cliente.post("/api/hospedes", json={"nome": "X", "email": "x@"}), 422,
                          {"email": "E-mail inválido."})


if __name__ == "__main__":
    unittest.main()
