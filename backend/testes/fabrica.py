"""Objetos de domínio válidos para os testes, sem banco. Cada função aceita mudanças nos campos."""

from gemovel.dominio.usuario import Administrador, Funcionario


def novo_admin(**mudar):
    dados = dict(id=1, nome="Marina Alves", email="marina@gemovel.test")
    dados.update(mudar)
    return Administrador(**dados)


def novo_funcionario(**mudar):
    dados = dict(id=3, nome="Cida Ramos", email="cida@gemovel.test",
                 administrador_id=1, funcao="limpeza")
    dados.update(mudar)
    return Funcionario(**dados)
