// Gaveta da tarefa (web-admin.md §6): o detalhe com o histórico e o formulário de nova tarefa e de
// editar. Usada pelas telas Tarefas e Equipe, pela gaveta da reserva (a limpeza da saída) e pelo
// detalhe do imóvel.

import {api} from "../nucleo/api.js";
import {data, horario, isoDoDia, quandoFoi} from "../nucleo/formatos.js";
import {html} from "../nucleo/html.js";
import {TIPOS, cargaNoDia, fraseDoRegistro, horarioDaTarefa, inicioSugerido, passagensDoAdmin, primeiroNome}
  from "../nucleo/tarefas.js";
import {abrirGaveta, cliqueComum, fecharGaveta} from "../nucleo/url.js";
import {adiarEnvio, avisar} from "../componentes/aviso.js";
import {ligarFormulario} from "../componentes/formulario.js";
import {recarregarGaveta} from "../componentes/gaveta.js";
import {ligarMenu} from "../componentes/menu.js";
import {ROTULO_DO_ESTADO, avatar, chip, estadoVisivel, icone} from "../componentes/pecas.js";
import {carregarImoveis} from "./reserva.js";

// O nome do tipo e a janela de horário moram no núcleo, que o app da equipe também usa.
export {TIPOS, horarioDaTarefa};

// A recusa do servidor vem no campo status ("Não dá mais para desfazer."); o resto, na mensagem.
const fraseDoErro = (erro, padrao) => erro?.campos?.status ?? erro?.mensagem ?? padrao;

/** Marcar como (R5): manda na hora, e o aviso dá 10s para Desfazer, que volta a última mudança. */
export async function marcarTarefa(tarefa, novo, {depois = () => {}} = {}) {
  try {
    await api.post(`/api/tarefas/${tarefa.id}/estado`, {status: novo});
  } catch (erro) {
    if (erro?.status !== 401) avisar(fraseDoErro(erro, "Não deu para mudar a tarefa."));
    return;
  }
  depois();
  avisar(`Tarefa marcada como ${ROTULO_DO_ESTADO[novo].toLowerCase()}.`, {acao: {rotulo: "Desfazer", fazer: async () => {
    try {
      await api.post(`/api/tarefas/${tarefa.id}/desfazer`, {});
      depois();
    } catch (erro) {
      if (erro?.status !== 401) avisar(fraseDoErro(erro, "Não deu para desfazer."));
    }
  }}});
}

/** Excluir sem perguntar: `esconder` tira a tarefa da tela, o aviso dá 10s para Desfazer e o pedido
 * só sai depois. Se o servidor recusar, `mostrar` devolve a tarefa. */
export function excluirTarefa(tarefa, {esconder = () => {}, mostrar = () => {}, depois = () => {}} = {}) {
  esconder();
  const envio = adiarEnvio(({keepalive}) => api.delete(`/api/tarefas/${tarefa.id}`, {keepalive})
    .then(depois, (erro) => {
      mostrar();
      if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para excluir a tarefa.");
    }));
  avisar("Tarefa excluída.", {acao: {rotulo: "Desfazer", fazer: () => {
    envio.desfazer();
    mostrar();
  }}});
}

/** Editar · Marcar como (só os estados que o admin pode dar) · Excluir. */
export function itensDaTarefa(tarefa, {aoMarcar, aoExcluir, comEditar = true}) {
  const itens = comEditar ? [{rotulo: "Editar", fazer: () => abrirGaveta("tarefa", tarefa.id, {editar: true})}, {separador: true}] : [];
  for (const novo of passagensDoAdmin(tarefa.status)) {
    itens.push({rotulo: `Marcar como ${ROTULO_DO_ESTADO[novo].toLowerCase()}`, fazer: () => aoMarcar(tarefa, novo)});
  }
  itens.push({separador: true}, {rotulo: "Excluir", perigo: true, fazer: () => aoExcluir(tarefa)});
  return itens;
}

export function responsavelDaTarefa(t) {
  return t.responsavel
    ? html`<span class="pessoa-curta">${avatar(t.responsavel.nome, {tamanho: "sm"})}<span>${t.responsavel.nome}</span></span>`
    : html`<span class="texto-atencao">Sem responsável</span>`;
}

