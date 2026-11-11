"""Formato do JSON da API: datas, horários, dinheiro, enumerações e códigos (sem banco)."""

import unittest
from datetime import date, datetime, time
from decimal import Decimal

from app import criar_app
from gemovel.dominio.bloqueio import Bloqueio
from gemovel.dominio.enums import StatusTarefa
from gemovel.dominio.hospede import Hospede
from gemovel.rotas.formato_json import codigo_imovel, codigo_reserva, frase_conflito, periodo
from testes.apoio import SEGREDO_DE_TESTE
from testes.fabrica import nova_reserva


class TestFormatoJson(unittest.TestCase):
    def test_provedor_formata_datas_horas_e_dinheiro(self):
        texto = criar_app(segredo=SEGREDO_DE_TESTE).json.dumps({
            "z": Decimal("1620"), "a": date(2026, 11, 8), "h": time(15, 0),
            "dh": datetime(2026, 11, 8, 15, 0, 42), "s": StatusTarefa.EM_ANDAMENTO, "n": "Chalé"})
        self.assertEqual(texto, '{"z": "1620.00", "a": "2026-11-08", "h": "15:00", '
                                '"dh": "2026-11-08T15:00", "s": "em_andamento", "n": "Chalé"}')

    def test_codigos(self):
        self.assertEqual((codigo_imovel(6), codigo_reserva(12)), ("IMV-006", "RSV-0012"))

    def test_periodo(self):
        self.assertEqual(periodo(date(2026, 11, 4), date(2026, 11, 7)), "4 a 7 nov")
        self.assertEqual(periodo(date(2026, 10, 30), date(2026, 11, 2)), "30 out a 2 nov")
        self.assertEqual(periodo(date(2026, 12, 28), date(2027, 1, 2)), "28 dez 2026 a 2 jan 2027")

    def test_frases_de_conflito(self):
        r = nova_reserva(id=2, data_entrada=date(2026, 11, 4), data_saida=date(2026, 11, 7),
                         hospede=Hospede(administrador_id=1, nome="Mariana Costa"))
        b = Bloqueio(imovel_id=8, data_inicio=date(2026, 11, 8), data_fim=date(2026, 11, 11), motivo="Troca do aquecedor")
        self.assertEqual(frase_conflito(r, "reserva"), "Conflita com RSV-0002 (Mariana Costa, 4 a 7 nov). Escolha outras datas.")
        self.assertEqual(frase_conflito(b, "reserva"), "O imóvel está bloqueado de 8 a 11 nov (troca do aquecedor).")
        self.assertEqual(frase_conflito(r, "bloqueio"), "Já há a reserva RSV-0002 (Mariana Costa, 4 a 7 nov) nessas datas.")
        self.assertEqual(frase_conflito(b, "bloqueio"), "Já há um bloqueio de 8 a 11 nov (troca do aquecedor) nessas datas.")


if __name__ == "__main__":
    unittest.main()
