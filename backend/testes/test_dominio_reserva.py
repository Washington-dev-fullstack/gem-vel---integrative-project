"""Domínio: reserva (noites e total, conflito de datas, situação, cancelamento e limpeza da saída), sem banco."""

import unittest
from datetime import date, datetime, time
from decimal import Decimal

from gemovel.dominio.enums import StatusReserva, StatusTarefa, TipoTarefa
from gemovel.dominio.reserva import Reserva
from gemovel.erros import ErroValidacao
from testes.fabrica import nova_reserva, novo_imovel


class TestReserva(unittest.TestCase):
    def test_noites_e_total(self):
        r = nova_reserva()
        self.assertIsInstance(r, Reserva)
        self.assertEqual((r.noites(), r.calcular_total(), r.valor_total),
                         (4, Decimal("1800.00"), Decimal("1800.00")))
        self.assertEqual(nova_reserva(valor_total=Decimal("1620.00")).valor_total, Decimal("1620.00"))

    def test_sair_e_entrar_no_mesmo_dia_nao_conflita(self):  # reserva de 7 a 11 nov
        r = nova_reserva()
        self.assertFalse(r.conflita_com(date(2026, 11, 11), date(2026, 11, 13)))
        self.assertFalse(r.conflita_com(date(2026, 11, 5), date(2026, 11, 7)))
        for entrada, saida in ((10, 12), (8, 9), (6, 12)):
            self.assertTrue(r.conflita_com(date(2026, 11, entrada), date(2026, 11, saida)))

    def test_reserva_cancelada_nao_conflita(self):
        self.assertFalse(nova_reserva(status="cancelada").conflita_com(date(2026, 11, 8), date(2026, 11, 9)))

    def test_situacao_usa_os_horarios_do_imovel(self):  # entrada às 15:00, saída às 11:00
        casos = {datetime(2026, 11, 7, 14, 59): "futura", datetime(2026, 11, 7, 15, 0): "em_curso",
                 datetime(2026, 11, 11, 10, 59): "em_curso", datetime(2026, 11, 11, 11, 0): "concluida"}
        for agora, esperado in casos.items():
            self.assertEqual(nova_reserva().situacao(agora, novo_imovel()), esperado)
        self.assertEqual(nova_reserva(status="cancelada").situacao(datetime(2026, 11, 8), novo_imovel()),
                         "cancelada")

    def test_cancelar_duas_vezes_e_erro(self):
        r = nova_reserva()
        r.cancelar()
        self.assertEqual(r.status, StatusReserva.CANCELADA)
        with self.assertRaises(ErroValidacao) as c:
            r.cancelar()
        self.assertEqual(c.exception.campos, {"status": "Esta reserva já está cancelada."})

    def test_limpeza_de_saida_usa_os_horarios_do_imovel(self):
        t = nova_reserva().criar_limpeza_de_saida(
            novo_imovel(horario_entrada=time(14, 0), horario_saida=time(10, 0)))
        self.assertEqual((t.tipo, t.titulo, t.imovel_id, t.reserva_id, t.funcionario_id, t.status),
                         (TipoTarefa.LIMPEZA, "Limpeza de saída", 6, 12, None, StatusTarefa.PENDENTE))
        self.assertEqual((t.agendada_para, t.prazo),
                         (datetime(2026, 11, 11, 10, 0), datetime(2026, 11, 11, 14, 0)))

    def test_validacao(self):
        casos = [(dict(data_saida=date(2026, 11, 7), num_hospedes=0),
                  {"data_saida": "A saída precisa ser depois da entrada.",
                   "num_hospedes": "Use pelo menos 1 hóspede."}),
                 (dict(valor_total=Decimal("-1")), {"valor_total": "O total não pode ser negativo."})]
        for mudar, campos in casos:
            with self.assertRaises(ErroValidacao) as c:
                nova_reserva(**mudar)
            self.assertEqual(c.exception.campos, campos)


if __name__ == "__main__":
    unittest.main()
