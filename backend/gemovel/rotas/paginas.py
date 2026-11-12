"""Páginas do front-end (spec do front §3). Os modelos não levam dados: cada tela busca o que
mostra na API. Aqui só se decide quem abre cada página."""

from functools import wraps
from urllib.parse import urlencode

from flask import Blueprint, redirect, render_template, request

from gemovel.rotas.autenticacao import usuario_da_sessao

bp = Blueprint("paginas", __name__)


def destino_seguro(volta):
    """O endereço de volta depois do login, só se for deste site: começa com uma barra, não com
    duas, e não tem barra invertida (o navegador lê "/\\site" como "//site"). Senão, None."""
    if not volta or not volta.startswith("/") or volta.startswith("//") or "\\" in volta:
        return None
    return volta


def painel_do_perfil(usuario):
    """A primeira página de cada perfil."""
    return "/" if usuario.perfil() == "administrador" else "/minhas-tarefas"


def exige_pagina(*perfis):
    """Sem login, manda para /entrar com o endereço pedido no volta; com outro perfil, manda
    para o painel da pessoa, sem mensagem."""

    def decorador(pagina):
        @wraps(pagina)
        def pagina_com_login(*args, **kwargs):
            usuario = usuario_da_sessao()
            if usuario is None:
                volta = request.full_path if request.query_string else request.path
                return redirect("/entrar?" + urlencode({"volta": volta}))
            if perfis and usuario.perfil() not in perfis:
                return redirect(painel_do_perfil(usuario))
            return pagina(*args, **kwargs)

        return pagina_com_login

    return decorador


@bp.get("/entrar")
def entrar():
    usuario = usuario_da_sessao()
    if usuario is not None:
        return redirect(painel_do_perfil(usuario))
    return render_template("entrar.html")


def _pagina_do_admin(endereco, modelo, nome):
    @exige_pagina("administrador")
    def pagina(**_):
        return render_template(f"admin/{modelo}.html")

    bp.add_url_rule(endereco, nome, pagina, methods=["GET"])


for _endereco, _modelo in (("/", "visao-geral"), ("/agenda", "agenda"), ("/reservas", "reservas"),
                           ("/imoveis", "imoveis"), ("/imoveis/<int:id>", "imovel"), ("/tarefas", "tarefas"),
                           ("/equipe", "equipe")):
    _pagina_do_admin(_endereco, _modelo, _modelo.replace("-", "_"))


@bp.get("/minhas-tarefas")
@exige_pagina("funcionario")
def minhas_tarefas():
    return render_template("app-equipe/minhas-tarefas.html")
