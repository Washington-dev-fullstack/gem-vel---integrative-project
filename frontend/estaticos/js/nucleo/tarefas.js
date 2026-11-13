// Regras das tarefas que as telas do admin e o app da equipe usam (lote B §9 e §11), sem DOM.

import {data, horario, isoDoDia} from "./formatos.js";

export const porHorario = (a, b) => a.agendada_para.localeCompare(b.agendada_para) || a.id - b.id;

/** Os grupos da tela, na ordem do lote B. A gema de atrasada só vale antes de começar: a tarefa em
 * andamento atrasada fica no grupo dela. Cada grupo vem por horário. */
export function agruparTarefas(tarefas) {
  const grupos = {atrasadas: [], em_andamento: [], pendentes: [], concluidas: []};
  for (const t of tarefas) {
    if (t.status === "concluida") grupos.concluidas.push(t);
    else if (t.status === "em_andamento") grupos.em_andamento.push(t);
    else if (t.atrasada) grupos.atrasadas.push(t);
    else grupos.pendentes.push(t);
  }
  for (const lista of Object.values(grupos)) lista.sort(porHorario);
  return grupos;
}

const PASSAGENS = {pendente: ["em_andamento", "concluida"], em_andamento: ["concluida"], concluida: ["pendente"]};

/** Para onde o admin pode levar a tarefa pelo menu (R5): só ele reabre a concluída. */
export const passagensDoAdmin = (status) => PASSAGENS[status] ?? [];

export const primeiroNome = (nome) => String(nome ?? "").trim().split(/\s+/)[0];

const VERBOS = {pendente: "criou", em_andamento: "começou", concluida: "concluiu"};

/** "Marcos começou": o primeiro nome de quem mudou e o verbo da mudança. */
export function fraseDoRegistro(registro) {
  const verbo = registro.status_novo === "pendente" && registro.status_anterior === "concluida"
    ? "reabriu" : VERBOS[registro.status_novo];
  return `${primeiroNome(registro.usuario?.nome)} ${verbo}`;
}

/** A carga de quem pode pegar a tarefa, na lista de responsáveis: "1 tarefa hoje". */
export function cargaNoDia(total, ehHoje) {
  const quando = ehHoje ? "hoje" : "neste dia";
  if (!total) return `nenhuma tarefa ${quando}`;
  return `${total} ${total === 1 ? "tarefa" : "tarefas"} ${quando}`;
}

/** A fila do cartão de pessoa: uma gema por tarefa do dia, no máximo 6, e quantas sobram. */
export function filaDeGemas(estados, maximo = 6) {
  return {gemas: estados.slice(0, maximo), resto: Math.max(0, estados.length - maximo)};
}

/** O dia da pessoa no cartão da equipe: "2 de 3 concluídas". */
export function fraseDoDia({total, concluidas}) {
  return `${concluidas} de ${total} ${total === 1 ? "concluída" : "concluídas"}`;
}

const FAZENDO = {limpeza: (imovel) => `limpando ${imovel}`, manutencao: (imovel) => `manutenção em ${imovel}`};

/** A linha de baixo do cartão: o que a pessoa faz agora, a próxima tarefa (a hora, ou o dia quando
 * não é `hoje`) ou "Dia livre". */
export function linhaDoAgora(pessoa, hoje) {
  if (pessoa.agora) {
    const fazendo = FAZENDO[pessoa.funcao] ?? ((imovel) => `em ${imovel}`);
    return `Agora: ${fazendo(pessoa.agora.imovel.nome)}`;
  }
  if (pessoa.proxima) {
    const quando = pessoa.proxima.agendada_para;
    const dia = quando.slice(0, 10) === hoje ? horario(quando) : data(quando, {hoje});
    return `Próxima: ${dia} · ${pessoa.proxima.imovel.nome}`;
  }
  return "Dia livre";
}

/** O aviso de desativar (decisão 5): as tarefas pendentes depois de agora ficam sem responsável. */
export function fraseDoDesativar({nome, futuras_pendentes: n}) {
  const acesso = `Acesso de ${primeiroNome(nome)} desativado.`;
  if (!n) return acesso;
  return n === 1 ? `${acesso} 1 tarefa futura ficou sem responsável.`
    : `${acesso} ${n} tarefas futuras ficaram sem responsável.`;
}

/** O início sugerido da nova tarefa: hoje, a próxima hora cheia (não antes das 9h; depois das 23h,
 * amanhã às 9h), para a tarefa não nascer atrasada; em outro dia, 9h. */
export function inicioSugerido(dia, agora = new Date()) {
  const hoje = isoDoDia(agora);
  if (dia && dia !== hoje) return `${dia}T09:00`;
  const hora = Math.max(9, agora.getHours() + 1);
  if (hora > 23) return `${isoDoDia(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1))}T09:00`;
  return `${hoje}T${String(hora).padStart(2, "0")}:00`;
}
