"""Apoio aos testes que usam o banco de verdade: as contas de exemplo, consultas diretas
e a limpeza do que cada teste grava (assim as contagens dos dados de exemplo continuam exatas)."""

from config import carregar_config
from gemovel.conexao import Conexao

# Senha de teste das contas de exemplo (a mesma do LEIA-ME.md). No banco fica só o hash.
SENHA_DE_TESTE = "Gemovel@2026"

# Quantas linhas cada tabela tem depois do banco/02_dados_exemplo.sql.
ESPERADO = {"usuario": 6, "funcionario": 4, "imovel": 9, "hospede": 15,
            "reserva": 16, "bloqueio": 2, "tarefa": 18, "historico_tarefa": 28}

# Chave da sessão nos testes: o cookie de login é assinado com ela.
SEGREDO_DE_TESTE = "segredo-dos-testes"

# Conexão própria dos testes, separada da do app.
_conexao = Conexao(carregar_config())

# O que apagar no fim de cada teste, por tabela. A reserva apaga antes as tarefas dela: a chave
# da tarefa viraria NULL e a limpeza ficaria sobrando. O histórico some junto com a tarefa.
_APAGAR = {
    "usuario": ("DELETE FROM usuario WHERE id = %s",),
    "imovel": ("DELETE FROM imovel WHERE id = %s",),
    "hospede": ("DELETE FROM hospede WHERE id = %s",),
    "reserva": ("DELETE FROM tarefa WHERE reserva_id = %s", "DELETE FROM reserva WHERE id = %s"),
    "bloqueio": ("DELETE FROM bloqueio WHERE id = %s",),
    "tarefa": ("DELETE FROM tarefa WHERE id = %s",),
}


def consultar(sql, parametros=()):
    """As linhas de uma consulta, como dicionários."""
    with _conexao.transacao() as t:
        return t.consultar(sql, parametros)


def executar(sql, parametros=()):
    """Roda um comando e devolve o id gerado (INSERT) ou as linhas afetadas."""
    with _conexao.transacao() as t:
        return t.executar(sql, parametros)


def apagar_depois(caso, tabela, id):
    """No fim do teste `caso`, apaga a linha `id` da `tabela` (e o que depende dela)."""
    comandos = _APAGAR[tabela]

    def apagar():
        for sql in comandos:
            executar(sql, (id,))

    caso.addCleanup(apagar)
