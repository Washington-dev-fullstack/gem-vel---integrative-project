import {test} from "node:test";
import assert from "node:assert/strict";
import {html} from "../estaticos/js/nucleo/html.js";

test("escapa os cinco caracteres no texto e no atributo", () => {
  const nome = `Ana "<b>' & <img onerror=x>`;
  const seguro = "Ana &quot;&lt;b&gt;&#39; &amp; &lt;img onerror=x&gt;";
  assert.equal(String(html`<p title="${nome}">${nome}</p>`), `<p title="${seguro}">${seguro}</p>`);
});
test("não escapa duas vezes e junta listas", () => {
  const itens = ["<a>", "b"].map((t) => html`<li>${t}</li>`);
  assert.equal(String(html`<ul>${itens}</ul>`), "<ul><li>&lt;a&gt;</li><li>b</li></ul>");
});
test("vazio some, zero fica", () => {
  assert.equal(String(html`<i>${null}${undefined}${false}${0}</i>`), "<i>0</i>");
});
