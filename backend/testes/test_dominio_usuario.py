"""Domínio: usuários (Usuario, Administrador e Funcionario), sem banco."""

import unittest
from types import SimpleNamespace

from gemovel.dominio.enums import TipoTarefa
from gemovel.dominio.usuario import Usuario
from gemovel.erros import ErroValidacao
from testes.fabrica import novo_admin, novo_funcionario


class TestUsuario(unittest.TestCase):
    def test_senha_confere_e_o_hash_nao_e_a_senha(self):
        u = novo_admin()
        u.definir_senha("abcd1234")
        self.assertTrue(u.verificar_senha("abcd1234"))
        self.assertFalse(u.verificar_senha("abcd12345"))
        self.assertNotEqual(u.senha_hash, "abcd1234")
        self.assertTrue(u.senha_hash.startswith("scrypt:"))

    def test_senha_curta_ou_vazia(self):
        for senha, msg in (("1234567", "A senha precisa ter pelo menos 8 caracteres."),
                           (None, "Preencha este campo.")):
            with self.assertRaises(ErroValidacao) as c:
                novo_admin().definir_senha(senha)
            self.assertEqual(c.exception.campos, {"senha": msg})

    def test_perfis(self):
        self.assertEqual((novo_admin().perfil(), novo_funcionario().perfil()),
                         ("administrador", "funcionario"))

    def test_usuario_e_abstrato(self):
        with self.assertRaises(TypeError):
            Usuario(nome="Ana", email="ana@gemovel.test")

    def test_email_em_minusculas_e_texto_sem_espacos(self):
        u = novo_admin(nome="  Ana  ", email=" Ana@Gemovel.TEST ", telefone=" ")
        self.assertEqual((u.nome, u.email, u.telefone), ("Ana", "ana@gemovel.test", None))

    def test_uma_mensagem_por_campo(self):
        with self.assertRaises(ErroValidacao) as c:
            novo_admin(nome="", email="sem-arroba", telefone="1" * 21)
        self.assertEqual(c.exception.mensagem, "Confira os campos destacados.")
        self.assertEqual(c.exception.campos, {"nome": "Preencha este campo.",
                                              "email": "E-mail inválido.",
                                              "telefone": "Use até 20 caracteres."})

    def test_funcao_invalida(self):
        with self.assertRaises(ErroValidacao) as c:
            novo_funcionario(funcao="jardinagem")
        self.assertEqual(c.exception.campos, {"funcao": "Escolha uma das opções."})

    def test_pode_executar_exige_pessoa_ativa_e_mesma_funcao(self):
        limpeza = SimpleNamespace(tipo=TipoTarefa.LIMPEZA)
        manutencao = SimpleNamespace(tipo=TipoTarefa.MANUTENCAO)
        self.assertTrue(novo_funcionario().pode_executar(limpeza))
        self.assertFalse(novo_funcionario().pode_executar(manutencao))
        self.assertFalse(novo_funcionario(ativo=False).pode_executar(limpeza))


if __name__ == "__main__":
    unittest.main()
