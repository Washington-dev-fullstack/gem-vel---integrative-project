// Gaveta da pessoa da equipe (web-admin.md §7): os contatos, as tarefas de hoje e as próximas, o
// formulário de nova pessoa e de editar, a gaveta curta de redefinir a senha, desativar e reativar.

import {api} from "../nucleo/api.js";
import {data, isoDoDia, linkDoTelefone, linkDoWhatsapp} from "../nucleo/formatos.js";
import {html} from "../nucleo/html.js";
import {fraseDoDesativar, porHorario, primeiroNome} from "../nucleo/tarefas.js";
import {abrirGaveta, cliqueComum, fecharGaveta} from "../nucleo/url.js";
import {adiarEnvio, avisar} from "../componentes/aviso.js";
import {ligarFormulario, ligarMostrarSenha} from "../componentes/formulario.js";
import {recarregarGaveta} from "../componentes/gaveta.js";
import {ligarMenu} from "../componentes/menu.js";
import {chip, estadoVisivel, gema, icone} from "../componentes/pecas.js";
import {TIPOS, horarioDaTarefa} from "./tarefa.js";

/** A função da pessoa tem os nomes dos tipos de tarefa que ela pega. */
export const FUNCOES = TIPOS;

const DICA_DA_SENHA = "Passe a senha para a pessoa: ela entra com este e-mail e esta senha.";

/** A equipe com o resumo de hoje (GET /api/funcionarios). */
export const carregarEquipe = (dia = isoDoDia()) => api.get("/api/funcionarios", {dia}).then((r) => r.funcionarios);

async function buscarPessoa(id) {
  const pessoa = (await carregarEquipe()).find((p) => p.id === Number(id));
  if (!pessoa) throw Object.assign(new Error(), {status: 404, mensagem: "Esta pessoa não está na sua equipe."});
  return pessoa;
}

/** "(11) 98505-6060 · WhatsApp", os dois com link; sem telefone, o traço. */
export function contatosDaPessoa(pessoa) {
  if (!pessoa.telefone) return "–";
  const tel = linkDoTelefone(pessoa.telefone);
  const whatsapp = linkDoWhatsapp(pessoa.telefone);
  return html`${tel ? html`<a class="link numero" href="${tel}">${pessoa.telefone}</a>` : html`<span class="numero">${pessoa.telefone}</span>`}${
    whatsapp ? html` · <a class="link" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp</a>` : ""}`;
}

/** Desativar sem perguntar (decisão 5): `esconder` já mostra a pessoa desativada, o aviso dá 10s para
 * Desfazer e o pedido só sai depois. As tarefas pendentes dela depois de agora ficam sem responsável. */
export function desativarPessoa(pessoa, {esconder = () => {}, mostrar = () => {}, depois = () => {}} = {}) {
  esconder();
  const envio = adiarEnvio(({keepalive}) => api.post(`/api/funcionarios/${pessoa.id}/desativar`, {}, {keepalive})
    .then(depois, (erro) => {
      mostrar();
      if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para desativar o acesso.");
    }));
  avisar(fraseDoDesativar(pessoa), {acao: {rotulo: "Desfazer", fazer: () => {
    envio.desfazer();
    mostrar();
  }}});
}

export async function reativarPessoa(pessoa, {depois = () => {}} = {}) {
  try {
    const salva = await api.post(`/api/funcionarios/${pessoa.id}/reativar`, {});
    avisar(`Acesso de ${primeiroNome(salva.nome)} reativado.`);
    depois(salva);
  } catch (erro) {
    if (erro?.status !== 401) avisar(erro?.mensagem ?? "Não deu para reativar o acesso.");
  }
}

/** Nova tarefa para Marcos · Redefinir senha · Desativar; quem está desativado só tem Reativar. */
export function itensDaPessoa(pessoa, {aoDesativar, aoReativar}) {
  if (!pessoa.ativo) return [{rotulo: "Reativar", fazer: () => aoReativar(pessoa)}];
  return [
    {rotulo: `Nova tarefa para ${primeiroNome(pessoa.nome)}`,
      fazer: () => abrirGaveta("tarefa", "nova", {preencher: {funcionarioId: pessoa.id, tipo: pessoa.funcao}})},
    {rotulo: "Redefinir senha", fazer: () => abrirGaveta("pessoa", pessoa.id, {editar: true, preencher: {modo: "senha"}})},
    {separador: true},
    {rotulo: "Desativar", perigo: true, fazer: () => aoDesativar(pessoa)},
  ];
}

