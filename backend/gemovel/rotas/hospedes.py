"""Rotas dos hóspedes: a busca do formulário de reserva e o cadastro."""

from flask import Blueprint, g, jsonify, request

from gemovel.dao.hospede_dao import HospedeDAO
from gemovel.dominio.hospede import Hospede
from gemovel.dominio.validacao import limpar
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json
from gemovel.rotas.formato_json import hospede_json

bp = Blueprint("hospedes", __name__, url_prefix="/api")


@bp.get("/hospedes")
@exige_login("administrador")
def buscar():
    termo = limpar(request.args.get("busca"))
    hospedes = HospedeDAO(conexao_do_app()).buscar(g.usuario.id, termo)
    return jsonify(hospedes=[hospede_json(h) for h in hospedes])


@bp.post("/hospedes")
@exige_login("administrador")
def cadastrar():
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in ("nome", "telefone", "email", "documento", "observacoes")}
    leitor.conferir()
    hospede = Hospede(administrador_id=g.usuario.id, **dados)
    dao = HospedeDAO(conexao_do_app())
    novo_id = dao.inserir(hospede)
    return jsonify(hospede_json(dao.buscar_por_id(novo_id))), 201
