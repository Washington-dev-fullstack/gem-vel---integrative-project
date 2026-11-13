// Endereços do sistema. No Flask, cada tela tem um caminho (/agenda, /imoveis/3); na demonstração do
// GitHub Pages, cada tela é um arquivo num subcaminho (agenda.html, imovel.html?id=3). As funções puras
// convertem nos dois sentidos; as de navegação só traduzem quando a página é da demonstração.

/** A página veio da demonstração (gerada por ferramentas/gerar_site.py), com a meta gemovel-modo? */
export const modoDemo = () =>
  typeof document !== "undefined" && document.querySelector('meta[name="gemovel-modo"]')?.content === "demo";

const ARQUIVO_ESPECIAL = {"": "visao-geral", entrar: "index"};

/** "/imoveis/3?reserva=2#a" → "imovel.html?id=3&reserva=2#a"; "/" → "visao-geral.html". Fora do sistema, igual. */
export function paraArquivo(endereco) {
  const partes = /^\/(?!\/)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(endereco ?? "");
  if (!partes) return endereco;
  const [, caminho, busca = "", marca = ""] = partes;
  if (caminho.startsWith("estaticos/")) return endereco.slice(1);
  const imovel = /^imoveis\/(\d+)$/.exec(caminho);
  if (imovel) return `imovel.html?id=${imovel[1]}${busca ? `&${busca.slice(1)}` : ""}${marca}`;
  return `${ARQUIVO_ESPECIAL[caminho] ?? caminho}.html${busca}${marca}`;
}

/** O contrário: ("imovel.html", "?id=3&reserva=2", "#a") → "/imoveis/3?reserva=2#a". */
export function paraCaminho(arquivo, busca = "", marca = "") {
  const nome = arquivo.replace(/\.html$/, "");
  if (nome === "imovel") {
    const id = /(?:^\?|&)id=(\d+)/.exec(busca)?.[1] ?? "";
    const resto = busca.replace(/^\?/, "").split("&").filter((par) => par && !par.startsWith("id=")).join("&");
    return `/imoveis/${id}${resto ? `?${resto}` : ""}${marca}`;
  }
  const caminho = nome === "visao-geral" ? "/" : nome === "index" || nome === "" ? "/entrar" : `/${nome}`;
  return `${caminho}${busca}${marca}`;
}

const PAINEL = {administrador: "visao-geral.html", funcionario: "minhas-tarefas.html"};

/** A regra das páginas do Flask (rotas/paginas.py): sem sessão, Entrar com a volta; com o perfil de
 * outra área, o painel da pessoa; em Entrar já com sessão, o painel. `null` quando fica onde está. */
export function destinoDaGuarda(arquivo, busca, perfil) {
  const tela = arquivo || "index.html";
  if (tela === "index.html") return perfil ? PAINEL[perfil] : null;
  if (!perfil) return `index.html?volta=${encodeURIComponent(paraCaminho(tela, busca))}`;
  return (tela === "minhas-tarefas.html") === (perfil === "funcionario") ? null : PAINEL[perfil];
}

// Na página.

export const arquivoAtual = () => location.pathname.split("/").pop() || "index.html";

/** O caminho da tela atual como no Flask ("/imoveis/3"), também na demonstração. */
export const paginaAtual = () =>
  modoDemo() ? paraCaminho(arquivoAtual(), location.search).replace(/[?#].*$/, "") : location.pathname;

/** O endereço inteiro da tela atual como no Flask, para o ?volta= de Entrar. */
export const enderecoAtual = () => (modoDemo() ? paraCaminho(arquivoAtual(), location.search, location.hash)
  : location.pathname + location.search + location.hash);

/** Abre outra tela pelo caminho do Flask ("/agenda?mes=2026-11"). */
export const ir = (endereco) => location.assign(modoDemo() ? paraArquivo(endereco) : endereco);

/** O mesmo, sem deixar a tela atual no histórico. */
export const irSubstituindo = (endereco) => location.replace(modoDemo() ? paraArquivo(endereco) : endereco);

/** Na demonstração, os links do sistema (href="/…") viram arquivos, também os que as telas desenham depois. */
export function traduzirLinks(raiz = document.documentElement) {
  const trocar = (link) => link.setAttribute("href", paraArquivo(link.getAttribute("href")));
  const varrer = (no) => {
    if (no.nodeType !== Node.ELEMENT_NODE) return;
    if (no.matches('a[href^="/"]')) trocar(no);
    no.querySelectorAll('a[href^="/"]').forEach(trocar);
  };
  varrer(raiz);
  new MutationObserver((mudancas) => {
    for (const mudanca of mudancas) {
      if (mudanca.type === "attributes") varrer(mudanca.target);
      else mudanca.addedNodes.forEach(varrer);
    }
  }).observe(raiz, {subtree: true, childList: true, attributes: true, attributeFilter: ["href"]});
}
