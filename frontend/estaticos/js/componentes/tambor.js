// Tambor de dígitos (DESIGN.md §10, item 7): cada algarismo é uma coluna de 0 a 9 que desliza até o
// valor novo, 30ms depois da coluna anterior, e o último passo assenta com ease-pop. O leitor de tela
// lê só o valor final; sem animação (nível Leve ou movimento reduzido), o texto vai direto.

import {podeAnimar} from "../nucleo/nivel.js";

const PADRAO = "cubic-bezier(.23, 1, .32, 1)";
const POP = "cubic-bezier(.34, 1.56, .64, 1)";
const DURACAO = 300;
const ENTRE_COLUNAS = 30;

// "R$ 4.560,00" → [{texto: "R$ "}, {digito: 4}, {texto: "."}, …]: o texto seguido fica numa parte só.
export function partesDoNumero(texto) {
  const partes = [];
  for (const caractere of String(texto ?? "")) {
    const anterior = partes[partes.length - 1];
    if (caractere >= "0" && caractere <= "9") partes.push({digito: Number(caractere)});
    else if (anterior && "texto" in anterior) anterior.texto += caractere;
    else partes.push({texto: caractere});
  }
  return partes;
}

// O valor que cada tambor mostra, para o próximo partir dele.
const valorAtual = new WeakMap();

const posicao = (digito) => `translateY(${-digito * 10}%)`;

function coluna() {
  const caixa = document.createElement("span");
  caixa.className = "tambor__coluna";
  const rolo = document.createElement("span");
  rolo.className = "tambor__rolo";
  for (let n = 0; n <= 9; n += 1) {
    const algarismo = document.createElement("span");
    algarismo.textContent = String(n);
    rolo.append(algarismo);
  }
  caixa.append(rolo);
  return {caixa, rolo};
}

export function tambor(elemento, texto) {
  if (!elemento) return;
  texto = String(texto ?? "");
  const anterior = valorAtual.get(elemento);
  valorAtual.set(elemento, texto);
  if (!podeAnimar() || !elemento.animate) {
    elemento.textContent = texto;
    return;
  }
  if (anterior === texto && elemento.querySelector(".tambor__digitos")) return;

  // Os algarismos se alinham pela direita: a coluna das unidades parte das unidades de antes.
  const antes = partesDoNumero(anterior ?? "").filter((p) => "digito" in p).map((p) => p.digito);
  const partes = partesDoNumero(texto);
  const total = partes.filter((p) => "digito" in p).length;
  const valor = document.createElement("span");
  valor.className = "visualmente-oculto";
  valor.textContent = texto;
  const digitos = document.createElement("span");
  digitos.className = "tambor__digitos";
  digitos.setAttribute("aria-hidden", "true");
  const animar = [];
  let indice = 0;
  for (const parte of partes) {
    if ("texto" in parte) {
      const pedaco = document.createElement("span");
      pedaco.className = "tambor__texto";
      pedaco.textContent = parte.texto;
      digitos.append(pedaco);
      continue;
    }
    const {caixa, rolo} = coluna();
    const de = antes[antes.length - (total - indice)] ?? 0;
    rolo.style.transform = posicao(parte.digito);
    digitos.append(caixa);
    if (de !== parte.digito) animar.push({rolo, de, para: parte.digito, atraso: indice * ENTRE_COLUNAS});
    indice += 1;
  }
  elemento.classList.add("tambor");
  elemento.replaceChildren(valor, digitos);
  for (const {rolo, de, para, atraso} of animar) {
    // O último passo (o algarismo de antes do final) assenta com ease-pop.
    const penultimo = para + (de < para ? -1 : 1);
    const quadros = penultimo === de
      ? [{transform: posicao(de), easing: POP}, {transform: posicao(para)}]
      : [{transform: posicao(de), easing: PADRAO}, {transform: posicao(penultimo), offset: 0.75, easing: POP}, {transform: posicao(para)}];
    rolo.animate(quadros, {duration: DURACAO, delay: atraso, fill: "backwards"});
  }
}
