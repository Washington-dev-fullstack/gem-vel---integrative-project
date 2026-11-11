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
