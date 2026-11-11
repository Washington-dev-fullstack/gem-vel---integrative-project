"""Rotas da sessão: entrar, ver quem está logado e sair (spec §5)."""

from flask import Blueprint, g, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash

from gemovel.dao.usuario_dao import UsuarioDAO
from gemovel.dominio.validacao import Validador, limpar
from gemovel.erros import NaoAutenticado, SemPermissao
from gemovel.rotas import conexao_do_app
from gemovel.rotas.autenticacao import exige_login
from gemovel.rotas.entrada import Leitor, corpo_json
from gemovel.rotas.formato_json import usuario_json

bp = Blueprint("sessao", __name__, url_prefix="/api")

SENHA_NAO_CONFERE = "E-mail ou senha não conferem."
ACESSO_DESATIVADO = "Este acesso foi desativado. Fale com quem administra o Gemóvel."

# Conferido quando o e-mail não existe: a resposta leva o mesmo tempo de uma senha errada,
# e ninguém descobre pelo tempo quais e-mails têm acesso.
HASH_FALSO = generate_password_hash("hash-falso-para-e-mail-desconhecido")


@bp.post("/sessao")
def entrar():
    leitor = Leitor(corpo_json())
    email, senha = leitor.texto("email"), leitor.texto("senha")
    leitor.conferir()
    v = Validador()
    email = v.exigir("email", limpar(email))
    v.exigir("senha", senha or None)
    v.conferir()

    usuario = UsuarioDAO(conexao_do_app()).buscar_por_email(email.lower())
    if usuario is None:
        check_password_hash(HASH_FALSO, senha)
        raise NaoAutenticado(SENHA_NAO_CONFERE)
    if not usuario.verificar_senha(senha):
        raise NaoAutenticado(SENHA_NAO_CONFERE)
    if not usuario.ativo:
        raise SemPermissao(ACESSO_DESATIVADO)
    session.clear()
    session["usuario_id"] = usuario.id
    return jsonify(usuario=usuario_json(usuario))


@bp.get("/sessao")
@exige_login()
def quem_esta_logado():
    return jsonify(usuario=usuario_json(g.usuario))


@bp.delete("/sessao")
def sair():
    session.clear()
    return "", 204
