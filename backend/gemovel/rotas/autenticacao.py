"""Login nas rotas: o decorador exige_login confere a sessão e o perfil antes da rota rodar."""

from functools import wraps

from flask import g, session

from gemovel.dao.usuario_dao import UsuarioDAO
from gemovel.erros import NaoAutenticado, SemPermissao
from gemovel.rotas import conexao_do_app


def usuario_da_sessao():
    """A pessoa logada, relida do banco a cada pedido, ou None. Quem sumiu ou foi desativado
    perde o acesso na hora: a sessão é limpa."""
    usuario_id = session.get("usuario_id")
    if usuario_id is None:
        return None
    usuario = UsuarioDAO(conexao_do_app()).buscar_por_id(usuario_id)
    if usuario is None or not usuario.ativo:
        session.clear()
        return None
    return usuario


def exige_login(*perfis):
    """Só deixa a rota rodar com alguém logado e, quando há `perfis`, com um desses perfis.
    A pessoa logada fica em g.usuario."""

    def decorador(rota):
        @wraps(rota)
        def rota_com_login(*args, **kwargs):
            usuario = usuario_da_sessao()
            if usuario is None:
                raise NaoAutenticado()
            if perfis and usuario.perfil() not in perfis:
                raise SemPermissao()
            g.usuario = usuario
            return rota(*args, **kwargs)

        return rota_com_login

    return decorador
