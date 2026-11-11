"""Conexão com o banco do Gemóvel: um pool de conexões do mysql-connector-python."""

import threading
from contextlib import contextmanager

import mysql.connector
from mysql.connector import errorcode, pooling

# As 8 tabelas, na ordem da especificação.
TABELAS = ("usuario", "funcionario", "imovel", "hospede",
           "reserva", "bloqueio", "tarefa", "historico_tarefa")

MENSAGEM_DESLIGADO = "Não foi possível conectar ao banco. O MySQL do XAMPP está ligado?"

# Segundos esperando o MySQL responder antes de desistir.
TEMPO_LIMITE = 5

# Segundos que um pedido espera por uma conexão livre quando todas as do pool estão em uso.
ESPERA_POR_CONEXAO = 10
MENSAGEM_OCUPADO = "O banco está ocupado: todas as conexões estão em uso. Tente de novo em instantes."


class BancoIndisponivel(Exception):
    """O banco não respondeu. A mensagem diz o que conferir."""


def _mensagem(erro: mysql.connector.Error, config: dict) -> str:
    """Traduz o erro do conector numa frase que diz o que fazer."""
    if erro.errno == errorcode.ER_BAD_DB_ERROR:
        return (f"O banco {config['database']} não existe. Importe banco/01_estrutura.sql "
                "e banco/02_dados_exemplo.sql.")
    if erro.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        return "O MySQL recusou o usuário ou a senha. Confira DB_USUARIO e DB_SENHA no backend/.env."
    return MENSAGEM_DESLIGADO


class Conexao:
    """Guarda um pool de conexões. O pool só é criado no primeiro uso, e de novo
    se falhar: assim, ligar o XAMPP depois do Flask também funciona."""

    def __init__(self, config: dict, tamanho_pool: int = 5):
        self._config = config
        self._tamanho_pool = tamanho_pool
        self._pool = None
        self._trava = threading.Lock()
        # Quantas conexões do pool ainda podem ser entregues agora.
        self._livres = threading.BoundedSemaphore(tamanho_pool)

    def _obter_pool(self) -> pooling.MySQLConnectionPool:
        with self._trava:
            if self._pool is None:
                try:
                    self._pool = pooling.MySQLConnectionPool(
                        pool_name="gemovel",
                        pool_size=self._tamanho_pool,
                        connection_timeout=TEMPO_LIMITE,
                        **self._config,
                    )
                except mysql.connector.Error as erro:
                    raise BancoIndisponivel(_mensagem(erro, self._config)) from erro
            return self._pool

    @contextmanager
    def obter(self):
        """Entrega uma conexão do pool e a devolve no fim do bloco `with`. Se todas
        estiverem em uso, espera uma ficar livre: o painel faz vários pedidos ao mesmo tempo."""
        pool = self._obter_pool()
        # O pool do conector falha na hora quando está cheio; o semáforo faz o pedido esperar a vez.
        if not self._livres.acquire(timeout=ESPERA_POR_CONEXAO):
            raise BancoIndisponivel(MENSAGEM_OCUPADO)
        try:
            try:
                cnx = pool.get_connection()
            except mysql.connector.Error as erro:
                raise BancoIndisponivel(_mensagem(erro, self._config)) from erro
            try:
                yield cnx
            finally:
                cnx.close()  # numa conexão do pool, close() devolve a conexão ao pool
        finally:
            self._livres.release()

    @contextmanager
    def transacao(self):
        """Bloco `with` que entrega uma Transacao numa conexão só. No fim do bloco grava
        tudo (commit); se algo falhar, desfaz tudo (rollback) e o erro segue adiante."""
        with self.obter() as cnx:
            with _conexao_perdida():
                cnx.start_transaction()
            try:
                yield Transacao(cnx)
                with _conexao_perdida():
                    cnx.commit()
            except BaseException:
                try:
                    cnx.rollback()
                except mysql.connector.Error:
                    pass  # a conexão caiu: o MySQL já desfez a transação
                raise

    def testar(self) -> dict:
        """Devolve a versão do MySQL e quantas linhas cada tabela tem."""
        try:
            with self.obter() as cnx:
                cursor = cnx.cursor()
                cursor.execute("SELECT VERSION()")
                (versao,) = cursor.fetchone()
                tabelas = {}
                for tabela in TABELAS:  # nomes fixos daqui, nunca vindos de fora
                    cursor.execute(f"SELECT COUNT(*) FROM `{tabela}`")
                    (tabelas[tabela],) = cursor.fetchone()
                cursor.close()
        except mysql.connector.Error as erro:
            raise BancoIndisponivel(_mensagem(erro, self._config)) from erro
        return {"versao": versao, "tabelas": tabelas}


@contextmanager
def _conexao_perdida():
    """A conexão que cai no meio do caminho vira BancoIndisponivel, como a que nem abriu."""
    try:
        yield
    except (mysql.connector.InterfaceError, mysql.connector.OperationalError) as erro:
        raise BancoIndisponivel(MENSAGEM_DESLIGADO) from erro


class Transacao:
    """Uma transação aberta numa conexão só. Quem cria é o Conexao.transacao()."""

    def __init__(self, cnx):
        self._cnx = cnx

    def executar(self, sql: str, parametros=()) -> int:
        """Roda um comando. Devolve o id gerado por um INSERT ou, nos outros comandos,
        quantas linhas mudaram."""
        with _conexao_perdida():
            cursor = self._cnx.cursor()
            try:
                cursor.execute(sql, parametros)
                if sql.lstrip().upper().startswith("INSERT"):
                    return cursor.lastrowid
                return cursor.rowcount
            finally:
                cursor.close()

    def consultar(self, sql: str, parametros=()) -> list[dict]:
        """Roda uma consulta e devolve as linhas como dicionários."""
        with _conexao_perdida():
            cursor = self._cnx.cursor(dictionary=True)
            try:
                cursor.execute(sql, parametros)
                return cursor.fetchall()
            finally:
                cursor.close()
