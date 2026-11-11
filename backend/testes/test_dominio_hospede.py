"""Domínio: hóspede, sem banco."""

import unittest

from gemovel.dominio.hospede import Hospede
from gemovel.erros import ErroValidacao


class TestHospede(unittest.TestCase):
    def test_opcionais_vazios_viram_none_e_email_em_minusculas(self):
        h = Hospede(administrador_id=1, nome=" Carla Nogueira ", telefone="", email="Carla@Example.com")
        self.assertEqual((h.nome, h.telefone, h.email, h.documento),
                         ("Carla Nogueira", None, "carla@example.com", None))

    def test_campos_invalidos(self):
        with self.assertRaises(ErroValidacao) as c:
            Hospede(administrador_id=1, nome=None, email="carla@", documento="1" * 21)
        self.assertEqual(c.exception.campos, {"nome": "Preencha este campo.",
                                              "email": "E-mail inválido.",
                                              "documento": "Use até 20 caracteres."})


if __name__ == "__main__":
    unittest.main()
