"""Formato do JSON da API: o provedor do app converte datas, horários, dinheiro e
enumerações num lugar só, e as funções <assunto>_json montam cada objeto da resposta."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum

from flask.json.provider import DefaultJSONProvider


class ProvedorJson(DefaultJSONProvider):
    """Acentos legíveis, campos na ordem em que foram montados e os formatos da spec §6."""

    ensure_ascii = False
    sort_keys = False

    @staticmethod
    def default(valor):
        if isinstance(valor, datetime):  # antes de date: datetime também é date
            return valor.strftime("%Y-%m-%dT%H:%M")
        if isinstance(valor, date):
            return valor.isoformat()
        if isinstance(valor, time):
            return valor.strftime("%H:%M")
        if isinstance(valor, Decimal):
            return f"{valor:.2f}"
        if isinstance(valor, Enum):
            return valor.value
        return DefaultJSONProvider.default(valor)


def codigo_imovel(id):
    return f"IMV-{id:03d}"


def codigo_reserva(id):
    return f"RSV-{id:04d}"
