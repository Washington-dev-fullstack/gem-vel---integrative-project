"""API do Gemóvel (Flask).

Etapa 1: só a rota de saúde, que confere a conexão com o banco.
Para rodar, da raiz do projeto: backend/.venv/Scripts/python backend/app.py
e abrir http://localhost:5000/api/saude
"""

from flask import Flask, jsonify

from config import carregar_config
from gemovel.conexao import BancoIndisponivel, Conexao


def criar_app(config: dict | None = None) -> Flask:
    """Cria o app. `config` é a configuração do banco; se vier None, usa o backend/.env."""
    config = config if config is not None else carregar_config()
    app = Flask(__name__)
    app.json.ensure_ascii = False  # acentos legíveis no JSON
    conexao = Conexao(config)

    @app.get("/api/saude")
    def saude():
        try:
            resultado = conexao.testar()
        except BancoIndisponivel as erro:
            return jsonify(status="erro", mensagem=str(erro)), 503
        return jsonify(status="ok", banco=config["database"],
                       versao=resultado["versao"], tabelas=resultado["tabelas"])

    return app


if __name__ == "__main__":
    criar_app().run(debug=True)
