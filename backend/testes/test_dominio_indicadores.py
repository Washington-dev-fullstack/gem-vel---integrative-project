"""Indicadores dos imóveis, sem banco: noites e receita no período, percentual, prontidão,
próxima entrada e reservas futuras."""

import unittest
from datetime import date, datetime
from decimal import Decimal

from gemovel.dominio.enums import StatusReserva, StatusTarefa
from gemovel.dominio.indicadores import (noites_no_periodo, percentual, prontidao, proxima_entrada,
                                         receita_no_periodo, reservas_futuras, resumo_do_mes)
from testes.fabrica import nova_reserva, nova_tarefa, novo_imovel

NOV = (date(2026, 11, 1), date(2026, 11, 30))
AGORA = datetime(2026, 11, 12, 12, 0)  # quinta, 12 nov, meio-dia


def reserva(id, entrada, saida, **mudar):
    return nova_reserva(id=id, data_entrada=date(2026, 11, entrada), data_saida=date(2026, 11, saida), **mudar)


def limpeza(reserva_id, status=StatusTarefa.PENDENTE, **mudar):
    datas = {StatusTarefa.EM_ANDAMENTO: {"iniciada_em": datetime(2026, 11, 12, 11, 30)},
             StatusTarefa.CONCLUIDA: {"iniciada_em": datetime(2026, 11, 12, 11, 30),
                                      "concluida_em": datetime(2026, 11, 12, 13, 0)}}.get(status, {})
    return nova_tarefa(imovel_id=6, reserva_id=reserva_id, status=status, agendada_para=datetime(2026, 11, 12, 11, 0),
                       prazo=datetime(2026, 11, 12, 15, 0), **datas, **mudar)


class TestIndicadores(unittest.TestCase):
    def test_noites_no_periodo(self):
        self.assertEqual(noites_no_periodo(date(2026, 10, 30), date(2026, 11, 3), *NOV), 2)
        self.assertEqual(noites_no_periodo(date(2026, 11, 4), date(2026, 11, 7), *NOV), 3)
        self.assertEqual(noites_no_periodo(date(2026, 10, 1), date(2026, 10, 5), *NOV), 0)
        self.assertEqual(noites_no_periodo(date(2026, 11, 29), date(2026, 12, 2), *NOV), 2)

    def test_receita_no_periodo_divide_pelas_noites(self):
        virada = nova_reserva(data_entrada=date(2026, 10, 30), data_saida=date(2026, 11, 3), valor_total=Decimal("1000.00"))
        self.assertEqual(receita_no_periodo(virada, *NOV), Decimal("500.00"))
        uma_em_nov = nova_reserva(data_entrada=date(2026, 10, 30), data_saida=date(2026, 11, 2), valor_total=Decimal("1000.00"))
        self.assertEqual(receita_no_periodo(uma_em_nov, *NOV), Decimal("333.33"))
        cancelada = nova_reserva(valor_total=Decimal("1000.00"), status=StatusReserva.CANCELADA)
        self.assertEqual(receita_no_periodo(cancelada, *NOV), Decimal("0.00"))

    def test_percentual(self):
        self.assertEqual([percentual(12, 30), percentual(1, 8), percentual(0, 0)], [40, 13, 0])

    def test_prontidao_nos_cinco_estados(self):
        imovel = novo_imovel()
        saiu = reserva(20, 8, 12)  # saiu hoje às 11:00
        self.assertEqual(prontidao(imovel, [saiu, reserva(21, 12, 14)], [], datetime(2026, 11, 12, 16, 0)),
                         {"estado": "hospedes", "ate": date(2026, 11, 14)})
        self.assertEqual(prontidao(imovel, [saiu], [limpeza(20, StatusTarefa.EM_ANDAMENTO)], AGORA), {"estado": "limpando"})
        self.assertEqual(prontidao(imovel, [saiu], [limpeza(20)], AGORA), {"estado": "limpeza_pendente"})
        self.assertEqual(prontidao(imovel, [saiu], [limpeza(20)], datetime(2026, 11, 12, 15, 1)), {"estado": "limpeza_atrasada"})
        self.assertEqual(prontidao(imovel, [saiu], [limpeza(20, StatusTarefa.CONCLUIDA)], AGORA), {"estado": "pronto"})
        self.assertEqual(prontidao(imovel, [], [], AGORA), {"estado": "pronto"})

    def test_prontidao_olha_so_a_ultima_que_saiu_e_ignora_a_cancelada(self):
        imovel = novo_imovel()
        antiga, ultima = reserva(18, 2, 5), reserva(20, 8, 12)
        self.assertEqual(prontidao(imovel, [antiga, ultima], [limpeza(18)], AGORA), {"estado": "pronto"})
        em_curso_cancelada = reserva(22, 11, 14, status=StatusReserva.CANCELADA)
        self.assertEqual(prontidao(imovel, [em_curso_cancelada], [], AGORA), {"estado": "pronto"})

    def test_proxima_entrada(self):
        imovel = novo_imovel()
        reservas = [reserva(20, 10, 14, hospede="Carla"), reserva(21, 20, 22, hospede="Bruno"),
                    reserva(22, 15, 18, hospede="Ana"), reserva(23, 13, 15, hospede="Eva", status=StatusReserva.CANCELADA)]
        self.assertEqual(proxima_entrada(imovel, reservas, AGORA), (datetime(2026, 11, 15, 15, 0), "Ana"))
        self.assertIsNone(proxima_entrada(imovel, reservas[:1], AGORA))

    def test_reservas_futuras_conta_as_em_curso_e_as_que_vem(self):
        imovel = novo_imovel()
        reservas = [reserva(18, 2, 5), reserva(20, 10, 14), reserva(21, 20, 22),
                    reserva(23, 13, 15, status=StatusReserva.CANCELADA), reserva(24, 9, 12)]
        self.assertEqual(reservas_futuras(imovel, reservas, AGORA), 2)  # a de 9 a 12 saiu às 11:00


    def test_resumo_do_mes(self):
        # Dois imóveis ativos em novembro: 60 noites possíveis. O imóvel 9 foi desativado depois.
        ativos = [novo_imovel(id=6), novo_imovel(id=7)]
        reservas = [
            nova_reserva(id=1, data_entrada=date(2026, 10, 30), data_saida=date(2026, 11, 3),
                         valor_total=Decimal("1000.00")),  # 2 das 4 noites em novembro: 500,00
            reserva(2, 10, 13, imovel_id=7, valor_total=Decimal("900.00")),
            reserva(3, 20, 22, imovel_id=9, valor_total=Decimal("400.00")),  # entra na receita, não na ocupação
            reserva(4, 5, 9, valor_total=Decimal("800.00"), status=StatusReserva.CANCELADA),  # não conta
        ]
        self.assertEqual(resumo_do_mes(reservas, ativos, *NOV),
                         {"receita": Decimal("1800.00"), "ocupacao": {"percentual": 8, "noites": 5, "noites_possiveis": 60},
                          "reservas": 3, "diaria_media": Decimal("257.14")})
        self.assertEqual(resumo_do_mes([], ativos, *NOV)["diaria_media"], None)


if __name__ == "__main__":
    unittest.main()
