"""Gera a versão de demonstração do Gemóvel para o GitHub Pages, na pasta site/.

As mesmas telas e os mesmos scripts do front-end, com a API simulada no navegador
(docs/superpowers/specs/2026-11-13-github-pages-design.md). Rode da raiz do projeto, com o MySQL
ligado e os dados de exemplo recém-carregados (as datas deles contam do dia em que foram carregados):

    backend/.venv/Scripts/python ferramentas/gerar_site.py
"""

import json
import shutil
import sys
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "backend"))

from jinja2 import Environment, FileSystemLoader  # noqa: E402  (vem com o Flask)

from config import carregar_config  # noqa: E402
from gemovel.conexao import Conexao  # noqa: E402

SITE = RAIZ / "site"
FRONTEND = RAIZ / "frontend"

# Arquivo do site → template de frontend/paginas. index.html é Entrar.
PAGINAS = {
    "index.html": "entrar.html",
    "visao-geral.html": "admin/visao-geral.html",
    "agenda.html": "admin/agenda.html",
    "reservas.html": "admin/reservas.html",
    "imoveis.html": "admin/imoveis.html",
    "imovel.html": "admin/imovel.html",
    "tarefas.html": "admin/tarefas.html",
    "equipe.html": "admin/equipe.html",
    "minhas-tarefas.html": "app-equipe/minhas-tarefas.html",
}

# As tabelas como o servidor simulado lê (demo/servidor.js). A senha não sai do banco.
CONSULTAS = {
    "usuarios": "SELECT u.id, u.nome, u.email, u.telefone, u.perfil, u.ativo, f.administrador_id, f.funcao"
                " FROM usuario u LEFT JOIN funcionario f ON f.usuario_id = u.id ORDER BY u.id",
    "imoveis": "SELECT id, administrador_id, nome, logradouro, numero, complemento, bairro, cidade, uf, cep, capacidade,"
               " valor_diaria, horario_entrada, horario_saida, observacoes, ativo FROM imovel ORDER BY id",
    "hospedes": "SELECT id, administrador_id, nome, telefone, email, documento, observacoes FROM hospede ORDER BY id",
    "reservas": "SELECT id, imovel_id, hospede_id, data_entrada, data_saida, num_hospedes, valor_diaria, valor_total,"
                " status, observacoes FROM reserva ORDER BY id",
    "bloqueios": "SELECT id, imovel_id, data_inicio, data_fim, motivo FROM bloqueio ORDER BY id",
    "tarefas": "SELECT id, imovel_id, reserva_id, funcionario_id, tipo, titulo, descricao, agendada_para, prazo, status,"
               " iniciada_em, concluida_em FROM tarefa ORDER BY id",
    "historico": "SELECT id, tarefa_id, usuario_id, status_anterior, status_novo, observacao, registrado_em"
                 " FROM historico_tarefa ORDER BY id",
}


def valor_json(valor):
    """Datas e horas em texto, como o servidor simulado guarda; dinheiro com duas casas."""
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%dT%H:%M:%S")
    if isinstance(valor, date):
        return valor.isoformat()
    if isinstance(valor, timedelta):  # o conector entrega TIME como timedelta
        minutos = int(valor.total_seconds()) // 60
        return f"{minutos // 60:02d}:{minutos % 60:02d}"
    if isinstance(valor, time):
        return valor.strftime("%H:%M")
    if isinstance(valor, Decimal):
        return f"{valor:.2f}"
    return valor


def ler_dados():
    with Conexao(carregar_config(), tamanho_pool=1).transacao() as t:
        dados = {tabela: [{coluna: valor_json(v) for coluna, v in linha.items()} for linha in t.consultar(sql)]
                 for tabela, sql in CONSULTAS.items()}
    for linha in dados["usuarios"] + dados["imoveis"]:
        linha["ativo"] = bool(linha["ativo"])
    for usuario in dados["usuarios"]:
        if usuario["perfil"] == "administrador":
            del usuario["administrador_id"], usuario["funcao"]
    dados["sessao"] = None
    return dados


def gerar():
    # Por cima do que já houver (nada é apagado): os arquivos estáticos, as páginas e os dados.
    shutil.copytree(FRONTEND / "estaticos", SITE / "estaticos", dirs_exist_ok=True)
    ambiente = Environment(loader=FileSystemLoader(FRONTEND / "paginas"), autoescape=True)
    for arquivo, modelo in PAGINAS.items():
        pagina = ambiente.get_template(modelo).render(demo=True)
        # O Pages serve o site num subcaminho: os caminhos absolutos viram relativos à página.
        (SITE / arquivo).write_text(pagina.replace('"/estaticos/', '"estaticos/'), encoding="utf-8", newline="\n")
    (SITE / "estaticos" / "demo").mkdir(exist_ok=True)
    exemplo = {"gerado_em": date.today().isoformat(), "dados": ler_dados()}
    (SITE / "estaticos" / "demo" / "dados.json").write_text(json.dumps(exemplo, ensure_ascii=False), encoding="utf-8")
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Site gerado em {SITE} com os dados de {exemplo['gerado_em']}: "
          + ", ".join(f"{len(v)} {k}" for k, v in exemplo["dados"].items() if isinstance(v, list)))


if __name__ == "__main__":
    gerar()
