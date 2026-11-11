"""Rota de saúde (Etapa 1): confere a conexão com o banco e conta as linhas das tabelas."""

from flask import Blueprint, current_app, jsonify

from gemovel.conexao import BancoIndisponivel
from gemovel.rotas import conexao_do_app

bp = Blueprint("saude", __name__, url_prefix="/api")


@bp.get("/saude")
def saude():
    try:
        resultado = conexao_do_app().testar()
    except BancoIndisponivel as erro:
        return jsonify(status="erro", mensagem=str(erro)), 503
    return jsonify(status="ok", banco=current_app.extensions["gemovel.config"]["database"],
                   versao=resultado["versao"], tabelas=resultado["tabelas"])
