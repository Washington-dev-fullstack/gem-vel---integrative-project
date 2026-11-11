"""Hóspede de um administrador."""

from gemovel.dominio.validacao import TEXTO_LONGO, Validador


class Hospede:
    """Quem se hospeda. Só o nome é obrigatório."""

    def __init__(self, *, id=None, administrador_id, nome, telefone=None, email=None,
                 documento=None, observacoes=None):
        v = Validador()
        self._id = id
        self._administrador_id = v.exigir("administrador_id", administrador_id)
        self._nome = v.texto("nome", nome, 120)
        self._telefone = v.texto("telefone", telefone, 20, obrigatorio=False)
        self._email = v.email("email", email, obrigatorio=False)
        self._documento = v.texto("documento", documento, 20, obrigatorio=False)
        self._observacoes = v.texto("observacoes", observacoes, TEXTO_LONGO, obrigatorio=False)
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
    def telefone(self):
        return self._telefone

    @property
    def email(self):
        return self._email

    @property
    def documento(self):
        return self._documento

    @property
    def observacoes(self):
        return self._observacoes
