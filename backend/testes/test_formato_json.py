"""Formato do JSON da API: datas, horários, dinheiro, enumerações e códigos (sem banco)."""

import unittest
from datetime import date, datetime, time
from decimal import Decimal

from app import criar_app
from gemovel.dominio.enums import StatusTarefa
from gemovel.rotas.formato_json import codigo_imovel, codigo_reserva
from testes.apoio import SEGREDO_DE_TESTE


class TestFormatoJson(unittest.TestCase):
    def test_provedor_formata_datas_horas_e_dinheiro(self):
        texto = criar_app(segredo=SEGREDO_DE_TESTE).json.dumps({
            "z": Decimal("1620"), "a": date(2026, 11, 8), "h": time(15, 0),
            "dh": datetime(2026, 11, 8, 15, 0, 42), "s": StatusTarefa.EM_ANDAMENTO, "n": "Chalé"})
        self.assertEqual(texto, '{"z": "1620.00", "a": "2026-11-08", "h": "15:00", '
                                '"dh": "2026-11-08T15:00", "s": "em_andamento", "n": "Chalé"}')

    def test_codigos(self):
        self.assertEqual((codigo_imovel(6), codigo_reserva(12)), ("IMV-006", "RSV-0012"))


if __name__ == "__main__":
    unittest.main()
