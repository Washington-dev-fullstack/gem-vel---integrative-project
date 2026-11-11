"""Objetos de domínio válidos para os testes, sem banco. Cada função aceita mudanças nos campos."""

from decimal import Decimal

from gemovel.dominio.imovel import Imovel
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


def novo_imovel(**mudar):
    """O Apto Jardins dos dados de exemplo, com os horários padrão (15:00 e 11:00)."""
    dados = dict(id=6, administrador_id=1, nome="Apto Jardins", logradouro="Rua Haddock Lobo",
                 numero="900", complemento="ap. 33", bairro="Jardins", cidade="São Paulo",
                 uf="SP", cep="01414-001", capacidade=4, valor_diaria=Decimal("450.00"))
    dados.update(mudar)
    return Imovel(**dados)
