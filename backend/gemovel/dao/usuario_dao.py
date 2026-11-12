"""DAOs dos usuários. A tabela funcionario estende usuario (herança 1:1), então as consultas
juntam as duas e a coluna perfil escolhe a classe: Administrador ou Funcionario."""

from contextlib import contextmanager

import mysql.connector
from mysql.connector import errorcode

from gemovel.dao.base import DAOBase
from gemovel.dominio.usuario import Administrador, Funcionario
from gemovel.erros import Conflito

COLUNAS_USUARIO = ("id", "nome", "email", "senha_hash", "telefone", "perfil", "ativo")

EMAIL_REPETIDO = "Este e-mail já tem acesso ao Gemóvel."

_SELECT = ("SELECT " + ", ".join(f"u.{coluna}" for coluna in COLUNAS_USUARIO)
           + ", f.administrador_id, f.funcao FROM usuario u LEFT JOIN funcionario f ON f.usuario_id = u.id")


@contextmanager
def _email_unico():
    """A chave única do e-mail vira Conflito (409): segura dois cadastros iguais ao mesmo tempo."""
    try:
        yield
    except mysql.connector.IntegrityError as erro:
        if erro.errno == errorcode.ER_DUP_ENTRY:
            raise Conflito(EMAIL_REPETIDO, campo="email") from erro
        raise


def usuario_da_linha(linha):
    """Monta a pessoa de uma linha com as colunas de usuario mais administrador_id e funcao."""
    dados = {coluna: linha[coluna] for coluna in COLUNAS_USUARIO if coluna != "perfil"}
    if linha["perfil"] == "funcionario":
        return Funcionario(administrador_id=linha["administrador_id"], funcao=linha["funcao"], **dados)
    return Administrador(**dados)


class UsuarioDAO(DAOBase):
    def _para_objeto(self, linha):
        return usuario_da_linha(linha)

    def buscar_por_email(self, email):
        linhas = self._consultar(_SELECT + " WHERE u.email = %s", (email,))
        return self._para_objeto(linhas[0]) if linhas else None

    def buscar_por_id(self, id):
        linhas = self._consultar(_SELECT + " WHERE u.id = %s", (id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def inserir(self, usuario):
        """Grava a pessoa e devolve o id dela. E-mail repetido vira Conflito (409)."""
        with self._bloco() as transacao:
            return self._inserir_usuario(transacao, usuario)

    def _inserir_usuario(self, transacao, usuario):
        with _email_unico():
            return transacao.executar(
                "INSERT INTO usuario (nome, email, senha_hash, telefone, perfil, ativo) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (usuario.nome, usuario.email, usuario.senha_hash, usuario.telefone, usuario.perfil(),
                 int(usuario.ativo)))

    def mudar_senha(self, id, senha_hash):
        self._executar("UPDATE usuario SET senha_hash = %s WHERE id = %s", (senha_hash, id))

    def mudar_ativo(self, id, ativo):
        """Desativa ou reativa o acesso: a pessoa nunca é apagada."""
        self._executar("UPDATE usuario SET ativo = %s WHERE id = %s", (int(ativo), id))


class FuncionarioDAO(UsuarioDAO):
    def listar_por_administrador(self, administrador_id):
        """A equipe do administrador, ativos e desativados, em ordem de nome."""
        linhas = self._consultar(_SELECT + " WHERE f.administrador_id = %s ORDER BY u.nome, u.id",
                                 (administrador_id,))
        return [self._para_objeto(linha) for linha in linhas]

    def inserir(self, funcionario):
        """Grava usuario e funcionario na mesma transação e devolve o id da pessoa."""
        with self._bloco() as transacao:
            id = self._inserir_usuario(transacao, funcionario)
            transacao.executar("INSERT INTO funcionario (usuario_id, administrador_id, funcao) "
                               "VALUES (%s, %s, %s)",
                               (id, funcionario.administrador_id, funcionario.funcao.value))
            return id

    def atualizar(self, funcionario):
        """Grava nome, e-mail, telefone e função na mesma transação. E-mail repetido vira Conflito (409)."""
        with self._bloco() as transacao:
            with _email_unico():
                transacao.executar("UPDATE usuario SET nome = %s, email = %s, telefone = %s WHERE id = %s",
                                   (funcionario.nome, funcionario.email, funcionario.telefone, funcionario.id))
            transacao.executar("UPDATE funcionario SET funcao = %s WHERE usuario_id = %s",
                               (funcionario.funcao.value, funcionario.id))
