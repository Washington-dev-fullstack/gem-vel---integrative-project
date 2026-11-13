"""Rotas do painel do administrador: a visão geral de um mês (indicadores, receita dos 12 meses,
ocupação por imóvel e o que pede atenção hoje) e a busca geral do topo."""

import calendar
import re
from datetime import date, datetime, timedelta
from decimal import Decimal

from flask import Blueprint, g, jsonify, request

from gemovel.dao.hospede_dao import HospedeDAO
from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dao.tarefa_dao import TarefaDAO
from gemovel.dominio.enums import StatusReserva, TipoTarefa
from gemovel.dominio.indicadores import noites_no_periodo, percentual, receita_no_periodo, resumo_do_mes
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import parametro_mes
from gemovel.rotas.formato_json import codigo_reserva, imovel_resumo, reserva_json, tarefa_json

bp = Blueprint("painel", __name__, url_prefix="/api")

MESES_DO_GRAFICO = 12
MAXIMO_POR_GRUPO = 5
BUSCA_MINIMA = 2  # letras

# O código que a pessoa digita na busca: IMV-003, imv3, RSV-0012...
_CODIGO_IMOVEL = re.compile(r"imv-?(\d{1,9})", re.IGNORECASE)
_CODIGO_RESERVA = re.compile(r"rsv-?(\d{1,9})", re.IGNORECASE)


def _fim_do_mes(inicio):
    return inicio.replace(day=calendar.monthrange(inicio.year, inicio.month)[1])


def _meses_ate(mes, quantos):
    """O dia 1 de cada um dos `quantos` meses que terminam em `mes`, do mais antigo ao mais novo."""
    indice = mes.year * 12 + mes.month - 1
    return [date(i // 12, i % 12 + 1, 1) for i in range(indice - quantos + 1, indice + 1)]


def _ocupacao_por_imovel(reservas, ativos, inicio, fim):
    validas = [r for r in reservas if r.status is not StatusReserva.CANCELADA]
    linhas = []
    for imovel in ativos:
        noites = sum(noites_no_periodo(r.data_entrada, r.data_saida, inicio, fim) for r in validas
                     if r.imovel_id == imovel.id)
        linhas.append({"imovel": imovel_resumo(imovel), "percentual": percentual(noites, fim.day), "noites": noites})
    return linhas


def _hoje(conexao, agora):
    """Chegadas e saídas de hoje (confirmadas) e o que precisa de atenção: as tarefas atrasadas (R7)
    e as limpezas de hoje ainda sem responsável."""
    hoje = agora.date()
    # A reserva que sai hoje não ocupa a noite de hoje: o período começa ontem para trazê-la.
    reservas = ReservaDAO(conexao).listar_por_periodo(g.usuario.id, hoje - timedelta(days=1), hoje)
    confirmadas = [r for r in reservas if r.status is StatusReserva.CONFIRMADA]
    chegadas = sorted((r for r in confirmadas if r.data_entrada == hoje),
                      key=lambda r: (r.imovel.horario_entrada, r.imovel.nome, r.id))
    saidas = sorted((r for r in confirmadas if r.data_saida == hoje),
                    key=lambda r: (r.imovel.horario_saida, r.imovel.nome, r.id))
    atencao = [t for t in TarefaDAO(conexao).listar_abertas(g.usuario.id)
               if t.esta_atrasada(agora) or (t.tipo is TipoTarefa.LIMPEZA and t.funcionario_id is None
                                            and t.agendada_para.date() == hoje)]
    return {"chegadas": [reserva_json(r, agora) for r in chegadas],
            "saidas": [reserva_json(r, agora) for r in saidas],
            "atencao": [tarefa_json(t, agora) for t in atencao]}


@bp.get("/visao-geral")
@exige_login("administrador")
def visao_geral():
    agora = datetime.now()
    inicio = parametro_mes("mes", agora.date().replace(day=1))
    fim = _fim_do_mes(inicio)
    meses = _meses_ate(inicio, MESES_DO_GRAFICO)
    conexao = conexao_do_app()
    # Uma consulta para os 12 meses: o gráfico, os indicadores e a ocupação saem dela.
    reservas = ReservaDAO(conexao).listar_por_periodo(g.usuario.id, meses[0], fim)
    ativos = [imovel for imovel in ImovelDAO(conexao).listar_por_administrador(g.usuario.id) if imovel.ativo]
    receita_por_mes = [{"mes": f"{mes:%Y-%m}",
                        "receita": sum((receita_no_periodo(r, mes, _fim_do_mes(mes)) for r in reservas), Decimal("0.00"))}
                       for mes in meses]
    return jsonify(mes=f"{inicio:%Y-%m}", indicadores=resumo_do_mes(reservas, ativos, inicio, fim),
                   receita_por_mes=receita_por_mes, ocupacao_por_imovel=_ocupacao_por_imovel(reservas, ativos, inicio, fim),
                   hoje=_hoje(conexao, agora))


def _id_do_codigo(padrao, termo):
    codigo = padrao.fullmatch(termo)
    return int(codigo[1]) if codigo else None


@bp.get("/busca")
@exige_login("administrador")
def busca():
    """No máximo 5 de cada: imóvel por nome ou código, reserva por código ou nome do hóspede e
    hóspede por nome ou telefone (a regra do HospedeDAO.buscar). Menos de 2 letras: nada."""
    termo = request.args.get("q", "").strip()
    if len(termo) < BUSCA_MINIMA:
        return jsonify(imoveis=[], reservas=[], hospedes=[])
    conexao = conexao_do_app()
    imoveis = ImovelDAO(conexao).buscar(g.usuario.id, termo, _id_do_codigo(_CODIGO_IMOVEL, termo), MAXIMO_POR_GRUPO)
    reservas = ReservaDAO(conexao).buscar(g.usuario.id, termo, _id_do_codigo(_CODIGO_RESERVA, termo), MAXIMO_POR_GRUPO)
    hospedes = [hospede for hospede, _ in HospedeDAO(conexao).buscar(g.usuario.id, termo)][:MAXIMO_POR_GRUPO]
    return jsonify(
        imoveis=[imovel_resumo(i) | {"bairro": i.bairro, "ativo": i.ativo} for i in imoveis],
        reservas=[{"id": r.id, "codigo": codigo_reserva(r.id), "hospede": {"id": r.hospede.id, "nome": r.hospede.nome},
                   "imovel": imovel_resumo(r.imovel), "data_entrada": r.data_entrada, "data_saida": r.data_saida,
                   "status": r.status} for r in reservas],
        hospedes=[{"id": h.id, "nome": h.nome, "telefone": h.telefone} for h in hospedes])
