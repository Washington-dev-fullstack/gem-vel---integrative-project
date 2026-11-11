"""Imóvel de aluguel por temporada, com as regras de valor (R2) e de capacidade (R3)."""

import re
from datetime import time

from gemovel.dominio.validacao import CENTAVO, PREENCHA, TEXTO_LONGO, Validador, dinheiro, limpar

UFS = ("AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
       "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO")

_CEP = re.compile(r"^\d{5}-\d{3}$")
_CEP_SO_DIGITOS = re.compile(r"^\d{8}$")
CAPACIDADE_MAXIMA = 255


class Imovel:
    """Um imóvel do administrador. É desativado (ativo = False), nunca apagado."""

    def __init__(self, *, id=None, administrador_id, nome, logradouro, numero, complemento=None,
                 bairro, cidade, uf, cep=None, capacidade=2, valor_diaria,
                 horario_entrada=time(15, 0), horario_saida=time(11, 0), observacoes=None, ativo=True):
        v = Validador()
        self._id = id
        self._administrador_id = v.exigir("administrador_id", administrador_id)
        self._nome = v.texto("nome", nome, 100)
        self._logradouro = v.texto("logradouro", logradouro, 150)
        self._numero = v.texto("numero", numero, 10)
        self._complemento = v.texto("complemento", complemento, 60, obrigatorio=False)
        self._bairro = v.texto("bairro", bairro, 80)
        self._cidade = v.texto("cidade", cidade, 80)
        self._uf = _ler_uf(v, uf)
        self._cep = _ler_cep(v, cep)
        self._capacidade = _ler_capacidade(v, capacidade)
        self._valor_diaria = dinheiro(v, "valor_diaria", valor_diaria)
        if self._valor_diaria is not None and self._valor_diaria <= 0:
            v.erro("valor_diaria", "Use um valor maior que zero.")
        self._horario_entrada = v.exigir("horario_entrada", horario_entrada)
        self._horario_saida = v.exigir("horario_saida", horario_saida)
        if (self._horario_entrada is not None and self._horario_saida is not None
                and not self._horario_saida < self._horario_entrada):
            v.erro("horario_saida", "A saída precisa ser antes da entrada, para caber a limpeza.")
        self._observacoes = v.texto("observacoes", observacoes, TEXTO_LONGO, obrigatorio=False)
        self._ativo = bool(ativo)
        v.conferir()

    @property
    def id(self):
        return self._id

    @property
    def administrador_id(self):
        return self._administrador_id

    @property
    def nome(self):
        return self._nome

    @property
    def logradouro(self):
        return self._logradouro

    @property
    def numero(self):
        return self._numero

    @property
    def complemento(self):
        return self._complemento

    @property
    def bairro(self):
        return self._bairro

    @property
    def cidade(self):
        return self._cidade

    @property
    def uf(self):
        return self._uf

    @property
    def cep(self):
        return self._cep

    @property
    def capacidade(self):
        return self._capacidade

    @property
    def valor_diaria(self):
        return self._valor_diaria

    @property
    def horario_entrada(self):
        return self._horario_entrada

    @property
    def horario_saida(self):
        return self._horario_saida

    @property
    def observacoes(self):
        return self._observacoes

    @property
    def ativo(self):
        return self._ativo

    def endereco_completo(self):
        """"logradouro, número[, complemento] · bairro, cidade/UF"."""
        rua = f"{self._logradouro}, {self._numero}"
        if self._complemento:
            rua += f", {self._complemento}"
        return f"{rua} · {self._bairro}, {self._cidade}/{self._uf}"

    def calcular_valor(self, entrada, saida):
        """Diária × noites (R2)."""
        return (self._valor_diaria * (saida - entrada).days).quantize(CENTAVO)

    def comporta(self, num_hospedes):
        """De 1 hóspede até a capacidade (R3)."""
        return 1 <= num_hospedes <= self._capacidade


def _ler_uf(v, uf):
    uf = limpar(uf)
    if uf is None:
        v.erro("uf", PREENCHA)
        return None
    uf = str(uf).upper()
    if uf not in UFS:
        v.erro("uf", "Escolha uma das opções.")
    return uf


def _ler_cep(v, cep):
    cep = limpar(cep)
    if cep is None:
        return None
    cep = str(cep)
    if _CEP_SO_DIGITOS.match(cep):
        return f"{cep[:5]}-{cep[5:]}"
    if not _CEP.match(cep):
        v.erro("cep", "Use o formato 00000-000.")
    return cep


def _ler_capacidade(v, capacidade):
    if capacidade is None:
        v.erro("capacidade", PREENCHA)
        return None
    if isinstance(capacidade, bool) or not isinstance(capacidade, int) \
            or not 1 <= capacidade <= CAPACIDADE_MAXIMA:
        v.erro("capacidade", f"Use um número de 1 a {CAPACIDADE_MAXIMA}.")
    return capacidade
