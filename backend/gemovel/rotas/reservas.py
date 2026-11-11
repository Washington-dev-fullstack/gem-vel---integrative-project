"""Rotas das reservas: a lista de um período e o cadastro, que já cria a limpeza da saída."""

import calendar
from datetime import datetime

from flask import Blueprint, g, jsonify

from gemovel.dao.hospede_dao import HospedeDAO
from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dao.tarefa_dao import TarefaDAO
from gemovel.dominio.hospede import Hospede
from gemovel.dominio.reserva import Reserva
from gemovel.dominio.validacao import PREENCHA
from gemovel.erros import Conflito, ErroValidacao
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data
from gemovel.rotas.formato_json import frase_conflito, reserva_json, tarefa_json

bp = Blueprint("reservas", __name__, url_prefix="/api")


@bp.get("/reservas")
@exige_login("administrador")
def listar():
    agora = datetime.now()
    hoje = agora.date()
    de = parametro_data("de", hoje.replace(day=1))
    ate = parametro_data("ate", hoje.replace(day=calendar.monthrange(hoje.year, hoje.month)[1]))
    if ate < de:
        raise ErroValidacao({"ate": "O fim não pode ser antes do início."})  # decisão 4
    reservas = ReservaDAO(conexao_do_app()).listar_por_periodo(g.usuario.id, de, ate)
    return jsonify(reservas=[reserva_json(r, agora) for r in reservas])


def _hospede_novo(dados, administrador_id):
    """O hóspede que vem dentro da reserva. Os erros levam o prefixo "hospede_novo." (decisão 7)."""
    try:
        leitor = Leitor(dados)
        nome, telefone = leitor.texto("nome"), leitor.texto("telefone")
        leitor.conferir()
        return Hospede(administrador_id=administrador_id, nome=nome, telefone=telefone)
    except ErroValidacao as erro:
        raise ErroValidacao({f"hospede_novo.{campo}": mensagem for campo, mensagem in erro.campos.items()}) from erro


def _frase_capacidade(imovel):
    """Decisão 5: sem artigo antes do nome, e "1 hóspede" no singular."""
    hospedes = "hóspede" if imovel.capacidade == 1 else "hóspedes"
    return f"{imovel.nome} recebe até {imovel.capacidade} {hospedes}."


@bp.post("/reservas")
@exige_login("administrador")
def cadastrar():
    agora = datetime.now()
    leitor = Leitor(corpo_json())
    imovel_id = leitor.inteiro("imovel_id")
    hospede_id = leitor.inteiro("hospede_id")
    hospede_novo = leitor.objeto("hospede_novo")
    datas = {"data_entrada": leitor.data("data_entrada"), "data_saida": leitor.data("data_saida")}
    num_hospedes = leitor.inteiro("num_hospedes")
    valor_total = leitor.dinheiro("valor_total")
    observacoes = leitor.texto("observacoes")
    leitor.conferir()

    conexao = conexao_do_app()
    with conexao.transacao() as t:  # tudo ou nada, na ordem da spec §5
        # 1. A trava do imóvel faz duas reservas das mesmas datas passarem uma de cada vez:
        #    a segunda só procura o conflito depois que a primeira gravou.
        if imovel_id is None:
            raise ErroValidacao({"imovel_id": PREENCHA})
        imovel = ImovelDAO(conexao, t).buscar_por_id(imovel_id, travar=True)
        if imovel is None or imovel.administrador_id != g.usuario.id:
            raise ErroValidacao({"imovel_id": "Imóvel não encontrado."})
        if not imovel.ativo:
            raise ErroValidacao({"imovel_id": "Este imóvel está desativado."})

        # 2. O hóspede: o novo (que vale mais que o hospede_id) ou um dos cadastrados.
        hospedes = HospedeDAO(conexao, t)
        if hospede_novo is not None:
            hospede_id = hospedes.inserir(_hospede_novo(hospede_novo, g.usuario.id))
        else:
            if hospede_id is None:
                raise ErroValidacao({"hospede_id": PREENCHA})
            hospede = hospedes.buscar_por_id(hospede_id)
            if hospede is None or hospede.administrador_id != g.usuario.id:
                raise ErroValidacao({"hospede_id": "Hóspede não encontrado."})

        # 3. A reserva, com a diária do imóvel; a capacidade (R3) e o conflito (R1).
        reserva = Reserva(imovel_id=imovel.id, hospede_id=hospede_id, num_hospedes=num_hospedes,
                          valor_diaria=imovel.valor_diaria, valor_total=valor_total, observacoes=observacoes, **datas)
        if not imovel.comporta(reserva.num_hospedes):
            raise ErroValidacao({"num_hospedes": _frase_capacidade(imovel)})
        reservas = ReservaDAO(conexao, t)
        conflito = reservas.buscar_conflito(imovel.id, reserva.data_entrada, reserva.data_saida)
        if conflito is not None:
            raise Conflito(frase_conflito(conflito, "reserva"), campo="data_entrada")

        # 4. Grava, relê e cria a limpeza da saída em nome de quem reservou (R4).
        relida = reservas.buscar_por_id(reservas.inserir(reserva))
        tarefas = TarefaDAO(conexao, t)
        limpeza = tarefas.buscar_por_id(tarefas.inserir(relida.criar_limpeza_de_saida(imovel), g.usuario))
    return jsonify(reserva_json(relida, agora) | {"limpeza": tarefa_json(limpeza, agora)}), 201
