// Formulário de cadastro (padrão do DESIGN.md §4): junta os campos, mostra a espera no botão,
// põe cada erro da API no campo certo e leva o foco ao primeiro. Nada roda ao importar.

import {html, renderizar} from "../nucleo/html.js";
import {paraDinheiroApi} from "../nucleo/formatos.js";
import {SPRITE, icone, trocarTexto} from "./pecas.js";

/** Enquanto um envio espera a resposta, chamar de novo devolve a mesma promessa. */
export function umEnvioPorVez(funcao) {
  let andamento = null;
  return (...argumentos) => {
    if (andamento) return andamento;
    let resultado;
    try {
      resultado = Promise.resolve(funcao(...argumentos));
    } catch (erro) {
      resultado = Promise.reject(erro);
    }
    andamento = resultado.finally(() => {
      andamento = null;
    });
    return andamento;
  };
}

function valorDoCampo(campo) {
  if (campo.type === "checkbox") return campo.checked;
  // A senha vai como foi digitada: espaço no começo ou no fim faz parte dela.
  if (campo.type === "password" || campo.dataset.tipo === "senha") return campo.value === "" ? null : campo.value;
  const texto = campo.value.trim();
  if (texto === "") return null;
  if (campo.dataset.tipo === "moeda") return paraDinheiroApi(texto) ?? texto;
  if (campo.type === "number" || campo.dataset.tipo === "inteiro") {
    const numero = Number(texto);
    return Number.isInteger(numero) ? numero : texto;
  }
  return texto;
}

export function lerCampos(form) {
  const dados = {};
  for (const campo of form.elements) {
    if (!campo.name || campo.disabled || campo.type === "submit" || campo.type === "button") continue;
    if (campo.type === "radio") {
      if (campo.checked) dados[campo.name] = campo.value;
      else if (!(campo.name in dados)) dados[campo.name] = null;
      continue;
    }
    dados[campo.name] = valorDoCampo(campo);
  }
  return dados;
}

function grupoDe(campo) {
  return campo.closest(".campo") ?? campo.parentElement;
}

// O erro de um campo pode trazer, logo abaixo da mensagem, um botão que resolve ali mesmo (na busca do
// hóspede, "Cadastrar “Ana”"). `acao()` roda na hora e devolve {rotulo, fazer, icone}, ou null.
const acoesDoErro = new WeakMap();

export function acaoNoErro(campo, acao) {
  acoesDoErro.set(campo, acao);
}

/** Refaz o rótulo do botão do erro de `campo` com o texto de agora, sem tirar o erro do lugar. */
export function atualizarAcaoDoErro(campo) {
  const rotulo = grupoDe(campo).querySelector(".campo__acao .botao__rotulo");
  const acao = rotulo && acoesDoErro.get(campo)?.();
  if (acao) rotulo.textContent = acao.rotulo;
}

function botaoDaAcao(campo, acao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao botao--sm botao--secundario campo__acao";
  renderizar(botao, html`${acao.icone ? icone(acao.icone) : ""}<span class="botao__rotulo">${acao.rotulo}</span>`);
  botao.addEventListener("click", () => (acoesDoErro.get(campo)?.() ?? acao).fazer());
  return botao;
}

export function limparErro(campo) {
  campo.removeAttribute("aria-invalid");
  const grupo = grupoDe(campo);
  grupo.querySelector(".campo__acao")?.remove();
  const erro = grupo.querySelector(".campo__erro");
  if (!erro) return;
  const ligados = (campo.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id && id !== erro.id);
  if (ligados.length) campo.setAttribute("aria-describedby", ligados.join(" "));
  else campo.removeAttribute("aria-describedby");
  erro.remove();
}

/** Mostra `mensagem` embaixo do campo; a mesma mensagem de novo não refaz o erro (nem a animação).
 * Com `invalido: false`, o campo não fica inválido e o aviso não some ao digitar: é o aviso que a
 * busca dá enquanto a pessoa ainda escreve, e quem o tira é a própria busca. */
