// Gaveta do imóvel (web-admin.md §5): o formulário de novo imóvel e de editar. Aqui também ficam as
// peças que a lista e o detalhe dividem: a prontidão, a ocupação do mês, a próxima entrada, o menu e
// o desativar adiado com Desfazer.

import {api} from "../nucleo/api.js";
import {data, horario} from "../nucleo/formatos.js";
import {html} from "../nucleo/html.js";
import {abrirGaveta, fecharGaveta} from "../nucleo/url.js";
import {adiarEnvio, avisar} from "../componentes/aviso.js";
import {ligarFormulario} from "../componentes/formulario.js";
import {chip, icone} from "../componentes/pecas.js";
import {ir} from "../nucleo/enderecos.js";

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const PRONTIDAO = {hospedes: "Hóspedes", limpeza_pendente: "Limpeza pendente", limpando: "Limpando", pronto: "Pronto",
  limpeza_atrasada: "Limpeza atrasada"};
const ESTADO_DO_CHIP = {limpeza_pendente: "pendente", limpando: "em_andamento", pronto: "concluida", limpeza_atrasada: "atrasada"};
const MES_POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", {month: "long"});

const reservasFuturas = (n) => `${n} ${n === 1 ? "reserva futura" : "reservas futuras"}`;

/** A pílula ou o chip da prontidão (lote B §10); o imóvel desativado mostra só "Desativado". */
export function prontidaoDe(imovel) {
  if (!imovel.ativo) return html`<span class="pilula">Desativado</span>`;
  const {estado, ate} = imovel.prontidao;
  if (estado === "hospedes") return html`<span class="pilula pilula--estadia">Hóspedes até ${data(ate)}</span>`;
  return chip(ESTADO_DO_CHIP[estado], PRONTIDAO[estado]);
}

/** "78% de ocupação em novembro (23 de 30 noites)". */
export function fraseOcupacao(imovel, hoje = new Date()) {
  const {percentual, noites, noites_mes: noitesMes} = imovel.ocupacao_mes;
  return `${percentual}% de ocupação em ${MES_POR_EXTENSO.format(hoje)} (${noites} de ${noitesMes} noites)`;
}

/** O medidor de 4px e o percentual, com a frase inteira na dica e no rótulo do medidor. */
export function medidorDeOcupacao(imovel) {
  const {percentual} = imovel.ocupacao_mes;
  const frase = fraseOcupacao(imovel);
  return html`<span class="ocupacao" data-dica="${frase}">
    <span class="medidor medidor--fino" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentual}"
      aria-label="${frase}" style="--valor: ${percentual / 100}"><span class="medidor__valor"></span></span>
    <span class="ocupacao__valor numero" aria-hidden="true">${percentual}%</span></span>`;
}

/** {dia: "dom, 15 nov", hora: "15:00", quando: "dom, 15 nov · 15:00", hospede: "Ana Souza"} ou null. */
export function proximaEntrada(imovel) {
  const proxima = imovel.proxima_entrada;
  if (!proxima) return null;
  const dia = data(proxima.data_hora);
  const hora = horario(proxima.data_hora);
  return {dia, hora, quando: `${dia} · ${hora}`, hospede: proxima.hospede.nome};
}

export const localDoImovel = (imovel) => `${imovel.bairro}, ${imovel.cidade}`;

/** Editar · Bloquear datas · Desativar (desabilitado com reservas futuras) ou Reativar. O detalhe tem
 * "Editar" num botão próprio e passa comEditar: false. */
export function itensDoImovel(imovel, {aoDesativar, aoReativar, comEditar = true}) {
  const itens = comEditar ? [{rotulo: "Editar", fazer: () => abrirGaveta("imovel", imovel.id, {editar: true})}] : [];
  if (!imovel.ativo) return [...itens, ...(itens.length ? [{separador: true}] : []), {rotulo: "Reativar", fazer: () => aoReativar(imovel)}];
  itens.push({rotulo: "Bloquear datas", fazer: () => abrirGaveta("bloqueio", "novo", {preencher: {imovelId: imovel.id}})},
    {separador: true});
  if (imovel.reservas_futuras > 0) return [...itens, {rotulo: "Desativar", desabilitado: `há ${reservasFuturas(imovel.reservas_futuras)}`}];
  return [...itens, {rotulo: "Desativar", perigo: true, fazer: () => aoDesativar(imovel)}];
}

