// Gaveta de bloquear datas (web-admin.md §5): o imóvel, o período com a mesma checagem de
// conflito da reserva (R1) e o motivo. Usada pela tela Reservas e pelo detalhe do imóvel.

import {api} from "../nucleo/api.js";
import {html} from "../nucleo/html.js";
import {fecharGaveta} from "../nucleo/url.js";
import {avisar} from "../componentes/aviso.js";
import {ligarFormulario} from "../componentes/formulario.js";
import {icone} from "../componentes/pecas.js";
import {seletorDatas} from "../componentes/seletor-datas.js";
import {carregarImoveis} from "./reserva.js";
import {ir} from "../nucleo/enderecos.js";

export function gavetaBloqueio({depois = () => {}} = {}) {
  return {
    async formulario(_id, preencher = {}) {
      const imoveis = (await carregarImoveis()).filter((i) => i.ativo || i.id === preencher.imovelId);
      return {
        titulo: "Bloquear datas",
        trecho: html`<form class="formulario" id="form-bloqueio" novalidate>
          <div class="campo">
            <label class="campo__rotulo" for="bloqueio-imovel">Imóvel</label>
            <div class="seletor">
              <select class="entrada" id="bloqueio-imovel" name="imovel_id" data-tipo="inteiro" required data-obrigatorio="Escolha o imóvel.">
                <option value="">Escolha o imóvel</option>
                ${imoveis.map((i) => html`<option value="${i.id}" ${i.id === preencher.imovelId ? "selected" : ""}>${i.nome}</option>`)}
              </select>${icone("abrir")}
            </div>
          </div>
          <div class="campo" data-datas></div>
          <div class="campo">
            <label class="campo__rotulo" for="bloqueio-motivo">Motivo</label>
            <input class="entrada" id="bloqueio-motivo" name="motivo" maxlength="120" required autocomplete="off" placeholder="Troca do aquecedor">
          </div>
          <footer class="gaveta__rodape">
            <button type="submit" class="botao botao--primario" data-enviando="Salvando…"><span class="botao__rotulo">Bloquear datas</span></button>
            <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button>
          </footer>
        </form>`,
        ligar(dialogo) {
          const form = dialogo.querySelector("#form-bloqueio");
          const imovel = form.elements.imovel_id;
          const seletor = seletorDatas(form.querySelector("[data-datas]"), {
            imovelId: Number(imovel.value) || null, nomes: ["data_inicio", "data_fim"], rotulo: "Período",
            rotulos: ["Início", "Fim"], criando: "bloqueio",
          });
          imovel.addEventListener("change", () => seletor.trocarImovel(Number(imovel.value) || null));
          ligarFormulario(form, {
            // O imóvel vai no endereço do pedido; o corpo leva só as datas e o motivo.
            dados: ({imovel_id: imovelId, ...corpo}) => ({imovelId, corpo}),
            enviar: ({imovelId, corpo}) => api.post(`/api/imoveis/${imovelId}/bloqueios`, corpo),
            depois: (bloqueio) => {
              fecharGaveta();
              avisar("Datas bloqueadas", {acao: {rotulo: "Ver na agenda",
                fazer: () => ir(`/agenda?mes=${bloqueio.data_inicio.slice(0, 7)}`)}});
              depois(bloqueio);
            },
          });
        },
      };
    },
  };
}
