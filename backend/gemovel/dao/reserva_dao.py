"""DAO das reservas. A reserva vem sempre com o imóvel e o hóspede, juntados na mesma consulta."""

from gemovel.dao.base import DAOBase, colunas, sem_prefixo
from gemovel.dao.hospede_dao import COLUNAS_HOSPEDE, hospede_da_linha
from gemovel.dao.imovel_dao import COLUNAS_IMOVEL, imovel_da_linha
from gemovel.dominio.reserva import Reserva

COLUNAS_RESERVA = ("id", "imovel_id", "hospede_id", "data_entrada", "data_saida", "num_hospedes", "valor_diaria",
                   "valor_total", "status", "observacoes")

_SELECT = ("SELECT " + colunas("r", COLUNAS_RESERVA) + ", " + colunas("i", COLUNAS_IMOVEL, "i_") + ", "
           + colunas("h", COLUNAS_HOSPEDE, "h_")
           + " FROM reserva r JOIN imovel i ON i.id = r.imovel_id JOIN hospede h ON h.id = r.hospede_id")


def reserva_da_linha(linha, imovel=None, hospede=None):
    return Reserva(**{coluna: linha[coluna] for coluna in COLUNAS_RESERVA}, imovel=imovel, hospede=hospede)


class ReservaDAO(DAOBase):
    def _para_objeto(self, linha):
        return reserva_da_linha(linha, imovel_da_linha(sem_prefixo(linha, "i_")),
                                hospede_da_linha(sem_prefixo(linha, "h_")))

    def buscar_por_id(self, id):
        linhas = self._consultar(_SELECT + " WHERE r.id = %s", (id,))
        return self._para_objeto(linhas[0]) if linhas else None
