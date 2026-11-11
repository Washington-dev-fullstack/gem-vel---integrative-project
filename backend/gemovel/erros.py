"""Erros do Gemóvel. Cada um vira uma resposta da API, sempre com o mesmo formato:
{"erro": {"mensagem": ..., "campos": {...}}}."""


class ErroGemovel(Exception):
    """Erro com uma mensagem geral e, quando há, uma mensagem por campo."""

    def __init__(self, mensagem, campos=None):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.campos = dict(campos or {})


class ErroValidacao(ErroGemovel):
    """Um ou mais campos inválidos (422), com uma mensagem por campo."""

    def __init__(self, campos):
        super().__init__("Confira os campos destacados.", campos)


class Conflito(ErroGemovel):
    """A gravação esbarra em algo que já existe (409). A frase também vai no campo, se houver."""

    def __init__(self, mensagem, campo=None):
        super().__init__(mensagem, {campo: mensagem} if campo else None)


class NaoEncontrado(ErroGemovel):
    """Não existe, ou é de outro administrador (404)."""

    def __init__(self):
        super().__init__("Não encontrado.")


class NaoAutenticado(ErroGemovel):
    """Sem login, ou a conta foi desativada depois do login (401)."""

    def __init__(self, mensagem="Entre de novo para continuar."):
        super().__init__(mensagem)


class SemPermissao(ErroGemovel):
    """A pessoa logada tem outro perfil (403)."""

    def __init__(self, mensagem="Esta área é de outro perfil."):
        super().__init__(mensagem)


class PedidoInvalido(ErroGemovel):
    """O corpo do pedido não é um objeto JSON (400)."""

    def __init__(self):
        super().__init__("O pedido não veio em JSON.")
