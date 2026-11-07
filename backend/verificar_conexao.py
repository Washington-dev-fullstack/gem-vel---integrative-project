"""Confere a conexão do Python com o banco: mostra a versão do MySQL e quantas linhas cada tabela tem.

Uso, da raiz do projeto:
    backend/.venv/Scripts/python backend/verificar_conexao.py
Termina com código 0 se conectou, ou 1 com uma frase dizendo o que conferir.
"""

import sys

from config import carregar_config
from gemovel.conexao import BancoIndisponivel, Conexao


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # acentos certos também no Git Bash
    config = carregar_config()
    try:
        resultado = Conexao(config).testar()
    except BancoIndisponivel as erro:
        print(erro)
        return 1
    print(f"Conectado ao banco {config['database']} (MySQL {resultado['versao']}).")
    for tabela, linhas in resultado["tabelas"].items():
        print(f"  {tabela:<17} {linhas:>3} linhas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
