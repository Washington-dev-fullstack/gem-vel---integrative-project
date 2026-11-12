"""DAO dos hóspedes. A busca do formulário de reserva procura no nome e no telefone."""

import re

from gemovel.dao.base import DAOBase
from gemovel.dominio.hospede import Hospede

COLUNAS_HOSPEDE = ("id", "administrador_id", "nome", "telefone", "email", "documento", "observacoes")

_SELECT = "SELECT " + ", ".join(COLUNAS_HOSPEDE) + " FROM hospede"

# Com os totais da lista: quantas reservas o hóspede tem (as canceladas também) e a entrada da mais recente.
_SELECT_COM_TOTAIS = ("SELECT " + ", ".join(COLUNAS_HOSPEDE)
                      + ", (SELECT COUNT(*) FROM reserva WHERE reserva.hospede_id = hospede.id) AS num_reservas"
                      ", (SELECT MAX(data_entrada) FROM reserva WHERE reserva.hospede_id = hospede.id) AS ultima_reserva"
                      " FROM hospede")

# Com termo, a busca para aqui: é a lista de sugestões do formulário.
LIMITE_DA_BUSCA = 20

# O telefone sem a máscara "(11) 99110-1001", para comparar só os dígitos (REPLACE roda no MariaDB e no MySQL).
_TELEFONE_SO_DIGITOS = "REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '')"
# Só o termo feito de dígitos e dos sinais dessa máscara é um telefone: "Helena 1" não busca o dígito 1.
_PARECE_TELEFONE = re.compile(r"[0-9() -]+")


def hospede_da_linha(linha):
    return Hospede(**{coluna: linha[coluna] for coluna in COLUNAS_HOSPEDE})


def _escapar_like(termo):
    """Escapa os curingas do LIKE: quem digita % ou _ procura esses caracteres, não "qualquer coisa"."""
    return termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class HospedeDAO(DAOBase):
    def _para_objeto(self, linha):
        return hospede_da_linha(linha)

    def buscar(self, administrador_id, termo=None):
        """Os hóspedes do administrador por nome. Com `termo`, só os que têm o termo no nome
        ou no telefone (sem diferença de acento nem de maiúscula, pela collation do banco). O termo
        que parece telefone também é comparado só pelos dígitos: "11991101001" acha "(11) 99110-1001".
        Cada um vem com os totais das reservas: pares (hospede, {"num_reservas", "ultima_reserva"})."""
        sql, parametros = _SELECT_COM_TOTAIS + " WHERE administrador_id = %s", [administrador_id]
        if termo:
            padrao = f"%{_escapar_like(termo)}%"
            condicoes = ["nome LIKE %s", "telefone LIKE %s"]
            parametros += [padrao, padrao]
            digitos = re.sub(r"[^0-9]", "", termo)
            if digitos and _PARECE_TELEFONE.fullmatch(termo):
                condicoes.append(_TELEFONE_SO_DIGITOS + " LIKE %s")
                parametros.append(f"%{digitos}%")
            sql += " AND (" + " OR ".join(condicoes) + ")"
        sql += " ORDER BY nome, id"
        if termo:
            sql += f" LIMIT {LIMITE_DA_BUSCA}"
        return [(self._para_objeto(linha),
                 {"num_reservas": linha["num_reservas"], "ultima_reserva": linha["ultima_reserva"]})
                for linha in self._consultar(sql, tuple(parametros))]

    def buscar_por_id(self, id):
        linhas = self._consultar(_SELECT + " WHERE id = %s", (id,))
        return self._para_objeto(linhas[0]) if linhas else None

    def inserir(self, hospede):
        """Grava o hóspede e devolve o id dele."""
        return self._executar(
            "INSERT INTO hospede (administrador_id, nome, telefone, email, documento, observacoes) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (hospede.administrador_id, hospede.nome, hospede.telefone, hospede.email, hospede.documento,
             hospede.observacoes))

    def atualizar(self, hospede):
        """Grava os dados do hóspede (o dono não muda)."""
        self._executar("UPDATE hospede SET nome = %s, telefone = %s, email = %s, documento = %s, observacoes = %s "
                       "WHERE id = %s", (hospede.nome, hospede.telefone, hospede.email, hospede.documento,
                                         hospede.observacoes, hospede.id))

    def excluir(self, id):
        """Apaga o hóspede. O banco recusa apagar quem tem reservas (ON DELETE RESTRICT): a rota confere antes."""
        self._executar("DELETE FROM hospede WHERE id = %s", (id,))
