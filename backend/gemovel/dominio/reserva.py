"""Reserva de um imóvel: datas sem conflito (R1), valor (R2) e a limpeza da saída (R4)."""

from datetime import datetime

from gemovel.dominio.enums import StatusReserva, TipoTarefa
from gemovel.dominio.tarefa import Tarefa
from gemovel.dominio.validacao import CENTAVO, PREENCHA, TEXTO_LONGO, Validador, dinheiro
from gemovel.erros import ErroValidacao


class Reserva:
    """Uma estadia: a saída é exclusiva, então sair e entrar no mesmo dia não conflita."""

    def __init__(self, *, id=None, imovel_id, hospede_id, data_entrada, data_saida, num_hospedes,
                 valor_diaria, valor_total=None, status=StatusReserva.CONFIRMADA, observacoes=None,
                 imovel=None, hospede=None):
        v = Validador()
        self._id = id
        self._imovel_id = v.exigir("imovel_id", imovel_id)
        self._hospede_id = v.exigir("hospede_id", hospede_id)
        self._data_entrada = v.exigir("data_entrada", data_entrada)
        self._data_saida = v.exigir("data_saida", data_saida)
        if (self._data_entrada is not None and self._data_saida is not None
                and not self._data_saida > self._data_entrada):
            v.erro("data_saida", "A saída precisa ser depois da entrada.")
        self._num_hospedes = _ler_num_hospedes(v, num_hospedes)
        self._valor_diaria = dinheiro(v, "valor_diaria", valor_diaria)
        if self._valor_diaria is not None and self._valor_diaria <= 0:
            v.erro("valor_diaria", "Use um valor maior que zero.")
        self._valor_total = None
        if valor_total is not None:
            self._valor_total = dinheiro(v, "valor_total", valor_total)
            if self._valor_total is not None and self._valor_total < 0:
                v.erro("valor_total", "O total não pode ser negativo.")
        self._status = v.opcao("status", status, StatusReserva)
        self._observacoes = v.texto("observacoes", observacoes, TEXTO_LONGO, obrigatorio=False)
        self._imovel = imovel
        self._hospede = hospede
        v.conferir()
        if self._valor_total is None:
            self._valor_total = self.calcular_total()

    @property
    def id(self):
        return self._id

    @property
    def imovel_id(self):
        return self._imovel_id

    @property
    def hospede_id(self):
        return self._hospede_id

    @property
    def data_entrada(self):
        return self._data_entrada

    @property
    def data_saida(self):
        return self._data_saida

    @property
    def num_hospedes(self):
        return self._num_hospedes

    @property
    def valor_diaria(self):
        return self._valor_diaria

    @property
    def valor_total(self):
        return self._valor_total

    @property
    def status(self):
        return self._status

    @property
    def observacoes(self):
        return self._observacoes

    @property
    def imovel(self):
        return self._imovel

    @property
    def hospede(self):
        return self._hospede

    def noites(self):
        return (self._data_saida - self._data_entrada).days

    def calcular_total(self):
        """Diária gravada na reserva × noites (R2)."""
        return (self._valor_diaria * self.noites()).quantize(CENTAVO)

    def conflita_com(self, entrada, saida):
        """Só a reserva confirmada ocupa as datas (R1)."""
        return (self._status is StatusReserva.CONFIRMADA
                and self._data_entrada < saida and entrada < self._data_saida)

    def situacao(self, agora, imovel):
        """futura antes da entrada (no horário de entrada), em_curso até a saída (no horário de saída)."""
        if self._status is StatusReserva.CANCELADA:
            return "cancelada"
        if agora < datetime.combine(self._data_entrada, imovel.horario_entrada):
            return "futura"
        if agora < datetime.combine(self._data_saida, imovel.horario_saida):
            return "em_curso"
        return "concluida"

    def cancelar(self):
        if self._status is StatusReserva.CANCELADA:
            raise ErroValidacao({"status": "Esta reserva já está cancelada."})
        self._status = StatusReserva.CANCELADA

    def criar_limpeza_de_saida(self, imovel):
        """A limpeza do dia da saída, do horário de saída ao de entrada, sem responsável (R4)."""
        return Tarefa(imovel_id=self._imovel_id, tipo=TipoTarefa.LIMPEZA, titulo="Limpeza de saída",
                      reserva_id=self._id,
                      agendada_para=datetime.combine(self._data_saida, imovel.horario_saida),
                      prazo=datetime.combine(self._data_saida, imovel.horario_entrada))


def _ler_num_hospedes(v, num_hospedes):
    if num_hospedes is None:
        v.erro("num_hospedes", PREENCHA)
    elif isinstance(num_hospedes, bool) or not isinstance(num_hospedes, int):
        v.erro("num_hospedes", "Número inválido.")
    elif num_hospedes < 1:
        v.erro("num_hospedes", "Use pelo menos 1 hóspede.")
    return num_hospedes
