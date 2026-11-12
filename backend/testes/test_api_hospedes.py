"""API: os hóspedes de cada administrador (buscar e cadastrar), com banco de verdade."""

import unittest

from testes.apoio import CasoApi, apagar_depois, consultar, executar, linha


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


    def criar(self, **dados):
        """Cria um hóspede da Marina (apagado no fim do teste) e devolve o JSON dele."""
        r = self.cliente.post("/api/hospedes", json={"nome": "Hóspede Teste", **dados})
        self.assertEqual(r.status_code, 201, r.get_json())
        apagar_depois(self, "hospede", r.json["id"])
        return r.json

    def test_lista_de_hospedes_traz_reservas_e_a_ultima(self):
        esperado = linha("SELECT COUNT(*) AS num, MAX(data_entrada) AS ultima FROM reserva WHERE hospede_id = 12")
        sem_reserva = self.criar()["id"]
        por_id = {h["id"]: h for h in self.cliente.get("/api/hospedes").json["hospedes"]}
        self.assertEqual((por_id[12]["num_reservas"], por_id[12]["ultima_reserva"]),
                         (esperado["num"], esperado["ultima"].isoformat()))
        self.assertEqual((por_id[sem_reserva]["num_reservas"], por_id[sem_reserva]["ultima_reserva"]), (0, None))

    def test_um_hospede_com_as_reservas(self):
        r = self.cliente.get("/api/hospedes/12")
        self.assertEqual(r.status_code, 200, r.get_json())
        ids = [x["id"] for x in consultar("SELECT id FROM reserva WHERE hospede_id = 12 "
                                          "ORDER BY data_entrada DESC, id DESC")]
        self.assertEqual((r.json["nome"], [x["id"] for x in r.json["reservas"]]), ("Carla Nogueira", ids))
        self.assertEqual(list(r.json["reservas"][0]),
                         ["id", "codigo", "imovel", "data_entrada", "data_saida", "status", "situacao"])

    def test_hospede_de_outro_admin_da_404(self):
        criado = self.criar()
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.confere_erro(paulo.get(f"/api/hospedes/{criado['id']}"), 404)
        self.confere_erro(paulo.patch(f"/api/hospedes/{criado['id']}", json={"nome": "Outro"}), 404)
        self.confere_erro(paulo.delete(f"/api/hospedes/{criado['id']}"), 404)
        self.assertEqual(self.cliente.get(f"/api/hospedes/{criado['id']}").json["nome"], "Hóspede Teste")

    def test_editar_hospede(self):
        criado = self.criar(email="antes@example.com")
        r = self.cliente.patch(f"/api/hospedes/{criado['id']}", json={"nome": "Hóspede Editado",
                                                                      "telefone": "(11) 90000-1111"})
        self.assertEqual(r.status_code, 200, r.get_json())
        self.assertEqual(r.json, {"id": criado["id"], "nome": "Hóspede Editado", "telefone": "(11) 90000-1111",
                                  "email": None, "documento": None, "observacoes": None})

    def test_excluir_hospede_sem_reservas(self):
        criado = self.criar()
        r = self.cliente.delete(f"/api/hospedes/{criado['id']}")
        self.assertEqual((r.status_code, r.get_data(as_text=True)), (204, ""))
        self.confere_erro(self.cliente.get(f"/api/hospedes/{criado['id']}"), 404)

    def test_excluir_hospede_com_reservas_da_409(self):
        self.confere_erro(self.cliente.delete("/api/hospedes/12"), 409,
                          mensagem="Este hóspede tem reservas e não pode ser excluído.")

if __name__ == "__main__":
    unittest.main()
