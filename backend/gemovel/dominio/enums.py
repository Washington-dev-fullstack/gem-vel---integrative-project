"""Enumerações do domínio, com os mesmos valores das colunas ENUM do banco."""

from enum import Enum


class Funcao(Enum):
    LIMPEZA = "limpeza"
    MANUTENCAO = "manutencao"


class TipoTarefa(Enum):
    LIMPEZA = "limpeza"
    MANUTENCAO = "manutencao"


class StatusTarefa(Enum):
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"


class StatusReserva(Enum):
    CONFIRMADA = "confirmada"
    CANCELADA = "cancelada"
