"""Base dos DAOs: cada DAO tem o SQL da sua tabela, escrito à mão, e converte as linhas
do banco em objetos do domínio."""

from abc import ABC, abstractmethod
from contextlib import contextmanager


class DAOBase(ABC):
    """Um DAO roda dentro da transação que recebe (quando a rota junta vários passos numa
    transação só) ou abre uma transação curta a cada chamada."""

    def __init__(self, conexao, transacao=None):
        self._conexao = conexao
        self._transacao = transacao

    @contextmanager
    def _bloco(self):
        """Bloco `with` que entrega a transação recebida ou uma nova: o DAO que grava em duas
        tabelas usa um bloco só, e as duas gravações valem juntas ou nenhuma vale."""
        if self._transacao is not None:
            yield self._transacao
        else:
            with self._conexao.transacao() as transacao:
                yield transacao

    def _executar(self, sql, parametros=()):
        with self._bloco() as transacao:
            return transacao.executar(sql, parametros)

    def _consultar(self, sql, parametros=()):
        with self._bloco() as transacao:
            return transacao.consultar(sql, parametros)

    @abstractmethod
    def _para_objeto(self, linha):
        """Converte uma linha do banco (um dicionário) no objeto do domínio."""
