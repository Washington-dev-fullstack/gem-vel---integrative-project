"""Base dos DAOs: cada DAO tem o SQL da sua tabela, escrito à mão, e converte as linhas
do banco em objetos do domínio."""

from abc import ABC, abstractmethod
from contextlib import contextmanager
from datetime import time


def hora(valor):
    """O conector entrega a coluna TIME como timedelta; o domínio usa time."""
    if valor is None:
        return None
    segundos = int(valor.total_seconds())
    return time(segundos // 3600, segundos % 3600 // 60, segundos % 60)


def colunas(apelido, nomes, prefixo=""):
    """As colunas de uma tabela da junção, com o prefixo no nome: colunas("i", ("id", "nome"), "i_")
    devolve "i.id AS i_id, i.nome AS i_nome". Os prefixos: imóvel i_, hóspede h_, responsável r_,
    quem mudou u_ e tarefa t_."""
    return ", ".join(f"{apelido}.{nome} AS {prefixo}{nome}" for nome in nomes)


def sem_prefixo(linha, prefixo):
    """As colunas da linha que começam com `prefixo`, já sem ele."""
    return {chave[len(prefixo):]: valor for chave, valor in linha.items() if chave.startswith(prefixo)}



def escapar_like(termo):
    """Escapa os curingas do LIKE: quem digita % ou _ procura esses caracteres, não "qualquer coisa"."""
    return termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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
