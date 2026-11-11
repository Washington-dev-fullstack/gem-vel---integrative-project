"""DAO dos hóspedes. A busca do formulário de reserva procura no nome e no telefone."""

from gemovel.dao.base import DAOBase
from gemovel.dominio.hospede import Hospede

COLUNAS_HOSPEDE = ("id", "administrador_id", "nome", "telefone", "email", "documento", "observacoes")

_SELECT = "SELECT " + ", ".join(COLUNAS_HOSPEDE) + " FROM hospede"

# Com termo, a busca para aqui: é a lista de sugestões do formulário.
LIMITE_DA_BUSCA = 20


def hospede_da_linha(linha):
    return Hospede(**{coluna: linha[coluna] for coluna in COLUNAS_HOSPEDE})


def _escapar_like(termo):
    """Escapa os curingas do LIKE: quem digita % ou _ procura esses caracteres, não "qualquer coisa"."""
    return termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class HospedeDAO(DAOBase):
    def _para_objeto(self, linha):
        return hospede_da_linha(linha)

    def buscar(self, administrador_id, termo=None):
        """Os hóspedes do administrador por nome. Com `termo`, só os que têm o termo no nome
        ou no telefone (sem diferença de acento nem de maiúscula, pela collation do banco)."""
        sql, parametros = _SELECT + " WHERE administrador_id = %s", [administrador_id]
        if termo:
            padrao = f"%{_escapar_like(termo)}%"
            sql += " AND (nome LIKE %s OR telefone LIKE %s)"
            parametros += [padrao, padrao]
        sql += " ORDER BY nome, id"
        if termo:
            sql += f" LIMIT {LIMITE_DA_BUSCA}"
        return [self._para_objeto(linha) for linha in self._consultar(sql, tuple(parametros))]

    def buscar_por_id(self, id):
        linhas = self._consultar(_SELECT + " WHERE id = %s", (id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def inserir(self, hospede):
        """Grava o hóspede e devolve o id dele."""
        return self._executar(
            "INSERT INTO hospede (administrador_id, nome, telefone, email, documento, observacoes) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (hospede.administrador_id, hospede.nome, hospede.telefone, hospede.email, hospede.documento,
             hospede.observacoes))
