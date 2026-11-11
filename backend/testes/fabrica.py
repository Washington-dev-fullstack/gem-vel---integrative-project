"""Objetos de domínio válidos para os testes, sem banco. Cada função aceita mudanças nos campos."""

from datetime import date, datetime
from decimal import Decimal

from gemovel.dominio.imovel import Imovel
from gemovel.dominio.reserva import Reserva
from gemovel.dominio.tarefa import Tarefa
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


def nova_tarefa(**mudar):
    """A limpeza de saída da Cobertura Moema: 5 nov 2026, das 11:00 às 15:00, sem reserva."""
    dados = dict(id=5, imovel_id=2, tipo="limpeza", titulo="Limpeza de saída",
                 agendada_para=datetime(2026, 11, 5, 11, 0), prazo=datetime(2026, 11, 5, 15, 0))
    dados.update(mudar)
    return Tarefa(**dados)


def nova_reserva(**mudar):
    """A reserva da Carla no Apto Jardins: de 7 a 11 nov 2026, 2 hóspedes, diária de 450,00."""
    dados = dict(id=12, imovel_id=6, hospede_id=12, data_entrada=date(2026, 11, 7),
                 data_saida=date(2026, 11, 11), num_hospedes=2, valor_diaria=Decimal("450.00"))
    dados.update(mudar)
    return Reserva(**dados)
