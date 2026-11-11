"""Domínio: bloqueio de datas de um imóvel, sem banco."""

import unittest
from datetime import date

from gemovel.dominio.bloqueio import Bloqueio
from gemovel.erros import ErroValidacao


class TestBloqueio(unittest.TestCase):
    def test_conflito_segue_a_regra_das_reservas(self):  # bloqueio de 8 a 11 nov
        b = Bloqueio(imovel_id=8, data_inicio=date(2026, 11, 8), data_fim=date(2026, 11, 11),
                     motivo="Troca do aquecedor")
        self.assertFalse(b.conflita_com(date(2026, 11, 11), date(2026, 11, 13)))  # entra no dia do fim
        self.assertFalse(b.conflita_com(date(2026, 11, 5), date(2026, 11, 8)))    # sai no dia do início
        self.assertTrue(b.conflita_com(date(2026, 11, 10), date(2026, 11, 12)))

    def test_fim_depois_do_inicio_e_motivo(self):
        with self.assertRaises(ErroValidacao) as c:
            Bloqueio(imovel_id=8, data_inicio=date(2026, 11, 8), data_fim=date(2026, 11, 8), motivo="")
        self.assertEqual(c.exception.campos, {"data_fim": "O fim precisa ser depois do início.",
                                              "motivo": "Preencha este campo."})


if __name__ == "__main__":
    unittest.main()
