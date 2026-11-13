// Contas da Visão geral e da Agenda, sem DOM: a saudação, a escala do gráfico, os meses e a posição
// das barras na linha do tempo (entrada às 15:00, saída às 11:00, como o protótipo aprovado).

import {isoDoDia} from "./formatos.js";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
  "novembro", "dezembro"];
const ENTRADA = 15 / 24; // a barra começa às 15:00 do dia da entrada
const SAIDA = 11 / 24; // e termina às 11:00 do dia da saída

export function saudacao(agora = new Date()) {
  const hora = agora.getHours();
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

/** O topo do eixo e as marcas, em uns 4 passos de 1, 2, 2,5 ou 5 vezes uma potência de 10. */
export function escalaDoEixo(maximo) {
  const alvo = maximo > 0 ? maximo : 1000;
  const bruto = alvo / 4;
  const grandeza = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].find((m) => m * grandeza >= bruto) * grandeza;
  const topo = Math.ceil(alvo / passo) * passo;
  return {topo, marcas: Array.from({length: Math.round(topo / passo) + 1}, (_, i) => i * passo)};
}

const partesDoMes = (mes) => mes.split("-").map(Number);

export function mesAbreviado(mes) {
  return MESES[partesDoMes(mes)[1] - 1].slice(0, 3);
}

export function mesPorExtenso(mes) {
  const [ano, numero] = partesDoMes(mes);
  return `${MESES[numero - 1]} de ${ano}`;
}

/** Os dias do mês "2026-11", em ISO. */
export function diasDoMes(mes) {
  const [ano, numero] = partesDoMes(mes);
  const total = new Date(ano, numero, 0).getDate();
  return Array.from({length: total}, (_, i) => isoDoDia(new Date(ano, numero - 1, i + 1)));
}

// Dias contados em UTC: a troca do horário de verão não encurta nem alonga um dia.
const numeroDoDia = (iso) => {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia) / 864e5;
};

/**
 * Onde a barra de uma estadia cai na linha do tempo que começa em `inicio` e mostra `dias` dias:
 * {esquerda, largura} em frações da largura, e se a barra continua antes ou depois do que se vê.
 * Fora da vista, null.
 */
export function barraNaAgenda({entrada, saida}, inicio, dias) {
  const zero = numeroDoDia(inicio);
  const de = numeroDoDia(entrada) - zero + ENTRADA;
  const ate = numeroDoDia(saida) - zero + SAIDA;
  const esquerda = Math.max(de, 0);
  const direita = Math.min(ate, dias);
  if (direita <= esquerda) return null;
  return {esquerda: esquerda / dias, largura: (direita - esquerda) / dias, cortadaAntes: de < 0, cortadaDepois: ate > dias};
}

/** Onde cai, em fração da largura, um momento "2026-11-05T13:00" na vista que começa em `inicio`; fora dela, null. */
export function posicaoNoTempo(dataHora, inicio, dias) {
  const [dia, hora = "00:00"] = dataHora.split("T");
  const [h, m] = hora.split(":").map(Number);
  const x = numeroDoDia(dia) - numeroDoDia(inicio) + (h + m / 60) / 24;
  return x < 0 || x > dias ? null : x / dias;
}

/** Arrastar do dia `a` ao dia `b` (índices a partir de `inicio`, em qualquer ordem): entrada e saída. */
export function periodoDoArraste(inicio, a, b) {
  const [ano, mes, dia] = inicio.split("-").map(Number);
  const noDia = (i) => isoDoDia(new Date(ano, mes - 1, dia + i));
  return {entrada: noDia(Math.min(a, b)), saida: noDia(Math.max(a, b) + 1)};
}
