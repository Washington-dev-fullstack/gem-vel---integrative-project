"""Abre o site pronto (a pasta site/, a versão de demonstração) no navegador, servido só para este
computador, sem Flask e sem MySQL. É o que o "Abrir o site.bat" da raiz roda; para desligar, feche
a janela ou aperte Ctrl+C.

    python ferramentas/abrir_site.py
"""

import functools
import http.server
import threading
import webbrowser
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
PORTA = 5700  # fixa, para o navegador lembrar a sessão e as mudanças feitas na demonstração


class Pedido(http.server.SimpleHTTPRequestHandler):
    # No Windows, o registro pode dizer que .js é text/plain, e aí o navegador recusa os módulos.
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript",
                      ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml",
                      ".html": "text/html", ".woff2": "font/woff2"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # depois de gerar o site de novo, vale o novo
        super().end_headers()

    def log_message(self, formato, *args):  # sem uma linha por arquivo pedido
        pass


class Servidor(http.server.ThreadingHTTPServer):
    allow_reuse_address = False  # no Windows, reaproveitar a porta deixaria dois servidores nela


def abrir():
    pedido = functools.partial(Pedido, directory=str(SITE))
    try:
        servidor = Servidor(("127.0.0.1", PORTA), pedido)
    except OSError:  # a porta está ocupada (o site já está aberto em outra janela?): usa uma livre
        servidor = Servidor(("127.0.0.1", 0), pedido)
    endereco = f"http://127.0.0.1:{servidor.server_port}/"
    print(f"Site do Gemóvel aberto em {endereco}\nPara desligar, feche esta janela.")
    threading.Timer(0.5, webbrowser.open, [endereco]).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    abrir()