export function marcarErro(campo, mensagem, {invalido = true} = {}) {
  const grupo = grupoDe(campo);
  if (grupo.querySelector(".campo__erro")?.dataset.mensagem === mensagem) {
    atualizarAcaoDoErro(campo);
  } else {
    limparErro(campo);
    const erro = document.createElement("p");
    erro.className = "campo__erro";
    erro.id = `erro-${campo.id || campo.name}`;
    erro.dataset.mensagem = mensagem;
    renderizar(erro, html`${icone("erro")}<span>${mensagem}</span>`);
    grupo.append(erro);
    const acao = acoesDoErro.get(campo)?.();
    if (acao) grupo.append(botaoDaAcao(campo, acao));
    const ligados = (campo.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    campo.setAttribute("aria-describedby", [...ligados, erro.id].join(" "));
  }
  if (invalido) campo.setAttribute("aria-invalid", "true");
  else campo.removeAttribute("aria-invalid");
}

function mostrarResumo(form, mensagem, erros) {
  form.querySelector(".formulario__resumo")?.remove();
  if (!mensagem) return;
  const resumo = document.createElement("div");
  resumo.className = "faixa faixa--erro formulario__resumo";
  resumo.setAttribute("role", "alert");
  resumo.tabIndex = -1;
  renderizar(resumo, html`${icone("erro")}<div class="faixa__texto"><p>${mensagem}</p>${erros.length > 1
    ? html`<ul>${erros.map(([campo, texto]) => html`<li><a href="#${campo.id}">${texto}</a></li>`)}</ul>` : ""}</div>`);
  form.prepend(resumo);
}

// O campo escondido que um controle preenche (as datas do seletor, o hóspede da busca) aponta
// esse controle em data-erro-em: o erro aparece e recebe o foco ali.
function alvoDoErro(form, campo) {
  return (campo?.dataset?.erroEm && form.querySelector(campo.dataset.erroEm)) || campo;
}

function camposDoErro(form, campos) {
  return Object.entries(campos ?? {})
    .map(([nome, texto]) => [form.elements.namedItem(nome), texto])
    .map(([campo, texto]) => [alvoDoErro(form, campo instanceof RadioNodeList ? campo[0] : campo), texto])
    // Um erro por controle: as duas datas escondidas apontam o mesmo seletor.
    .filter(([campo], i, todos) => campo && todos.findIndex(([outro]) => outro === campo) === i);
}

/** Erros ditos pela API (ou pela conferência local) aparecem nos campos e no resumo. O conflito
 * (409) também vai para o resumo do topo, mesmo com o campo certo marcado (web-admin.md §4). */
export function mostrarErros(form, {mensagem, campos, status = null}) {
  for (const campo of form.querySelectorAll("[aria-invalid]")) limparErro(campo);
  const erros = camposDoErro(form, campos);
  for (const [campo, texto] of erros) marcarErro(campo, texto);
  const semCampo = Object.keys(campos ?? {}).length > erros.length;
  mostrarResumo(form, erros.length > 1 || semCampo || !erros.length || status === 409 ? mensagem : null, erros);
  const primeiro = erros[0]?.[0];
  if (primeiro) primeiro.focus();
  else form.querySelector(".formulario__resumo")?.focus?.();
}

function conferirObrigatorios(form) {
  const campos = {};
  for (const campo of form.querySelectorAll("[required]")) {
    const vazio = campo.type === "checkbox" ? !campo.checked : !campo.value.trim();
    if (vazio) campos[campo.name] = campo.dataset.obrigatorio ?? "Preencha este campo.";
  }
  return campos;
}

/**
 * Liga o envio do formulário. `enviar(dados)` devolve a promessa da API; `depois(resposta)` roda
 * quando der certo. O botão de envio mostra o rótulo de `data-enviando` enquanto espera.
 */
export function ligarFormulario(form, {enviar, depois, dados: ajustar = (dados) => dados}) {
  form.noValidate = true;
  const botao = form.querySelector('[type="submit"]') ?? document.querySelector(`[type="submit"][form="${form.id}"]`);
  const rotulo = botao?.querySelector(".botao__rotulo") ?? botao;
  const rotuloOriginal = rotulo?.textContent;

  form.addEventListener("input", (evento) => {
    const campo = evento.target;
    if (campo.getAttribute?.("aria-invalid") === "true") limparErro(campo);
  });
  form.addEventListener("focusout", (evento) => {
    const campo = evento.target;
    if (campo.required && campo.value?.trim?.() === "" && campo.dataset.tocado) {
      marcarErro(campo, campo.dataset.obrigatorio ?? "Preencha este campo.");
    }
  });
  form.addEventListener("input", (evento) => {
    evento.target.dataset && (evento.target.dataset.tocado = "1");
  });

  const mandar = umEnvioPorVez(async () => {
    const faltando = conferirObrigatorios(form);
    if (Object.keys(faltando).length) {
      mostrarErros(form, {mensagem: "Confira os campos destacados.", campos: faltando});
      return;
    }
    botao?.setAttribute("aria-busy", "true");
    if (botao?.dataset.enviando) trocarTexto(rotulo, botao.dataset.enviando);
    try {
      const resposta = await enviar(ajustar(lerCampos(form)));
      form.dispatchEvent(new CustomEvent("gemovel:salvo", {bubbles: true}));
      await depois?.(resposta);
    } catch (erro) {
      if (erro?.status === 401) return; // o aviso de sessão expirada já apareceu
      mostrarErros(form, {mensagem: erro?.mensagem ?? "Algo deu errado do nosso lado. Tente de novo.", campos: erro?.campos,
        status: erro?.status});
    } finally {
      botao?.removeAttribute("aria-busy");
      if (botao?.dataset.enviando && rotulo?.isConnected) trocarTexto(rotulo, rotuloOriginal);
    }
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    mandar();
  });
  return {enviar: mandar};
}

/** O botão Mostrar de cada senha do formulário (o aria-controls diz qual campo): troca o tipo do
 * campo, o rótulo e o ícone. */
export function ligarMostrarSenha(form) {
  for (const botao of form.querySelectorAll("[data-mostrar]")) {
    const senha = form.querySelector(`#${botao.getAttribute("aria-controls")}`);
    botao.addEventListener("click", () => {
      const aparecendo = senha.type === "text";
      senha.type = aparecendo ? "password" : "text";
      botao.querySelector("[data-mostrar-rotulo]").textContent = aparecendo ? "Mostrar" : "Ocultar";
      botao.querySelector("use").setAttribute("href", `${SPRITE}#${aparecendo ? "mostrar" : "ocultar"}`);
    });
  }
}
