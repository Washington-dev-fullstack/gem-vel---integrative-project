"""Páginas servidas pelo Flask (spec do front-end §3): quem entra em cada uma, o volta
depois do login e a página 404 fora de /api."""

from urllib.parse import parse_qs, urlsplit

from gemovel.rotas.paginas import destino_seguro
from testes.apoio import CasoApi, consultar, executar


class TestPaginas(CasoApi):
    def test_sem_login_vai_para_entrar_com_volta(self):
        r = self.cliente.get("/reservas?mes=2026-11")
        destino = urlsplit(r.headers["Location"])
        self.assertEqual((r.status_code, destino.path, parse_qs(destino.query)),
                         (302, "/entrar", {"volta": ["/reservas?mes=2026-11"]}))

    def test_entrar_e_404_abrem_sem_login(self):
        self.assertEqual(self.cliente.get("/entrar").status_code, 200)
        r = self.cliente.get("/nao-existe")
        self.assertEqual((r.status_code, r.mimetype), (404, "text/html"))
        self.assertIn("Esta página ainda não foi lapidada.", r.get_data(as_text=True))

    def test_api_que_nao_existe_continua_em_json(self):
        self.confere_erro(self.cliente.get("/api/nao-existe"), 404)

    def test_admin_abre_as_paginas_do_admin(self):
        self.entrar("marina@gemovel.test")
        for caminho in ("/", "/agenda", "/reservas", "/imoveis", "/imoveis/1", "/imoveis/999", "/tarefas", "/equipe"):
            with self.subTest(caminho):
                r = self.cliente.get(caminho)
                self.assertEqual((r.status_code, r.mimetype), (200, "text/html"))

    def test_perfil_errado_vai_para_o_proprio_painel(self):
        self.entrar("cida@gemovel.test")
        self.assertEqual(self.cliente.get("/reservas").headers["Location"], "/minhas-tarefas")
        admin = self.app.test_client()
        self.entrar("marina@gemovel.test", admin)
        self.assertEqual(admin.get("/minhas-tarefas").headers["Location"], "/")

    def test_quem_ja_entrou_e_abre_entrar_vai_para_o_painel(self):
        self.entrar("marina@gemovel.test")
        r = self.cliente.get("/entrar")
        self.assertEqual((r.status_code, r.headers["Location"]), (302, "/"))

    def test_pessoa_desativada_volta_para_entrar(self):
        self.entrar("cida@gemovel.test")
        cida = consultar("SELECT id FROM usuario WHERE email = 'cida@gemovel.test'")[0]["id"]
        executar("UPDATE usuario SET ativo = 0 WHERE id = %s", (cida,))
        self.addCleanup(executar, "UPDATE usuario SET ativo = 1 WHERE id = %s", (cida,))
        self.assertEqual(urlsplit(self.cliente.get("/minhas-tarefas").headers["Location"]).path, "/entrar")

    def test_destino_seguro(self):
        for volta, esperado in (("/reservas?mes=2026-11", "/reservas?mes=2026-11"), ("//evil.com", None),
                                ("/\\evil.com", None), ("https://evil.com", None), ("", None), (None, None)):
            with self.subTest(volta=volta):
                self.assertEqual(destino_seguro(volta), esperado)

    def test_estaticos_saem_com_o_tipo_certo(self):
        for caminho, tipo in (("/estaticos/css/admin.css", "text/css"), ("/estaticos/icones.svg", "image/svg+xml"),
                              ("/estaticos/lib/gsap.min.js", "text/javascript")):
            with self.subTest(caminho):
                r = self.cliente.get(caminho)
                self.assertEqual((r.status_code, r.mimetype), (200, tipo))
