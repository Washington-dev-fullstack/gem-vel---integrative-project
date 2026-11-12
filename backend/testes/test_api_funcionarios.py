"""API: a equipe de cada administrador (listar, cadastrar, editar, senha, desativar e reativar),
com banco de verdade."""

import unittest

from testes.apoio import CasoApi, apagar_depois, consultar, executar

CAMPOS_DA_PESSOA = ("id", "nome", "email", "telefone", "funcao", "ativo")


class TestFuncionarios(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def test_lista_a_equipe_por_nome(self):
        f = self.cliente.get("/api/funcionarios").get_json()["funcionarios"]
        self.assertEqual([x["nome"] for x in f], ["Cida Ramos", "Júlia Lima", "Marcos Teixeira", "Rafael Souza"])
        self.assertEqual({campo: f[0][campo] for campo in CAMPOS_DA_PESSOA},
                         {"id": 3, "nome": "Cida Ramos", "email": "cida@gemovel.test",
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


class TestEditarEquipe(CasoApi):
    """O dia de cada pessoa, editar, trocar a senha, desativar e reativar."""

    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def nova_pessoa(self):
        r = self.cliente.post("/api/funcionarios", json={"nome": "Bia Teste", "funcao": "limpeza",
                                                         "email": "bia.teste@gemovel.test", "senha": "senha-da-bia"})
        self.assertEqual(r.status_code, 201, r.get_data(as_text=True))
        id = r.get_json()["id"]
        apagar_depois(self, "usuario", id)
        return id

    def tarefa_de(self, pessoa_id, quando):
        r = self.cliente.post("/api/tarefas", json={"tipo": "limpeza", "imovel_id": 3, "titulo": "Teste",
                                                    "agendada_para": quando, "funcionario_id": pessoa_id})
        self.assertEqual(r.status_code, 201, r.get_data(as_text=True))
        id = r.get_json()["id"]
        apagar_depois(self, "tarefa", id)  # a limpeza roda antes da que apaga a pessoa
        return id

    def entra(self, senha, email="bia.teste@gemovel.test"):
        return self.app.test_client().post("/api/sessao", json={"email": email, "senha": senha}).status_code

    def test_equipe_traz_o_dia_e_as_futuras_pendentes(self):
        dia = consultar("SELECT DATE(agendada_para) AS dia FROM tarefa WHERE id = 9")[0]["dia"]  # a 9 é da Cida
        equipe = self.cliente.get(f"/api/funcionarios?dia={dia}").get_json()["funcionarios"]
        self.assertEqual(list(equipe[0]), [*CAMPOS_DA_PESSOA, "dia", "agora", "proxima", "futuras_pendentes"])
        for pessoa in equipe:
            with self.subTest(pessoa=pessoa["nome"]):
                do_dia = consultar("SELECT status FROM tarefa WHERE funcionario_id = %s AND DATE(agendada_para) = %s"
                                   " ORDER BY agendada_para, id", (pessoa["id"], dia))
                self.assertEqual(pessoa["dia"], {"total": len(do_dia),
                                                 "concluidas": sum(x["status"] == "concluida" for x in do_dia),
                                                 "estados": [x["status"] for x in do_dia]})
                futuras = consultar("SELECT COUNT(*) AS n FROM tarefa WHERE funcionario_id = %s AND status = 'pendente'"
                                    " AND agendada_para > NOW()", (pessoa["id"],))[0]["n"]
                self.assertEqual(pessoa["futuras_pendentes"], futuras)
                agora = consultar("SELECT t.id, t.titulo, i.id AS imovel_id, i.nome FROM tarefa t JOIN imovel i"
                                  " ON i.id = t.imovel_id WHERE t.funcionario_id = %s AND t.status = 'em_andamento'"
                                  " ORDER BY t.agendada_para, t.id LIMIT 1", (pessoa["id"],))
                self.assertEqual(pessoa["agora"], None if not agora else
                                 {"id": agora[0]["id"], "titulo": agora[0]["titulo"],
                                  "imovel": {"id": agora[0]["imovel_id"], "nome": agora[0]["nome"]}})
                proxima = consultar("SELECT t.agendada_para, i.id AS imovel_id, i.nome FROM tarefa t JOIN imovel i"
                                    " ON i.id = t.imovel_id WHERE t.funcionario_id = %s AND t.status = 'pendente'"
                                    " AND t.agendada_para >= NOW() ORDER BY t.agendada_para, t.id LIMIT 1", (pessoa["id"],))
                self.assertEqual(pessoa["proxima"], None if not proxima else
                                 {"agendada_para": proxima[0]["agendada_para"].isoformat(timespec="minutes"),
                                  "imovel": {"id": proxima[0]["imovel_id"], "nome": proxima[0]["nome"]}})
        self.assertGreater(next(p for p in equipe if p["id"] == 3)["dia"]["total"], 0)
        self.assertIsNotNone(next(p for p in equipe if p["id"] == 5)["agora"])  # o Marcos está com a tarefa 5

    def test_editar_pessoa(self):
        id = self.nova_pessoa()
        r = self.cliente.patch(f"/api/funcionarios/{id}", json={"nome": "Bia Souza", "funcao": "manutencao",
                                                                "telefone": "(11) 99999-0000",
                                                                "email": "Bia.Souza@gemovel.test"})
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertEqual(r.get_json(), {"id": id, "nome": "Bia Souza", "email": "bia.souza@gemovel.test",
                                        "telefone": "(11) 99999-0000", "funcao": "manutencao", "ativo": True})
        self.assertEqual(consultar("SELECT funcao FROM funcionario WHERE usuario_id = %s", (id,)), [{"funcao": "manutencao"}])
        self.assertEqual(self.entra("senha-da-bia", "bia.souza@gemovel.test"), 200)  # a senha continua a mesma
        r = self.cliente.patch(f"/api/funcionarios/{id}", json={"nome": "Bia Souza", "funcao": "manutencao",
                                                                "email": "bia.souza@gemovel.test"})
        self.assertEqual((r.status_code, r.get_json()["telefone"]), (200, None))  # o próprio e-mail não conflita
        self.confere_erro(self.cliente.patch(f"/api/funcionarios/{id}", json={"funcao": "limpeza",
                                                                              "email": "bia.souza@gemovel.test"}),
                          422, {"nome": "Preencha este campo."})

    def test_email_repetido_da_409(self):
        id = self.nova_pessoa()
        r = self.cliente.patch(f"/api/funcionarios/{id}", json={"nome": "Bia Teste", "funcao": "limpeza",
                                                                "email": "cida@gemovel.test"})
        self.confere_erro(r, 409, {"email": "Este e-mail já tem acesso ao Gemóvel."},
                          "Este e-mail já tem acesso ao Gemóvel.")

    def test_mudar_funcao_com_pendentes_da_409(self):
        id = self.nova_pessoa()
        self.tarefa_de(id, "2030-01-10T09:00")
        frase = ("Esta pessoa tem tarefas pendentes de limpeza. "
                 "Passe as tarefas para outra pessoa antes de mudar a função.")
        r = self.cliente.patch(f"/api/funcionarios/{id}", json={"nome": "Bia Teste", "funcao": "manutencao",
                                                                "email": "bia.teste@gemovel.test"})
        self.confere_erro(r, 409, {"funcao": frase}, frase)
        self.assertEqual(consultar("SELECT funcao FROM funcionario WHERE usuario_id = %s", (id,)), [{"funcao": "limpeza"}])

    def test_senha_curta_da_422(self):
        id = self.nova_pessoa()
        self.confere_erro(self.cliente.post(f"/api/funcionarios/{id}/senha", json={"senha": "1234567"}), 422,
                          {"senha": "A senha precisa ter pelo menos 8 caracteres."})
        self.assertEqual(self.entra("senha-da-bia"), 200)

    def test_senha_nova_entra(self):
        id = self.nova_pessoa()
        r = self.cliente.post(f"/api/funcionarios/{id}/senha", json={"senha": "senha-nova-da-bia"})
        self.assertEqual(r.status_code, 204, r.get_data(as_text=True))
        self.assertEqual((self.entra("senha-nova-da-bia"), self.entra("senha-da-bia")), (200, 401))

    def test_desativar_libera_as_tarefas_futuras(self):
        id = self.nova_pessoa()
        futuras = [self.tarefa_de(id, "2030-01-10T09:00"), self.tarefa_de(id, "2030-01-11T09:00")]
        concluida, passada = self.tarefa_de(id, "2030-01-12T09:00"), self.tarefa_de(id, "2020-01-10T09:00")
        executar("UPDATE tarefa SET status = 'concluida', iniciada_em = agendada_para, concluida_em = agendada_para"
                 " WHERE id = %s", (concluida,))
        r = self.cliente.post(f"/api/funcionarios/{id}/desativar", json={})
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertEqual((r.get_json()["tarefas_liberadas"], r.get_json()["funcionario"]["ativo"]), (2, False))
        self.assertEqual(consultar("SELECT id, funcionario_id FROM tarefa WHERE id IN (%s, %s, %s, %s) ORDER BY id",
                                   (*futuras, concluida, passada)),
                         [{"id": futuras[0], "funcionario_id": None}, {"id": futuras[1], "funcionario_id": None},
                          {"id": concluida, "funcionario_id": id}, {"id": passada, "funcionario_id": id}])
        self.assertEqual(self.entra("senha-da-bia"), 403)

    def test_reativar(self):
        id = self.nova_pessoa()
        self.cliente.post(f"/api/funcionarios/{id}/desativar", json={})
        r = self.cliente.post(f"/api/funcionarios/{id}/reativar", json={})
        self.assertEqual((r.status_code, r.get_json()["ativo"]), (200, True))
        self.assertEqual(self.entra("senha-da-bia"), 200)

    def test_pessoa_de_outro_admin_da_404(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        for resposta in (paulo.patch("/api/funcionarios/3", json={"nome": "Cida Ramos", "funcao": "limpeza",
                                                                   "email": "cida@gemovel.test"}),
                         paulo.post("/api/funcionarios/3/senha", json={"senha": "senha-nova-da-cida"}),
                         paulo.post("/api/funcionarios/3/desativar", json={}),
                         paulo.post("/api/funcionarios/3/reativar", json={}),
                         self.cliente.post("/api/funcionarios/2/senha", json={"senha": "senha-nova-do-paulo"})):
            self.confere_erro(resposta, 404)
        self.assertEqual(consultar("SELECT ativo FROM usuario WHERE id = 3"), [{"ativo": 1}])


if __name__ == "__main__":
    unittest.main()