// A linha compacta da tarefa; a de outro dia leva a data.
function linhaDaTarefa(t, hoje) {
  const comDia = t.agendada_para.slice(0, 10) !== hoje;
  return html`<li class="linha"><span class="linha__inicio">${gema(estadoVisivel(t))}</span>
    <div class="linha__meio"><a class="linha__titulo linha__link" href="?tarefa=${t.id}" data-tarefa="${t.id}">${t.titulo} · ${t.imovel.nome}</a>
      <span class="linha__meta numero">${comDia ? `${data(t.agendada_para)} · ` : ""}${horarioDaTarefa(t)}</span></div>
    <div class="linha__fim">${chip(estadoVisivel(t))}</div></li>`;
}

function secaoDeTarefas(id, titulo, tarefas, vazia, hoje) {
  return html`<section class="gaveta__secao" aria-labelledby="${id}">
    <h3 class="gaveta__secao-titulo" id="${id}">${titulo}</h3>
    ${tarefas.length ? html`<ul class="lista" role="list">${tarefas.map((t) => linhaDaTarefa(t, hoje))}</ul>`
      : html`<p class="dados__secundario">${vazia}</p>`}
  </section>`;
}

function campo(nome, rotulo, valor, {tipo = "text", obrigatorio = false, extra = ""} = {}) {
  return html`<div class="campo"><label class="campo__rotulo" for="pessoa-${nome}">${rotulo}${obrigatorio
    ? "" : html` <span class="campo__opcional">opcional</span>`}</label>
    <input class="entrada" id="pessoa-${nome}" name="${nome}" type="${tipo}" value="${valor ?? ""}" autocomplete="off"
      ${obrigatorio ? "required" : ""} ${extra}></div>`;
}

function campoSenha(rotulo) {
  return html`<div class="campo">
    <label class="campo__rotulo" for="pessoa-senha">${rotulo}</label>
    <div class="controle">
      <input class="entrada" id="pessoa-senha" name="senha" type="password" autocomplete="new-password" data-tipo="senha"
        required data-obrigatorio="Escolha a senha." aria-describedby="pessoa-senha-dica">
      <button type="button" class="botao botao--sm botao--fantasma" data-mostrar aria-controls="pessoa-senha">${icone("mostrar")}<span data-mostrar-rotulo>Mostrar</span></button>
    </div>
    <p class="campo__dica" id="pessoa-senha-dica">${DICA_DA_SENHA}</p>
  </div>`;
}

const rodapeDoFormulario = (rotulo) => html`<footer class="gaveta__rodape">
    <button type="submit" class="botao botao--primario" data-enviando="Salvando…"><span class="botao__rotulo">${rotulo}</span></button>
    <button type="button" class="botao botao--secundario" data-gaveta-fechar>Fechar</button>
  </footer>`;

async function formularioDaSenha(id) {
  const pessoa = await buscarPessoa(id);
  return {
    titulo: "Redefinir senha",
    contexto: pessoa.nome,
    trecho: html`<form class="formulario" id="form-senha" novalidate>${campoSenha("Nova senha")}${rodapeDoFormulario("Salvar senha")}</form>`,
    ligar(dialogo) {
      const form = dialogo.querySelector("#form-senha");
      ligarMostrarSenha(form);
      ligarFormulario(form, {
        enviar: (dados) => api.post(`/api/funcionarios/${id}/senha`, dados),
        depois: () => {
          fecharGaveta();
          avisar(`Senha de ${primeiroNome(pessoa.nome)} redefinida.`);
        },
      });
    },
  };
}

/**
 * As gavetas da pessoa para ligarGavetas. `depois()` roda depois de salvar, desativar ou reativar;
 * `aoDesativar(pessoa)` deixa a tela mostrar a pessoa desativada na hora. O formulário de redefinir
 * a senha abre com preencher {modo: "senha"}; o de nova pessoa aceita {funcao}.
 */
