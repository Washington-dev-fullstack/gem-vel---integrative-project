"""API: a equipe de cada administrador (listar e cadastrar), com banco de verdade."""

import unittest

from testes.apoio import CasoApi, apagar_depois, consultar


class TestFuncionarios(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def test_lista_a_equipe_por_nome(self):
        f = self.cliente.get("/api/funcionarios").get_json()["funcionarios"]
        self.assertEqual([x["nome"] for x in f], ["Cida Ramos", "Júlia Lima", "Marcos Teixeira", "Rafael Souza"])
        self.assertEqual(f[0], {"id": 3, "nome": "Cida Ramos", "email": "cida@gemovel.test",
                                "telefone": "(11) 98303-4040", "funcao": "limpeza", "ativo": True})

    def test_paulo_nao_ve_a_equipe_da_marina(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.assertEqual(paulo.get("/api/funcionarios").get_json(), {"funcionarios": []})

    def test_cria_funcionario_que_consegue_entrar(self):
        r = self.cliente.post("/api/funcionarios", json={"nome": "Bia Teste", "funcao": "limpeza",
                                                         "email": "Bia.Teste@gemovel.test", "senha": "senha-da-bia"})
        self.assertEqual(r.status_code, 201)
        novo = r.get_json()
        apagar_depois(self, "usuario", novo["id"])
        self.assertEqual(list(novo), ["id", "nome", "email", "telefone", "funcao", "ativo"])
        self.assertEqual(consultar("SELECT administrador_id, funcao FROM funcionario WHERE usuario_id = %s",
                                   (novo["id"],)), [{"administrador_id": 1, "funcao": "limpeza"}])
        bia = self.app.test_client().post("/api/sessao", json={"email": "bia.teste@gemovel.test",
                                                               "senha": "senha-da-bia"})
        self.assertEqual(bia.get_json()["usuario"]["perfil"], "funcionario")

    def test_email_repetido_da_409(self):
        r = self.cliente.post("/api/funcionarios", json={"nome": "Outra Cida", "funcao": "limpeza",
                                                         "email": "cida@gemovel.test", "senha": "senha-da-cida"})
        self.confere_erro(r, 409, {"email": "Este e-mail já tem acesso ao Gemóvel."},
                          "Este e-mail já tem acesso ao Gemóvel.")

    def test_senha_curta_da_422(self):
        r = self.cliente.post("/api/funcionarios", json={"nome": "Bia Teste", "funcao": "limpeza",
                                                         "email": "bia@gemovel.test", "senha": "1234567"})
        self.confere_erro(r, 422, {"senha": "A senha precisa ter pelo menos 8 caracteres."})

    def test_escrita_sem_json_da_400_e_nao_grava(self):
        for pedido in ({"data": {"nome": "Bia Teste", "funcao": "limpeza", "email": "bia@gemovel.test",
                                 "senha": "senha-da-bia"}},
                       {"data": '{"nome": "Bia Teste"}', "content_type": "text/plain"}):
            self.confere_erro(self.cliente.post("/api/funcionarios", **pedido), 400)
        self.assertEqual(consultar("SELECT COUNT(*) AS n FROM usuario"), [{"n": 6}])


if __name__ == "__main__":
    unittest.main()
