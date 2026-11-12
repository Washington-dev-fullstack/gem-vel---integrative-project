"""Rotas dos imóveis: cada administrador vê, cadastra, edita e desativa só os imóveis dele, com os
indicadores (prontidão, próxima entrada, ocupação do mês e reservas futuras), e os bloqueios."""

import calendar
from datetime import datetime, time
from decimal import Decimal

from flask import Blueprint, g, jsonify

from gemovel.dao.bloqueio_dao import BloqueioDAO
from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dao.tarefa_dao import TarefaDAO
from gemovel.dominio.bloqueio import Bloqueio
from gemovel.dominio.imovel import Imovel
from gemovel.dominio.indicadores import (noites_no_periodo, percentual, prontidao, proxima_entrada,
                                         receita_no_periodo, reservas_futuras)
from gemovel.erros import Conflito, ErroValidacao, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data
from gemovel.rotas.formato_json import bloqueio_json, frase_conflito, imovel_json, proxima_entrada_json

bp = Blueprint("imoveis", __name__, url_prefix="/api")

# Padrões do cadastro (os mesmos da tabela).
CAPACIDADE_PADRAO = 2
ENTRADA_PADRAO = time(15, 0)
SAIDA_PADRAO = time(11, 0)

_TEXTOS = ("nome", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "cep", "observacoes")


def _mes(dia):
    """O primeiro e o último dia do mês de `dia`."""
    return dia.replace(day=1), dia.replace(day=calendar.monthrange(dia.year, dia.month)[1])


def _dados_dos_indicadores(conexao, agora, imovel_id=None, transacao=None):
    """As reservas e as limpezas abertas que os indicadores usam: uma consulta de cada, para a
    lista inteira (nunca uma por imóvel)."""
    hoje = agora.date()
    reservas = ReservaDAO(conexao, transacao).listar_para_indicadores(g.usuario.id, hoje.replace(day=1), hoje, imovel_id)
    return reservas, TarefaDAO(conexao, transacao).listar_abertas(g.usuario.id)


def _indicadores(imovel, reservas, limpezas, agora):
    inicio, fim = _mes(agora.date())
    noites = sum(noites_no_periodo(r.data_entrada, r.data_saida, inicio, fim) for r in reservas if r.imovel_id == imovel.id)
    return {"prontidao": prontidao(imovel, reservas, limpezas, agora),
            "proxima_entrada": proxima_entrada_json(proxima_entrada(imovel, reservas, agora)),
            "ocupacao_mes": {"percentual": percentual(noites, fim.day), "noites": noites, "noites_mes": fim.day},
            "reservas_futuras": reservas_futuras(imovel, reservas, agora)}


def _detalhe_json(conexao, imovel, agora):
    """O imóvel com os indicadores e a receita do mês (as noites do mês de cada reserva)."""
    reservas, limpezas = _dados_dos_indicadores(conexao, agora, imovel.id)
    inicio, fim = _mes(agora.date())
    receita = sum((receita_no_periodo(r, inicio, fim) for r in reservas), Decimal("0.00"))
    return imovel_json(imovel) | _indicadores(imovel, reservas, limpezas, agora) | {"receita_mes": receita}


def _ler_imovel():
    """Os campos do cadastro, no cadastrar e no editar. Aqui só se confere o formato."""
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in _TEXTOS}
    dados["capacidade"] = leitor.inteiro("capacidade", CAPACIDADE_PADRAO)
    dados["valor_diaria"] = leitor.dinheiro("valor_diaria")
    dados["horario_entrada"] = leitor.horario("horario_entrada", ENTRADA_PADRAO)
    dados["horario_saida"] = leitor.horario("horario_saida", SAIDA_PADRAO)
    leitor.conferir()
    return dados


def _imovel_do_administrador(dao, id, travar=False):
    """O imóvel do administrador logado. O de outro administrador também dá 404: não diz que existe."""
    imovel = dao.buscar_por_id(id, travar=travar)
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise NaoEncontrado()
    return imovel


