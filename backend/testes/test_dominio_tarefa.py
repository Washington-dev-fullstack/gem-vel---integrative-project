"""Domínio: tarefa (atraso, mudanças de estado, responsável e validação) e histórico, sem banco."""

import unittest
from datetime import datetime

from gemovel.dominio.enums import StatusTarefa
from gemovel.dominio.tarefa import HistoricoTarefa
from gemovel.erros import ErroValidacao
from testes.fabrica import nova_tarefa, novo_admin, novo_funcionario


class TestTarefa(unittest.TestCase):
    def test_atrasada_com_prazo(self):
        t = nova_tarefa()
        self.assertFalse(t.esta_atrasada(datetime(2026, 11, 5, 15, 0)))
        self.assertTrue(t.esta_atrasada(datetime(2026, 11, 5, 15, 1)))

    def test_atrasada_sem_prazo_usa_o_horario_agendado(self):
        t = nova_tarefa(prazo=None)
        self.assertFalse(t.esta_atrasada(datetime(2026, 11, 5, 11, 0)))
        self.assertTrue(t.esta_atrasada(datetime(2026, 11, 5, 11, 1)))

    def test_concluida_nunca_esta_atrasada(self):
        t = nova_tarefa()
        t.concluir(novo_funcionario())
        self.assertFalse(t.esta_atrasada(datetime(2030, 1, 1)))

    def test_iniciar(self):
        t = nova_tarefa(funcionario_id=3)
        h = t.iniciar(novo_funcionario())
        self.assertIsInstance(h, HistoricoTarefa)
        self.assertEqual(t.status, StatusTarefa.EM_ANDAMENTO)
        self.assertIsNotNone(t.iniciada_em)
        self.assertEqual((h.tarefa_id, h.usuario_id, h.status_anterior, h.status_novo, h.registrado_em),
                         (5, 3, StatusTarefa.PENDENTE, StatusTarefa.EM_ANDAMENTO, t.iniciada_em))

    def test_concluir_direto_da_pendente_preenche_o_inicio(self):
        t = nova_tarefa()
        h = t.concluir(novo_funcionario(), " Faltava sabonete ")
        self.assertEqual(t.status, StatusTarefa.CONCLUIDA)
        self.assertEqual(t.iniciada_em, t.concluida_em)
        self.assertEqual((h.status_anterior, h.observacao), (StatusTarefa.PENDENTE, "Faltava sabonete"))

    def test_transicoes_proibidas(self):
        t = nova_tarefa()
        t.iniciar(novo_funcionario())
        with self.assertRaises(ErroValidacao) as c:
            t.iniciar(novo_funcionario())
        self.assertEqual(c.exception.campos, {"status": "Só uma tarefa pendente pode começar."})
        t.concluir(novo_funcionario())
        with self.assertRaises(ErroValidacao) as c:
            t.concluir(novo_funcionario())
        self.assertEqual(c.exception.campos, {"status": "Esta tarefa já está concluída."})
        with self.assertRaises(ErroValidacao) as c:
            nova_tarefa().reabrir(novo_admin())
        self.assertEqual(c.exception.campos, {"status": "Só uma tarefa concluída pode ser reaberta."})

    def test_so_quem_administra_reabre(self):
        t = nova_tarefa()
        t.concluir(novo_funcionario())
        with self.assertRaises(ErroValidacao) as c:
            t.reabrir(novo_funcionario())
        self.assertEqual(c.exception.campos, {"status": "Só quem administra pode reabrir uma tarefa."})
        h = t.reabrir(novo_admin())
        self.assertEqual((t.status, t.iniciada_em, t.concluida_em, h.status_anterior, h.status_novo),
                         (StatusTarefa.PENDENTE, None, None, StatusTarefa.CONCLUIDA, StatusTarefa.PENDENTE))

    def test_atribuir(self):
        t = nova_tarefa(tipo="manutencao")
        with self.assertRaises(ErroValidacao) as c:
            t.atribuir(novo_funcionario())
        self.assertEqual(c.exception.campos, {"funcionario_id": "Esta pessoa não faz este tipo de tarefa."})
        t.atribuir(novo_funcionario(id=6, funcao="manutencao"))
        self.assertEqual(t.funcionario_id, 6)
        t.atribuir(None)
        self.assertIsNone(t.funcionario_id)

    def test_validacao(self):
        casos = [(dict(prazo=datetime(2026, 11, 5, 10, 59)),
                  {"prazo": "O prazo não pode ser antes do início."}),
                 (dict(tipo="manutencao", reserva_id=3),
                  {"reserva_id": "Só a limpeza pode ficar ligada a uma reserva."}),
                 (dict(titulo="", tipo="pintura"),
                  {"titulo": "Preencha este campo.", "tipo": "Escolha uma das opções."})]
        for mudar, campos in casos:
            with self.assertRaises(ErroValidacao) as c:
                nova_tarefa(**mudar)
            self.assertEqual(c.exception.campos, campos)


if __name__ == "__main__":
    unittest.main()
