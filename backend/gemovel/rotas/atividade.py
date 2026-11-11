"""Rota da atividade recente: as últimas mudanças de estado nas tarefas, para o painel."""

from flask import Blueprint, g, jsonify

from gemovel.dao.tarefa_dao import HistoricoTarefaDAO
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import parametro_inteiro
from gemovel.rotas.formato_json import atividade_json

bp = Blueprint("atividade", __name__, url_prefix="/api")


@bp.get("/atividade")
@exige_login("administrador")
def atividade():
    limite = parametro_inteiro("limite", 8, 1, 50)
    historico = HistoricoTarefaDAO(conexao_do_app()).listar_recentes(g.usuario.id, limite)
    return jsonify(atividade=[atividade_json(h) for h in historico])
