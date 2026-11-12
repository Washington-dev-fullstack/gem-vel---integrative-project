// Gaveta do hóspede (web-admin.md §4, aba Hóspedes): os dados, as reservas em linhas compactas,
// o formulário e o excluir com Desfazer (só para quem não tem reservas).

import {api} from "../nucleo/api.js";
import {intervalo} from "../nucleo/formatos.js";
import {html} from "../nucleo/html.js";
import {abrirGaveta, fecharGaveta} from "../nucleo/url.js";
import {adiarEnvio, avisar} from "../componentes/aviso.js";
import {ligarFormulario} from "../componentes/formulario.js";
import {ligarMenu} from "../componentes/menu.js";
import {icone} from "../componentes/pecas.js";
import {pilulaDaSituacao} from "./reserva.js";

export const reservasPorExtenso = (n) => `${n} ${n === 1 ? "reserva" : "reservas"}`;
const primeiroNome = (nome) => nome.trim().split(/\s+/)[0];
export const cliqueComum = (evento) => evento.button === 0 && !evento.ctrlKey && !evento.metaKey && !evento.shiftKey && !evento.altKey;

/** O excluir não pergunta: some da tela, o aviso dá 10s para Desfazer e só depois vai o pedido. */
export function excluirHospede(hospede, {esconder = () => {}, mostrar = () => {}, depois = () => {}} = {}) {
  esconder();
  const envio = adiarEnvio(({keepalive}) => api.delete(`/api/hospedes/${hospede.id}`, {keepalive})
    .then(depois, (erro) => {
      mostrar();
      if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para excluir o cadastro.");
    }));
  avisar(`Cadastro de ${hospede.nome} excluído.`, {acao: {rotulo: "Desfazer", fazer: () => {
    envio.desfazer();
    mostrar();
  }}});
}

/** Editar · Nova reserva para Carla · Excluir, desabilitado com o motivo quando há reservas. */
export function itensDoHospede(hospede, {aoExcluir}) {
  return [
    {rotulo: "Editar", fazer: () => abrirGaveta("hospede", hospede.id, {editar: true})},
    {rotulo: `Nova reserva para ${primeiroNome(hospede.nome)}`,
      fazer: () => abrirGaveta("reserva", "nova", {preencher: {hospede: {id: hospede.id, nome: hospede.nome}}})},
    {separador: true},
    hospede.num_reservas > 0
      ? {rotulo: "Excluir", perigo: true, desabilitado: `tem ${reservasPorExtenso(hospede.num_reservas)}`}
      : {rotulo: "Excluir", perigo: true, fazer: () => aoExcluir(hospede)},
  ];
}

function campo(nome, rotulo, valor, {tipo = "text", obrigatorio = false} = {}) {
  return html`<div class="campo"><label class="campo__rotulo" for="hospede-${nome}">${rotulo}${obrigatorio
    ? "" : html` <span class="campo__opcional">opcional</span>`}</label>
    <input class="entrada" id="hospede-${nome}" name="${nome}" type="${tipo}" value="${valor ?? ""}" autocomplete="off"
      ${obrigatorio ? "required" : ""}></div>`;
}

export function gavetaHospede({depois = () => {}, aoExcluir = (hospede) => excluirHospede(hospede, {depois})} = {}) {
  return {
    async detalhe(id) {
      const hospede = await api.get(`/api/hospedes/${id}`);
      const quantas = hospede.reservas.length;
      return {
        titulo: hospede.nome,
        contexto: quantas ? reservasPorExtenso(quantas) : "Sem reservas",
        trecho: html`<div class="gaveta__secao"><dl class="dados">
            <dt>Telefone</dt><dd class="numero">${hospede.telefone ?? "–"}</dd>
            <dt>E-mail</dt><dd>${hospede.email ? html`<a class="link" href="mailto:${hospede.email}">${hospede.email}</a>` : "–"}</dd>
            <dt>Documento</dt><dd class="numero">${hospede.documento ?? "–"}</dd>
            ${hospede.observacoes ? html`<dt>Observações</dt><dd class="dados__texto">${hospede.observacoes}</dd>` : ""}
          </dl></div>
          <div class="gaveta__secao"><h3 class="gaveta__secao-titulo">Reservas</h3>
            ${quantas ? html`<ul class="lista" role="list">${hospede.reservas.map((r) => html`<li class="linha">
                <div class="linha__meio"><a class="linha__titulo linha__link" href="?reserva=${r.id}" data-reserva="${r.id}">${r.codigo} · ${r.imovel.nome}</a>
                  <span class="linha__meta numero">${intervalo(r.data_entrada, r.data_saida)}</span></div>
                <div class="linha__fim">${pilulaDaSituacao(r.situacao)}</div></li>`)}</ul>`
              : html`<p class="dados__secundario">Nenhuma reserva ainda.</p>`}
          </div>
          <footer class="gaveta__rodape">
            <button type="button" class="botao botao--secundario" data-editar>Editar</button>
            <button type="button" class="botao botao--icone botao--fantasma" data-acoes aria-label="Mais ações de ${hospede.nome}">${icone("acoes", {tamanho: 20})}</button>
          </footer>`,
        ligar(dialogo) {
          dialogo.querySelector("[data-editar]").addEventListener("click", () => abrirGaveta("hospede", id, {editar: true}));
          for (const link of dialogo.querySelectorAll("[data-reserva]")) {
            link.addEventListener("click", (evento) => {
              if (!cliqueComum(evento)) return;
              evento.preventDefault();
              abrirGaveta("reserva", Number(link.dataset.reserva));
            });
          }
          ligarMenu(dialogo.querySelector("[data-acoes]"), itensDoHospede({...hospede, num_reservas: quantas}, {
            aoExcluir: (escolhido) => {
              fecharGaveta();
              aoExcluir(escolhido);
            },
          }));
        },
      };
    },

    async formulario(id) {
      const editando = id !== "novo";
      const hospede = editando ? await api.get(`/api/hospedes/${id}`) : {};
      return {
        titulo: editando ? `Editar ${hospede.nome}` : "Novo hóspede",
        trecho: html`<form class="formulario" id="form-hospede" novalidate>
          ${campo("nome", "Nome", hospede.nome, {obrigatorio: true})}
          <div class="formulario__linha">${campo("telefone", "Telefone", hospede.telefone, {tipo: "tel"})}
            ${campo("documento", "Documento", hospede.documento)}</div>
          ${campo("email", "E-mail", hospede.email, {tipo: "email"})}
          <div class="campo">
            <label class="campo__rotulo" for="hospede-observacoes">Observações <span class="campo__opcional">opcional</span></label>
            <textarea class="entrada" id="hospede-observacoes" name="observacoes" rows="3">${hospede.observacoes ?? ""}</textarea>
          </div>
          <footer class="gaveta__rodape">
            <button type="submit" class="botao botao--primario" data-enviando="Salvando…"><span class="botao__rotulo">Salvar hóspede</span></button>
            <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button>
          </footer>
        </form>`,
        ligar(dialogo) {
          ligarFormulario(dialogo.querySelector("#form-hospede"), {
            enviar: (dados) => (editando ? api.patch(`/api/hospedes/${id}`, dados) : api.post("/api/hospedes", dados)),
            depois: (salvo) => {
              fecharGaveta();
              avisar(`Cadastro de ${salvo.nome} ${editando ? "salvo" : "criado"}.`);
              depois(salvo);
            },
          });
        },
      };
    },
  };
}
