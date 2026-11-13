"""Rotas da API. Cada arquivo tem um Blueprint com o prefixo /api; aqui ficam o registro
dos Blueprints e os tratadores de erro, que respondem sempre no mesmo formato:
{"erro": {"mensagem": ..., "campos": {...}}}."""

from flask import current_app, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from gemovel.conexao import BancoIndisponivel
from gemovel.erros import (Conflito, ErroGemovel, ErroValidacao, NaoAutenticado, NaoEncontrado,
                           PedidoInvalido, SemPermissao)

MENSAGEM_500 = "Algo deu errado do nosso lado. Tente de novo."

_STATUS_DO_ERRO = ((ErroValidacao, 422), (Conflito, 409), (NaoEncontrado, 404),
                   (NaoAutenticado, 401), (SemPermissao, 403), (PedidoInvalido, 400))

# Erros do próprio Flask nos endereços /api (decisão 14 do plano).
_MENSAGEM_HTTP = {400: PedidoInvalido().mensagem, 404: NaoEncontrado().mensagem,
                  405: "Este endereço não aceita este método."}


def conexao_do_app():
    """A Conexao do app que atende o pedido."""
    return current_app.extensions["gemovel.conexao"]


def resposta_de_erro(mensagem, status, campos=None):
    return jsonify(erro={"mensagem": mensagem, "campos": campos or {}}), status


def _e_da_api():
    return request.path == "/api" or request.path.startswith("/api/")


def registrar(app):
    """Registra os Blueprints e os tratadores de erro no app."""
    from gemovel.rotas import (atividade, funcionarios, hospedes, imoveis, paginas, painel, reservas, saude,
                               sessao, tarefas)

    for modulo in (saude, sessao, funcionarios, imoveis, hospedes, reservas, tarefas, atividade, painel, paginas):
        app.register_blueprint(modulo.bp)

    @app.errorhandler(ErroGemovel)
    def _erro_gemovel(erro):
        status = next((codigo for classe, codigo in _STATUS_DO_ERRO if isinstance(erro, classe)), 500)
        return resposta_de_erro(erro.mensagem, status, erro.campos)

    @app.errorhandler(BancoIndisponivel)
    def _banco_indisponivel(erro):
        return resposta_de_erro(str(erro), 503)

    @app.errorhandler(HTTPException)
    def _erro_http(erro):
        if not _e_da_api():
            # Fora de /api: a página 404 do Gemóvel; nos outros códigos, a página padrão do Flask.
            return (render_template("404.html"), 404) if erro.code == 404 else erro
        status = erro.code or 500
        resposta, status = resposta_de_erro(_MENSAGEM_HTTP.get(status, MENSAGEM_500), status)
        if status == 405 and getattr(erro, "valid_methods", None):
            resposta.headers["Allow"] = ", ".join(erro.valid_methods)
        return resposta, status

    @app.errorhandler(Exception)
    def _erro_inesperado(erro):
        current_app.logger.exception("Erro inesperado em %s %s", request.method, request.path)
        return resposta_de_erro(MENSAGEM_500, 500)
