"""API: login, sessão e a conferência de login e perfil em cada rota (banco de verdade)."""

import unittest

from app import criar_app
from config import carregar_config
from testes.apoio import SEGREDO_DE_TESTE, SENHA_DE_TESTE, CasoApi, apagar_depois, executar


class TestSessao(CasoApi):
    def conta_temporaria(self, ativo):  # administrador com a senha dos dados de exemplo
        id = executar("INSERT INTO usuario (nome, email, senha_hash, perfil, ativo) "
                      "SELECT 'Conta Temporária', 'temporaria@gemovel.test', senha_hash, 'administrador', %s "
                      "FROM usuario WHERE id = 1", (ativo,))
        apagar_depois(self, "usuario", id)
        return "temporaria@gemovel.test"

    def test_login_da_marina(self):
        r = self.cliente.post("/api/sessao", json={"email": "marina@gemovel.test", "senha": SENHA_DE_TESTE})
        self.assertEqual((r.status_code, r.get_json()),
                         (200, {"usuario": {"id": 1, "nome": "Marina Alves", "email": "marina@gemovel.test",
                                            "perfil": "administrador"}}))
        self.assertIn("HttpOnly", r.headers["Set-Cookie"])
        self.assertIn("SameSite=Lax", r.headers["Set-Cookie"])

    def test_login_de_funcionario_traz_a_funcao(self):
        r = self.cliente.post("/api/sessao", json={"email": "cida@gemovel.test", "senha": SENHA_DE_TESTE})
        self.assertEqual(r.get_json()["usuario"], {"id": 3, "nome": "Cida Ramos", "email": "cida@gemovel.test",
                                                   "perfil": "funcionario", "funcao": "limpeza"})

    def test_login_aceita_email_com_maiusculas_e_espacos(self):
        self.entrar("  Marina@Gemovel.TEST ")

    def test_senha_errada_e_email_desconhecido_dao_a_mesma_resposta(self):
        for corpo in ({"email": "marina@gemovel.test", "senha": "senha-errada"},
                      {"email": "ninguem@gemovel.test", "senha": SENHA_DE_TESTE}):
            self.confere_erro(self.cliente.post("/api/sessao", json=corpo), 401,
                              mensagem="E-mail ou senha não conferem.")

    def test_login_sem_campos_da_422(self):
        self.confere_erro(self.cliente.post("/api/sessao", json={}), 422,
                          {"email": "Preencha este campo.", "senha": "Preencha este campo."})

    def test_conta_desativada_da_403(self):
        r = self.cliente.post("/api/sessao", json={"email": self.conta_temporaria(ativo=0), "senha": SENHA_DE_TESTE})
        self.confere_erro(r, 403, mensagem="Este acesso foi desativado. Fale com quem administra o Gemóvel.")

    def test_conta_desativada_depois_do_login_perde_o_acesso(self):
        email = self.conta_temporaria(ativo=1)
        self.entrar(email)
        executar("UPDATE usuario SET ativo = 0 WHERE email = %s", (email,))
        self.confere_erro(self.cliente.get("/api/sessao"), 401)

    def test_cada_rota_confere_login_e_perfil(self):  # cobre também as rotas das tarefas seguintes
        sem_login = {("/api/saude", "GET"), ("/api/sessao", "POST"), ("/api/sessao", "DELETE")}
        conferidas = set()
        cida, marina = self.app.test_client(), self.app.test_client()
        self.entrar("cida@gemovel.test", cida)
        self.entrar("marina@gemovel.test", marina)
        for regra in self.app.url_map.iter_rules():
            for metodo in sorted(regra.methods - {"HEAD", "OPTIONS"}):
                if not regra.rule.startswith("/api/") or (regra.rule, metodo) in sem_login:
                    continue
                url = regra.rule.replace("<int:id>", "1")
                outro = marina if regra.rule == "/api/minhas-tarefas" else cida
                with self.subTest(metodo=metodo, url=url):
                    self.confere_erro(self.cliente.open(url, method=metodo, json={}), 401)
                    if regra.rule != "/api/sessao":
                        self.confere_erro(outro.open(url, method=metodo, json={}), 403)
                conferidas.add((regra.rule, metodo))
        self.assertEqual(len(conferidas), 16)  # as 19 rotas menos as 3 que não pedem login

    def test_sair_limpa_a_sessao(self):
        self.entrar("marina@gemovel.test")
        self.assertEqual(self.cliente.delete("/api/sessao").status_code, 204)
        self.confere_erro(self.cliente.get("/api/sessao"), 401)

    def test_banco_desligado_da_503_no_formato_de_erro(self):
        cliente = criar_app({**carregar_config(), "port": 3999}, segredo=SEGREDO_DE_TESTE).test_client()
        with cliente.session_transaction() as sessao:
            sessao["usuario_id"] = 1
        self.confere_erro(cliente.get("/api/sessao"), 503,
                          mensagem="Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?")


if __name__ == "__main__":
    unittest.main()