@bp.get("/imoveis")
@exige_login("administrador")
def listar():
    agora = datetime.now()
    conexao = conexao_do_app()
    imoveis = ImovelDAO(conexao).listar_por_administrador(g.usuario.id)
    reservas, limpezas = _dados_dos_indicadores(conexao, agora)
    return jsonify(imoveis=[imovel_json(i) | _indicadores(i, reservas, limpezas, agora) for i in imoveis])


@bp.post("/imoveis")
@exige_login("administrador")
def cadastrar():
    imovel = Imovel(administrador_id=g.usuario.id, **_ler_imovel())
    dao = ImovelDAO(conexao_do_app())
    novo_id = dao.inserir(imovel)
    return jsonify(imovel_json(dao.buscar_por_id(novo_id))), 201


@bp.get("/imoveis/<int:id>")
@exige_login("administrador")
def detalhar(id):
    conexao = conexao_do_app()
    return jsonify(_detalhe_json(conexao, _imovel_do_administrador(ImovelDAO(conexao), id), datetime.now()))


@bp.patch("/imoveis/<int:id>")
@exige_login("administrador")
def editar(id):
    dados = _ler_imovel()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = ImovelDAO(conexao, t)
        atual = _imovel_do_administrador(dao, id, travar=True)
        dao.atualizar(Imovel(id=id, administrador_id=g.usuario.id, ativo=atual.ativo, **dados))
    return jsonify(_detalhe_json(conexao, ImovelDAO(conexao).buscar_por_id(id), datetime.now()))


@bp.post("/imoveis/<int:id>/desativar")
@exige_login("administrador")
def desativar(id):
    agora = datetime.now()
    corpo_json()  # escrita só aceita JSON; o corpo é {}
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        # A trava vem antes da leitura das reservas: uma reserva nova não entra no meio da conta.
        dao = ImovelDAO(conexao, t)
        imovel = _imovel_do_administrador(dao, id, travar=True)
        reservas, _ = _dados_dos_indicadores(conexao, agora, id, t)
        futuras = reservas_futuras(imovel, reservas, agora)
        if futuras:
            raise Conflito(f"Há 1 reserva futura neste imóvel." if futuras == 1
                           else f"Há {futuras} reservas futuras neste imóvel.")
        dao.mudar_ativo(id, False)
    return jsonify(_detalhe_json(conexao, ImovelDAO(conexao).buscar_por_id(id), agora))


@bp.post("/imoveis/<int:id>/reativar")
@exige_login("administrador")
def reativar(id):
    corpo_json()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = ImovelDAO(conexao, t)
        _imovel_do_administrador(dao, id, travar=True)
        dao.mudar_ativo(id, True)
    return jsonify(_detalhe_json(conexao, ImovelDAO(conexao).buscar_por_id(id), datetime.now()))


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


@bp.get("/bloqueios")
@exige_login("administrador")
def bloqueios_do_periodo():
    """Os bloqueios de todos os imóveis do administrador que cruzam o período (padrão: o mês atual)."""
    inicio, fim = _mes(datetime.now().date())
    de, ate = parametro_data("de", inicio), parametro_data("ate", fim)
    if ate < de:
        raise ErroValidacao({"ate": "O fim não pode ser antes do início."})
    bloqueios = BloqueioDAO(conexao_do_app()).listar_por_periodo(g.usuario.id, de, ate)
    return jsonify(bloqueios=[bloqueio_json(b) for b in bloqueios])


@bp.delete("/bloqueios/<int:id>")
@exige_login("administrador")
def excluir_bloqueio(id):
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        bloqueios = BloqueioDAO(conexao, t)
        bloqueio = bloqueios.buscar_por_id(id)
        if bloqueio is None:
            raise NaoEncontrado()
        _imovel_do_administrador(ImovelDAO(conexao, t), bloqueio.imovel_id)
        bloqueios.excluir(id)
    return "", 204
