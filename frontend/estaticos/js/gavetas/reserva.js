// Gaveta da reserva (web-admin.md §4): o detalhe, com o hóspede e a limpeza da saída, e o
// formulário de nova reserva e de editar. Usada pela tela Reservas, pelo detalhe do imóvel e pela Agenda.

import {api} from "../nucleo/api.js";
import {data, dinheiro, horario} from "../nucleo/formatos.js";
import {html} from "../nucleo/html.js";
import {abrirGaveta, fecharGaveta} from "../nucleo/url.js";
import {adiarEnvio, avisar} from "../componentes/aviso.js";
import {buscaNoFormulario} from "../componentes/busca.js";
import {ligarFormulario, marcarErro} from "../componentes/formulario.js";
import {ligarMenu} from "../componentes/menu.js";
import {chip, estadoVisivel, icone} from "../componentes/pecas.js";
import {contarNoites, noitesPorExtenso, seletorDatas} from "../componentes/seletor-datas.js";

export const SITUACOES = {futura: "Futura", em_curso: "Em curso", concluida: "Concluída", cancelada: "Cancelada"};

export function pilulaDaSituacao(situacao) {
  return html`<span class="pilula${situacao === "em_curso" ? " pilula--estadia" : ""}" data-situacao="${situacao}">${SITUACOES[situacao]}</span>`;
}

let imoveisDaConta = null;

/** Os imóveis do administrador (ativos e desativados), buscados uma vez por página. */
export function carregarImoveis({deNovo = false} = {}) {
  if (deNovo || !imoveisDaConta) {
    imoveisDaConta = api.get("/api/imoveis").then((resposta) => resposta.imoveis);
    imoveisDaConta.catch(() => {
      imoveisDaConta = null;
    });
  }
  return imoveisDaConta;
}

export const enderecoNaAgenda = (reserva) => `/agenda?mes=${reserva.data_entrada.slice(0, 7)}`;
export const hospedesPorExtenso = (n) => `${n} ${n === 1 ? "hóspede" : "hóspedes"}`;
export const fraseCapacidade = (imovel) => `${imovel.nome} recebe até ${hospedesPorExtenso(imovel.capacidade)}.`;
const horariosDe = (imovel) => ({entrada: horario(imovel.horario_entrada), saida: horario(imovel.horario_saida)});
const semMoeda = (valor) => dinheiro(valor).replace(/^R\$\s*/, "");

/** Diária × noites, em centavos para não errar o arredondamento (R2). */
function conta(diaria, entrada, saida) {
  const noites = contarNoites(entrada, saida);
  return {noites, diaria, total: ((Math.round(Number(diaria) * 100) * noites) / 100).toFixed(2)};
}

/**
 * Cancelar sem perguntar (decisão 4): `esconder` tira a reserva da tela na hora, o aviso dá 10s
 * para Desfazer e o pedido só sai depois. Se o servidor recusar, `mostrar` devolve a reserva.
 */
export function cancelarReserva(reserva, {esconder = () => {}, mostrar = () => {}, depois = () => {}} = {}) {
  esconder();
  const envio = adiarEnvio(({keepalive}) => api.post(`/api/reservas/${reserva.id}/cancelar`, {}, {keepalive})
    .then(depois, (erro) => {
      mostrar();
      if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para cancelar a reserva.");
    }));
  avisar(`Reserva ${reserva.codigo} cancelada.`, {acao: {rotulo: "Desfazer", fazer: () => {
    envio.desfazer();
    mostrar();
  }}});
}

