"""Configuração do banco e chave da sessão, lidas do arquivo backend/.env (veja o .env.example)."""

import os
import secrets
import warnings
from pathlib import Path

from dotenv import load_dotenv

PASTA_BACKEND = Path(__file__).resolve().parent

# Valor inválido vira ERRO, em vez de ser trocado em silêncio (o XAMPP vem sem o modo estrito).
MODO_ESTRITO = "STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION"


def carregar_config() -> dict:
    """Devolve a configuração de conexão no formato do mysql-connector.

    Sem o .env, valem os padrões do XAMPP (root, sem senha, 127.0.0.1:3306).
    """
    load_dotenv(PASTA_BACKEND / ".env")
    return {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": int(os.getenv("DB_PORTA", "3306")),
        "user": os.getenv("DB_USUARIO", "root"),
        "password": os.getenv("DB_SENHA", ""),
        "database": os.getenv("DB_NOME", "gemovel"),
        # O conector pede por padrão uma collation que o MariaDB 10.4 não conhece;
        # fixar esta faz os acentos voltarem intactos.
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
        "sql_mode": MODO_ESTRITO,
        # A extensão em C do conector 9.x não conecta no MariaDB do XAMPP (as contas usam
        # mysql_native_password e o erro nem chega ao Python); a versão em Python puro conecta.
        "use_pure": True,
    }


def carregar_segredo_sessao() -> str:
    """Devolve a chave que assina o cookie de login (SEGREDO_SESSAO no .env).

    Sem ela, gera uma chave temporária e avisa: funciona, mas todo mundo sai quando o Flask reinicia.
    """
    load_dotenv(PASTA_BACKEND / ".env")
    segredo = os.getenv("SEGREDO_SESSAO", "").strip()
    if not segredo:
        warnings.warn("SEGREDO_SESSAO não está no backend/.env: usando uma chave temporária, "
                      "e todo mundo sai quando o Flask reiniciar.", UserWarning, stacklevel=2)
        return secrets.token_hex(32)
    return segredo
