// Formatos da interface (DESIGN.md §3 e §11). As datas da API vêm em ISO sem fuso e são lidas
// como hora local: "2026-11-06" é o dia 6, nunca o dia 5 às 21h.

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const REAL = new Intl.NumberFormat("pt-BR", {style: "currency", currency: "BRL"});

export function lerData(iso) {
  const [dia, hora = "00:00"] = String(iso).split("T");
  const [ano, mes, d] = dia.split("-").map(Number);
  const [h, m, s = 0] = hora.split(":").map(Number);
  return new Date(ano, mes - 1, d, h, m, s);
}

function comoData(valor) {
  return valor instanceof Date ? valor : lerData(valor);
}

export function dinheiro(valor) {
  return REAL.format(Number(valor));
}

export function dataCurta(iso) {
  const d = comoData(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function data(iso, {hoje = new Date()} = {}) {
  const d = comoData(iso);
  const ano = d.getFullYear() === comoData(hoje).getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${DIAS[d.getDay()]}, ${dataCurta(d)}${ano}`;
}

export function periodo(inicio, fim, opcoes = {}) {
  return `${data(inicio, opcoes)} → ${data(fim, opcoes)}`;
}

export function horario(isoOuHora) {
  const texto = String(isoOuHora);
  const hora = texto.includes("T") ? texto.split("T")[1] : texto;
  return hora.slice(0, 5);
}

export function paraDinheiroApi(texto) {
  let limpo = String(texto ?? "").replace(/R\$/g, "").replace(/\s/g, "");
  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    limpo = limpo.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Number(limpo).toFixed(2);
}
