"""Leitura dos pedidos: o corpo em JSON, o tipo de cada campo e os parâmetros do endereço.

O Leitor só confere o formato (texto no lugar de número, data mal escrita). As regras
de cada campo ficam no domínio, que recebe os valores já convertidos.
"""

import re
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation

from flask import request

from gemovel.dominio.validacao import Validador
from gemovel.erros import ErroValidacao, PedidoInvalido

_DATA = re.compile(r"\d{4}-\d{2}-\d{2}")
_HORARIO = re.compile(r"\d{2}:\d{2}")
_DATA_HORA = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")
_INTEIRO = re.compile(r"[0-9]+")
_MES = re.compile(r"(\d{4})-(\d{2})")

# O dinheiro cabe numa coluna DECIMAL(10,2).
LIMITE_DINHEIRO = Decimal("100000000")


def corpo_json():
    """O corpo do pedido, que precisa ser um objeto JSON com Content-Type application/json."""
    if not request.is_json:
        raise PedidoInvalido()
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        raise PedidoInvalido()
    return dados


def _vazio(valor):
    return valor is None or valor == ""


class Leitor:
    """Lê os campos de um pedido e junta os erros de formato; conferir() levanta todos de uma vez."""

    def __init__(self, dados):
        self._dados = dados
        self._v = Validador()

    def conferir(self):
        self._v.conferir()

    def texto(self, campo):
        valor = self._dados.get(campo)
        if valor is None or isinstance(valor, str):
            return valor
        self._v.erro(campo, "Valor inválido.")
        return None

    def inteiro(self, campo, padrao=None):
        valor = self._dados.get(campo)
        if _vazio(valor):
            return padrao
        if isinstance(valor, int) and not isinstance(valor, bool):
            return valor
        if isinstance(valor, str) and _INTEIRO.fullmatch(valor):
            return int(valor)
        self._v.erro(campo, "Número inválido.")
        return None

    def dinheiro(self, campo):
        valor = self._dados.get(campo)
        if _vazio(valor):
            return None
        quantia = None
        if isinstance(valor, (int, float, str)) and not isinstance(valor, bool):
            try:
                quantia = Decimal(str(valor))
            except InvalidOperation:
                quantia = None
        if (quantia is not None and quantia.is_finite() and quantia.as_tuple().exponent >= -2
                and quantia < LIMITE_DINHEIRO):
            return quantia
        self._v.erro(campo, "Valor inválido.")
        return None

    def data(self, campo):
        return self._ler(campo, _DATA, date.fromisoformat, "Data inválida.")

    def horario(self, campo, padrao=None):
        return self._ler(campo, _HORARIO, time.fromisoformat, "Horário inválido.", padrao)

    def data_hora(self, campo):
        return self._ler(campo, _DATA_HORA, datetime.fromisoformat, "Data inválida.")

    def objeto(self, campo):
        valor = self._dados.get(campo)
        if _vazio(valor):
            return None
        if isinstance(valor, dict):
            return valor
        self._v.erro(campo, "Valor inválido.")
        return None

    def _ler(self, campo, formato, converter, mensagem, padrao=None):
        valor = self._dados.get(campo)
        if _vazio(valor):
            return padrao
        if isinstance(valor, str) and formato.fullmatch(valor):
            try:
                return converter(valor)
            except ValueError:
                pass
        self._v.erro(campo, mensagem)
        return None


def parametro_data(nome, padrao):
    """Um parâmetro do endereço no formato 2026-11-08; ausente ou vazio dá o padrão."""
    valor = request.args.get(nome, "")
    if valor == "":
        return padrao
    if _DATA.fullmatch(valor):
        try:
            return date.fromisoformat(valor)
        except ValueError:
            pass
    raise ErroValidacao({nome: "Data inválida."})


def parametro_inteiro(nome, padrao, minimo, maximo):
    """Um número inteiro do endereço, de `minimo` a `maximo`; ausente ou vazio dá o padrão."""
    valor = request.args.get(nome, "")
    if valor == "":
        return padrao
    if _INTEIRO.fullmatch(valor) and minimo <= int(valor) <= maximo:
        return int(valor)
    raise ErroValidacao({nome: f"Use um número de {minimo} a {maximo}."})


def parametro_mes(nome, padrao):
    """O dia 1 do mês de um parâmetro no formato 2026-11 (de 1900 a 2999); ausente ou vazio dá o padrão."""
    valor = request.args.get(nome, "")
    if valor == "":
        return padrao
    formato = _MES.fullmatch(valor)
    if formato and 1900 <= int(formato[1]) <= 2999 and 1 <= int(formato[2]) <= 12:
        return date(int(formato[1]), int(formato[2]), 1)
    raise ErroValidacao({nome: "Mês inválido."})
