import os
import unittest
from unittest import mock

from app import criar_app
from config import carregar_config, carregar_segredo_sessao
from gemovel.conexao import Conexao
from testes.apoio import SEGREDO_DE_TESTE

PORTA_SEM_BANCO = 3999


class TestRotaSaude(unittest.TestCase):
    def test_saude_responde_200_com_as_tabelas(self):
        resposta = criar_app(segredo=SEGREDO_DE_TESTE).test_client().get("/api/saude")
        self.assertEqual(resposta.status_code, 200)
        dados = resposta.get_json()
        self.assertEqual(dados["status"], "ok")
        self.assertEqual(dados["banco"], "gemovel")
        self.assertEqual(dados["tabelas"]["imovel"], 9)

    def test_banco_desligado_responde_503(self):
        app = criar_app({**carregar_config(), "port": PORTA_SEM_BANCO}, segredo=SEGREDO_DE_TESTE)
        resposta = app.test_client().get("/api/saude")
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(resposta.get_json(), {
            "status": "erro",
            "mensagem": "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?",
        })


class TestAppBase(unittest.TestCase):
    def test_segredo_vem_do_env(self):
        with mock.patch.dict(os.environ, {"SEGREDO_SESSAO": "abc"}):
            self.assertEqual(carregar_segredo_sessao(), "abc")

    def test_sem_segredo_gera_uma_chave_e_avisa(self):
        with mock.patch("config.load_dotenv"), mock.patch.dict(os.environ, {"SEGREDO_SESSAO": ""}), \
                self.assertWarns(UserWarning):
            self.assertEqual(len(carregar_segredo_sessao()), 64)

    def test_erros_de_endereco_em_json(self):
        cliente = criar_app(segredo=SEGREDO_DE_TESTE).test_client()
        r = cliente.get("/api/nao-existe")
        self.assertEqual((r.status_code, r.get_json()),
                         (404, {"erro": {"mensagem": "Não encontrado.", "campos": {}}}))
        r = cliente.delete("/api/saude")
        self.assertEqual((r.status_code, r.get_json()),
                         (405, {"erro": {"mensagem": "Este endereço não aceita este método.", "campos": {}}}))

    def test_erro_inesperado_da_500_em_json(self):
        app = criar_app(segredo=SEGREDO_DE_TESTE)
        with mock.patch.object(Conexao, "testar", side_effect=RuntimeError("quebrou")), \
                self.assertLogs(app.logger, "ERROR"):
            r = app.test_client().get("/api/saude")
        self.assertEqual((r.status_code, r.get_json()),
                         (500, {"erro": {"mensagem": "Algo deu errado do nosso lado. Tente de novo.",
                                         "campos": {}}}))


if __name__ == "__main__":
    unittest.main()
