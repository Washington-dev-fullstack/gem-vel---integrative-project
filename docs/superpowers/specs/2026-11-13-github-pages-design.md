# Gemóvel — Versão de demonstração no GitHub Pages

> **Proposta, aguardando o sim da dupla (13 nov 2026).** Pedido: "o site tem que estar no formato para postar no GitHub Pages". Escolha feita: demonstração no navegador, com os dados de exemplo e as mudanças guardadas só no navegador de quem visita.

## Objetivo

Publicar o front-end como site estático no GitHub Pages, navegável por quem não tem o Flask nem o MySQL: as mesmas telas e os mesmos scripts, com uma API simulada no navegador. No computador da dupla, com o Flask rodando, nada muda: tudo continua indo para a API de verdade, pelo Fetch, como a escola pede.

## Como o site é gerado

- **`ferramentas/gerar_site.py`** (Python e Jinja2, que já vem com o Flask), rodado com o banco de exemplo carregado:
  1. renderiza cada template de `frontend/paginas` para a pasta `site/`: `index.html` (Entrar), `visao-geral.html`, `agenda.html`, `reservas.html`, `imoveis.html`, `imovel.html`, `tarefas.html`, `equipe.html` e `minhas-tarefas.html`;
  2. copia `frontend/estaticos` para `site/estaticos` e troca os caminhos absolutos (`/estaticos/…`) por relativos, inclusive nos `url()` do CSS, porque o Pages serve o site num subcaminho (`/gemovel-integrative-project/`);
  3. grava os dados de exemplo em `site/estaticos/demo/dados.json`, lidos do banco (sem as senhas);
  4. cria `site/.nojekyll`, para o Pages servir os arquivos como estão.
- **Publicação:** a pasta `site/` vai para o git, e `.github/workflows/pages.yml` a publica a cada push na `main`. No GitHub, uma vez só: Settings → Pages → Source: "GitHub Actions".

## O modo demonstração

- **Como a página sabe:** as páginas geradas trazem `<meta name="gemovel-modo" content="demo">`. Sem a meta (servidas pelo Flask), nada do modo demonstração roda.
- **API simulada:** `nucleo/api.js` entrega o pedido a `demo/servidor.js` em vez do `fetch`. O servidor simulado responde às mesmas rotas, com o mesmo JSON e o mesmo formato de erro (`{"erro": {"mensagem", "campos"}}`):
  - leitura: imóveis (com prontidão e ocupação), reservas, hóspedes, bloqueios, tarefas (do dia, abertas e do imóvel), equipe, visão geral, busca, atividade e minhas tarefas;
  - escrita: criar, editar, cancelar, excluir, desativar, mudar o estado e desfazer, com as regras principais (R1 datas sem conflito, R2 valor, R5 só o admin reabre, R7 atrasada) e os campos obrigatórios.
- **Datas sempre atuais:** os dados de exemplo são relativos ao dia em que o site foi gerado; na carga, todas as datas andam até hoje.
- **Mudanças:** ficam no `localStorage` de quem visita. Uma faixa fixa no topo avisa "Demonstração: as mudanças ficam só neste navegador." com o botão "Recomeçar", que volta aos dados de exemplo.
- **Entrar:** aceita as contas de exemplo (admin e equipe) com qualquer senha, e a tela lista os e-mails de exemplo. A senha de verdade não vai para o site.
- **Endereços:** cada tela vira um arquivo (`/agenda` → `agenda.html`; `/imoveis/3` → `imovel.html?id=3`). Um tradutor no núcleo ajusta links, `location.assign` e o sprite dos ícones, só no modo demonstração.

## Fora do escopo

- Sessão, senha e segurança de verdade: é uma demonstração.
- Visitantes não veem as mudanças uns dos outros.

## Testes

- `node --test` cobre o servidor simulado nas regras (conflito, valor, atrasada, estado e desfazer, recusas com 409 e 422) e o tradutor de endereços.
- Conferência no navegador: `python -m http.server` servindo `site/` num subcaminho igual ao do Pages, entrando como admin e como equipe.
