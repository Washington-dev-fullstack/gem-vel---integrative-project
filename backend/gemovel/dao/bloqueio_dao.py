"""DAO dos bloqueios: datas em que o imóvel não recebe reservas (obra, manutenção, uso do dono)."""

from gemovel.dao.base import DAOBase
from gemovel.dominio.bloqueio import Bloqueio

COLUNAS_BLOQUEIO = ("id", "imovel_id", "data_inicio", "data_fim", "motivo")

_SELECT = "SELECT " + ", ".join(COLUNAS_BLOQUEIO) + " FROM bloqueio"


def bloqueio_da_linha(linha):
    return Bloqueio(**{coluna: linha[coluna] for coluna in COLUNAS_BLOQUEIO})


class BloqueioDAO(DAOBase):
    def _para_objeto(self, linha):
        return bloqueio_da_linha(linha)

    def listar_por_imovel(self, imovel_id):
        linhas = self._consultar(_SELECT + " WHERE imovel_id = %s ORDER BY data_inicio, id", (imovel_id,))
        return [self._para_objeto(linha) for linha in linhas]

    def buscar_por_id(self, id):
        linhas = self._consultar(_SELECT + " WHERE id = %s", (id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def inserir(self, bloqueio):
        """Grava o bloqueio e devolve o id dele."""
        return self._executar("INSERT INTO bloqueio (imovel_id, data_inicio, data_fim, motivo) VALUES (%s, %s, %s, %s)",
                              (bloqueio.imovel_id, bloqueio.data_inicio, bloqueio.data_fim, bloqueio.motivo))

    def listar_por_periodo(self, administrador_id, inicio, fim):
        """Os bloqueios dos imóveis do administrador com ao menos uma noite de `inicio` a `fim`."""
        linhas = self._consultar(
            "SELECT b.id, b.imovel_id, b.data_inicio, b.data_fim, b.motivo FROM bloqueio b "
            "JOIN imovel i ON i.id = b.imovel_id WHERE i.administrador_id = %s AND b.data_inicio <= %s "
            "AND b.data_fim > %s ORDER BY b.data_inicio, b.id", (administrador_id, fim, inicio))
        return [self._para_objeto(linha) for linha in linhas]

    def excluir(self, id):
        self._executar("DELETE FROM bloqueio WHERE id = %s", (id,))