function linhaDoHistorico(registro) {
  const nome = primeiroNome(registro.usuario?.nome);
  return html`<li class="atividade__linha">${avatar(registro.usuario?.nome, {tamanho: "sm"})}
    <div><p class="atividade__frase"><strong>${nome}</strong>${fraseDoRegistro(registro).slice(nome.length)}</p>
      ${registro.observacao ? html`<p class="atividade__obs">${registro.observacao}</p>` : ""}</div>
    <time class="atividade__hora numero" datetime="${registro.registrado_em}">${quandoFoi(registro.registrado_em)}</time></li>`;
}

function trechoDoDetalhe(t) {
  return html`<div class="gaveta__secao"><dl class="dados">
      <dt>Tipo</dt><dd>${TIPOS[t.tipo]}</dd>
      <dt>Imóvel</dt><dd><a class="link" href="/imoveis/${t.imovel.id}">${t.imovel.nome}</a></dd>
      ${t.reserva ? html`<dt>Reserva</dt><dd><a class="link" href="?reserva=${t.reserva.id}" data-reserva>${t.reserva.codigo} · saída ${data(t.reserva.data_saida)}</a></dd>` : ""}
      <dt>Horário</dt><dd><p class="numero">${data(t.agendada_para)} · ${horarioDaTarefa(t)}</p>
        ${t.atrasada ? html`<p class="dados__secundario texto-atraso">Atrasada</p>` : ""}</dd>
      <dt>Responsável</dt><dd>${responsavelDaTarefa(t)}</dd>
      ${t.descricao ? html`<dt>Descrição</dt><dd class="dados__texto">${t.descricao}</dd>` : ""}
    </dl></div>
    <section class="gaveta__secao" aria-labelledby="tarefa-historico">
      <h3 class="gaveta__secao-titulo" id="tarefa-historico">Histórico</h3>
      <ul class="atividade" role="list">${[...t.historico].reverse().map(linhaDoHistorico)}</ul>
    </section>
    <footer class="gaveta__rodape">
      <button type="button" class="botao botao--secundario" data-editar>Editar</button>
      <button type="button" class="botao botao--icone botao--fantasma" data-acoes aria-label="Mais ações da tarefa">${icone("acoes", {tamanho: 20})}</button>
    </footer>`;
}

// Formulário.

const dataDe = (iso) => (iso ? iso.slice(0, 10) : "");
const horaDe = (iso) => (iso ? horario(iso) : "");

function campoDataHora(nome, rotulo, iso, {obrigatorio, depois = ""}) {
  return html`<fieldset class="campo campo-data-hora">
    <legend class="campo__rotulo">${rotulo}${obrigatorio ? "" : html` <span class="campo__opcional">opcional</span>`}</legend>
    <div class="formulario__linha">
      <div class="campo"><label class="visualmente-oculto" for="tarefa-${nome}-dia">Dia ${rotulo === "Início" ? "do início" : "do prazo"}</label>
        <input class="entrada numero" id="tarefa-${nome}-dia" type="date" value="${dataDe(iso)}" data-dia="${nome}"></div>
      <div class="campo"><label class="visualmente-oculto" for="tarefa-${nome}-hora">Horário ${rotulo === "Início" ? "do início" : "do prazo"}</label>
        <input class="entrada numero" id="tarefa-${nome}-hora" type="time" value="${horaDe(iso)}" data-hora="${nome}"></div>
    </div>
    <input type="hidden" name="${nome}" value="${iso ?? ""}" data-erro-em="#tarefa-${nome}-dia"
      ${obrigatorio ? html`required data-obrigatorio="Escolha o dia e o horário do início."` : ""}>
    ${depois}
  </fieldset>`;
}

