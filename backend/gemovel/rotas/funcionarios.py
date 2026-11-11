"""Rotas da equipe: cada administrador lista e cadastra as pessoas que fazem as tarefas."""

from flask import Blueprint, g, jsonify

from gemovel.dao.usuario_dao import EMAIL_REPETIDO, FuncionarioDAO
from gemovel.dominio.usuario import Funcionario
from gemovel.erros import Conflito
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json
from gemovel.rotas.formato_json import funcionario_json

bp = Blueprint("funcionarios", __name__, url_prefix="/api")


@bp.get("/funcionarios")
@exige_login("administrador")
def listar():
    equipe = FuncionarioDAO(conexao_do_app()).listar_por_administrador(g.usuario.id)
    return jsonify(funcionarios=[funcionario_json(f) for f in equipe])


@bp.post("/funcionarios")
@exige_login("administrador")
def cadastrar():
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in ("nome", "email", "telefone", "funcao", "senha")}
    leitor.conferir()
    senha = dados.pop("senha")
    funcionario = Funcionario(administrador_id=g.usuario.id, **dados)
    funcionario.definir_senha(senha)

    dao = FuncionarioDAO(conexao_do_app())
    # O e-mail já vem normalizado pelo domínio. A chave única do banco ainda segura
    # dois cadastros ao mesmo tempo: o inserir também responde com o Conflito.
    if dao.buscar_por_email(funcionario.email) is not None:
        raise Conflito(EMAIL_REPETIDO, campo="email")
    novo_id = dao.inserir(funcionario)
    return jsonify(funcionario_json(dao.buscar_por_id(novo_id))), 201
