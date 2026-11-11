"""Bloqueio de datas de um imóvel (manutenção, uso do dono...)."""

from gemovel.dominio.validacao import Validador


class Bloqueio:
    """Datas em que o imóvel não recebe reservas. O fim é exclusivo, como a saída da reserva."""

    def __init__(self, *, id=None, imovel_id, data_inicio, data_fim, motivo):
        v = Validador()
        self._id = id
        self._imovel_id = v.exigir("imovel_id", imovel_id)
        self._data_inicio = v.exigir("data_inicio", data_inicio)
        self._data_fim = v.exigir("data_fim", data_fim)
        if (self._data_inicio is not None and self._data_fim is not None
                and not self._data_fim > self._data_inicio):
            v.erro("data_fim", "O fim precisa ser depois do início.")
        self._motivo = v.texto("motivo", motivo, 120)
        v.conferir()

    @property
    def id(self):
        return self._id

    @property
    def imovel_id(self):
        return self._imovel_id

    @property
    def data_inicio(self):
        return self._data_inicio

    @property
    def data_fim(self):
        return self._data_fim

    @property
    def motivo(self):
        return self._motivo

    def conflita_com(self, entrada, saida):
        """Mesma regra das reservas (R1): sair e entrar no mesmo dia não conflita."""
        return self._data_inicio < saida and entrada < self._data_fim
