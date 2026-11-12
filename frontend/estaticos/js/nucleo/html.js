// Template marcado que escapa tudo o que vem de fora: html`<p title="${nome}">${nome}</p>`.
// Um Trecho já montado entra sem escapar de novo; listas são juntadas; null, undefined e false somem.

export class Trecho {
  constructor(texto) {
    this.texto = texto;
  }

  toString() {
    return this.texto;
  }
}

const ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};

function valor(v) {
  if (v === null || v === undefined || v === false) return "";
  if (v instanceof Trecho) return v.texto;
  if (Array.isArray(v)) return v.map(valor).join("");
  return String(v).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function html(partes, ...valores) {
  let texto = partes[0];
  valores.forEach((v, i) => {
    texto += valor(v) + partes[i + 1];
  });
  return new Trecho(texto);
}

export function renderizar(elemento, trecho) {
  elemento.innerHTML = String(trecho);
}
