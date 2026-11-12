"""API: os bloqueios de cada imóvel (listar e bloquear datas), com banco de verdade."""

import unittest
from datetime import date, timedelta

from gemovel.rotas.formato_json import periodo
from testes.apoio import CasoApi, apagar_depois, consultar, datas_livres, imovel_temporario, linha


class TestBloqueios(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def test_lista_os_bloqueios_do_imovel(self):
        b1 = linha("SELECT data_inicio, data_fim FROM bloqueio WHERE id = 1")
        self.assertEqual(self.cliente.get("/api/imoveis/8/bloqueios").get_json(),
                         {"bloqueios": [{"id": 1, "imovel_id": 8, "data_inicio": str(b1["data_inicio"]),
                                         "data_fim": str(b1["data_fim"]), "motivo": "Troca do aquecedor"}]})

    def test_paulo_nao_ve_nem_bloqueia_imovel_da_marina(self):
        # A Marina vê: o 404 do Paulo vem do dono do imóvel, não de um endereço que não existe.
        self.assertEqual(self.cliente.get("/api/imoveis/8/bloqueios").status_code, 200)
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        inicio, fim = datas_livres(8)
        self.confere_erro(paulo.get("/api/imoveis/8/bloqueios"), 404)
        self.confere_erro(paulo.post("/api/imoveis/8/bloqueios", json={"data_inicio": inicio, "data_fim": fim,
                                                                       "motivo": "Teste"}), 404)

    def test_cria_bloqueio(self):
        inicio, fim = datas_livres(3)
        r = self.cliente.post("/api/imoveis/3/bloqueios", json={"data_inicio": inicio, "data_fim": fim,
                                                               "motivo": " Pintura "})
        self.assertEqual(r.status_code, 201)
        b = r.get_json()
        apagar_depois(self, "bloqueio", b["id"])
        self.assertEqual(b, {"id": b["id"], "imovel_id": 3, "data_inicio": str(inicio), "data_fim": str(fim),
                             "motivo": "Pintura"})

    def test_bloqueio_sobre_reserva_da_409(self):
        r12 = linha("SELECT data_entrada, data_saida FROM reserva WHERE id = 12")
        frase = (f"Já há a reserva RSV-0012 (Carla Nogueira, {periodo(r12['data_entrada'], r12['data_saida'])}) "
                 "nessas datas.")
        r = self.cliente.post("/api/imoveis/6/bloqueios", json={"data_inicio": r12["data_entrada"],
                                                               "data_fim": r12["data_saida"], "motivo": "Teste"})
        self.confere_erro(r, 409, {"data_inicio": frase}, frase)

    def test_bloqueio_sobre_bloqueio_da_409(self):
        b1 = linha("SELECT data_inicio, data_fim FROM bloqueio WHERE id = 1")
        frase = f"Já há um bloqueio de {periodo(b1['data_inicio'], b1['data_fim'])} (troca do aquecedor) nessas datas."
        r = self.cliente.post("/api/imoveis/8/bloqueios", json={"data_inicio": b1["data_inicio"],
                                                               "data_fim": b1["data_fim"], "motivo": "Teste"})
        self.confere_erro(r, 409, {"data_inicio": frase}, frase)

    def test_datas_invertidas_e_motivo(self):
        inicio, _ = datas_livres(3)
        r = self.cliente.post("/api/imoveis/3/bloqueios", json={"data_inicio": inicio, "data_fim": inicio, "motivo": ""})
        self.confere_erro(r, 422, {"data_fim": "O fim precisa ser depois do início.", "motivo": "Preencha este campo."})

    def test_imovel_desativado(self):
        imovel, (inicio, fim) = imovel_temporario(self, ativo=0), datas_livres(3)
        r = self.cliente.post(f"/api/imoveis/{imovel}/bloqueios", json={"data_inicio": inicio, "data_fim": fim,
                                                                       "motivo": "Teste"})
        self.confere_erro(r, 409, mensagem="Este imóvel está desativado.")


class TestBloqueiosDoPeriodo(CasoApi):
    def setUp(self):
        super().setUp()
        self.entrar("marina@gemovel.test")

    def test_bloqueios_do_periodo(self):
        de, ate = date.today() - timedelta(days=60), date.today() + timedelta(days=60)
        esperados = [l["id"] for l in consultar(
            "SELECT b.id FROM bloqueio b JOIN imovel i ON i.id = b.imovel_id WHERE i.administrador_id = 1 "
            "AND b.data_inicio <= %s AND b.data_fim > %s ORDER BY b.data_inicio, b.id", (ate, de))]
        r = self.cliente.get(f"/api/bloqueios?de={de}&ate={ate}")
        self.assertEqual([b["id"] for b in r.get_json()["bloqueios"]], esperados)
        self.assertTrue(esperados)
        self.assertEqual(self.cliente.get("/api/bloqueios").status_code, 200)  # padrão: o mês atual
        self.confere_erro(self.cliente.get(f"/api/bloqueios?de={ate}&ate={de}"), 422,
                          {"ate": "O fim não pode ser antes do início."})

    def test_excluir_bloqueio(self):
        id = imovel_temporario(self, ativo=1)
        inicio, fim = datas_livres(id)
        r = self.cliente.post(f"/api/imoveis/{id}/bloqueios",
                              json={"data_inicio": str(inicio), "data_fim": str(fim), "motivo": "Pintura"})
        bloqueio = r.get_json()["id"]
        apagar_depois(self, "bloqueio", bloqueio)
        self.assertEqual(self.cliente.delete(f"/api/bloqueios/{bloqueio}").status_code, 204)
        self.assertEqual(self.cliente.get(f"/api/imoveis/{id}/bloqueios").get_json(), {"bloqueios": []})
        self.confere_erro(self.cliente.delete(f"/api/bloqueios/{bloqueio}"), 404)

    def test_bloqueio_de_outro_admin_da_404(self):
        paulo = self.app.test_client()
        self.entrar("paulo@gemovel.test", paulo)
        self.confere_erro(paulo.delete("/api/bloqueios/1"), 404)
        self.assertEqual(len(consultar("SELECT id FROM bloqueio WHERE id = 1")), 1)
        self.assertNotIn(1, [b["id"] for b in paulo.get("/api/bloqueios?de=2000-01-01&ate=2099-12-31").get_json()["bloqueios"]])


if __name__ == "__main__":
    unittest.main()
