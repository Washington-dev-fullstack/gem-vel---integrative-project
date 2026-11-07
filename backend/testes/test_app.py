import unittest

from app import criar_app
from config import carregar_config

PORTA_SEM_BANCO = 3999


class TestRotaSaude(unittest.TestCase):
    def test_saude_responde_200_com_as_tabelas(self):
        resposta = criar_app().test_client().get("/api/saude")
        self.assertEqual(resposta.status_code, 200)
        dados = resposta.get_json()
        self.assertEqual(dados["status"], "ok")
        self.assertEqual(dados["banco"], "gemovel")
        self.assertEqual(dados["tabelas"]["imovel"], 9)

    def test_banco_desligado_responde_503(self):
        app = criar_app({**carregar_config(), "port": PORTA_SEM_BANCO})
        resposta = app.test_client().get("/api/saude")
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(resposta.get_json(), {
            "status": "erro",
            "mensagem": "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?",
        })


if __name__ == "__main__":
    unittest.main()
