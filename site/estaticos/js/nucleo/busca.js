// A busca geral do topo (web-admin.md §8; lote B §4), sem DOM: as ações, os grupos de resultados com
// o endereço de cada um e a lista dos recentes.

import {intervalo} from "./formatos.js";

const ACOES = [
  {rotulo: "Nova reserva", tipo: "reserva", id: "nova", pagina: "/reservas"},
  {rotulo: "Novo imóvel", tipo: "imovel", id: "novo", pagina: "/imoveis"},
  {rotulo: "Nova tarefa", tipo: "tarefa", id: "nova", pagina: "/tarefas"},
  {rotulo: "Nova pessoa", tipo: "pessoa", id: "nova", pagina: "/equipe"},
  {rotulo: "Bloquear datas", tipo: "bloqueio", id: "novo", pagina: "/agenda"},
];
const MAXIMO_DE_ACOES = 3;
const MAXIMO_DE_RECENTES = 5;

export const semAcento = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Sem texto, todas as ações; com texto, até três cujo nome contém o que foi digitado. */
export function acoesDaBusca(termo) {
  const alvo = semAcento(termo).trim();
  const acoes = ACOES.map(({pagina, ...acao}) => ({...acao, endereco: `${pagina}?${acao.tipo}=${acao.id}`}));
  return alvo ? acoes.filter((acao) => semAcento(acao.rotulo).includes(alvo)).slice(0, MAXIMO_DE_ACOES) : acoes;
}

/** A resposta de /api/busca em grupos {nome, itens}; cada item tem título, detalhe e endereço. */
export function gruposDaBusca({imoveis = [], reservas = [], hospedes = []}, termo) {
  const grupos = [
    {nome: "Ações", itens: acoesDaBusca(termo).map((a) => ({tipo: "acao", titulo: a.rotulo, detalhe: null,
      gaveta: {tipo: a.tipo, id: a.id}, endereco: a.endereco}))},
    {nome: "Imóveis", itens: imoveis.map((i) => ({tipo: "imovel", id: i.id, titulo: i.nome,
      detalhe: [i.codigo, i.bairro, i.ativo ? null : "desativado"].filter(Boolean).join(" · "), endereco: `/imoveis/${i.id}`}))},
    {nome: "Reservas", itens: reservas.map((r) => ({tipo: "reserva", id: r.id, titulo: `${r.codigo} · ${r.hospede.nome}`,
      detalhe: [intervalo(r.data_entrada, r.data_saida), r.imovel.nome, r.status === "cancelada" ? "cancelada" : null].filter(Boolean).join(" · "),
      endereco: `/reservas?reserva=${r.id}`}))},
    {nome: "Hóspedes", itens: hospedes.map((h) => ({tipo: "hospede", id: h.id, titulo: h.nome, detalhe: h.telefone,
      endereco: `/reservas?hospede=${h.id}#hospedes`}))},
  ];
  return grupos.filter((grupo) => grupo.itens.length);
}

/** O item escolhido vai para o topo dos recentes, sem repetir, e a lista guarda no máximo cinco. */
export function juntarRecente(recentes, {tipo, id, titulo, detalhe, endereco}) {
  return [{tipo, id, titulo, detalhe, endereco}, ...recentes.filter((r) => !(r.tipo === tipo && r.id === id))]
    .slice(0, MAXIMO_DE_RECENTES);
}