function trechoDoFormulario({tarefa, imoveis, imovelId, tipo, inicio}) {
  return html`<form class="formulario" id="form-tarefa" novalidate>
    <div class="campo"><fieldset class="escolhas"><legend>Tipo</legend>
      ${Object.entries(TIPOS).map(([valor, rotulo]) => html`<label class="escolha">
        <input type="radio" name="tipo" value="${valor}" ${valor === tipo ? "checked" : ""}><span>${rotulo}</span></label>`)}
    </fieldset></div>
    <div class="campo">
      <label class="campo__rotulo" for="tarefa-imovel">Imóvel</label>
      <div class="seletor">
        <select class="entrada" id="tarefa-imovel" name="imovel_id" data-tipo="inteiro" required data-obrigatorio="Escolha o imóvel.">
          <option value="">Escolha o imóvel</option>
          ${imoveis.map((i) => html`<option value="${i.id}" ${i.id === imovelId ? "selected" : ""}>${i.nome}</option>`)}
        </select>${icone("abrir")}
      </div>
    </div>
    <div class="campo">
      <label class="campo__rotulo" for="tarefa-titulo">Título</label>
      <input class="entrada" id="tarefa-titulo" name="titulo" maxlength="120" required autocomplete="off"
        value="${tarefa?.titulo ?? TIPOS[tipo]}">
    </div>
    <div class="campo" data-campo-reserva>
      <label class="campo__rotulo" for="tarefa-reserva">Reserva ligada <span class="campo__opcional">opcional</span></label>
      <div class="seletor">
        <select class="entrada" id="tarefa-reserva" name="reserva_id" data-tipo="inteiro" aria-describedby="tarefa-reserva-dica">
          <option value="">Sem reserva</option>
        </select>${icone("abrir")}
      </div>
      <p class="campo__dica" id="tarefa-reserva-dica">Ao escolher, o início e o prazo seguem a saída e a próxima entrada do imóvel.</p>
    </div>
    ${campoDataHora("agendada_para", "Início", tarefa?.agendada_para ?? inicio, {obrigatorio: true})}
    ${campoDataHora("prazo", "Prazo", tarefa?.prazo ?? null, {obrigatorio: false,
      depois: html`<p class="campo__dica campo__dica--acao" data-proxima-entrada hidden><span data-proxima-texto></span>
        <button type="button" class="link link--botao" data-usar-prazo>Usar como prazo</button></p>`})}
    <div class="campo">
      <label class="campo__rotulo" for="tarefa-responsavel">Responsável <span class="campo__opcional">opcional</span></label>
      <div class="seletor">
        <select class="entrada" id="tarefa-responsavel" name="funcionario_id" data-tipo="inteiro">
          <option value="">Sem responsável</option>
        </select>${icone("abrir")}
      </div>
    </div>
    <div class="campo">
      <label class="campo__rotulo" for="tarefa-descricao">Descrição <span class="campo__opcional">opcional</span></label>
      <textarea class="entrada" id="tarefa-descricao" name="descricao" rows="3" placeholder="O que fazer, o material">${tarefa?.descricao ?? ""}</textarea>
    </div>
    <footer class="gaveta__rodape">
      <button type="submit" class="botao botao--primario" data-enviando="Salvando…"><span class="botao__rotulo">Salvar tarefa</span></button>
      <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button>
    </footer>
  </form>`;
}

function opcoes(select, lista, escolhido, rotulo) {
  const primeira = select.options[0].outerHTML;
  select.innerHTML = primeira;
  for (const item of lista) select.add(new Option(rotulo(item), item.id, false, item.id === escolhido));
  if (escolhido != null && !lista.some((item) => item.id === escolhido)) select.value = "";
}

