"""Rotas das tarefas: as abertas, as do dia e as de um imóvel, uma tarefa com o histórico, o
cadastro, editar e excluir (administrador); mudar o estado e desfazer (os dois perfis: a pessoa da
equipe só nas próprias tarefas); e as tarefas de cada pessoa da equipe."""

from datetime import datetime, time

from flask import Blueprint, g, jsonify, request

from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dao.tarefa_dao import HistoricoTarefaDAO, TarefaDAO
from gemovel.dao.usuario_dao import UsuarioDAO
from gemovel.dominio.enums import StatusTarefa
from gemovel.dominio.tarefa import Tarefa
from gemovel.dominio.validacao import Validador
from gemovel.erros import Conflito, ErroValidacao, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data, parametro_inteiro
from gemovel.rotas.formato_json import tarefa_completa_json, tarefa_json

bp = Blueprint("tarefas", __name__, url_prefix="/api")

POR_VEZ = 30


@bp.get("/tarefas")
@exige_login("administrador")
def listar():
    """Com `imovel_id`, as de um imóvel; com `dia`, todas as daquele dia; sem nada, as abertas."""
    agora = datetime.now()
    conexao = conexao_do_app()
    if request.args.get("imovel_id", "") != "":
        return _tarefas_do_imovel(conexao, agora)
    dao = TarefaDAO(conexao)
    if request.args.get("dia", "") != "":
        tarefas = dao.listar_do_dia(g.usuario.id, parametro_data("dia", agora.date()))
    else:
        tarefas = dao.listar_abertas(g.usuario.id)
    return jsonify(tarefas=[tarefa_json(t, agora) for t in tarefas])


def _tarefas_do_imovel(conexao, agora):
    """A aba Tarefas do detalhe do imóvel: as agendadas a partir de `de` (padrão: hoje), por horário,
    30 por vez; `pular` diz quantas já vieram."""
    imovel_id = parametro_inteiro("imovel_id", None, 1, 2_147_483_647)
    imovel = ImovelDAO(conexao).buscar_por_id(imovel_id)
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise NaoEncontrado()
    desde = datetime.combine(parametro_data("de", agora.date()), time.min)
    pular = parametro_inteiro("pular", 0, 0, 1_000_000)
    tarefas = TarefaDAO(conexao).listar_do_imovel(imovel_id, desde, pular, POR_VEZ + 1)
    return jsonify(tarefas=[tarefa_json(t, agora) for t in tarefas[:POR_VEZ]], tem_mais=len(tarefas) > POR_VEZ)


def _tarefa_de_quem_pede(dao, id, travar=False):
    """A tarefa de um imóvel do administrador logado ou, para a pessoa da equipe, uma das próprias.
    As outras dão 404: não diz que existem."""
    tarefa = dao.buscar_por_id(id, travar=travar)
    if tarefa is None:
        raise NaoEncontrado()
    if g.usuario.perfil() == "administrador":
        dono = tarefa.imovel.administrador_id == g.usuario.id
    else:
        dono = tarefa.funcionario_id == g.usuario.id
    if not dono:
        raise NaoEncontrado()
    return tarefa


def _ler_tarefa():
    """Os campos do cadastro, no cadastrar e no editar: os dados da tarefa e o id do responsável.
    Aqui só se confere o formato."""
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in ("tipo", "titulo", "descricao")}
    dados["imovel_id"] = leitor.inteiro("imovel_id")
    dados["reserva_id"] = leitor.inteiro("reserva_id")
    dados["agendada_para"] = leitor.data_hora("agendada_para")
    dados["prazo"] = leitor.data_hora("prazo")
    funcionario_id = leitor.inteiro("funcionario_id")
    leitor.conferir()
    return dados, funcionario_id


def _conferir_vinculos(conexao, tarefa, funcionario_id, transacao=None):
    """O imóvel, a reserva e o responsável precisam ser do administrador; o responsável fica na tarefa."""
    # O imóvel pode estar desativado: a manutenção de um imóvel parado faz sentido (decisão 9).
    imovel = ImovelDAO(conexao, transacao).buscar_por_id(tarefa.imovel_id)
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise ErroValidacao({"imovel_id": "Imóvel não encontrado."})
    if tarefa.reserva_id is not None:  # decisão 6
        reserva = ReservaDAO(conexao, transacao).buscar_por_id(tarefa.reserva_id)
        if reserva is None or reserva.imovel.administrador_id != g.usuario.id:
            raise ErroValidacao({"reserva_id": "Reserva não encontrada."})
        if reserva.imovel_id != tarefa.imovel_id:
            raise ErroValidacao({"reserva_id": "Esta reserva é de outro imóvel."})
    pessoa = None
    if funcionario_id is not None:  # decisão 9
        pessoa = UsuarioDAO(conexao, transacao).buscar_por_id(funcionario_id)
        if (pessoa is None or pessoa.perfil() != "funcionario" or not pessoa.ativo
                or pessoa.administrador_id != g.usuario.id):
            raise ErroValidacao({"funcionario_id": "Pessoa não encontrada."})
    tarefa.atribuir(pessoa)


