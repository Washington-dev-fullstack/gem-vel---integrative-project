"""Rotas da equipe: cada administrador lista as pessoas que fazem as tarefas (com o dia de cada uma),
cadastra, edita, troca a senha, desativa e reativa."""

from datetime import datetime

from flask import Blueprint, g, jsonify

from gemovel.dao.tarefa_dao import TarefaDAO
from gemovel.dao.usuario_dao import EMAIL_REPETIDO, FuncionarioDAO
from gemovel.dominio.enums import Funcao, StatusTarefa
from gemovel.dominio.usuario import Funcionario
from gemovel.erros import Conflito, NaoEncontrado
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json, parametro_data
from gemovel.rotas.formato_json import funcionario_json

bp = Blueprint("funcionarios", __name__, url_prefix="/api")

_CAMPOS = ("nome", "email", "telefone", "funcao")
_NOME_DA_FUNCAO = {Funcao.LIMPEZA: "limpeza", Funcao.MANUTENCAO: "manutenção"}


def _imovel_curto(tarefa):
    return {"id": tarefa.imovel.id, "nome": tarefa.imovel.nome}


def _resumo_da_pessoa(pessoa, tarefas, dia, agora):
    """As tarefas do `dia` (por horário), a que está em andamento, a próxima pendente a partir de agora
    e quantas pendentes a pessoa tem depois de agora."""
    dela = [t for t in tarefas if t.funcionario_id == pessoa.id]
    do_dia = [t for t in dela if t.agendada_para.date() == dia]
    em_andamento = next((t for t in dela if t.status is StatusTarefa.EM_ANDAMENTO), None)
    pendentes = [t for t in dela if t.status is StatusTarefa.PENDENTE and t.agendada_para >= agora]
    return {"dia": {"total": len(do_dia), "concluidas": sum(t.status is StatusTarefa.CONCLUIDA for t in do_dia),
                    "estados": [t.status for t in do_dia]},
            "agora": None if em_andamento is None else {"id": em_andamento.id, "titulo": em_andamento.titulo,
                                                         "imovel": _imovel_curto(em_andamento)},
            "proxima": None if not pendentes else {"agendada_para": pendentes[0].agendada_para,
                                                   "imovel": _imovel_curto(pendentes[0])},
            "futuras_pendentes": sum(t.agendada_para > agora for t in pendentes)}


def _pessoa_do_administrador(dao, id):
    """A pessoa da equipe do administrador logado. A de outro administrador, ou quem não é da
    equipe, dá 404: não diz que existe."""
    pessoa = dao.buscar_por_id(id)
    if pessoa is None or pessoa.perfil() != "funcionario" or pessoa.administrador_id != g.usuario.id:
        raise NaoEncontrado()
    return pessoa


def _pessoa_json(conexao, id):
    return funcionario_json(FuncionarioDAO(conexao).buscar_por_id(id))


@bp.get("/funcionarios")
@exige_login("administrador")
def listar():
    """A equipe por nome, cada pessoa com o resumo do `dia` (padrão: hoje)."""
    agora = datetime.now()
    dia = parametro_data("dia", agora.date())
    conexao = conexao_do_app()
    equipe = FuncionarioDAO(conexao).listar_por_administrador(g.usuario.id)
    tarefas = TarefaDAO(conexao).listar_para_equipe(g.usuario.id, dia, agora)
    return jsonify(funcionarios=[funcionario_json(f) | _resumo_da_pessoa(f, tarefas, dia, agora) for f in equipe])


@bp.post("/funcionarios")
@exige_login("administrador")
def cadastrar():
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in (*_CAMPOS, "senha")}
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


@bp.patch("/funcionarios/<int:id>")
@exige_login("administrador")
def editar(id):
    """Nome, e-mail, telefone e função. A função só muda sem tarefas abertas da função antiga."""
    leitor = Leitor(corpo_json())
    dados = {campo: leitor.texto(campo) for campo in _CAMPOS}
    leitor.conferir()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = FuncionarioDAO(conexao, t)
        atual = _pessoa_do_administrador(dao, id)
        pessoa = Funcionario(id=id, administrador_id=g.usuario.id, senha_hash=atual.senha_hash,
                             ativo=atual.ativo, **dados)
        dono_do_email = dao.buscar_por_email(pessoa.email)
        if dono_do_email is not None and dono_do_email.id != id:
            raise Conflito(EMAIL_REPETIDO, campo="email")
        if pessoa.funcao is not atual.funcao and TarefaDAO(conexao, t).contar_abertas_do_funcionario(id):
            raise Conflito(f"Esta pessoa tem tarefas pendentes de {_NOME_DA_FUNCAO[atual.funcao]}. "
                           "Passe as tarefas para outra pessoa antes de mudar a função.", campo="funcao")
        dao.atualizar(pessoa)
    return jsonify(_pessoa_json(conexao, id))


@bp.post("/funcionarios/<int:id>/senha")
@exige_login("administrador")
def trocar_senha(id):
    leitor = Leitor(corpo_json())
    senha = leitor.texto("senha")
    leitor.conferir()
    dao = FuncionarioDAO(conexao_do_app())
    pessoa = _pessoa_do_administrador(dao, id)
    pessoa.definir_senha(senha)
    dao.mudar_senha(id, pessoa.senha_hash)
    return "", 204


@bp.post("/funcionarios/<int:id>/desativar")
@exige_login("administrador")
def desativar(id):
    """Tira o acesso e o responsável das tarefas pendentes dela agendadas depois de agora (decisão 5)."""
    corpo_json()  # escrita só aceita JSON; o corpo é {}
    agora = datetime.now()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = FuncionarioDAO(conexao, t)
        _pessoa_do_administrador(dao, id)
        dao.mudar_ativo(id, False)
        liberadas = TarefaDAO(conexao, t).liberar_pendentes_futuras(id, agora)
    return jsonify(funcionario=_pessoa_json(conexao, id), tarefas_liberadas=liberadas)


@bp.post("/funcionarios/<int:id>/reativar")
@exige_login("administrador")
def reativar(id):
    corpo_json()
    conexao = conexao_do_app()
    with conexao.transacao() as t:
        dao = FuncionarioDAO(conexao, t)
        _pessoa_do_administrador(dao, id)
        dao.mudar_ativo(id, True)
    return jsonify(_pessoa_json(conexao, id))
