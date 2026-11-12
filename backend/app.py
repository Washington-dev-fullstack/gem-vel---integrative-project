"""API do Gemóvel (Flask): só a fábrica do app. As rotas ficam em gemovel/rotas/.

Para rodar, da raiz do projeto: backend/.venv/Scripts/python backend/app.py
e abrir http://127.0.0.1:5000/api/saude
"""

from pathlib import Path

from flask import Flask

from config import carregar_config, carregar_segredo_sessao
from gemovel.conexao import Conexao
from gemovel.rotas import registrar
from gemovel.rotas.formato_json import ProvedorJson

# O front-end fica ao lado do backend: as páginas Jinja e os arquivos estáticos.
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


def criar_app(config: dict | None = None, segredo: str | None = None) -> Flask:
    """Cria o app. `config` é a configuração do banco (None: lê o backend/.env), e `segredo`
    é a chave que assina o cookie de login (None: lê a SEGREDO_SESSAO do backend/.env)."""
    config = config if config is not None else carregar_config()
    segredo = segredo or carregar_segredo_sessao()
    app = Flask(__name__, template_folder=str(FRONTEND / "paginas"), static_folder=str(FRONTEND / "estaticos"),
                static_url_path="/estaticos")
    app.json = ProvedorJson(app)
    app.secret_key = segredo
    # HttpOnly: o JavaScript da página não lê o cookie. Lax: outro site não manda o cookie
    # num POST; junto com as escritas só em JSON, isso protege contra CSRF.
    app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")
    app.extensions["gemovel.conexao"] = Conexao(config)
    app.extensions["gemovel.config"] = config
    registrar(app)
    return app


if __name__ == "__main__":
    criar_app().run(debug=True)
