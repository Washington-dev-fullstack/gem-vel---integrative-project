"""Domínio: imóvel (endereço, valor, capacidade e validação), sem banco."""

import unittest
from datetime import date, time
from decimal import Decimal

from gemovel.dominio.imovel import UFS
from gemovel.erros import ErroValidacao
from testes.fabrica import novo_imovel


class TestImovel(unittest.TestCase):
    def test_endereco_completo_com_e_sem_complemento(self):
        self.assertEqual(novo_imovel().endereco_completo(),
                         "Rua Haddock Lobo, 900, ap. 33 · Jardins, São Paulo/SP")
        self.assertEqual(novo_imovel(complemento=None).endereco_completo(),
                         "Rua Haddock Lobo, 900 · Jardins, São Paulo/SP")

    def test_calcular_valor_e_diaria_vezes_noites(self):
        self.assertEqual(novo_imovel().calcular_valor(date(2026, 11, 7), date(2026, 11, 11)),
                         Decimal("1800.00"))

    def test_comporta_de_1_ate_a_capacidade(self):
        self.assertEqual([novo_imovel().comporta(n) for n in (0, 1, 4, 5)],
                         [False, True, True, False])

    def test_cep_uf_e_numero(self):
        self.assertEqual(novo_imovel(cep="01414001").cep, "01414-001")
        self.assertIsNone(novo_imovel(cep="").cep)
        self.assertEqual(novo_imovel(uf="sp").uf, "SP")
        self.assertEqual(novo_imovel(numero="s/n").numero, "s/n")
        self.assertEqual(len(UFS), 27)

    def test_campos_invalidos(self):
        with self.assertRaises(ErroValidacao) as c:
            novo_imovel(nome="", logradouro="x" * 151, uf="XX", cep="0141-4001",
                        capacidade=0, valor_diaria=Decimal("0"))
        self.assertEqual(c.exception.campos, {
            "nome": "Preencha este campo.", "logradouro": "Use até 150 caracteres.",
            "uf": "Escolha uma das opções.", "cep": "Use o formato 00000-000.",
            "capacidade": "Use um número de 1 a 255.",
            "valor_diaria": "Use um valor maior que zero."})

    def test_saida_precisa_ser_antes_da_entrada(self):
        with self.assertRaises(ErroValidacao) as c:
            novo_imovel(horario_entrada=time(11, 0), horario_saida=time(11, 0))
        self.assertEqual(c.exception.campos, {
            "horario_saida": "A saída precisa ser antes da entrada, para caber a limpeza."})


if __name__ == "__main__":
    unittest.main()
