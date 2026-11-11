"""Validação dos campos do domínio: o Validador junta os erros de todos os campos
e levanta um ErroValidacao só, com a primeira mensagem de cada campo."""

import re

from gemovel.erros import ErroValidacao

# Limite das observações e descrições (colunas TEXT).
TEXTO_LONGO = 2000

PREENCHA = "Preencha este campo."
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def limpar(valor):
    """Tira os espaços das pontas do texto; o texto vazio vira None."""
    if isinstance(valor, str):
        valor = valor.strip()
        return valor or None
    return valor


class Validador:
    """Confere os campos um a um e guarda a primeira mensagem de cada campo."""

    def __init__(self):
        self._erros = {}

    def erro(self, campo, mensagem):
        self._erros.setdefault(campo, mensagem)

    def tem_erro(self, campo):
        return campo in self._erros

    def conferir(self):
        if self._erros:
            raise ErroValidacao(self._erros)

    def exigir(self, campo, valor):
        if valor is None:
            self.erro(campo, PREENCHA)
        return valor

    def texto(self, campo, valor, maximo, obrigatorio=True):
        valor = limpar(valor)
        if valor is None:
            if obrigatorio:
                self.erro(campo, PREENCHA)
            return None
        valor = str(valor)
        if len(valor) > maximo:
            self.erro(campo, f"Use até {maximo} caracteres.")
        return valor

    def email(self, campo, valor, obrigatorio=True):
        valor = self.texto(campo, valor, 160, obrigatorio)
        if valor is None or self.tem_erro(campo):
            return valor
        valor = valor.lower()
        if not _EMAIL.match(valor):
            self.erro(campo, "E-mail inválido.")
        return valor

    def opcao(self, campo, valor, enumeracao):
        if isinstance(valor, enumeracao):
            return valor
        valor = limpar(valor)
        if valor is None:
            self.erro(campo, PREENCHA)
            return None
        try:
            return enumeracao(valor)
        except ValueError:
            self.erro(campo, "Escolha uma das opções.")
            return None
