// Avanço de estado (lote B §12; app-equipe.md §3): o botão grande do cartão leva a tarefa ao próximo
// estado. Com a resposta, a gema se lapida e o aviso dá 10s para Desfazer; a falha fica no cartão.
// O aviso também é o anúncio do leitor de tela (a região de status dele). Nada roda ao importar.

import {api} from "../nucleo/api.js";
import {movimentoReduzido} from "../nucleo/nivel.js";
import {acaoDoAvanco, fraseDaMudanca} from "../nucleo/tarefas.js";
import {avisar} from "./aviso.js";
import {esconderFaixa, mostrarFaixa} from "./faixa.js";
import {umEnvioPorVez} from "./formulario.js";

const SEM_INTERNET = "Não deu para salvar. Confira a internet.";

// Sem resposta do servidor, a frase da internet; a recusa dele vem no campo status ou na mensagem.
const fraseDoErro = (erro) => (erro?.status === 0 ? SEM_INTERNET : erro?.campos?.status ?? erro?.mensagem ?? SEM_INTERNET);

// As durações e as curvas vêm dos tokens da v0.4, para não duplicar os números aqui.
const token = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
const duracao = (nome) => parseFloat(token(nome)) || 0;

/** A gema do cartão se lapida: em `dur-moderate` ao começar, em `dur-slow` com brilho e um pulo ao
 * concluir. Ao desfazer, e com movimento reduzido, só um fade de `dur-fast`. */
export function lapidarGema(elemento, como) {
  if (!elemento?.animate) return;
  if (como === "desfazer" || movimentoReduzido()) {
    elemento.animate([{opacity: 0}, {opacity: 1}], {duration: duracao("--dur-fast")});
    return;
  }
  const curva = token("--ease-entrance");
  if (como === "em_andamento") {
    elemento.animate([{opacity: 0.3, transform: "scale(.7) rotate(-20deg)"}, {opacity: 1, transform: "none"}],
      {duration: duracao("--dur-moderate"), easing: curva});
    return;
  }
  const lapidar = elemento.animate([
    {opacity: 0.4, transform: "scale(.6) rotate(-30deg)", filter: "brightness(1.8)"},
    {opacity: 1, transform: "none", filter: "brightness(1)"},
  ], {duration: duracao("--dur-slow"), easing: curva});
  lapidar.onfinish = () => elemento.animate([{transform: "scale(.88)"}, {transform: "none"}],
    {duration: duracao("--dur-moderate"), easing: token("--ease-pop")});
}

/** Liga o botão [data-avanco] do cartão. `aoMudar(tarefa, {como})` redesenha o cartão no lugar, com
 * `como` = "em_andamento", "concluida" ou "desfazer". Toques repetidos esperam a mesma resposta. */
export function ligarAvanco(cartao, tarefa, {aoMudar}) {
  const acao = acaoDoAvanco(tarefa);
  const botao = cartao.querySelector("[data-avanco]");
  if (!acao || !botao) return;
  const rotulo = botao.querySelector("[data-rotulo]");
  const falha = cartao.querySelector("[data-falha]");

  async function desfazer() {
    try {
      aoMudar(await api.post(`/api/tarefas/${tarefa.id}/desfazer`, {}), {como: "desfazer"});
    } catch (erro) {
      if (erro?.status !== 401) avisar(erro?.status === 0 ? SEM_INTERNET : fraseDoErro(erro));
    }
  }

  const enviar = umEnvioPorVez(async () => {
    esconderFaixa(falha);
    botao.setAttribute("aria-busy", "true");
    rotulo.textContent = acao.espera;
    try {
      const nova = await api.post(`/api/tarefas/${tarefa.id}/estado`, {status: acao.proximo});
      if (acao.proximo === "concluida") navigator.vibrate?.(15);
      aoMudar(nova, {como: acao.proximo});
      avisar(fraseDaMudanca(nova), {acao: {rotulo: "Desfazer", fazer: desfazer}});
    } catch (erro) {
      botao.removeAttribute("aria-busy");
      rotulo.textContent = acao.rotulo;
      if (erro?.status === 401) return; // o aviso de sessão expirada já leva para Entrar
      const deNovo = !erro?.status || erro.status >= 500;
      mostrarFaixa(falha, {mensagem: fraseDoErro(erro), tentarDeNovo: deNovo ? () => enviar() : null});
    }
  });

  botao.addEventListener("click", () => enviar());
}
