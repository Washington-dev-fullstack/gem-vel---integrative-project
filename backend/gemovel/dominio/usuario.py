"""Usuários do Gemóvel: quem administra e quem faz as tarefas (herança, como no banco)."""

from abc import ABC, abstractmethod

from werkzeug.security import check_password_hash, generate_password_hash

from gemovel.dominio.enums import Funcao
from gemovel.dominio.validacao import PREENCHA, Validador
from gemovel.erros import ErroValidacao

SENHA_MINIMA = 8


class Usuario(ABC):
    """Quem entra no Gemóvel. É abstrata: cada pessoa é Administrador ou Funcionario."""

    def __init__(self, *, id=None, nome, email, telefone=None, senha_hash=None, ativo=True):
        v = Validador()
        self._id = id
        self._nome = v.texto("nome", nome, 120)
        self._email = v.email("email", email)
        self._telefone = v.texto("telefone", telefone, 20, obrigatorio=False)
        self._senha_hash = senha_hash
        self._ativo = bool(ativo)
        v.conferir()

    @property
    def id(self):
        return self._id

    @property
    def nome(self):
        return self._nome

    @property
    def email(self):
        return self._email

    @property
    def telefone(self):
        return self._telefone

    @property
    def senha_hash(self):
        return self._senha_hash

    @property
    def ativo(self):
        return self._ativo

    def definir_senha(self, senha):
        """Guarda só o hash da senha (scrypt do werkzeug, o formato dos dados de exemplo)."""
        v = Validador()
        if senha is None or senha == "":
            v.erro("senha", PREENCHA)
        elif len(senha) < SENHA_MINIMA:
            v.erro("senha", f"A senha precisa ter pelo menos {SENHA_MINIMA} caracteres.")
        v.conferir()
        self._senha_hash = generate_password_hash(senha)

    def verificar_senha(self, senha):
        if not self._senha_hash or senha is None:
            return False
        return check_password_hash(self._senha_hash, senha)

    @abstractmethod
    def perfil(self):
        """O valor da coluna perfil: "administrador" ou "funcionario"."""


class Administrador(Usuario):
    """Dono dos imóveis, hóspedes e reservas; organiza a equipe."""

    def perfil(self):
        return "administrador"


class Funcionario(Usuario):
    """Pessoa da equipe de um administrador: faz limpeza ou manutenção."""

    def __init__(self, *, administrador_id, funcao, **dados_do_usuario):
        v = Validador()
        self._administrador_id = v.exigir("administrador_id", administrador_id)
        self._funcao = v.opcao("funcao", funcao, Funcao)
        try:
            super().__init__(**dados_do_usuario)
        except ErroValidacao as erro:
            for campo, mensagem in erro.campos.items():
                v.erro(campo, mensagem)
        v.conferir()

    @property
    def administrador_id(self):
        return self._administrador_id

    @property
    def funcao(self):
        return self._funcao

    def perfil(self):
        return "funcionario"

    def pode_executar(self, tarefa):
        """Pessoa ativa e função igual ao tipo da tarefa (limpeza com limpeza, manutenção com manutenção)."""
        return self._ativo and tarefa.tipo is not None and self._funcao.value == tarefa.tipo.value
