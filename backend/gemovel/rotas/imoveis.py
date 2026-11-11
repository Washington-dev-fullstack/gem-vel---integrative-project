"""Rotas dos imóveis: cada administrador vê e cadastra só os imóveis dele."""

from datetime import time

from flask import Blueprint, g, jsonify

from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dominio.imovel import Imovel
from gemovel.erros import NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json
from gemovel.rotas.formato_json import imovel_json

bp = Blueprint("imoveis", __name__, url_prefix="/api")

# Padrões do cadastro (os mesmos da tabela).
CAPACIDADE_PADRAO = 2
ENTRADA_PADRAO = time(15, 0)
SAIDA_PADRAO = time(11, 0)

_TEXTOS = ("nome", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "cep", "observacoes")


@bp.get("/imoveis")
@exige_login("administrador")
def listar():
    imoveis = ImovelDAO(conexao_do_app()).listar_por_administrador(g.usuario.id)
    return jsonify(imoveis=[imovel_json(i) for i in imoveis])


@bp.post("/imoveis")
@exige_login("administrador")
def cadastrar():
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in _TEXTOS}
    dados["capacidade"] = leitor.inteiro("capacidade", CAPACIDADE_PADRAO)
    dados["valor_diaria"] = leitor.dinheiro("valor_diaria")
    dados["horario_entrada"] = leitor.horario("horario_entrada", ENTRADA_PADRAO)
    dados["horario_saida"] = leitor.horario("horario_saida", SAIDA_PADRAO)
    leitor.conferir()
    imovel = Imovel(administrador_id=g.usuario.id, **dados)
    dao = ImovelDAO(conexao_do_app())
    novo_id = dao.inserir(imovel)
    return jsonify(imovel_json(dao.buscar_por_id(novo_id))), 201


@bp.get("/imoveis/<int:id>")
@exige_login("administrador")
def detalhar(id):
    imovel = ImovelDAO(conexao_do_app()).buscar_por_id(id)
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise NaoEncontrado()  # o de outro administrador também: não diz que existe
    return jsonify(imovel_json(imovel))
