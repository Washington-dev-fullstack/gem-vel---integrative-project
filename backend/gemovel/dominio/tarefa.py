"""Tarefas de limpeza e manutenção (R4, R5 e R7) e o histórico de cada mudança de estado."""

from datetime import datetime

from gemovel.dominio.enums import StatusTarefa, TipoTarefa
from gemovel.dominio.usuario import Administrador
from gemovel.dominio.validacao import TEXTO_LONGO, Validador
from gemovel.erros import ErroValidacao


def _agora():
    return datetime.now().replace(microsecond=0)


def _recusar(mensagem):
    raise ErroValidacao({"status": mensagem})


def _status_ou_none(valor):
    return None if valor is None else StatusTarefa(valor)


class Tarefa:
    """Uma tarefa num imóvel. A limpeza da saída fica ligada à reserva."""

    def __init__(self, *, id=None, imovel_id, tipo, titulo, agendada_para, reserva_id=None,
                 funcionario_id=None, descricao=None, prazo=None, status=StatusTarefa.PENDENTE,
                 iniciada_em=None, concluida_em=None, imovel=None, funcionario=None):
        v = Validador()
        self._id = id
        self._imovel_id = v.exigir("imovel_id", imovel_id)
        self._tipo = v.opcao("tipo", tipo, TipoTarefa)
        self._titulo = v.texto("titulo", titulo, 120)
        self._descricao = v.texto("descricao", descricao, TEXTO_LONGO, obrigatorio=False)
        self._agendada_para = v.exigir("agendada_para", agendada_para)
        self._prazo = prazo
        if prazo is not None and self._agendada_para is not None and prazo < self._agendada_para:
            v.erro("prazo", "O prazo não pode ser antes do início.")
        self._reserva_id = reserva_id
        if reserva_id is not None and self._tipo is not None and self._tipo is not TipoTarefa.LIMPEZA:
            v.erro("reserva_id", "Só a limpeza pode ficar ligada a uma reserva.")
        self._funcionario_id = funcionario_id
        self._status = v.opcao("status", status, StatusTarefa)
        self._iniciada_em = iniciada_em
        self._concluida_em = concluida_em
        self._imovel = imovel
        self._funcionario = funcionario
        v.conferir()

    @property
    def id(self):
        return self._id

    @property
    def imovel_id(self):
        return self._imovel_id

    @property
    def tipo(self):
        return self._tipo

    @property
    def titulo(self):
        return self._titulo

    @property
    def descricao(self):
        return self._descricao

    @property
    def agendada_para(self):
        return self._agendada_para

    @property
    def prazo(self):
        return self._prazo

    @property
    def reserva_id(self):
        return self._reserva_id

    @property
    def funcionario_id(self):
        return self._funcionario_id

    @property
    def status(self):
        return self._status

    @property
    def iniciada_em(self):
        return self._iniciada_em

    @property
    def concluida_em(self):
        return self._concluida_em

    @property
    def imovel(self):
        return self._imovel

    @property
    def funcionario(self):
        return self._funcionario

    def atribuir(self, funcionario):
        """Define o responsável; None deixa a tarefa sem responsável."""
        if funcionario is not None and not funcionario.pode_executar(self):
            raise ErroValidacao({"funcionario_id": "Esta pessoa não faz este tipo de tarefa."})
        self._funcionario_id = None if funcionario is None else funcionario.id
        self._funcionario = funcionario

    def reagendar(self, imovel, agendada_para, prazo):
        """Muda o imóvel e o horário da tarefa, com a mesma regra do cadastro para o prazo."""
        if prazo is not None and prazo < agendada_para:
            raise ErroValidacao({"prazo": "O prazo não pode ser antes do início."})
        self._imovel_id, self._imovel = imovel.id, imovel
        self._agendada_para, self._prazo = agendada_para, prazo

    def iniciar(self, por):
        """Pendente → em andamento (R5)."""
        if self._status is not StatusTarefa.PENDENTE:
            _recusar("Só uma tarefa pendente pode começar.")
        agora = _agora()
        anterior, self._status = self._status, StatusTarefa.EM_ANDAMENTO
        self._iniciada_em = agora
        return self._registrar(por, anterior, None, agora)

    def concluir(self, por, observacao=None):
        """Pendente ou em andamento → concluída; o início vazio recebe a mesma hora."""
        if self._status is StatusTarefa.CONCLUIDA:
            _recusar("Esta tarefa já está concluída.")
        v = Validador()
        observacao = v.texto("observacao", observacao, 255, obrigatorio=False)
        v.conferir()
        agora = _agora()
        anterior, self._status = self._status, StatusTarefa.CONCLUIDA
        self._concluida_em = agora
        if self._iniciada_em is None:
            self._iniciada_em = agora
        return self._registrar(por, anterior, observacao, agora)

    def reabrir(self, por):
        """Concluída → pendente, só por quem administra."""
        if not isinstance(por, Administrador):
            _recusar("Só quem administra pode reabrir uma tarefa.")
        if self._status is not StatusTarefa.CONCLUIDA:
            _recusar("Só uma tarefa concluída pode ser reaberta.")
        agora = _agora()
        anterior, self._status = self._status, StatusTarefa.PENDENTE
        self._iniciada_em = None
        self._concluida_em = None
        return self._registrar(por, anterior, None, agora)

    def esta_atrasada(self, agora):
        """Não concluída e já passou do prazo; sem prazo, do horário agendado (R7)."""
        if self._status is StatusTarefa.CONCLUIDA:
            return False
        limite = self._prazo if self._prazo is not None else self._agendada_para
        return agora > limite

    def _registrar(self, por, anterior, observacao, agora):
        return HistoricoTarefa(tarefa_id=self._id, usuario_id=por.id, status_anterior=anterior,
                               status_novo=self._status, observacao=observacao, registrado_em=agora)


class HistoricoTarefa:
    """Uma mudança de estado de uma tarefa: quem mudou, de qual estado para qual, e quando."""

    def __init__(self, *, id=None, tarefa_id, usuario_id, status_anterior, status_novo,
                 observacao=None, registrado_em=None, usuario=None, tarefa=None):
        self._id = id
        self._tarefa_id = tarefa_id
        self._usuario_id = usuario_id
        self._status_anterior = _status_ou_none(status_anterior)
        self._status_novo = _status_ou_none(status_novo)
        self._observacao = observacao
        self._registrado_em = registrado_em
        self._usuario = usuario
        self._tarefa = tarefa

    @property
    def id(self):
        return self._id

    @property
    def tarefa_id(self):
        return self._tarefa_id

    @property
    def usuario_id(self):
        return self._usuario_id

    @property
    def status_anterior(self):
        return self._status_anterior

    @property
    def status_novo(self):
        return self._status_novo

    @property
    def observacao(self):
        return self._observacao

    @property
    def registrado_em(self):
        return self._registrado_em

    @property
    def usuario(self):
        return self._usuario

    @property
    def tarefa(self):
        return self._tarefa
