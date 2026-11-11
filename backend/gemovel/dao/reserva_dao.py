"""DAO das reservas. A reserva vem sempre com o imóvel e o hóspede, juntados na mesma consulta."""

from gemovel.dao.base import DAOBase, colunas, sem_prefixo
from gemovel.dao.bloqueio_dao import COLUNAS_BLOQUEIO, bloqueio_da_linha
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

    def listar_por_periodo(self, administrador_id, inicio, fim):
        """As reservas do administrador que tocam o período (as canceladas também), por entrada."""
        linhas = self._consultar(_SELECT + " WHERE i.administrador_id = %s AND r.data_entrada <= %s"
                                 " AND r.data_saida > %s ORDER BY r.data_entrada, r.id", (administrador_id, fim, inicio))
        return [self._para_objeto(linha) for linha in linhas]

    def buscar_conflito(self, imovel_id, entrada, saida, ignorar_id=None):
        """O que já ocupa as datas no imóvel: primeiro a reserva confirmada que cruza o período,
        depois o bloqueio. Sair e entrar no mesmo dia não cruza (R1); a cancelada não ocupa nada."""
        sql = (_SELECT + " WHERE r.imovel_id = %s AND r.status = 'confirmada'"
               " AND r.data_entrada < %s AND %s < r.data_saida")
        parametros = [imovel_id, saida, entrada]
        if ignorar_id is not None:
            sql += " AND r.id <> %s"
            parametros.append(ignorar_id)
        linhas = self._consultar(sql + " ORDER BY r.data_entrada, r.id LIMIT 1", tuple(parametros))
        if linhas:
            return self._para_objeto(linhas[0])
        linhas = self._consultar("SELECT " + ", ".join(COLUNAS_BLOQUEIO) + " FROM bloqueio"
                                 " WHERE imovel_id = %s AND data_inicio < %s AND %s < data_fim"
                                 " ORDER BY data_inicio, id LIMIT 1", (imovel_id, saida, entrada))
        return bloqueio_da_linha(linhas[0]) if linhas else None

    def existe_conflito(self, imovel_id, entrada, saida, ignorar_id=None):
        return self.buscar_conflito(imovel_id, entrada, saida, ignorar_id) is not None

    def inserir(self, reserva):
        """Grava a reserva e devolve o id dela."""
        return self._executar(
            "INSERT INTO reserva (imovel_id, hospede_id, data_entrada, data_saida, num_hospedes, valor_diaria, "
            "valor_total, status, observacoes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (reserva.imovel_id, reserva.hospede_id, reserva.data_entrada, reserva.data_saida, reserva.num_hospedes,
             reserva.valor_diaria, reserva.valor_total, reserva.status.value, reserva.observacoes))