/** Liga os campos que dependem uns dos outros: tipo, imóvel, reserva (R4), horários e responsável. */
function ligarCampos(form, {tarefa, imoveis, responsavelInicial}) {
  const campos = form.elements;
  const hoje = isoDoDia();
  const tipoAtual = () => form.querySelector('[name="tipo"]:checked')?.value ?? "limpeza";
  const imovelAtual = () => imoveis.find((i) => i.id === Number(campos.imovel_id.value)) ?? null;
  const dia = (nome) => form.querySelector(`[data-dia="${nome}"]`);
  const hora = (nome) => form.querySelector(`[data-hora="${nome}"]`);
  const juntar = (nome) => {
    const valor = dia(nome).value || hora(nome).value ? `${dia(nome).value}T${hora(nome).value}` : "";
    campos[nome].value = valor;
  };
  const definir = (nome, iso) => {
    dia(nome).value = dataDe(iso);
    hora(nome).value = horaDe(iso);
    juntar(nome);
  };
  for (const nome of ["agendada_para", "prazo"]) {
    for (const campo of [dia(nome), hora(nome)]) campo.addEventListener("input", () => juntar(nome));
  }

  // Título sugerido pelo tipo, enquanto a pessoa não escreveu outro.
  let sugestao = campos.titulo.value === TIPOS[tipoAtual()] ? campos.titulo.value : null;

  // Reserva ligada (só na limpeza): as do imóvel com saída de hoje em diante.
  const campoReserva = form.querySelector("[data-campo-reserva]");
  let reservas = [];
  let pedidoReservas = 0;
  async function carregarReservas() {
    const imovel = imovelAtual();
    const meu = ++pedidoReservas;
    const escolhida = Number(campos.reserva_id.value) || tarefa?.reserva?.id || null;
    if (!imovel || tipoAtual() !== "limpeza") return;
    const ate = new Date();
    ate.setDate(ate.getDate() + 120);
    const lista = await api.get("/api/reservas", {de: hoje, ate: isoDoDia(ate)}).then((r) => r.reservas, () => []);
    if (meu !== pedidoReservas) return;
    reservas = lista.filter((r) => r.imovel.id === imovel.id && r.status === "confirmada" && r.data_saida >= hoje);
    if (tarefa?.reserva && tarefa.imovel.id === imovel.id && !reservas.some((r) => r.id === tarefa.reserva.id)) {
      reservas.unshift(tarefa.reserva);
    }
    opcoes(campos.reserva_id, reservas, escolhida, (r) => `${r.codigo} · saída ${data(r.data_saida)}`);
  }
  campos.reserva_id.addEventListener("change", () => {
    const reserva = reservas.find((r) => r.id === Number(campos.reserva_id.value));
    const imovel = imovelAtual();
    if (!reserva || !imovel) return;
    definir("agendada_para", `${reserva.data_saida}T${horario(imovel.horario_saida)}`); // R4
    definir("prazo", `${reserva.data_saida}T${horario(imovel.horario_entrada)}`);
    mostrarProxima();
    carregarEquipe();
  });

  // Prazo sugerido: a próxima entrada do imóvel, depois do início.
  const proxima = form.querySelector("[data-proxima-entrada]");
  function mostrarProxima() {
    const entrada = imovelAtual()?.proxima_entrada?.data_hora ?? null;
    const inicio = campos.agendada_para.value;
    proxima.hidden = !entrada || (inicio && entrada < inicio) || campos.prazo.value === entrada;
    if (!proxima.hidden) {
      proxima.querySelector("[data-proxima-texto]").textContent = `Próxima entrada: ${data(entrada)}, ${horario(entrada)} ·`;
    }
  }
  form.querySelector("[data-usar-prazo]").addEventListener("click", () => {
    definir("prazo", imovelAtual().proxima_entrada.data_hora);
    mostrarProxima();
    hora("prazo").focus();
  });

  // Responsáveis: só pessoas ativas da função do tipo, com a carga do dia do início.
  let equipe = [];
  let pedidoEquipe = 0;
  const desenharResponsaveis = (escolhido) => {
    const diaDoInicio = dia("agendada_para").value || hoje;
    const daFuncao = equipe.filter((p) => p.ativo && p.funcao === tipoAtual());
    opcoes(campos.funcionario_id, daFuncao, escolhido,
      (p) => `${p.nome} · ${cargaNoDia(p.dia.total, diaDoInicio === hoje)}`);
  };
  async function carregarEquipe(escolhido = Number(campos.funcionario_id.value) || null) {
    const meu = ++pedidoEquipe;
    const lista = await api.get("/api/funcionarios", {dia: dia("agendada_para").value || hoje}).then((r) => r.funcionarios, () => null);
    if (meu !== pedidoEquipe || !lista) return;
    equipe = lista;
    desenharResponsaveis(escolhido);
  }

  for (const radio of form.querySelectorAll('[name="tipo"]')) {
    radio.addEventListener("change", () => {
      const tipo = tipoAtual();
      if (sugestao !== null || !campos.titulo.value.trim()) {
        campos.titulo.value = TIPOS[tipo];
        sugestao = campos.titulo.value;
      }
      campoReserva.hidden = tipo !== "limpeza";
      if (tipo !== "limpeza") campos.reserva_id.value = "";
      else carregarReservas();
      desenharResponsaveis(Number(campos.funcionario_id.value) || null);
    });
  }
  campos.titulo.addEventListener("input", () => {
    sugestao = null;
  });
  campos.imovel_id.addEventListener("change", () => {
    campos.reserva_id.value = "";
    carregarReservas();
    mostrarProxima();
  });
  dia("agendada_para").addEventListener("change", () => {
    carregarEquipe();
    mostrarProxima();
  });
  hora("agendada_para").addEventListener("change", mostrarProxima);
  for (const campo of [dia("prazo"), hora("prazo")]) campo.addEventListener("change", mostrarProxima);

  campoReserva.hidden = tipoAtual() !== "limpeza";
  carregarReservas();
  carregarEquipe(responsavelInicial);
  mostrarProxima();

  return (dados) => ({tipo: dados.tipo, imovel_id: dados.imovel_id, titulo: dados.titulo, descricao: dados.descricao,
    reserva_id: dados.tipo === "limpeza" ? dados.reserva_id : null, agendada_para: dados.agendada_para,
    prazo: dados.prazo, funcionario_id: dados.funcionario_id});
}

