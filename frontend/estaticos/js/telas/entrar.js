// Tela Entrar: e-mail e senha; cada perfil cai na sua tela. O erro não diz qual dos dois está errado.

import {api} from "../nucleo/api.js";
import {destinoSeguro} from "../nucleo/url.js";
import {podeAnimar} from "../nucleo/nivel.js";
import {ligarFormulario, ligarMostrarSenha} from "../componentes/formulario.js";
import {esconderFaixa, mostrarFaixa} from "../componentes/faixa.js";

const SEM_CONEXAO = "Não deu para entrar agora. Confira a internet e tente de novo.";
const parametros = new URLSearchParams(location.search);
const form = document.querySelector("#form-entrar");
const avisos = document.querySelector("[data-entrar-avisos]");

if (parametros.has("saiu")) mostrarFaixa(avisos, {tom: "info", mensagem: "Você saiu do Gemóvel."});

ligarFormulario(form, {
  async enviar({email, senha}) {
    esconderFaixa(avisos);
    try {
      return await api.post("/api/sessao", {email, senha});
    } catch (erro) {
      const semServidor = erro.status === 0 || erro.status >= 500;
      // Sem o status, o formulário mostra a mensagem na faixa (401 aqui é senha errada, não sessão expirada).
      throw {mensagem: semServidor ? SEM_CONEXAO : erro.mensagem, campos: erro.status === 422 ? erro.campos : null};
    }
  },
  depois({usuario}) {
    const painel = usuario.perfil === "administrador" ? "/" : "/minhas-tarefas";
    location.assign(destinoSeguro(parametros.get("volta")) ?? painel);
  },
});

// Paralaxe do ponteiro: as gemas mais próximas mexem mais (até 12px). Só com mouse e com movimento.
function ligarParalaxe() {
  const palco = document.querySelector(".palco");
  if (!palco || !podeAnimar() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let quadro = 0;
  addEventListener("pointermove", (evento) => {
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => {
      const caixa = palco.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((evento.clientX - caixa.left) / caixa.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((evento.clientY - caixa.top) / caixa.height) * 2 - 1));
      palco.style.setProperty("--px", x.toFixed(3));
      palco.style.setProperty("--py", y.toFixed(3));
    });
  }, {passive: true});
}

ligarMostrarSenha(form);
ligarParalaxe();
