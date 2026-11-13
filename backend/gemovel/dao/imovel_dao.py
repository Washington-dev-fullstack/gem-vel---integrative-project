"""DAO dos imóveis. Imóvel não se apaga: é desativado (ativo = 0)."""

from gemovel.dao.base import DAOBase, escapar_like, hora
from gemovel.dominio.imovel import Imovel

COLUNAS_IMOVEL = ("id", "administrador_id", "nome", "logradouro", "numero", "complemento", "bairro", "cidade",
                  "uf", "cep", "capacidade", "valor_diaria", "horario_entrada", "horario_saida", "observacoes",
                  "ativo")

_SELECT = "SELECT " + ", ".join(COLUNAS_IMOVEL) + " FROM imovel"


def imovel_da_linha(linha):
    dados = {coluna: linha[coluna] for coluna in COLUNAS_IMOVEL}
    dados["horario_entrada"] = hora(dados["horario_entrada"])
    dados["horario_saida"] = hora(dados["horario_saida"])
    dados["ativo"] = bool(dados["ativo"])
    return Imovel(**dados)


class ImovelDAO(DAOBase):
    def _para_objeto(self, linha):
        return imovel_da_linha(linha)

    def listar_por_administrador(self, administrador_id):
        """Os imóveis do administrador, ativos e desativados, em ordem de nome."""
        linhas = self._consultar(_SELECT + " WHERE administrador_id = %s ORDER BY nome, id", (administrador_id,))
        return [self._para_objeto(linha) for linha in linhas]

    def buscar(self, administrador_id, termo, id=None, limite=5):
        """Os imóveis do administrador com o termo no nome (sem diferença de acento nem de maiúscula,
        pela collation) ou com o `id` que a busca leu do código IMV-003, em ordem de nome."""
        linhas = self._consultar(_SELECT + " WHERE administrador_id = %s AND (nome LIKE %s OR id = %s)"
                                 f" ORDER BY nome, id LIMIT {int(limite)}",
                                 (administrador_id, f"%{escapar_like(termo)}%", id))
        return [self._para_objeto(linha) for linha in linhas]

    def buscar_por_id(self, id, travar=False):
        """O imóvel ou None. Com travar=True, a linha fica travada (FOR UPDATE) até o fim da
        transação recebida: duas reservas do mesmo imóvel passam uma de cada vez."""
        if travar and self._transacao is None:
            raise ValueError("travar=True precisa da transação da rota: a trava acaba com a transação.")
        sql = _SELECT + " WHERE id = %s" + (" FOR UPDATE" if travar else "")
        linhas = self._consultar(sql, (id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def inserir(self, imovel):
        """Grava o imóvel e devolve o id dele."""
        return self._executar(
            "INSERT INTO imovel (administrador_id, nome, logradouro, numero, complemento, bairro, cidade, uf, cep, "
            "capacidade, valor_diaria, horario_entrada, horario_saida, observacoes, ativo) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (imovel.administrador_id, imovel.nome, imovel.logradouro, imovel.numero, imovel.complemento,
             imovel.bairro, imovel.cidade, imovel.uf, imovel.cep, imovel.capacidade, imovel.valor_diaria,
             imovel.horario_entrada, imovel.horario_saida, imovel.observacoes, int(imovel.ativo)))

    def atualizar(self, imovel):
        """Grava os campos do cadastro e o ativo."""
        self._executar(
            "UPDATE imovel SET nome = %s, logradouro = %s, numero = %s, complemento = %s, bairro = %s, cidade = %s, "
            "uf = %s, cep = %s, capacidade = %s, valor_diaria = %s, horario_entrada = %s, horario_saida = %s, "
            "observacoes = %s, ativo = %s WHERE id = %s",
            (imovel.nome, imovel.logradouro, imovel.numero, imovel.complemento, imovel.bairro, imovel.cidade,
             imovel.uf, imovel.cep, imovel.capacidade, imovel.valor_diaria, imovel.horario_entrada,
             imovel.horario_saida, imovel.observacoes, int(imovel.ativo), imovel.id))

    def mudar_ativo(self, id, ativo):
        """Desativa ou reativa: o imóvel nunca é apagado."""
        self._executar("UPDATE imovel SET ativo = %s WHERE id = %s", (int(ativo), id))
