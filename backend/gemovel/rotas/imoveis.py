"""Rotas dos imóveis: cada administrador vê e cadastra só os imóveis dele."""

from datetime import time

from flask import Blueprint, g, jsonify

from gemovel.dao.bloqueio_dao import BloqueioDAO
from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dominio.bloqueio import Bloqueio
from gemovel.dominio.imovel import Imovel
from gemovel.erros import Conflito, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json
from gemovel.rotas.formato_json import bloqueio_json, frase_conflito, imovel_json

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


def _imovel_do_administrador(dao, id, travar=False):
    """O imóvel do administrador logado. O de outro administrador também dá 404: não diz que existe."""
    imovel = dao.buscar_por_id(id, travar=travar)
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise NaoEncontrado()
    return imovel


@bp.get("/imoveis/<int:id>")
@exige_login("administrador")
def detalhar(id):
    return jsonify(imovel_json(_imovel_do_administrador(ImovelDAO(conexao_do_app()), id)))


@bp.get("/imoveis/<int:id>/bloqueios")
@exige_login("administrador")
def listar_bloqueios(id):
    conexao = conexao_do_app()
    _imovel_do_administrador(ImovelDAO(conexao), id)
    return jsonify(bloqueios=[bloqueio_json(b) for b in BloqueioDAO(conexao).listar_por_imovel(id)])


@bp.post("/imoveis/<int:id>/bloqueios")
@exige_login("administrador")
def bloquear(id):
    leitor = Leitor(corpo_json())
    datas = {"data_inicio": leitor.data("data_inicio"), "data_fim": leitor.data("data_fim")}
    motivo = leitor.texto("motivo")
    leitor.conferir()
    bloqueio = Bloqueio(imovel_id=id, motivo=motivo, **datas)

    conexao = conexao_do_app()
    with conexao.transacao() as t:
        # A trava do imóvel faz um bloqueio e uma reserva das mesmas datas passarem um de cada vez.
        imovel = _imovel_do_administrador(ImovelDAO(conexao, t), id, travar=True)
        if not imovel.ativo:
            raise Conflito("Este imóvel está desativado.")  # decisão 8: o imóvel vem no endereço, sem campo
        conflito = ReservaDAO(conexao, t).buscar_conflito(id, bloqueio.data_inicio, bloqueio.data_fim)
        if conflito is not None:
            raise Conflito(frase_conflito(conflito, "bloqueio"), campo="data_inicio")
        bloqueios = BloqueioDAO(conexao, t)
        relido = bloqueios.buscar_por_id(bloqueios.inserir(bloqueio))
    return jsonify(bloqueio_json(relido)), 201
