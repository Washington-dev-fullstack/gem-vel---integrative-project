"""Formato do JSON da API: o provedor do app converte datas, horários, dinheiro e
enumerações num lugar só, e as funções <assunto>_json montam cada objeto da resposta."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum

from flask.json.provider import DefaultJSONProvider


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
