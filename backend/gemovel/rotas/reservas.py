"""Rotas das reservas: a lista de um período, uma reserva, o cadastro (que já cria a limpeza da
saída), editar e cancelar."""

import calendar
from datetime import datetime

from flask import Blueprint, g, jsonify

from gemovel.dao.hospede_dao import HospedeDAO
from gemovel.dao.imovel_dao import ImovelDAO
from gemovel.dao.reserva_dao import ReservaDAO
from gemovel.dao.tarefa_dao import TarefaDAO
from gemovel.dominio.enums import StatusReserva, StatusTarefa
from gemovel.dominio.hospede import Hospede
from gemovel.dominio.reserva import Reserva
from gemovel.dominio.validacao import PREENCHA
from gemovel.erros import Conflito, ErroValidacao, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data
from gemovel.rotas.formato_json import frase_conflito, reserva_completa_json, reserva_json, tarefa_json

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


def _reserva_do_administrador(reservas, id):
    """A reserva de um imóvel do administrador logado. A de outro administrador também dá 404."""
    reserva = reservas.buscar_por_id(id)
    if reserva is None or reserva.imovel.administrador_id != g.usuario.id:
        raise NaoEncontrado()
    return reserva


@bp.get("/reservas/<int:id>")
@exige_login("administrador")
def detalhar(id):
    agora = datetime.now()
    conexao = conexao_do_app()
    reserva = _reserva_do_administrador(ReservaDAO(conexao), id)
    return jsonify(reserva_completa_json(reserva, TarefaDAO(conexao).buscar_limpeza_da_reserva(id), agora))


def _ler_reserva():
    """Os campos do formulário da reserva, os mesmos no cadastro e na edição (decisão 2 do plano),
    com o hóspede novo. Aqui só se confere o formato; as regras vêm depois, dentro da transação."""
    leitor = Leitor(corpo_json())
    campos = {"imovel_id": leitor.inteiro("imovel_id"), "hospede_id": leitor.inteiro("hospede_id"),
              "data_entrada": leitor.data("data_entrada"), "data_saida": leitor.data("data_saida"),
              "num_hospedes": leitor.inteiro("num_hospedes"), "valor_total": leitor.dinheiro("valor_total"),
              "observacoes": leitor.texto("observacoes")}
    hospede_novo = leitor.objeto("hospede_novo")
    leitor.conferir()
    return campos, hospede_novo


def _hospede_novo(dados, administrador_id):
    """O hóspede que vem dentro da reserva. Os erros levam o prefixo "hospede_novo." (decisão 7)."""
    try:
        leitor = Leitor(dados)
        campos = {campo: leitor.texto(campo) for campo in ("nome", "telefone", "email", "documento")}
        leitor.conferir()
        return Hospede(administrador_id=administrador_id, **campos)
    except ErroValidacao as erro:
        raise ErroValidacao({f"hospede_novo.{campo}": mensagem for campo, mensagem in erro.campos.items()}) from erro


def _travar_imovel(conexao, t, imovel_id):
    """Trava o imóvel (FOR UPDATE) antes de qualquer outra leitura da transação: duas gravações
    nas mesmas datas passam uma de cada vez, e a segunda só procura o conflito depois que a
    primeira gravou."""
    return None if imovel_id is None else ImovelDAO(conexao, t).buscar_por_id(imovel_id, travar=True)


def _conferir_imovel(imovel, imovel_id, aceita_desativado=False):
    if imovel_id is None:
        raise ErroValidacao({"imovel_id": PREENCHA})
    if imovel is None or imovel.administrador_id != g.usuario.id:
        raise ErroValidacao({"imovel_id": "Imóvel não encontrado."})
    if not imovel.ativo and not aceita_desativado:
        raise ErroValidacao({"imovel_id": "Este imóvel está desativado."})


def _conferir_hospede(hospedes, hospede_id):
    if hospede_id is None:
        raise ErroValidacao({"hospede_id": PREENCHA})
    hospede = hospedes.buscar_por_id(hospede_id)
    if hospede is None or hospede.administrador_id != g.usuario.id:
        raise ErroValidacao({"hospede_id": "Hóspede não encontrado."})


def _hospede_da_reserva(hospedes, hospede_id, hospede_novo):
    """O id do hóspede da reserva, no cadastro e na edição: o novo, que vale mais que o hospede_id
    (gravado aqui, dentro da transação), ou um dos cadastrados."""
    if hospede_novo is not None:
        return hospedes.inserir(_hospede_novo(hospede_novo, g.usuario.id))
    _conferir_hospede(hospedes, hospede_id)
    return hospede_id


def _frase_capacidade(imovel):
    """Decisão 5: sem artigo antes do nome, e "1 hóspede" no singular."""
    hospedes = "hóspede" if imovel.capacidade == 1 else "hóspedes"
    return f"{imovel.nome} recebe até {imovel.capacidade} {hospedes}."


