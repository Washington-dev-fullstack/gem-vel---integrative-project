"""Leitura dos pedidos: corpo em JSON, tipos dos campos e parâmetros do endereço (sem banco)."""

import unittest
from datetime import date, datetime, time
from decimal import Decimal

from app import criar_app
from gemovel.erros import ErroValidacao, PedidoInvalido
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data, parametro_inteiro
from testes.apoio import SEGREDO_DE_TESTE


class TestEntrada(unittest.TestCase):
    def test_leitor_converte_os_tipos(self):
        ler = Leitor({"nome": " Casa ", "capacidade": "4", "valor": 450.1, "entrada": "2026-11-07",
                      "hora": "15:00", "quando": "2026-11-08T09:30", "vazio": ""})
        self.assertEqual((ler.texto("nome"), ler.inteiro("capacidade"), ler.dinheiro("valor"),
                          ler.data("entrada"), ler.horario("hora"), ler.data_hora("quando")),
                         (" Casa ", 4, Decimal("450.1"), date(2026, 11, 7), time(15, 0),
                          datetime(2026, 11, 8, 9, 30)))
        self.assertEqual((ler.inteiro("vazio", padrao=2), ler.horario("ausente", padrao=time(11, 0))),
                         (2, time(11, 0)))
        ler.conferir()  # não levanta

    def test_leitor_junta_os_erros_de_formato(self):
        ler = Leitor({"a": True, "b": 2.5, "c": "450.123", "d": "07/11/2026", "e": "25:00",
                      "f": "2026-11-08 09:30", "g": 3, "h": [1]})
        ler.inteiro("a")
        ler.inteiro("b")
        ler.dinheiro("c")
        ler.data("d")
        ler.horario("e")
        ler.data_hora("f")
        ler.texto("g")
        ler.objeto("h")
        with self.assertRaises(ErroValidacao) as c:
            ler.conferir()
        self.assertEqual(c.exception.campos, {
            "a": "Número inválido.", "b": "Número inválido.", "c": "Valor inválido.",
            "d": "Data inválida.", "e": "Horário inválido.", "f": "Data inválida.",
            "g": "Valor inválido.", "h": "Valor inválido."})

    def test_corpo_precisa_ser_um_objeto_json(self):
        app = criar_app(segredo=SEGREDO_DE_TESTE)
        for pedido in ({"data": "nome=Casa", "content_type": "application/x-www-form-urlencoded"},
                       {"data": '{"nome": "Casa"}', "content_type": "text/plain"},
                       {"json": [1, 2]}):
            with app.test_request_context("/api/x", method="POST", **pedido), \
                    self.assertRaises(PedidoInvalido):
                corpo_json()

    def test_parametros_do_endereco(self):
        app = criar_app(segredo=SEGREDO_DE_TESTE)
        with app.test_request_context("/api/x?dia=2026-11-08&limite=10"):
            self.assertEqual((parametro_data("dia", None), parametro_inteiro("limite", 8, 1, 50),
                              parametro_inteiro("outro", 8, 1, 50)),
                             (date(2026, 11, 8), 10, 8))
        with app.test_request_context("/api/x?dia=2026-02-30&limite=51"):
            with self.assertRaises(ErroValidacao) as c:
                parametro_data("dia", None)
            self.assertEqual(c.exception.campos, {"dia": "Data inválida."})
            with self.assertRaises(ErroValidacao) as c:
                parametro_inteiro("limite", 8, 1, 50)
            self.assertEqual(c.exception.campos, {"limite": "Use um número de 1 a 50."})


if __name__ == "__main__":
    unittest.main()
