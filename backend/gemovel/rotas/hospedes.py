"""Rotas dos hóspedes: a lista (que também é a busca do formulário de reserva), um hóspede com
as reservas dele, o cadastro, editar e excluir."""

from datetime import datetime

from flask import Blueprint, g, jsonify, request

from gemovel.dao.hospede_dao import HospedeDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dominio.hospede import Hospede
from gemovel.dominio.validacao import limpar
from gemovel.erros import Conflito, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json
from gemovel.rotas.formato_json import hospede_json, reserva_resumo_json

bp = Blueprint("hospedes", __name__, url_prefix="/api")

_CAMPOS = ("nome", "telefone", "email", "documento", "observacoes")


def _ler_hospede():
    """Os campos do formulário do hóspede, no cadastro e na edição."""
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in _CAMPOS}
    leitor.conferir()
    return dados


def _hospede_do_administrador(dao, id):
    """O hóspede do administrador logado. O de outro administrador também dá 404: não diz que existe."""
    hospede = dao.buscar_por_id(id)
    if hospede is None or hospede.administrador_id != g.usuario.id:
        raise NaoEncontrado()
    return hospede


@bp.get("/hospedes")
@exige_login("administrador")
def buscar():
    termo = limpar(request.args.get("busca"))
    hospedes = HospedeDAO(conexao_do_app()).buscar(g.usuario.id, termo)
    return jsonify(hospedes=[hospede_json(h) | totais for h, totais in hospedes])


@bp.get("/hospedes/<int:id>")
@exige_login("administrador")
def detalhar(id):
    agora = datetime.now()
    conexao = conexao_do_app()
    hospede = _hospede_do_administrador(HospedeDAO(conexao), id)
    reservas = ReservaDAO(conexao).listar_do_hospede(id)
    return jsonify(hospede_json(hospede) | {"reservas": [reserva_resumo_json(r, agora) for r in reservas]})


@bp.post("/hospedes")
@exige_login("administrador")
def cadastrar():
    hospede = Hospede(administrador_id=g.usuario.id, **_ler_hospede())
    dao = HospedeDAO(conexao_do_app())
    novo_id = dao.inserir(hospede)
    return jsonify(hospede_json(dao.buscar_por_id(novo_id))), 201


@bp.patch("/hospedes/<int:id>")
@exige_login("administrador")
def editar(id):
    dados = _ler_hospede()
    dao = HospedeDAO(conexao_do_app())
    _hospede_do_administrador(dao, id)
    dao.atualizar(Hospede(id=id, administrador_id=g.usuario.id, **dados))
    return jsonify(hospede_json(dao.buscar_por_id(id)))


@bp.delete("/hospedes/<int:id>")
@exige_login("administrador")
def excluir(id):
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        hospedes = HospedeDAO(conexao, t)
        _hospede_do_administrador(hospedes, id)
        if ReservaDAO(conexao, t).listar_do_hospede(id):
            raise Conflito("Este hóspede tem reservas e não pode ser excluído.")
        hospedes.excluir(id)
    return "", 204