def _conferir_lotacao_e_datas(reservas, imovel, reserva):
    """A capacidade (R3) e o conflito com outra reserva ou com um bloqueio (R1). A reserva que
    está sendo editada não conflita com ela mesma."""
    if not imovel.comporta(reserva.num_hospedes):
        raise ErroValidacao({"num_hospedes": _frase_capacidade(imovel)})
    conflito = reservas.buscar_conflito(imovel.id, reserva.data_entrada, reserva.data_saida, ignorar_id=reserva.id)
    if conflito is not None:
        raise Conflito(frase_conflito(conflito, "reserva"), campo="data_entrada")


@bp.post("/reservas")
@exige_login("administrador")
def cadastrar():
    agora = datetime.now()
    campos, hospede_novo = _ler_reserva()
    conexao = conexao_do_app()
    with conexao.transacao() as t:  # tudo ou nada, na ordem da spec §5
        # 1. O imóvel, travado antes de tudo.
        imovel = _travar_imovel(conexao, t, campos["imovel_id"])
        _conferir_imovel(imovel, campos["imovel_id"])

        # 2. O hóspede: o novo (que vale mais que o hospede_id) ou um dos cadastrados.
        campos["hospede_id"] = _hospede_da_reserva(HospedeDAO(conexao, t), campos["hospede_id"], hospede_novo)

        # 3. A reserva, com a diária do imóvel; a capacidade (R3) e o conflito (R1).
        reserva = Reserva(valor_diaria=imovel.valor_diaria, **campos)
        reservas = ReservaDAO(conexao, t)
        _conferir_lotacao_e_datas(reservas, imovel, reserva)

        # 4. Grava, relê e cria a limpeza da saída em nome de quem reservou (R4).
        relida = reservas.buscar_por_id(reservas.inserir(reserva))
        tarefas = TarefaDAO(conexao, t)
        limpeza = tarefas.buscar_por_id(tarefas.inserir(relida.criar_limpeza_de_saida(imovel), g.usuario))
    return jsonify(reserva_json(relida, agora) | {"limpeza": tarefa_json(limpeza, agora)}), 201


@bp.patch("/reservas/<int:id>")
@exige_login("administrador")
def editar(id):
    agora = datetime.now()
    campos, hospede_novo = _ler_reserva()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        # As travas vêm antes das leituras: o imóvel de destino (como no cadastro) e a reserva.
        imovel = _travar_imovel(conexao, t, campos["imovel_id"])
        reservas = ReservaDAO(conexao, t)
        reservas.travar(id)
        atual = _reserva_do_administrador(reservas, id)
        if atual.status is StatusReserva.CANCELADA:
            raise Conflito("Esta reserva está cancelada.")
        mudou_de_imovel = campos["imovel_id"] != atual.imovel_id
        # A reserva que já estava num imóvel desativado ainda pode ser corrigida; mudar para ele, não.
        _conferir_imovel(imovel, campos["imovel_id"], aceita_desativado=not mudou_de_imovel)
        campos["hospede_id"] = _hospede_da_reserva(HospedeDAO(conexao, t), campos["hospede_id"], hospede_novo)

        # A diária é a da reserva; no outro imóvel, vale a diária dele. Sem valor_total, recalcula (R2).
        diaria = imovel.valor_diaria if mudou_de_imovel else atual.valor_diaria
        reserva = Reserva(id=id, valor_diaria=diaria, **campos)
        _conferir_lotacao_e_datas(reservas, imovel, reserva)
        reservas.atualizar(reserva)

        # A limpeza da saída ainda pendente vai junto (R4; decisão 3); a que já começou fica como está.
        tarefas = TarefaDAO(conexao, t)
        limpeza = tarefas.buscar_limpeza_da_reserva(id)
        if (limpeza is not None and limpeza.status is StatusTarefa.PENDENTE
                and (mudou_de_imovel or reserva.data_saida != atual.data_saida)):
            nova = reserva.criar_limpeza_de_saida(imovel)
            limpeza.reagendar(imovel, nova.agendada_para, nova.prazo)
            tarefas.atualizar(limpeza)
        relida = reservas.buscar_por_id(id)
        limpeza = tarefas.buscar_limpeza_da_reserva(id)
    return jsonify(reserva_completa_json(relida, limpeza, agora))


@bp.post("/reservas/<int:id>/cancelar")
@exige_login("administrador")
def cancelar(id):
    agora = datetime.now()
    corpo_json()  # escrita só aceita JSON; o corpo é {}
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        reservas = ReservaDAO(conexao, t)
        reservas.travar(id)
        reserva = _reserva_do_administrador(reservas, id)
        reserva.cancelar()
        reservas.atualizar(reserva)

        # A limpeza da saída ainda pendente é apagada, com o histórico dela (decisão 4).
        tarefas = TarefaDAO(conexao, t)
        limpeza = tarefas.buscar_limpeza_da_reserva(id)
        if limpeza is not None and limpeza.status is StatusTarefa.PENDENTE:
            tarefas.excluir(limpeza.id)
            limpeza = None
        relida = reservas.buscar_por_id(id)
    return jsonify(reserva_completa_json(relida, limpeza, agora))
