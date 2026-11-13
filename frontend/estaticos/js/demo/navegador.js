// A demonstração no navegador (GitHub Pages, spec 2026-11-13-github-pages-design.md). Guarda os dados de
// exemplo no localStorage de quem visita, faz as datas andarem até hoje e responde à API pelo servidor
// simulado. Na página, faz o que as rotas de páginas do Flask fariam (a guarda de cada tela), traduz os
// links e mostra a faixa da demonstração e as contas de exemplo em Entrar. Só as páginas geradas por
// ferramentas/gerar_site.py carregam este módulo.

import {html, renderizar} from "../nucleo/html.js";
import {arquivoAtual, destinoDaGuarda, traduzirLinks} from "../nucleo/enderecos.js";
import {icone} from "../componentes/pecas.js";
import {criarServidor, deslocarDatas} from "./servidor.js";

const CHAVE = "gemovel:demo";
const EXEMPLO = new URL("../../demo/dados.json", import.meta.url);
const PERFIL = {administrador: "Administração", limpeza: "Limpeza", manutencao: "Manutenção"};

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const diasEntre = (de, ate) => Math.round((Date.parse(ate) - Date.parse(de)) / 864e5);

// Sem localStorage (bloqueado ou cheio), as mudanças valem só até a página recarregar.
let semArmazenamento = false;
let naMemoria = null;

function lerGuardado() {
  if (semArmazenamento) return naMemoria;
  try {
    return JSON.parse(localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

function guardar(estado) {
  naMemoria = estado;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    semArmazenamento = true;
  }
}

function esquecer() {
  naMemoria = null;
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada guardado
  }
}

let exemplo = null;

/** Os dados de quem visita, com as datas andadas até hoje; na primeira visita, os de exemplo. */
async function abrirEstado() {
  let estado = lerGuardado();
  if (!estado?.dados) {
    exemplo ??= fetch(EXEMPLO).then((resposta) => {
      if (!resposta.ok) throw new Error(`dados de exemplo: ${resposta.status}`);
      return resposta.json();
    }).catch((erro) => {
      exemplo = null;
      throw erro;
    });
    const {gerado_em: geradoEm, dados} = await exemplo;
    estado = {dia_base: geradoEm, dados: structuredClone(dados)};
  }
  const dias = diasEntre(estado.dia_base, hoje());
  if (dias) {
    deslocarDatas(estado.dados, dias);
    estado.dia_base = hoje();
  }
  return estado;
}

/** O pedido da API (o caminho já com a busca), respondido pelo servidor simulado como uma Response. */
export async function responder(metodo, caminho, corpo) {
  try {
    const estado = await abrirEstado();
    const resposta = criarServidor(estado.dados).responder(metodo, caminho, corpo);
    guardar(estado);
    return new Response(resposta.status === 204 ? null : JSON.stringify(resposta.corpo),
      {status: resposta.status, headers: {"Content-Type": "application/json"}});
  } catch (erro) {
    console.error("Demonstração:", erro);
    throw erro;
  }
}

function perfilDaSessao() {
  const dados = lerGuardado()?.dados;
  return dados?.usuarios?.find((u) => u.id === dados.sessao && u.ativo)?.perfil ?? null;
}

/** Como as páginas do Flask: sem sessão vai para Entrar; com o perfil de outra área, para o painel. */
function guardarTela() {
  const destino = destinoDaGuarda(arquivoAtual(), location.search, perfilDaSessao());
  if (!destino) return false;
  document.documentElement.hidden = true; // a tela que vai sair nem aparece
  location.replace(destino);
  return true;
}

/** Recomeçar: volta aos dados de exemplo, sem tirar a pessoa da conta em que está. */
async function recomecar() {
  const sessao = lerGuardado()?.dados?.sessao ?? null;
  esquecer();
  const estado = await abrirEstado();
  estado.dados.sessao = sessao;
  guardar(estado);
  location.reload();
}

function mostrarFaixa() {
  const faixa = document.createElement("div");
  faixa.className = "faixa faixa--info demo-faixa";
  faixa.setAttribute("role", "note");
  renderizar(faixa, html`${icone("info")}<p class="faixa__texto">Demonstração: as mudanças ficam só neste navegador.</p>
    <button type="button" class="botao botao--sm botao--secundario">Recomeçar</button>`);
  faixa.querySelector("button").addEventListener("click", () => recomecar());
  const pular = document.querySelector(".pular-para-conteudo");
  if (pular) pular.after(faixa);
  else document.body.prepend(faixa);
}

/** Em Entrar, as contas de exemplo: um toque entra com a conta (na demonstração, qualquer senha serve). */
async function mostrarContas() {
  const form = document.querySelector("#form-entrar");
  if (!form) return;
  const {dados} = await abrirEstado();
  const caixa = document.createElement("section");
  caixa.className = "demo-contas";
  caixa.setAttribute("aria-labelledby", "demo-contas-titulo");
  renderizar(caixa, html`<h2 class="demo-contas__titulo" id="demo-contas-titulo">Contas de exemplo</h2>
    <p class="demo-contas__nota">Na demonstração, qualquer senha serve. Escolha uma conta para entrar.</p>
    <ul class="demo-contas__lista" role="list">${dados.usuarios.filter((u) => u.ativo).map((u) => html`<li>
      <button type="button" class="demo-contas__conta" data-email="${u.email}"><span>${u.nome}</span>
        <span class="demo-contas__perfil">${PERFIL[u.perfil === "administrador" ? u.perfil : u.funcao]}</span></button></li>`)}</ul>`);
  caixa.addEventListener("click", (evento) => {
    const conta = evento.target.closest("[data-email]");
    if (!conta) return;
    form.elements.email.value = conta.dataset.email;
    form.elements.senha.value = "demonstracao";
    form.requestSubmit();
  });
  form.after(caixa);
}

if (typeof document !== "undefined" && !guardarTela()) {
  traduzirLinks();
  mostrarFaixa();
  mostrarContas().catch((erro) => console.error("Demonstração:", erro));
}