/**
 * As gavetas da tarefa para ligarGavetas. `depois()` roda depois de salvar, marcar, desfazer ou
 * excluir; `aoExcluir(tarefa)` deixa a tela tirar a linha na hora (o padrão só exclui com Desfazer).
 * O formulário aceita no preencher {imovelId, funcionarioId, tipo, dia}; o detalhe, {voltarPara}.
 */
export function gavetaTarefa({depois = () => {}, aoExcluir = (tarefa) => excluirTarefa(tarefa, {depois})} = {}) {
  const depoisDeMarcar = () => {
    depois();
    recarregarGaveta();
  };
  return {
    async detalhe(id) {
      const t = await api.get(`/api/tarefas/${id}`);
      return {
        titulo: t.titulo,
        contexto: html`${TIPOS[t.tipo]} · ${t.imovel.nome}`,
        ferramentas: chip(estadoVisivel(t)),
        trecho: trechoDoDetalhe(t),
        ligar(dialogo) {
          dialogo.querySelector("[data-editar]").addEventListener("click", () => abrirGaveta("tarefa", id, {editar: true}));
          dialogo.querySelector("[data-reserva]")?.addEventListener("click", (evento) => {
            if (!cliqueComum(evento)) return;
            evento.preventDefault();
            abrirGaveta("reserva", t.reserva.id);
          });
          ligarMenu(dialogo.querySelector("[data-acoes]"), itensDaTarefa(t, {comEditar: false,
            aoMarcar: (tarefa, novo) => marcarTarefa(tarefa, novo, {depois: depoisDeMarcar}),
            aoExcluir: (tarefa) => {
              fecharGaveta();
              aoExcluir(tarefa);
            }}));
        },
      };
    },

    async formulario(id, preencher = {}) {
      const editando = id !== "nova";
      const [imoveis, tarefa] = await Promise.all([carregarImoveis(), editando ? api.get(`/api/tarefas/${id}`) : null]);
      const imovelId = tarefa?.imovel.id ?? preencher.imovelId ?? null;
      const ativos = imoveis.filter((i) => i.ativo || i.id === imovelId);
      const tipo = tarefa?.tipo ?? preencher.tipo ?? "limpeza";
      const inicio = inicioSugerido(preencher.dia);
      return {
        titulo: editando ? "Editar tarefa" : "Nova tarefa",
        contexto: editando ? html`${tarefa.titulo} · ${tarefa.imovel.nome}` : null,
        trecho: trechoDoFormulario({tarefa, imoveis: ativos, imovelId, tipo, inicio}),
        ligar(dialogo) {
          const form = dialogo.querySelector("#form-tarefa");
          const corpo = ligarCampos(form, {tarefa, imoveis: ativos,
            responsavelInicial: tarefa?.responsavel?.id ?? preencher.funcionarioId ?? null});
          ligarFormulario(form, {
            dados: corpo,
            enviar: (dados) => (editando ? api.patch(`/api/tarefas/${id}`, dados) : api.post("/api/tarefas", dados)),
            depois: (salva) => {
              fecharGaveta();
              avisar(editando ? "Tarefa salva." : "Tarefa criada.", {acao: {rotulo: "Ver no dia",
                fazer: () => location.assign(`/tarefas?dia=${salva.agendada_para.slice(0, 10)}`)}});
              depois(salva);
            },
          });
        },
      };
    },
  };
}