function linkDoWhatsapp(telefone) {
  const digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

function trechoDoDetalhe(r, imovel) {
  const valores = conta(r.valor_diaria, r.data_entrada, r.data_saida);
  const limpeza = r.limpeza;
  const whatsapp = linkDoWhatsapp(r.hospede.telefone);
  return html`<div class="gaveta__secao">
    <dl class="dados">
      <dt>Hóspede</dt>
      <dd><p>${r.hospede.nome}</p>
        ${r.hospede.telefone ? html`<p>${r.hospede.telefone}${whatsapp
          ? html` · <a class="link" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</p>` : ""}
        ${r.hospede.email ? html`<p><a class="link" href="mailto:${r.hospede.email}">${r.hospede.email}</a></p>` : ""}</dd>
      <dt>Estadia</dt>
      <dd><p>Entrada ${data(r.data_entrada)}${imovel ? ` · ${horario(imovel.horario_entrada)}` : ""}</p>
        <p>Saída ${data(r.data_saida)}${imovel ? ` · ${horario(imovel.horario_saida)}` : ""}</p>
        <p class="dados__secundario">${noitesPorExtenso(r.noites)} · ${hospedesPorExtenso(r.num_hospedes)}</p></dd>
      <dt>Valor</dt>
      <dd><p class="numero">${dinheiro(r.valor_diaria)} × ${noitesPorExtenso(valores.noites)} = ${dinheiro(valores.total)}</p>
        ${Number(r.valor_total) !== Number(valores.total) ? html`<p>Valor combinado <span class="numero">${dinheiro(r.valor_total)}</span></p>` : ""}</dd>
      <dt>Limpeza da saída</dt>
      <dd>${limpeza ? html`<p class="dados__limpeza">${chip(estadoVisivel(limpeza))}
          <span>${data(limpeza.agendada_para)}, ${horario(limpeza.agendada_para)}${limpeza.prazo ? `–${horario(limpeza.prazo)}` : ""}</span></p>
        <p class="dados__secundario">${limpeza.responsavel?.nome ?? "Sem responsável"}</p>` : "–"}</dd>
      ${r.observacoes ? html`<dt>Observações</dt><dd class="dados__texto">${r.observacoes}</dd>` : ""}
    </dl>
  </div>
  <footer class="gaveta__rodape">
    ${r.status === "cancelada" ? html`<p class="gaveta__nota">Reserva cancelada.</p>`
      : html`<button type="button" class="botao botao--secundario" data-editar>Editar</button>`}
    <button type="button" class="botao botao--icone botao--fantasma" data-acoes aria-label="Mais ações de ${r.codigo}">${icone("acoes", {tamanho: 20})}</button>
  </footer>`;
}

function trechoDoFormulario({reserva, imoveis, imovel, preencher}) {
  const hospede = reserva?.hospede ?? preencher.hospede ?? null;
  const editando = Boolean(reserva);
  return html`<form class="formulario" id="form-reserva" novalidate>
    <div class="campo">
      <label class="campo__rotulo" for="reserva-imovel">Imóvel</label>
      <div class="seletor">
        <select class="entrada" id="reserva-imovel" name="imovel_id" data-tipo="inteiro" required data-obrigatorio="Escolha o imóvel.">
          <option value="">Escolha o imóvel</option>
          ${imoveis.map((i) => html`<option value="${i.id}" ${i.id === imovel?.id ? "selected" : ""}>${i.nome} · ${dinheiro(i.valor_diaria)} a diária · até ${hospedesPorExtenso(i.capacidade)}</option>`)}
        </select>${icone("abrir")}
      </div>
    </div>
    <div class="campo" data-datas></div>
    <div class="campo" data-hospede>
      <label class="campo__rotulo" for="reserva-hospede">Hóspede</label>
      <input class="entrada" id="reserva-hospede" type="text" placeholder="Nome ou telefone" value="${hospede?.nome ?? ""}">
      <input type="hidden" name="hospede_id" value="${hospede?.id ?? ""}" data-erro-em="#reserva-hospede" required
        data-obrigatorio="Escolha um hóspede da lista ou cadastre um novo.">
    </div>
    <fieldset class="formulario__grupo" data-novo-hospede hidden disabled>
      <legend class="campo__rotulo">Hóspede novo</legend>
      <div class="campo"><label class="campo__rotulo" for="novo-nome">Nome</label>
        <input class="entrada" id="novo-nome" name="hospede_novo.nome" autocomplete="off"></div>
      <div class="formulario__linha">
        <div class="campo"><label class="campo__rotulo" for="novo-telefone">Telefone <span class="campo__opcional">opcional</span></label>
          <input class="entrada" id="novo-telefone" name="hospede_novo.telefone" type="tel" autocomplete="off"></div>
        <div class="campo"><label class="campo__rotulo" for="novo-documento">Documento <span class="campo__opcional">opcional</span></label>
          <input class="entrada" id="novo-documento" name="hospede_novo.documento" autocomplete="off"></div>
      </div>
      <div class="campo"><label class="campo__rotulo" for="novo-email">E-mail <span class="campo__opcional">opcional</span></label>
        <input class="entrada" id="novo-email" name="hospede_novo.email" type="email" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <button type="button" class="link link--botao" data-desistir>Escolher um hóspede cadastrado</button>
    </fieldset>
    <div class="campo">
      <label class="campo__rotulo" for="reserva-num">Hóspedes</label>
      <div class="controle controle--passos">
        <button type="button" class="passo" data-passo="-1" aria-label="Um hóspede a menos">${icone("menos")}</button>
        <input class="entrada" id="reserva-num" name="num_hospedes" data-tipo="inteiro" inputmode="numeric"
          value="${reserva?.num_hospedes ?? 2}" required aria-describedby="reserva-capacidade">
        <button type="button" class="passo" data-passo="1" aria-label="Um hóspede a mais">${icone("mais")}</button>
      </div>
      <p class="campo__dica" id="reserva-capacidade" data-capacidade></p>
    </div>
    <div class="campo">
      <label class="campo__rotulo" for="reserva-valor">Valor total</label>
      <div class="controle"><span class="controle__afixo">R$</span>
        <input class="entrada numero" id="reserva-valor" name="valor_total" data-tipo="moeda" inputmode="decimal"
          aria-describedby="reserva-conta"></div>
      <p class="campo__dica" id="reserva-conta"><span data-conta></span>
        <button type="button" class="link link--botao" data-voltar-calculo hidden>Voltar ao cálculo</button></p>
    </div>
    <div class="campo">
      <label class="campo__rotulo" for="reserva-obs">Observações <span class="campo__opcional">opcional</span></label>
      <textarea class="entrada" id="reserva-obs" name="observacoes" rows="3">${reserva?.observacoes ?? ""}</textarea>
    </div>
    <footer class="gaveta__rodape">
      <button type="submit" class="botao botao--primario" data-enviando="Salvando…"><span class="botao__rotulo">Salvar reserva</span></button>
      <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button>
    </footer>
  </form>`;
}

/** Liga os campos que dependem uns dos outros: imóvel, datas, hóspede, lotação (R3) e valor (R2). */
function ligarCampos(form, {reserva, imoveis, preencher}) {
  const editando = Boolean(reserva);
  const campos = form.elements;
  const imovelAtual = () => imoveis.find((i) => i.id === Number(campos.imovel_id.value)) ?? null;
  const inicial = imovelAtual();
  const avisoLimpeza = document.createElement("p");
  avisoLimpeza.className = "campo__dica campo__dica--limpeza";
  const seletor = seletorDatas(form.querySelector("[data-datas]"), {
    imovelId: inicial?.id ?? null, ignorarReserva: reserva?.id ?? null, horarios: inicial ? horariosDe(inicial) : null,
    entrada: reserva?.data_entrada ?? preencher.entrada ?? null, saida: reserva?.data_saida ?? preencher.saida ?? null,
    aoMudar: () => recalcular(),
  });
  form.querySelector("[data-datas]").append(avisoLimpeza);

  // Hóspede: um da lista, ou um novo cadastrado ali mesmo.
  const busca = form.querySelector("[data-hospede]");
  const novo = form.querySelector("[data-novo-hospede]");
  const trocarParaNovo = (ligado, nome = "") => {
    busca.hidden = ligado;
    novo.hidden = !ligado;
    novo.disabled = !ligado;
    campos.hospede_id.required = !ligado;
    campos["hospede_novo.nome"].required = ligado;
    if (ligado) {
      campos["hospede_novo.nome"].value = nome;
      campos["hospede_novo.telefone"].focus();
    } else {
      campos["reserva-hospede"].focus();
    }
  };
  buscaNoFormulario(busca, {
    buscar: (termo) => api.get("/api/hospedes", {busca: termo}).then((resposta) => resposta.hospedes),
    rotular: (h) => ({titulo: h.nome, detalhe: h.telefone}),
    criar: (termo) => trocarParaNovo(true, termo),
    aoEscolher: (h) => {
      campos.hospede_id.value = h.id;
    },
    aoDigitar: () => {
      campos.hospede_id.value = "";
    },
  });
  novo.querySelector("[data-desistir]").addEventListener("click", () => trocarParaNovo(false));

  // Lotação (R3): de 1 até a capacidade do imóvel.
  const num = campos.num_hospedes;
  const [menos, mais] = form.querySelectorAll("[data-passo]");
  const dicaCapacidade = form.querySelector("[data-capacidade]");
  // O erro aparece ao sair do campo (change) ou ao trocar de imóvel; digitando, o formulário o tira.
  const conferirLotacao = ({marcar = false} = {}) => {
    const imovel = imovelAtual();
    const quantos = Number(num.value);
    menos.disabled = !(quantos > 1);
    mais.disabled = Boolean(imovel) && quantos >= imovel.capacidade;
    dicaCapacidade.textContent = imovel ? fraseCapacidade(imovel) : "";
    if (marcar && imovel && quantos > imovel.capacidade) marcarErro(num, fraseCapacidade(imovel));
  };
  for (const passo of [menos, mais]) {
    passo.addEventListener("click", () => {
      num.value = Math.max(1, (Number(num.value) || 0) + Number(passo.dataset.passo));
      num.dispatchEvent(new Event("input", {bubbles: true}));
    });
  }
  num.addEventListener("input", () => conferirLotacao());
  num.addEventListener("change", () => conferirLotacao({marcar: true}));

  // Valor (R2): segue a conta até a pessoa mudar; "Voltar ao cálculo" volta a seguir.
  const valor = campos.valor_total;
  const contaVisivel = form.querySelector("[data-conta]");
  const voltar = form.querySelector("[data-voltar-calculo]");
  const diariaAtual = () => {
    const imovel = imovelAtual();
    return reserva && imovel?.id === reserva.imovel.id ? reserva.valor_diaria : imovel?.valor_diaria ?? null;
  };
  const calculo = () => {
    const {entrada, saida} = seletor.valor();
    const diaria = diariaAtual();
    return entrada && saida && diaria ? conta(diaria, entrada, saida) : null;
  };
  let editado = Boolean(reserva) && Number(reserva.valor_total) !== Number(calculo()?.total);
  if (editado) valor.value = semMoeda(reserva.valor_total);

  function recalcular() {
    const atual = calculo();
    contaVisivel.textContent = atual
      ? `${dinheiro(atual.diaria)} × ${noitesPorExtenso(atual.noites)} = ${dinheiro(atual.total)}`
      : "Escolha o imóvel e as datas para ver a conta.";
    if (!editado) valor.value = atual ? semMoeda(atual.total) : "";
    voltar.hidden = !editado || !atual;
    const imovel = imovelAtual();
    const {saida} = seletor.valor();
    avisoLimpeza.hidden = editando || !(imovel && saida);
    if (!avisoLimpeza.hidden) {
      avisoLimpeza.textContent = `Ao salvar, a limpeza da saída fica marcada para ${data(saida)}, das ${horario(imovel.horario_saida)} às ${horario(imovel.horario_entrada)}.`;
    }
  }
  valor.addEventListener("input", () => {
    editado = true;
    voltar.hidden = !calculo();
  });
  voltar.addEventListener("click", () => {
    editado = false;
    recalcular();
    valor.focus();
  });

  campos.imovel_id.addEventListener("change", () => {
    const imovel = imovelAtual();
    seletor.trocarImovel(imovel?.id ?? null, imovel ? horariosDe(imovel) : null);
    conferirLotacao({marcar: true});
    recalcular();
  });
  conferirLotacao();
  recalcular();

  return {
    corpo(dados) {
      const corpo = {imovel_id: dados.imovel_id, data_entrada: dados.data_entrada, data_saida: dados.data_saida,
        num_hospedes: dados.num_hospedes, valor_total: editado ? dados.valor_total : null, observacoes: dados.observacoes};
      if (!novo.hidden) {
        corpo.hospede_novo = {nome: dados["hospede_novo.nome"], telefone: dados["hospede_novo.telefone"],
          email: dados["hospede_novo.email"], documento: dados["hospede_novo.documento"]};
      } else {
        corpo.hospede_id = dados.hospede_id === null ? null : Number(dados.hospede_id);
      }
      return corpo;
    },
  };
}

/**
 * As gavetas da reserva para ligarGavetas. `depois(reserva)` roda depois de salvar ou cancelar;
 * `aoCancelar(reserva)` deixa a tela tirar a linha na hora (o padrão só cancela com Desfazer).
 */
export function gavetaReserva({depois = () => {}, aoCancelar = (reserva) => cancelarReserva(reserva, {depois})} = {}) {
  return {
    async detalhe(id) {
      const [reserva, imoveis] = await Promise.all([api.get(`/api/reservas/${id}`), carregarImoveis()]);
      const imovel = imoveis.find((i) => i.id === reserva.imovel.id);
      return {
        titulo: reserva.codigo,
        contexto: html`${reserva.hospede.nome} · ${reserva.imovel.nome}`,
        ferramentas: pilulaDaSituacao(reserva.situacao),
        trecho: trechoDoDetalhe(reserva, imovel),
        ligar(dialogo) {
          dialogo.querySelector("[data-editar]")?.addEventListener("click", () => abrirGaveta("reserva", id, {editar: true}));
          ligarMenu(dialogo.querySelector("[data-acoes]"), [
            {rotulo: "Ver na agenda", fazer: () => location.assign(enderecoNaAgenda(reserva))},
            ...(reserva.status === "cancelada" ? [] : [{separador: true}, {rotulo: "Cancelar reserva", perigo: true,
              fazer: () => {
                fecharGaveta();
                aoCancelar(reserva);
              }}]),
          ]);
        },
      };
    },

    async formulario(id, preencher = {}) {
      const editando = id !== "nova";
      const [imoveis, reserva] = await Promise.all([carregarImoveis(), editando ? api.get(`/api/reservas/${id}`) : null]);
      if (reserva?.status === "cancelada") {
        return {titulo: `Editar ${reserva.codigo}`, trecho: html`<div class="vazio">
          <p class="vazio__texto">Esta reserva está cancelada e não pode mais ser editada.</p>
          <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button></div>`};
      }
      const escolhido = reserva?.imovel.id ?? preencher.imovelId ?? null;
      const opcoes = imoveis.filter((i) => i.ativo || i.id === escolhido);
      const imovel = opcoes.find((i) => i.id === escolhido) ?? null;
      return {
        titulo: editando ? `Editar ${reserva.codigo}` : "Nova reserva",
        contexto: editando ? html`${reserva.hospede.nome} · ${reserva.imovel.nome}` : null,
        trecho: trechoDoFormulario({reserva, imoveis: opcoes, imovel, preencher}),
        ligar(dialogo) {
          const form = dialogo.querySelector("#form-reserva");
          const campos = ligarCampos(form, {reserva, imoveis: opcoes, preencher});
          ligarFormulario(form, {
            dados: (dados) => campos.corpo(dados),
            enviar: (corpo) => (editando ? api.patch(`/api/reservas/${id}`, corpo) : api.post("/api/reservas", corpo)),
            depois: (salva) => {
              fecharGaveta();
              avisar(`Reserva ${salva.codigo} ${editando ? "salva" : "criada"}`, {acao: {rotulo: "Ver na agenda",
                fazer: () => location.assign(enderecoNaAgenda(salva))}});
              depois(salva);
            },
          });
        },
      };
    },
  };
}