/** O desativar vai depois do prazo do aviso; "Desfazer" o cancela. */
export function desativarImovel(imovel, {esconder = () => {}, mostrar = () => {}, depois = () => {}} = {}) {
  esconder();
  const envio = adiarEnvio(({keepalive}) => api.post(`/api/imoveis/${imovel.id}/desativar`, {}, {keepalive})
    .then(depois, (erro) => {
      mostrar();
      if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para desativar o imóvel.");
    }));
  avisar(`${imovel.nome} desativado.`, {acao: {rotulo: "Desfazer", fazer: () => {
    envio.desfazer();
    mostrar();
  }}});
}

export async function reativarImovel(imovel, {depois = () => {}} = {}) {
  try {
    const salvo = await api.post(`/api/imoveis/${imovel.id}/reativar`, {});
    avisar(`${salvo.nome} reativado.`);
    depois(salvo);
  } catch (erro) {
    if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para reativar o imóvel.");
  }
}

function campo(nome, rotulo, valor, {obrigatorio = true, maximo = null, dica = null, extra = ""} = {}) {
  return html`<div class="campo"><label class="campo__rotulo" for="imovel-${nome}">${rotulo}${obrigatorio
    ? "" : html` <span class="campo__opcional">opcional</span>`}</label>
    <input class="entrada" id="imovel-${nome}" name="${nome}" value="${valor ?? ""}" autocomplete="off"
      ${maximo ? html`maxlength="${maximo}"` : ""} ${obrigatorio ? "required" : ""} ${dica ? html`aria-describedby="imovel-${nome}-dica"` : ""} ${extra}>
    ${dica ? html`<p class="campo__dica" id="imovel-${nome}-dica">${dica}</p>` : ""}</div>`;
}

const valorNoCampo = (valor) => (valor == null ? "" : Number(valor).toLocaleString("pt-BR", {minimumFractionDigits: 2}));

function trechoDoFormulario(imovel) {
  return html`<form class="formulario" id="form-imovel" novalidate>
    <fieldset class="formulario__grupo"><legend class="campo__rotulo">Identificação</legend>
      ${campo("nome", "Nome", imovel.nome, {maximo: 100, extra: html`placeholder="Loft Pinheiros"`})}
    </fieldset>
    <fieldset class="formulario__grupo"><legend class="campo__rotulo">Endereço</legend>
      ${campo("cep", "CEP", imovel.cep, {obrigatorio: false, maximo: 9, extra: html`inputmode="numeric" placeholder="00000-000"`})}
      ${campo("logradouro", "Logradouro", imovel.logradouro, {maximo: 150})}
      <div class="formulario__linha">${campo("numero", "Número", imovel.numero, {maximo: 10, dica: "Sem número? Escreva s/n."})}
        ${campo("complemento", "Complemento", imovel.complemento, {obrigatorio: false, maximo: 60})}</div>
      ${campo("bairro", "Bairro", imovel.bairro, {maximo: 80})}
      <div class="formulario__linha">${campo("cidade", "Cidade", imovel.cidade, {maximo: 80})}
        <div class="campo"><label class="campo__rotulo" for="imovel-uf">UF</label>
          <div class="seletor"><select class="entrada" id="imovel-uf" name="uf" required data-obrigatorio="Escolha a UF.">
            <option value="">Escolha</option>
            ${UFS.map((uf) => html`<option value="${uf}" ${uf === imovel.uf ? "selected" : ""}>${uf}</option>`)}
          </select>${icone("abrir")}</div></div></div>
    </fieldset>
    <fieldset class="formulario__grupo"><legend class="campo__rotulo">Hospedagem</legend>
      <div class="formulario__linha">
        <div class="campo"><label class="campo__rotulo" for="imovel-capacidade">Capacidade</label>
          <div class="controle controle--passos">
            <button type="button" class="passo" data-passo="-1" aria-label="Um hóspede a menos">${icone("menos")}</button>
            <input class="entrada" id="imovel-capacidade" name="capacidade" data-tipo="inteiro" inputmode="numeric"
              value="${imovel.capacidade ?? 2}" required>
            <button type="button" class="passo" data-passo="1" aria-label="Um hóspede a mais">${icone("mais")}</button>
          </div></div>
        <div class="campo"><label class="campo__rotulo" for="imovel-diaria">Diária</label>
          <div class="controle"><span class="controle__afixo">R$</span>
            <input class="entrada numero" id="imovel-diaria" name="valor_diaria" data-tipo="moeda" inputmode="decimal" required
              value="${valorNoCampo(imovel.valor_diaria)}" aria-describedby="imovel-diaria-dica"></div>
          <p class="campo__dica" id="imovel-diaria-dica" data-aviso-diaria hidden>A nova diária vale para as próximas reservas.
            As já feitas guardam a diária do dia em que foram feitas.</p></div>
      </div>
      <div class="formulario__linha">
        <div class="campo"><label class="campo__rotulo" for="imovel-entrada">Entrada</label>
          <input class="entrada numero" id="imovel-entrada" name="horario_entrada" type="time" required value="${imovel.horario_entrada ?? "15:00"}"></div>
        <div class="campo"><label class="campo__rotulo" for="imovel-saida">Saída</label>
          <input class="entrada numero" id="imovel-saida" name="horario_saida" type="time" required value="${imovel.horario_saida ?? "11:00"}"></div>
      </div>
    </fieldset>
    <fieldset class="formulario__grupo"><legend class="campo__rotulo">Para a equipe</legend>
      <div class="campo"><label class="campo__rotulo" for="imovel-observacoes">Instruções <span class="campo__opcional">opcional</span></label>
        <textarea class="entrada" id="imovel-observacoes" name="observacoes" rows="3" aria-describedby="imovel-observacoes-dica">${imovel.observacoes ?? ""}</textarea>
        <p class="campo__dica" id="imovel-observacoes-dica">Aparece para quem faz a limpeza e a manutenção: chave, portão, onde fica o material.</p></div>
    </fieldset>
    <footer class="gaveta__rodape">
      <button type="submit" class="botao botao--primario" data-enviando="Salvando…"><span class="botao__rotulo">Salvar imóvel</span></button>
      <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button>
    </footer>
  </form>`;
}

