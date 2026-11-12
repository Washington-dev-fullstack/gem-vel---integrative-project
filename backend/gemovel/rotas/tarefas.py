"""Rotas das tarefas: as abertas e o cadastro (administrador) e as tarefas de cada pessoa da equipe."""

from datetime import datetime, time

from flask import Blueprint, g, jsonify, request

from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dao.tarefa_dao import TarefaDAO
from gemovel.dao.usuario_dao import UsuarioDAO
from gemovel.dominio.tarefa import Tarefa
from gemovel.erros import ErroValidacao, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data, parametro_inteiro
from gemovel.rotas.formato_json import tarefa_json

bp = Blueprint("tarefas", __name__, url_prefix="/api")


@bp.get("/tarefas")
@exige_login("administrador")
def listar_abertas():
    agora = datetime.now()
    conexao = conexao_do_app()
    if request.args.get("imovel_id", "") != "":
        return _tarefas_do_imovel(conexao, agora)
    tarefas = TarefaDAO(conexao).listar_abertas(g.usuario.id)
    return jsonify(tarefas=[tarefa_json(t, agora) for t in tarefas])


POR_VEZ = 30


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


@bp.post("/tarefas")
@exige_login("administrador")
def cadastrar():
    agora = datetime.now()
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in ("tipo", "titulo", "descricao")}
    dados["imovel_id"] = leitor.inteiro("imovel_id")
    dados["reserva_id"] = leitor.inteiro("reserva_id")
    dados["agendada_para"] = leitor.data_hora("agendada_para")
    dados["prazo"] = leitor.data_hora("prazo")
    funcionario_id = leitor.inteiro("funcionario_id")
    leitor.conferir()
    tarefa = Tarefa(**dados)

    conexao = conexao_do_app()
    # O imóvel pode estar desativado: a manutenção de um imóvel parado faz sentido (decisão 9).
    imovel = ImovelDAO(conexao).buscar_por_id(tarefa.imovel_id)
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise ErroValidacao({"imovel_id": "Imóvel não encontrado."})
    if tarefa.reserva_id is not None:  # decisão 6
        reserva = ReservaDAO(conexao).buscar_por_id(tarefa.reserva_id)
        if reserva is None or reserva.imovel.administrador_id != g.usuario.id:
            raise ErroValidacao({"reserva_id": "Reserva não encontrada."})
        if reserva.imovel_id != tarefa.imovel_id:
            raise ErroValidacao({"reserva_id": "Esta reserva é de outro imóvel."})
    if funcionario_id is not None:  # decisão 9
        pessoa = UsuarioDAO(conexao).buscar_por_id(funcionario_id)
        if (pessoa is None or pessoa.perfil() != "funcionario" or not pessoa.ativo
                or pessoa.administrador_id != g.usuario.id):
            raise ErroValidacao({"funcionario_id": "Pessoa não encontrada."})
        tarefa.atribuir(pessoa)

    dao = TarefaDAO(conexao)
    novo_id = dao.inserir(tarefa, g.usuario)
    return jsonify(tarefa_json(dao.buscar_por_id(novo_id), agora)), 201


@bp.get("/minhas-tarefas")
@exige_login("funcionario")
def minhas_tarefas():
    agora = datetime.now()
    dia = parametro_data("dia", agora.date())
    tarefas = TarefaDAO(conexao_do_app()).listar_do_funcionario(g.usuario.id, dia)
    return jsonify(tarefas=[tarefa_json(t, agora, com_endereco=True) for t in tarefas])
