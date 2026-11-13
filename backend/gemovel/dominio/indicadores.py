"""Indicadores dos imóveis: noites e receita num período, percentual, prontidão, próxima entrada e
reservas futuras. Só regras, sem banco: as rotas passam as reservas e as limpezas lidas de uma vez."""

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from gemovel.dominio.enums import StatusReserva, StatusTarefa, TipoTarefa

CENTAVO = Decimal("0.01")


def noites_no_periodo(entrada, saida, inicio, fim):
    """As noites de `entrada` até a véspera de `saida` que caem de `inicio` a `fim`, inclusive."""
    return max((min(saida, fim + timedelta(days=1)) - max(entrada, inicio)).days, 0)


def receita_no_periodo(reserva, inicio, fim):
    """O valor da reserva dividido pelas noites, só das noites do período; cancelada não conta."""
    if reserva.status is StatusReserva.CANCELADA:
        return Decimal("0.00")
    noites = noites_no_periodo(reserva.data_entrada, reserva.data_saida, inicio, fim)
    return (reserva.valor_total * noites / reserva.noites()).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def percentual(parte, todo):
    """Inteiro, arredondado meio para cima; com `todo` zero, 0."""
    if not todo:
        return 0
    return int((Decimal(parte) * 100 / Decimal(todo)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _confirmadas(imovel, reservas):
    return [r for r in reservas if r.imovel_id == imovel.id and r.status is StatusReserva.CONFIRMADA]


def _saida(reserva, imovel):
    return datetime.combine(reserva.data_saida, imovel.horario_saida)


def prontidao(imovel, reservas, limpezas, agora):
    """Com hóspedes (até a saída); senão, a limpeza da saída da última reserva que já saiu diz se
    está limpando, atrasada (R7) ou pendente; sem limpeza aberta, pronto."""
    confirmadas = _confirmadas(imovel, reservas)
    em_curso = next((r for r in confirmadas if r.situacao(agora, imovel) == "em_curso"), None)
    if em_curso is not None:
        return {"estado": "hospedes", "ate": em_curso.data_saida}
    sairam = [r for r in confirmadas if _saida(r, imovel) <= agora]
    if not sairam:
        return {"estado": "pronto"}
    ultima = max(sairam, key=lambda r: (r.data_saida, r.id or 0))
    limpeza = next((t for t in limpezas if t.reserva_id == ultima.id and t.tipo is TipoTarefa.LIMPEZA), None)
    if limpeza is None or limpeza.status is StatusTarefa.CONCLUIDA:
        return {"estado": "pronto"}
    if limpeza.status is StatusTarefa.EM_ANDAMENTO:
        return {"estado": "limpando"}
    return {"estado": "limpeza_atrasada" if limpeza.esta_atrasada(agora) else "limpeza_pendente"}


def proxima_entrada(imovel, reservas, agora):
    """(data e hora da entrada, hóspede) da próxima reserva confirmada que ainda não entrou, ou None."""
    futuras = [(datetime.combine(r.data_entrada, imovel.horario_entrada), r) for r in _confirmadas(imovel, reservas)]
    futuras = [(quando, r) for quando, r in futuras if quando > agora]
    if not futuras:
        return None
    quando, reserva = min(futuras, key=lambda par: (par[0], par[1].id or 0))
    return quando, reserva.hospede


def reservas_futuras(imovel, reservas, agora):
    """As confirmadas que ainda não saíram: as em curso e as que vêm (impedem desativar o imóvel)."""
    return sum(1 for r in _confirmadas(imovel, reservas) if _saida(r, imovel) > agora)


def resumo_do_mes(reservas, imoveis_ativos, inicio, fim):
    """Os indicadores da visão geral (decisão 5): a receita (as noites do mês de cada reserva), a
    ocupação dos imóveis ativos, quantas reservas cruzam o mês e a diária média (receita ÷ noites
    vendidas no mês). A cancelada não conta; a de um imóvel já desativado entra na receita, nas
    reservas e na diária média, mas não na ocupação, que só conta os imóveis ativos."""
    no_mes = [(r, noites_no_periodo(r.data_entrada, r.data_saida, inicio, fim))
              for r in reservas if r.status is not StatusReserva.CANCELADA]
    no_mes = [(r, noites) for r, noites in no_mes if noites > 0]
    receita = sum((receita_no_periodo(r, inicio, fim) for r, _ in no_mes), Decimal("0.00"))
    vendidas = sum(noites for _, noites in no_mes)
    ativos = {imovel.id for imovel in imoveis_ativos}
    ocupadas = sum(noites for r, noites in no_mes if r.imovel_id in ativos)
    possiveis = len(ativos) * ((fim - inicio).days + 1)
    return {"receita": receita,
            "ocupacao": {"percentual": percentual(ocupadas, possiveis), "noites": ocupadas,
                         "noites_possiveis": possiveis},
            "reservas": len(no_mes),
            "diaria_media": (receita / vendidas).quantize(CENTAVO, rounding=ROUND_HALF_UP) if vendidas else None}
