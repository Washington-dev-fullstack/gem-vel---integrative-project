"""DAOs das tarefas e do histórico delas. A tarefa vem com o imóvel e o responsável; cada
mudança de estado vira uma linha do histórico, gravada junto com a mudança."""

from datetime import datetime, time, timedelta

from gemovel.dao.base import DAOBase, colunas, sem_prefixo
from gemovel.dao.imovel_dao import COLUNAS_IMOVEL, imovel_da_linha
from gemovel.dao.usuario_dao import COLUNAS_USUARIO, usuario_da_linha
from gemovel.dominio.tarefa import HistoricoTarefa, Tarefa

COLUNAS_TAREFA = ("id", "imovel_id", "reserva_id", "funcionario_id", "tipo", "titulo", "descricao", "agendada_para",
                  "prazo", "status", "iniciada_em", "concluida_em")

COLUNAS_HISTORICO = ("id", "tarefa_id", "usuario_id", "status_anterior", "status_novo", "observacao",
                     "registrado_em")


def _colunas_da_pessoa(apelido_usuario, apelido_funcionario, prefixo):
    """As colunas de usuario mais administrador_id e funcao, no formato de usuario_da_linha."""
    return (colunas(apelido_usuario, COLUNAS_USUARIO, prefixo) + ", "
            + colunas(apelido_funcionario, ("administrador_id", "funcao"), prefixo))


_SELECT_TAREFA = ("SELECT " + colunas("t", COLUNAS_TAREFA) + ", " + colunas("i", COLUNAS_IMOVEL, "i_") + ", "
                  + _colunas_da_pessoa("r", "rf", "r_")
                  + " FROM tarefa t JOIN imovel i ON i.id = t.imovel_id"
                  " LEFT JOIN usuario r ON r.id = t.funcionario_id"
                  " LEFT JOIN funcionario rf ON rf.usuario_id = t.funcionario_id")

_ORDEM_DAS_TAREFAS = " ORDER BY t.agendada_para, t.id"

_SELECT_HISTORICO = ("SELECT " + colunas("h", COLUNAS_HISTORICO) + ", " + _colunas_da_pessoa("u", "uf", "u_") + ", "
                     + colunas("t", COLUNAS_TAREFA, "t_") + ", " + colunas("i", COLUNAS_IMOVEL, "i_")
                     + " FROM historico_tarefa h JOIN usuario u ON u.id = h.usuario_id"
                     " LEFT JOIN funcionario uf ON uf.usuario_id = h.usuario_id"
                     " JOIN tarefa t ON t.id = h.tarefa_id JOIN imovel i ON i.id = t.imovel_id")


def tarefa_da_linha(linha, imovel=None, funcionario=None):
    return Tarefa(**{coluna: linha[coluna] for coluna in COLUNAS_TAREFA}, imovel=imovel, funcionario=funcionario)


def _pessoa_ou_none(linha, prefixo):
    """A pessoa da junção, ou None quando o LEFT JOIN não achou ninguém (tarefa sem responsável)."""
    dados = sem_prefixo(linha, prefixo)
    return usuario_da_linha(dados) if dados["id"] is not None else None


class TarefaDAO(DAOBase):
    def _para_objeto(self, linha):
        return tarefa_da_linha(linha, imovel_da_linha(sem_prefixo(linha, "i_")), _pessoa_ou_none(linha, "r_"))

    def _listar(self, onde, parametros):
        linhas = self._consultar(_SELECT_TAREFA + " WHERE " + onde + _ORDEM_DAS_TAREFAS, parametros)
        return [self._para_objeto(linha) for linha in linhas]

    def buscar_por_id(self, id):
        linhas = self._consultar(_SELECT_TAREFA + " WHERE t.id = %s", (id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def listar_do_funcionario(self, funcionario_id, dia):
        """As tarefas da pessoa agendadas no `dia`, mais as que ficaram abertas de dias anteriores."""
        inicio = datetime.combine(dia, time.min)
        return self._listar("t.funcionario_id = %s AND t.agendada_para < %s"
                            " AND (t.agendada_para >= %s OR t.status <> 'concluida')",
                            (funcionario_id, inicio + timedelta(days=1), inicio))

    def listar_abertas(self, administrador_id):
        """As tarefas pendentes e em andamento dos imóveis do administrador."""
        return self._listar("i.administrador_id = %s AND t.status IN ('pendente', 'em_andamento')",
                            (administrador_id,))

    def buscar_limpeza_da_reserva(self, reserva_id):
        """A limpeza da saída da reserva (R4), em qualquer estado, ou None."""
        linhas = self._consultar(_SELECT_TAREFA + " WHERE t.reserva_id = %s AND t.tipo = 'limpeza' ORDER BY t.id LIMIT 1",
                                 (reserva_id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def atualizar(self, tarefa):
        """Grava os campos da tarefa. O estado não muda aqui: cada mudança de estado grava também o histórico."""
        self._executar(
            "UPDATE tarefa SET imovel_id = %s, reserva_id = %s, funcionario_id = %s, tipo = %s, titulo = %s, "
            "descricao = %s, agendada_para = %s, prazo = %s WHERE id = %s",
            (tarefa.imovel_id, tarefa.reserva_id, tarefa.funcionario_id, tarefa.tipo.value, tarefa.titulo,
             tarefa.descricao, tarefa.agendada_para, tarefa.prazo, tarefa.id))

    def excluir(self, id):
        """Apaga a tarefa; o histórico dela vai junto (ON DELETE CASCADE)."""
        self._executar("DELETE FROM tarefa WHERE id = %s", (id,))

    def inserir(self, tarefa, criada_por):
        """Grava a tarefa e a primeira linha do histórico (nada → pendente), em nome de quem criou,
        na mesma transação. Devolve o id da tarefa."""
        with self._bloco() as transacao:
            id = transacao.executar(
                "INSERT INTO tarefa (imovel_id, reserva_id, funcionario_id, tipo, titulo, descricao, agendada_para, "
                "prazo, status, iniciada_em, concluida_em) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (tarefa.imovel_id, tarefa.reserva_id, tarefa.funcionario_id, tarefa.tipo.value, tarefa.titulo,
                 tarefa.descricao, tarefa.agendada_para, tarefa.prazo, tarefa.status.value, tarefa.iniciada_em,
                 tarefa.concluida_em))
            transacao.executar("INSERT INTO historico_tarefa (tarefa_id, usuario_id, status_anterior, status_novo) "
                               "VALUES (%s, %s, NULL, %s)", (id, criada_por.id, tarefa.status.value))
            return id


class HistoricoTarefaDAO(DAOBase):
    def _para_objeto(self, linha):
        tarefa = tarefa_da_linha(sem_prefixo(linha, "t_"), imovel_da_linha(sem_prefixo(linha, "i_")))
        return HistoricoTarefa(**{coluna: linha[coluna] for coluna in COLUNAS_HISTORICO},
                               usuario=usuario_da_linha(sem_prefixo(linha, "u_")), tarefa=tarefa)

    def listar_recentes(self, administrador_id, limite):
        """As últimas mudanças de estado nas tarefas dos imóveis do administrador, da mais nova à mais antiga."""
        linhas = self._consultar(_SELECT_HISTORICO + " WHERE i.administrador_id = %s"
                                 " ORDER BY h.registrado_em DESC, h.id DESC LIMIT %s", (administrador_id, limite))
        return [self._para_objeto(linha) for linha in linhas]
