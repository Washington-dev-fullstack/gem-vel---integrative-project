// A tabela de reservas (web-admin.md §4): cabeçalhos que ordenam, a linha e o menu de cada reserva.
// Serve à tela Reservas e à aba Reservas do detalhe do imóvel, que não tem a coluna Imóvel.

import {data, dinheiro} from "../nucleo/formatos.js";
import {html} from "../nucleo/html.js";
import {abrirGaveta, urlCom} from "../nucleo/url.js";
import {enderecoNaAgenda, pilulaDaSituacao} from "../gavetas/reserva.js";
import {icone} from "./pecas.js";

export const COMPARAR = {
  codigo: (a, b) => a.id - b.id,
  hospede: (a, b) => (a.hospede?.nome ?? "").localeCompare(b.hospede?.nome ?? "", "pt-BR"),
  imovel: (a, b) => a.imovel.nome.localeCompare(b.imovel.nome, "pt-BR"),
  entrada: (a, b) => a.data_entrada.localeCompare(b.data_entrada),
  saida: (a, b) => a.data_saida.localeCompare(b.data_saida),
  noites: (a, b) => a.noites - b.noites,
  valor: (a, b) => Number(a.valor_total) - Number(b.valor_total),
};

export const ordenarReservas = (reservas, ordem) => [...reservas].sort((a, b) => COMPARAR[ordem.coluna](a, b) * ordem.sentido
  || a.data_entrada.localeCompare(b.data_entrada) || a.id - b.id);

/** O endereço desta página com a gaveta aberta: o link funciona com Ctrl e em outra aba. */
export function enderecoDaGaveta(tipo, id) {
  const url = urlCom(new URL(location.href), {gaveta: {tipo, id}});
  return `${url.pathname}${url.search}`;
}

function cabecalho(ordem, coluna, rotulo, {direita = false, classe = ""} = {}) {
  const ativa = ordem.coluna === coluna;
  return html`<th scope="col" class="${classe}" ${direita ? html`data-alinhar="direita"` : ""}
    ${ativa ? html`aria-sort="${ordem.sentido > 0 ? "ascending" : "descending"}"` : ""}>
    <button type="button" class="tabela__ordenar" data-ordenar="${coluna}">${rotulo}${icone("abrir", {classe: "tabela__seta"})}</button></th>`;
}

export function cabecalhosDasReservas(ordem, {comImovel = true} = {}) {
  return html`<tr>${cabecalho(ordem, "codigo", "Código")}${cabecalho(ordem, "hospede", "Hóspede")}
    ${comImovel ? cabecalho(ordem, "imovel", "Imóvel") : ""}
    ${cabecalho(ordem, "entrada", "Entrada")}${cabecalho(ordem, "saida", "Saída")}
    ${cabecalho(ordem, "noites", "Noites", {direita: true, classe: "coluna-p3"})}${cabecalho(ordem, "valor", "Valor", {direita: true})}
    <th scope="col">Estado</th><th scope="col"><span class="visualmente-oculto">Ações</span></th></tr>`;
}

export function linhaDaReserva(r, {destaque = null, comImovel = true} = {}) {
  return html`<tr data-id="${r.id}" data-situacao="${r.situacao}" ${r.id === destaque ? html`data-destaque` : ""}>
    <td><a class="tabela__link numero" href="${enderecoDaGaveta("reserva", r.id)}" data-abrir="reserva" data-id="${r.id}">${r.codigo}</a></td>
    <td>${r.hospede?.nome ?? "–"}</td>
    ${comImovel ? html`<td>${r.imovel.nome}</td>` : ""}
    <td class="numero">${data(r.data_entrada)}</td>
    <td class="numero">${data(r.data_saida)}</td>
    <td class="numero coluna-p3" data-alinhar="direita">${r.noites}</td>
    <td class="numero" data-alinhar="direita"><span class="valor">${dinheiro(r.valor_total)}</span></td>
    <td>${pilulaDaSituacao(r.situacao)}</td>
    <td class="tabela__acoes"><button type="button" class="botao botao--icone botao--fantasma botao--sm" data-acoes="${r.id}"
      aria-label="Ações de ${r.codigo}">${icone("acoes")}</button></td>
  </tr>`;
}

export function itensDaReserva(r, {cancelar}) {
  const agenda = {rotulo: "Ver na agenda", fazer: () => location.assign(enderecoNaAgenda(r))};
  if (r.status === "cancelada") return [{rotulo: "Editar", desabilitado: "reserva cancelada"}, agenda];
  return [{rotulo: "Editar", fazer: () => abrirGaveta("reserva", r.id, {editar: true})}, agenda, {separador: true},
    {rotulo: "Cancelar reserva", perigo: true, fazer: () => cancelar(r)}];
}
