"""Formato do JSON da API: o provedor do app converte datas, horários, dinheiro e
enumerações num lugar só, e as funções <assunto>_json montam cada objeto da resposta."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum

from flask.json.provider import DefaultJSONProvider

from gemovel.dominio.reserva import Reserva

MESES = ("jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez")


class ProvedorJson(DefaultJSONProvider):
    """Acentos legíveis, campos na ordem em que foram montados e os formatos da spec §6."""

    ensure_ascii = False
    sort_keys = False

    @staticmethod
    def default(valor):
        if isinstance(valor, datetime):  # antes de date: datetime também é date
            return valor.strftime("%Y-%m-%dT%H:%M")
        if isinstance(valor, date):
            return valor.isoformat()
        if isinstance(valor, time):
            return valor.strftime("%H:%M")
        if isinstance(valor, Decimal):
            return f"{valor:.2f}"
        if isinstance(valor, Enum):
            return valor.value
        return DefaultJSONProvider.default(valor)


def codigo_imovel(id):
    return f"IMV-{id:03d}"


def codigo_reserva(id):
    return f"RSV-{id:04d}"


def usuario_json(usuario):
    """A pessoa logada: a função aparece só para quem é da equipe."""
    dados = {"id": usuario.id, "nome": usuario.nome, "email": usuario.email, "perfil": usuario.perfil()}
    if usuario.perfil() == "funcionario":
        dados["funcao"] = usuario.funcao
    return dados


def funcionario_json(funcionario):
    return {"id": funcionario.id, "nome": funcionario.nome, "email": funcionario.email,
            "telefone": funcionario.telefone, "funcao": funcionario.funcao, "ativo": funcionario.ativo}


def imovel_json(imovel):
    return {"id": imovel.id, "codigo": codigo_imovel(imovel.id), "administrador_id": imovel.administrador_id,
            "nome": imovel.nome, "endereco": imovel.endereco_completo(), "logradouro": imovel.logradouro,
            "numero": imovel.numero, "complemento": imovel.complemento, "bairro": imovel.bairro,
            "cidade": imovel.cidade, "uf": imovel.uf, "cep": imovel.cep, "capacidade": imovel.capacidade,
            "valor_diaria": imovel.valor_diaria, "horario_entrada": imovel.horario_entrada,
            "horario_saida": imovel.horario_saida, "observacoes": imovel.observacoes, "ativo": imovel.ativo}


def imovel_resumo(imovel):
    """O imóvel dentro de outro objeto (reserva, tarefa): só o que identifica."""
    return {"id": imovel.id, "codigo": codigo_imovel(imovel.id), "nome": imovel.nome}


def hospede_json(hospede):
    return {"id": hospede.id, "nome": hospede.nome, "telefone": hospede.telefone, "email": hospede.email,
            "documento": hospede.documento, "observacoes": hospede.observacoes}


def _pessoa_resumo(pessoa):
    return None if pessoa is None else {"id": pessoa.id, "nome": pessoa.nome}


def tarefa_json(tarefa, agora, com_endereco=False):
    """A tarefa; com_endereco acrescenta ao imóvel o endereço e as observações (app da equipe)."""
    imovel = imovel_resumo(tarefa.imovel)
    if com_endereco:
        imovel.update(endereco=tarefa.imovel.endereco_completo(), observacoes=tarefa.imovel.observacoes)
    return {"id": tarefa.id, "tipo": tarefa.tipo, "titulo": tarefa.titulo, "descricao": tarefa.descricao,
            "imovel": imovel, "reserva_id": tarefa.reserva_id, "responsavel": _pessoa_resumo(tarefa.funcionario),
            "agendada_para": tarefa.agendada_para, "prazo": tarefa.prazo, "status": tarefa.status,
            "atrasada": tarefa.esta_atrasada(agora), "iniciada_em": tarefa.iniciada_em,
            "concluida_em": tarefa.concluida_em}


def atividade_json(historico):
    """Uma linha da atividade recente: quem mudou qual tarefa, de qual imóvel, e para qual estado."""
    tarefa = historico.tarefa
    return {"id": historico.id, "registrado_em": historico.registrado_em,
            "status_anterior": historico.status_anterior, "status_novo": historico.status_novo,
            "observacao": historico.observacao, "usuario": _pessoa_resumo(historico.usuario),
            "tarefa": {"id": tarefa.id, "titulo": tarefa.titulo},
            "imovel": {"id": tarefa.imovel.id, "nome": tarefa.imovel.nome}}


def reserva_json(reserva, agora):
    return {"id": reserva.id, "codigo": codigo_reserva(reserva.id), "imovel": imovel_resumo(reserva.imovel),
            "hospede": _pessoa_resumo(reserva.hospede), "data_entrada": reserva.data_entrada,
            "data_saida": reserva.data_saida, "noites": reserva.noites(), "num_hospedes": reserva.num_hospedes,
            "valor_diaria": reserva.valor_diaria, "valor_total": reserva.valor_total, "status": reserva.status,
            "situacao": reserva.situacao(agora, reserva.imovel), "observacoes": reserva.observacoes}


def reserva_completa_json(reserva, limpeza, agora):
    """A reserva aberta na gaveta: o hóspede com os contatos e a limpeza da saída (ou None)."""
    return reserva_json(reserva, agora) | {"hospede": hospede_json(reserva.hospede),
                                           "limpeza": None if limpeza is None else tarefa_json(limpeza, agora)}


def reserva_resumo_json(reserva, agora):
    """A reserva na ficha do hóspede: o que identifica, as datas e o estado."""
    return {"id": reserva.id, "codigo": codigo_reserva(reserva.id), "imovel": imovel_resumo(reserva.imovel),
            "data_entrada": reserva.data_entrada, "data_saida": reserva.data_saida, "status": reserva.status,
            "situacao": reserva.situacao(agora, reserva.imovel)}


def bloqueio_json(bloqueio):
    return {"id": bloqueio.id, "imovel_id": bloqueio.imovel_id, "data_inicio": bloqueio.data_inicio,
            "data_fim": bloqueio.data_fim, "motivo": bloqueio.motivo}


def periodo(inicio, fim):
    """O período nas frases (spec §7): "4 a 7 nov", "30 out a 2 nov" ou "28 dez 2026 a 2 jan 2027"."""
    def dia_e_mes(data):
        return f"{data.day} {MESES[data.month - 1]}"

    if inicio.year != fim.year:
        return f"{dia_e_mes(inicio)} {inicio.year} a {dia_e_mes(fim)} {fim.year}"
    if inicio.month != fim.month:
        return f"{dia_e_mes(inicio)} a {dia_e_mes(fim)}"
    return f"{inicio.day} a {dia_e_mes(fim)}"


def frase_conflito(conflito, criando):
    """A frase do 409 (spec §7) para a reserva ou o bloqueio que já ocupa as datas;
    `criando` diz o que se tentava gravar: "reserva" ou "bloqueio"."""
    if isinstance(conflito, Reserva):
        reserva = (f"{codigo_reserva(conflito.id)} ({conflito.hospede.nome}, "
                   f"{periodo(conflito.data_entrada, conflito.data_saida)})")
        if criando == "reserva":
            return f"Conflita com {reserva}. Escolha outras datas."
        return f"Já há a reserva {reserva} nessas datas."
    motivo = conflito.motivo[:1].lower() + conflito.motivo[1:]  # no meio da frase, com minúscula
    bloqueio = f"{periodo(conflito.data_inicio, conflito.data_fim)} ({motivo})"
    if criando == "reserva":
        return f"O imóvel está bloqueado de {bloqueio}."
    return f"Já há um bloqueio de {bloqueio} nessas datas."