function ligarCapacidade(form) {
  const numero = form.elements.capacidade;
  const [menos] = form.querySelectorAll("[data-passo]");
  const conferir = () => {
    menos.disabled = !(Number(numero.value) > 1);
  };
  for (const passo of form.querySelectorAll("[data-passo]")) {
    passo.addEventListener("click", () => {
      numero.value = Math.max(1, (Number(numero.value) || 0) + Number(passo.dataset.passo));
      numero.dispatchEvent(new Event("input", {bubbles: true}));
    });
  }
  numero.addEventListener("input", conferir);
  conferir();
}

/** Novo imóvel e editar. O detalhe do imóvel é uma página: `?imovel=3` sem `editar` também abre o formulário. */
export function gavetaImovel({depois = () => {}} = {}) {
  const definicao = {
    detalhe: (id) => definicao.formulario(id),
    async formulario(id) {
      const editando = id !== "novo";
      const imovel = editando ? await api.get(`/api/imoveis/${id}`) : {};
      return {
        titulo: editando ? `Editar ${imovel.nome}` : "Novo imóvel",
        contexto: editando ? imovel.codigo : null,
        trecho: trechoDoFormulario(imovel),
        ligar(dialogo) {
          const form = dialogo.querySelector("#form-imovel");
          ligarCapacidade(form);
          if (editando) {
            const aviso = form.querySelector("[data-aviso-diaria]");
            const diaria = form.elements.valor_diaria;
            diaria.addEventListener("input", () => {
              aviso.hidden = diaria.value.trim() === valorNoCampo(imovel.valor_diaria);
            });
          }
          ligarFormulario(form, {
            enviar: (dados) => (editando ? api.patch(`/api/imoveis/${id}`, dados) : api.post("/api/imoveis", dados)),
            depois: (salvo) => {
              fecharGaveta();
              avisar(`${salvo.nome} ${editando ? "salvo" : "cadastrado"}.`, editando ? {}
                : {acao: {rotulo: "Ver imóvel", fazer: () => ir(`/imoveis/${salvo.id}`)}});
              depois(salvo);
            },
          });
        },
      };
    },
  };
  return definicao;
}