export function gavetaPessoa({depois = () => {}, aoDesativar = (pessoa) => desativarPessoa(pessoa, {depois})} = {}) {
  return {
    async detalhe(id) {
      const hoje = isoDoDia();
      const [pessoa, doDia, abertas] = await Promise.all([buscarPessoa(id),
        api.get("/api/tarefas", {dia: hoje}).then((r) => r.tarefas), api.get("/api/tarefas").then((r) => r.tarefas)]);
      const dela = (t) => t.responsavel?.id === pessoa.id;
      // Hoje: as do dia e as abertas de dias anteriores (atrasadas); depois, as próximas 5 abertas.
      const deHoje = [...doDia.filter(dela), ...abertas.filter((t) => dela(t) && t.agendada_para.slice(0, 10) < hoje)].sort(porHorario);
      const proximas = abertas.filter((t) => dela(t) && t.agendada_para.slice(0, 10) > hoje).sort(porHorario).slice(0, 5);
      return {
        titulo: pessoa.nome,
        contexto: pessoa.ativo ? FUNCOES[pessoa.funcao] : html`${FUNCOES[pessoa.funcao]} · Acesso desativado`,
        trecho: html`<div class="gaveta__secao"><dl class="dados">
            <dt>Função</dt><dd>${FUNCOES[pessoa.funcao]}</dd>
            <dt>Telefone</dt><dd>${contatosDaPessoa(pessoa)}</dd>
            <dt>E-mail de acesso</dt><dd><a class="link" href="mailto:${pessoa.email}">${pessoa.email}</a></dd>
          </dl></div>
          ${secaoDeTarefas("pessoa-hoje", "Hoje", deHoje, "Nenhuma tarefa hoje.", hoje)}
          ${secaoDeTarefas("pessoa-proximas", "Próximas", proximas, "Nenhuma tarefa marcada depois de hoje.", hoje)}
          <footer class="gaveta__rodape">
            <button type="button" class="botao botao--secundario" data-editar>Editar</button>
            <button type="button" class="botao botao--icone botao--fantasma" data-acoes aria-label="Mais ações de ${pessoa.nome}">${icone("acoes", {tamanho: 20})}</button>
          </footer>`,
        ligar(dialogo) {
          dialogo.querySelector("[data-editar]").addEventListener("click", () => abrirGaveta("pessoa", id, {editar: true}));
          for (const link of dialogo.querySelectorAll("[data-tarefa]")) {
            link.addEventListener("click", (evento) => {
              if (!cliqueComum(evento)) return;
              evento.preventDefault();
              abrirGaveta("tarefa", Number(link.dataset.tarefa),
                {preencher: {voltarPara: {tipo: "pessoa", id: pessoa.id, rotulo: pessoa.nome}}});
            });
          }
          ligarMenu(dialogo.querySelector("[data-acoes]"), itensDaPessoa(pessoa, {
            aoDesativar: (escolhida) => {
              fecharGaveta();
              aoDesativar(escolhida);
            },
            aoReativar: (escolhida) => reativarPessoa(escolhida, {depois: (salva) => {
              depois(salva);
              recarregarGaveta();
            }}),
          }));
        },
      };
    },

    async formulario(id, preencher = {}) {
      if (preencher.modo === "senha") return formularioDaSenha(id);
      const editando = id !== "nova";
      const pessoa = editando ? await buscarPessoa(id) : {funcao: Object.hasOwn(FUNCOES, preencher.funcao ?? "") ? preencher.funcao : "limpeza"};
      return {
        titulo: editando ? `Editar ${pessoa.nome}` : "Nova pessoa",
        trecho: html`<form class="formulario" id="form-pessoa" novalidate>
          ${campo("nome", "Nome", pessoa.nome, {obrigatorio: true, extra: html`maxlength="120"`})}
          <div class="campo"><fieldset class="escolhas"><legend>Função</legend>
            ${Object.entries(FUNCOES).map(([valor, rotulo]) => html`<label class="escolha">
              <input type="radio" name="funcao" value="${valor}" ${valor === pessoa.funcao ? "checked" : ""}><span>${rotulo}</span></label>`)}
          </fieldset></div>
          ${campo("telefone", "Telefone", pessoa.telefone, {tipo: "tel"})}
          ${campo("email", "E-mail de acesso", pessoa.email, {tipo: "email", obrigatorio: true, extra: html`spellcheck="false"`})}
          ${editando ? "" : campoSenha("Senha inicial")}
          ${rodapeDoFormulario("Salvar pessoa")}
        </form>`,
        ligar(dialogo) {
          const form = dialogo.querySelector("#form-pessoa");
          ligarMostrarSenha(form);
          ligarFormulario(form, {
            enviar: (dados) => (editando ? api.patch(`/api/funcionarios/${id}`, dados) : api.post("/api/funcionarios", dados)),
            depois: (salva) => {
              fecharGaveta();
              avisar(editando ? `Cadastro de ${primeiroNome(salva.nome)} salvo.` : `Acesso de ${primeiroNome(salva.nome)} criado.`);
              depois(salva);
            },
          });
        },
      };
    },
  };
}
