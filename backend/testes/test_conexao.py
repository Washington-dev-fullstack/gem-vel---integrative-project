import threading
import unittest
from unittest import mock

from werkzeug.security import check_password_hash

from config import carregar_config
from gemovel.conexao import BancoIndisponivel, Conexao
from testes.apoio import ESPERADO, SENHA_DE_TESTE, apagar_depois

# Uma porta onde não há MySQL nenhum: simula o XAMPP desligado.
PORTA_SEM_BANCO = 3999


def consultar_um(conexao, sql, parametros=()):
    """Roda uma consulta e devolve a primeira coluna da primeira linha."""
    with conexao.obter() as cnx:
        cursor = cnx.cursor()
        cursor.execute(sql, parametros)
        (valor,) = cursor.fetchone()
        cursor.close()
    return valor


class TestConexao(unittest.TestCase):
    def setUp(self):
        self.conexao = Conexao(carregar_config())

    def test_testar_conta_as_8_tabelas(self):
        resultado = self.conexao.testar()
        self.assertEqual(resultado["tabelas"], ESPERADO)
        self.assertTrue(resultado["versao"])

    def test_acentos_voltam_intactos(self):
        nome = consultar_um(self.conexao, "SELECT nome FROM imovel WHERE id = %s", (8,))
        self.assertEqual(nome, "Chalé da Serra")

    def test_senha_de_teste_confere(self):
        senha_hash = consultar_um(self.conexao, "SELECT senha_hash FROM usuario WHERE id = %s", (1,))
        self.assertTrue(check_password_hash(senha_hash, SENHA_DE_TESTE))

    def test_conexao_reaproveitada_continua_no_modo_estrito(self):
        # Com um pool de 1, a segunda consulta reaproveita a mesma conexão.
        conexao = Conexao(carregar_config(), tamanho_pool=1)
        for _ in range(2):
            modo = consultar_um(conexao, "SELECT @@SESSION.sql_mode")
            self.assertIn("STRICT_ALL_TABLES", modo)

    def test_pedido_alem_do_pool_espera_uma_conexao_livre(self):
        # O painel faz vários pedidos ao mesmo tempo: o que passar do pool espera, não falha.
        conexao = Conexao(carregar_config(), tamanho_pool=1)
        resultado = {}

        def pedir():
            try:
                resultado["nome"] = consultar_um(conexao, "SELECT nome FROM imovel WHERE id = %s", (8,))
            except BancoIndisponivel as erro:
                resultado["erro"] = str(erro)

        with conexao.obter():  # ocupa a única conexão do pool
            pedido = threading.Thread(target=pedir)
            pedido.start()
            pedido.join(0.5)
            self.assertTrue(pedido.is_alive(), f"o pedido devia esperar, não falhar: {resultado}")
        pedido.join(5)
        self.assertEqual(resultado, {"nome": "Chalé da Serra"})

    def test_pool_ocupado_demais_avisa_que_esta_ocupado(self):
        conexao = Conexao(carregar_config(), tamanho_pool=1)
        with mock.patch("gemovel.conexao.ESPERA_POR_CONEXAO", 0.2):
            with conexao.obter():
                with self.assertRaises(BancoIndisponivel) as contexto:
                    with conexao.obter():
                        pass
        self.assertIn("ocupado", str(contexto.exception))

    def test_banco_desligado_vira_banco_indisponivel(self):
        with self.assertRaises(BancoIndisponivel) as contexto:
            Conexao({**carregar_config(), "port": PORTA_SEM_BANCO}).testar()
        self.assertIn("XAMPP está ligado", str(contexto.exception))

    def test_banco_que_nao_existe_pede_os_scripts(self):
        with self.assertRaises(BancoIndisponivel) as contexto:
            Conexao({**carregar_config(), "database": "gemovel_que_nao_existe"}).testar()
        self.assertIn("01_estrutura.sql", str(contexto.exception))

    def test_senha_errada_aponta_o_env(self):
        with self.assertRaises(BancoIndisponivel) as contexto:
            Conexao({**carregar_config(), "password": "senha-errada"}).testar()
        self.assertIn("backend/.env", str(contexto.exception))

    def test_transacao_grava_tudo_no_fim(self):
        with self.conexao.transacao() as t:
            novo = t.executar("INSERT INTO hospede (administrador_id, nome) VALUES (%s, %s)",
                              (2, "Teste Transação"))
        apagar_depois(self, "hospede", novo)
        self.assertEqual(consultar_um(self.conexao, "SELECT nome FROM hospede WHERE id = %s", (novo,)),
                         "Teste Transação")

    def test_transacao_desfaz_tudo_se_der_erro(self):
        with self.assertRaises(RuntimeError):
            with self.conexao.transacao() as t:
                t.executar("INSERT INTO hospede (administrador_id, nome) VALUES (%s, %s)",
                           (2, "Teste Desfeito"))
                raise RuntimeError
        self.assertEqual(consultar_um(self.conexao, "SELECT COUNT(*) FROM hospede WHERE nome = %s",
                                      ("Teste Desfeito",)), 0)

    def test_consultar_devolve_dicionarios(self):
        with self.conexao.transacao() as t:
            linhas = t.consultar("SELECT id, nome FROM imovel WHERE id = %s", (8,))
        self.assertEqual(linhas, [{"id": 8, "nome": "Chalé da Serra"}])


if __name__ == "__main__":
    unittest.main()