def _completa_json(conexao, tarefa, agora):
    historico = HistoricoTarefaDAO(conexao).listar_da_tarefa(tarefa.id)
    reserva = None if tarefa.reserva_id is None else ReservaDAO(conexao).buscar_por_id(tarefa.reserva_id)
    return tarefa_completa_json(tarefa, historico, reserva, agora)


def _resposta_da_mudanca(conexao, id, agora):
    """A tarefa depois de mudar o estado; a pessoa da equipe recebe o formato das tarefas dela."""
    tarefa = TarefaDAO(conexao).buscar_por_id(id)
    return jsonify(tarefa_json(tarefa, agora, com_endereco=g.usuario.perfil() == "funcionario"))


@bp.post("/tarefas")
@exige_login("administrador")
def cadastrar():
    dados, funcionario_id = _ler_tarefa()
    tarefa = Tarefa(**dados)
    conexao = conexao_do_app()
    _conferir_vinculos(conexao, tarefa, funcionario_id)
    dao = TarefaDAO(conexao)
    novo_id = dao.inserir(tarefa, g.usuario)
    return jsonify(tarefa_json(dao.buscar_por_id(novo_id), datetime.now())), 201


@bp.get("/tarefas/<int:id>")
@exige_login("administrador")
def detalhar(id):
    conexao = conexao_do_app()
    return jsonify(_completa_json(conexao, _tarefa_de_quem_pede(TarefaDAO(conexao), id), datetime.now()))


@bp.patch("/tarefas/<int:id>")
@exige_login("administrador")
def editar(id):
    """Os campos do cadastro, com as mesmas regras. O estado não muda aqui."""
    dados, funcionario_id = _ler_tarefa()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = TarefaDAO(conexao, t)
        atual = _tarefa_de_quem_pede(dao, id, travar=True)
        tarefa = Tarefa(id=id, status=atual.status, iniciada_em=atual.iniciada_em,
                        concluida_em=atual.concluida_em, **dados)
        _conferir_vinculos(conexao, tarefa, funcionario_id, t)
        dao.atualizar(tarefa)
    return jsonify(_completa_json(conexao, TarefaDAO(conexao).buscar_por_id(id), datetime.now()))


@bp.delete("/tarefas/<int:id>")
@exige_login("administrador")
def excluir(id):
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = TarefaDAO(conexao, t)
        _tarefa_de_quem_pede(dao, id, travar=True)
        dao.excluir(id)  # o histórico vai junto (ON DELETE CASCADE)
    return "", 204


@bp.post("/tarefas/<int:id>/estado")
@exige_login("administrador", "funcionario")
def mudar_estado(id):
    """Começar, concluir ou reabrir (R5), com a linha do histórico na mesma transação. A pessoa da
    equipe anda um passo de cada vez."""
    leitor = Leitor(corpo_json())
    texto, observacao = leitor.texto("status"), leitor.texto("observacao")
    leitor.conferir()
    v = Validador()
    novo = v.opcao("status", texto, StatusTarefa)
    v.conferir()

    agora = datetime.now()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        # A trava vem antes de tudo: duas mudanças da mesma tarefa passam uma de cada vez.
        dao = TarefaDAO(conexao, t)
        tarefa = _tarefa_de_quem_pede(dao, id, travar=True)
        if novo is StatusTarefa.EM_ANDAMENTO:
            registro = tarefa.iniciar(g.usuario)
        elif novo is StatusTarefa.CONCLUIDA:
            if g.usuario.perfil() == "funcionario" and tarefa.status is StatusTarefa.PENDENTE:
                raise Conflito("Comece a tarefa antes de concluir.")
            registro = tarefa.concluir(g.usuario, observacao)
        else:
            registro = tarefa.reabrir(g.usuario)
        dao.gravar_estado(tarefa)
        HistoricoTarefaDAO(conexao, t).inserir(registro)
    return _resposta_da_mudanca(conexao, id, agora)


@bp.post("/tarefas/<int:id>/desfazer")
@exige_login("administrador", "funcionario")
def desfazer(id):
    """Volta a última mudança de estado (de quem a fez, até 10 segundos depois); o registro dela sai
    do histórico."""
    corpo_json()  # escrita só aceita JSON; o corpo é {}
    agora = datetime.now()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = TarefaDAO(conexao, t)
        tarefa = _tarefa_de_quem_pede(dao, id, travar=True)
        historico = HistoricoTarefaDAO(conexao, t)
        registro = historico.buscar_ultimo(id)
        tarefa.desfazer(registro, g.usuario, agora)
        dao.gravar_estado(tarefa)
        historico.excluir(registro.id)
    return _resposta_da_mudanca(conexao, id, agora)


@bp.get("/minhas-tarefas")
@exige_login("funcionario")
def minhas_tarefas():
    agora = datetime.now()
    dia = parametro_data("dia", agora.date())
    tarefas = TarefaDAO(conexao_do_app()).listar_do_funcionario(g.usuario.id, dia)
    return jsonify(tarefas=[tarefa_json(t, agora, com_endereco=True) for t in tarefas])
