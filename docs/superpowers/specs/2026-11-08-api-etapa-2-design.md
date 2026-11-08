# Gemóvel — API da Etapa 2

> Especificação. Desenho aprovado na conversa em 8 nov 2026, com três decisões: classes fiéis ao diagrama, login já na Etapa 2 e diagramas atualizados junto com a Etapa 2 (não antes da entrega de 09/11).

- **Entrega:** Etapa 2, 13/11/2026: "Back-end funcional em Python: classes, DAOs e rotas Flask implementadas (POO), operações de cadastro/consulta no banco funcionando (sem front-end finalizado)."
- **Base:**
  - a especificação do banco (`2026-11-06-banco-de-dados-design.md`, regras R1 a R8);
  - os diagramas de classes (`banco/diagramas/classes-dominio.mmd` e `classes-dao.mmd`);
  - o item 14 das telas web (`design/telas/web-admin.md`);
  - a arquitetura do front-end (`2026-11-08-front-end-design.md`), que consome esta API.
- **Pilha:** Python 3.13, Flask, mysql-connector-python (Python puro), werkzeug para o hash das senhas e unittest. Nenhuma dependência nova.

## 1. Escopo

**Entra na Etapa 2:**
- todas as classes de domínio, com todos os métodos do diagrama e as regras R1 a R7, testadas sem banco;
- os DAOs com os métodos de cadastro e de consulta do diagrama;
- 19 rotas: a de saúde (já existe), as de login e as de cadastro e consulta de cada assunto;
- os testes.

**Fica para a entrega final (17/11), junto com as telas:**
- editar, cancelar, desativar e reativar, remover bloqueio e mudar o estado da tarefa (R5);
- a busca geral (⌘K) e o conflito ao vivo no formulário de reserva;
- as leituras que juntam dados para as telas: prontidão e ocupação do imóvel, totais, tarefas por dia, o histórico de uma tarefa e a carga do dia de cada pessoa.

Os métodos de domínio dessas operações já ficam prontos agora. Faltam os DAOs e as rotas.

## 2. Camadas e arquivos

```
backend/
  app.py                criar_app(config, segredo): configuração, JSON, sessão, rotas e erros
  config.py             + carregar_segredo_sessao()
  gemovel/
    conexao.py          Conexao (+ transacao()), Transacao, BancoIndisponivel
    erros.py            ErroValidacao, Conflito, NaoEncontrado, NaoAutenticado, SemPermissao
    dominio/            enums.py · usuario.py (Usuario, Administrador, Funcionario) · imovel.py
                        hospede.py · reserva.py · bloqueio.py · tarefa.py (Tarefa, HistoricoTarefa)
    dao/                base.py (DAOBase) · usuario_dao.py (UsuarioDAO, FuncionarioDAO) · imovel_dao.py
                        hospede_dao.py · reserva_dao.py · bloqueio_dao.py
                        tarefa_dao.py (TarefaDAO, HistoricoTarefaDAO)
    rotas/              __init__.py (registrar) · formato_json.py · entrada.py · autenticacao.py
                        saude.py · sessao.py · imoveis.py · hospedes.py · reservas.py · tarefas.py
                        funcionarios.py · atividade.py
  testes/               apoio.py · test_dominio_*.py · test_api_*.py, mais os 11 testes da Etapa 1
```

- **Quem usa quem:** `rotas` usa `dominio` e `dao`; `dao` usa `dominio` e `conexao`; `dominio` não conhece Flask nem banco.
- **O caminho de um pedido:**
  - a rota lê o pedido (`entrada.py`) e confere quem está logado (`autenticacao.py`);
  - monta ou busca os objetos do domínio;
  - grava ou lê pelos DAOs;
  - devolve JSON.
- **JSON:** transformar objeto em JSON é função da rota (`para_json`), para as classes ficarem iguais ao diagrama.
- **Blueprints:** um por arquivo de rotas, todos com o prefixo `/api`.
- **Configuração:** `criar_app(config=None, segredo=None)`. `config` continua sendo só a do banco, que vai inteira para o conector. `segredo` é a chave da sessão (seção 8).

## 3. Domínio

**Do diagrama para o Python:**
- **Atributos:** o atributo privado do diagrama (`-nome`) vira `self._nome`, lido por uma propriedade só de leitura (`@property nome`).
- **Mudanças:** o que muda depois de criado muda só por método: `cancelar()`, `atribuir()`, `iniciar()`, `concluir()`, `reabrir()` e `definir_senha()`.
- **Validação:** o construtor confere os campos e, se algo estiver errado, levanta `ErroValidacao` com uma mensagem por campo (seção 7). Texto vem sem espaços nas pontas, e o campo opcional vazio vira `None`.
- **Usuários:** `Usuario` é abstrata (`ABC`), com `perfil()` abstrato. `Administrador.perfil()` devolve `"administrador"`, e `Funcionario.perfil()`, `"funcionario"`.
- **Enumerações:** são `enum.Enum`, com os mesmos valores do banco (`"limpeza"`, `"em_andamento"`, `"confirmada"`…).
- **Associações:** as do diagrama viram referências opcionais, só de leitura, preenchidas pelo DAO quando a consulta junta tabelas:
  - `Reserva.imovel` e `Reserva.hospede`;
  - `Tarefa.imovel` e `Tarefa.funcionario`;
  - `HistoricoTarefa.usuario` e `HistoricoTarefa.tarefa` (com a tarefa trazendo o imóvel).
- **Hora:** `esta_atrasada` e `situacao` recebem `agora` como parâmetro, para os testes fixarem a hora. As rotas passam `datetime.now()`, a hora local do servidor, a mesma do MySQL. `iniciar`, `concluir` e `reabrir` mantêm a assinatura do diagrama e usam `datetime.now()`.

**Regras por classe:**

| Classe | Método | Regra |
|---|---|---|
| Usuario | `definir_senha(senha)` | pelo menos 8 caracteres; grava o hash do werkzeug (scrypt, o formato dos dados de exemplo) (R8) |
| | `verificar_senha(senha)` | `check_password_hash` |
| Funcionario | `pode_executar(tarefa)` | pessoa ativa e função igual ao tipo da tarefa: limpeza com limpeza, manutenção com manutenção |
| Imovel | `calcular_valor(entrada, saida)` | diária × noites (R2) |
| | `comporta(num_hospedes)` | de 1 até a capacidade (R3) |
| | `endereco_completo()` | "logradouro, número[, complemento] · bairro, cidade/UF" |
| Reserva | `noites()` | dias entre a entrada e a saída |
| | `calcular_total()` | diária gravada na reserva × noites (R2) |
| | `conflita_com(entrada, saida)` | só se confirmada, e se `self.entrada < saida` e `entrada < self.saida`; sair e entrar no mesmo dia não conflita (R1) |
| | `situacao(agora, imovel)` | `cancelada` se cancelada; `futura` antes da entrada no horário de entrada; `em_curso` até a saída no horário de saída; depois, `concluida` (muda a assinatura do diagrama, seção 10) |
| | `cancelar()` | confirmada → cancelada; cancelar de novo é erro |
| | `criar_limpeza_de_saida(imovel)` | devolve a Tarefa de limpeza "Limpeza de saída" (R4): ligada à reserva e ao imóvel; agendada para a data de saída, no horário de saída; prazo no horário de entrada do mesmo dia; sem responsável; pendente |
| Bloqueio | `conflita_com(entrada, saida)` | mesma regra de datas da reserva |
| Tarefa | `atribuir(funcionario)` | aceita `None` (sem responsável); recusa quem não `pode_executar` |
| | `iniciar(por)` | pendente → em andamento; preenche `iniciada_em`; devolve o `HistoricoTarefa` (R5) |
| | `concluir(por, observacao)` | pendente ou em andamento → concluída; preenche `concluida_em` (e `iniciada_em`, se estiver vazio); devolve o `HistoricoTarefa` |
| | `reabrir(por)` | só um `Administrador`; concluída → pendente; limpa `iniciada_em` e `concluida_em`; devolve o `HistoricoTarefa` |
| | `esta_atrasada(agora)` | não concluída e `agora` depois do prazo; sem prazo, depois do horário agendado (R7) |

Mudança de estado que a regra não permite levanta `ErroValidacao`.

**Validação nos construtores** (os limites são os do banco):

| Classe | Regras |
|---|---|
| Usuario | nome de 1 a 120; e-mail válido, até 160, gravado em minúsculas; telefone até 20 |
| Imovel | nome de 1 a 100; logradouro de 1 a 150; número de 1 a 10 ("s/n" vale); complemento até 60; bairro e cidade de 1 a 80; UF entre as 27; CEP vazio ou "00000-000" (8 dígitos são aceitos e formatados); capacidade de 1 a 255; diária maior que zero, com duas casas; saída antes da entrada |
| Hospede | nome de 1 a 120; telefone até 20; e-mail válido, até 160; documento até 20 |
| Reserva | saída depois da entrada; hóspedes ≥ 1; diária > 0; total ≥ 0 |
| Bloqueio | fim depois do início; motivo de 1 a 120 |
| Tarefa | título de 1 a 120; prazo vazio ou não antes do agendado; reserva só em limpeza |

A saída precisa ser antes da entrada porque a limpeza da saída (R4) vai do horário de saída ao de entrada do mesmo dia.

## 4. Persistência

**Conexão e transação:**
- **`Conexao.transacao()` (novo):** é um bloco `with` que pega uma conexão só, começa uma transação e entrega um objeto `Transacao`. No fim do bloco, grava tudo (`commit`). Se der erro, desfaz tudo (`rollback`) e repassa o erro.
- **`Transacao`:** tem dois métodos:
  - `executar(sql, parametros) -> int` devolve o `lastrowid` de um INSERT ou o número de linhas afetadas;
  - `consultar(sql, parametros) -> list[dict]` devolve as linhas.
- **`DAOBase(conexao, transacao=None)`:** sem transação, cada chamada abre a sua. Com transação, todos os DAOs criados com ela gravam juntos. `_executar` e `_consultar` delegam para a transação, e `_para_objeto(linha)` é abstrato.
- **Erros do conector:** falha de conexão vira `BancoIndisponivel` (503, com as mensagens que já existem); chave duplicada (erro 1062) vira `Conflito`.
- **Conversões:** o DAO converte o `TIME` do banco (o conector entrega `timedelta`) em `time`, e o `TINYINT(1)` em `bool`.
- **SQL:** sempre com parâmetros (`%s`), nunca montado com texto vindo de fora.
- **Isolamento (R6):** toda listagem filtra pelo `administrador_id`, direto ou pelo imóvel. Os métodos que buscam por id não filtram: quem confere o dono é a rota.

**Métodos da Etapa 2:**

| DAO | Método | O que faz |
|---|---|---|
| UsuarioDAO | `buscar_por_email(email)` · `buscar_por_id(id)` | devolve um `Administrador` ou um `Funcionario` (pela coluna `perfil`, juntando `funcionario`), ou `None` |
| | `inserir(usuario)` | grava em `usuario` e devolve o id |
| FuncionarioDAO | `listar_por_administrador(administrador_id)` | a equipe, ativa e desativada, por nome |
| | `inserir(funcionario)` | grava `usuario` e `funcionario` na mesma transação |
| ImovelDAO | `listar_por_administrador(administrador_id)` | os imóveis, ativos e desativados, por nome |
| | `buscar_por_id(id, travar=False)` | um imóvel ou `None`; com `travar=True` (só dentro de transação), trava a linha (`FOR UPDATE`) |
| | `inserir(imovel)` | |
| HospedeDAO | `buscar(administrador_id, termo)` | nome ou telefone que contém o termo, por nome; sem termo, todos; com termo, até 20 |
| | `inserir(hospede)` | |
| ReservaDAO | `listar_por_periodo(administrador_id, inicio, fim)` | as reservas com alguma noite no período (`entrada ≤ fim` e `saída > início`), canceladas inclusive, com imóvel e hóspede, pela data de entrada |
| | `buscar_conflito(imovel_id, entrada, saida, ignorar_id=None)` (novo) | a primeira reserva confirmada, com o hóspede, ou o primeiro bloqueio que cruza as datas; ou `None` (R1) |
| | `existe_conflito(imovel_id, entrada, saida, ignorar_id=None)` | `buscar_conflito(...) is not None` |
| | `inserir(reserva)` | |
| BloqueioDAO | `listar_por_imovel(imovel_id)` | pela data de início |
| | `inserir(bloqueio)` | |
| TarefaDAO | `listar_do_funcionario(funcionario_id, dia)` | as tarefas do dia e as não concluídas de dias anteriores, com o imóvel (endereço e instruções), por horário |
| | `listar_abertas(administrador_id)` | pendentes e em andamento, com o imóvel e o responsável, por horário |
| | `inserir(tarefa, criada_por)` | grava a tarefa e a primeira linha do histórico (sem estado anterior → pendente), na mesma transação |
| HistoricoTarefaDAO | `listar_recentes(administrador_id, limite)` | os últimos registros, com quem mudou, a tarefa e o imóvel, do mais novo para o mais velho |

## 5. Rotas

| Método e rota | Quem | Pedido | Resposta |
|---|---|---|---|
| `GET /api/saude` | todos | — | 200 (já existe) |
| `POST /api/sessao` | todos | `email`, `senha` | 200 `{"usuario": …}` |
| `GET /api/sessao` | logado | — | 200 `{"usuario": …}` |
| `DELETE /api/sessao` | todos | — | 204 |
| `GET /api/imoveis` | admin | — | 200 `{"imoveis": […]}` |
| `POST /api/imoveis` | admin | campos do imóvel | 201 imóvel |
| `GET /api/imoveis/<id>` | admin | — | 200 imóvel |
| `GET /api/imoveis/<id>/bloqueios` | admin | — | 200 `{"bloqueios": […]}` |
| `POST /api/imoveis/<id>/bloqueios` | admin | `data_inicio`, `data_fim`, `motivo` | 201 bloqueio |
| `GET /api/hospedes?busca=` | admin | `busca` opcional | 200 `{"hospedes": […]}` |
| `POST /api/hospedes` | admin | campos do hóspede | 201 hóspede |
| `GET /api/reservas?de=&ate=` | admin | padrão: o mês atual | 200 `{"reservas": […]}` |
| `POST /api/reservas` | admin | ver abaixo | 201 reserva, com a `limpeza` criada |
| `GET /api/tarefas` | admin | — | 200 `{"tarefas": […]}` (as abertas) |
| `POST /api/tarefas` | admin | ver abaixo | 201 tarefa |
| `GET /api/funcionarios` | admin | — | 200 `{"funcionarios": […]}` |
| `POST /api/funcionarios` | admin | ver abaixo | 201 funcionário |
| `GET /api/minhas-tarefas?dia=` | funcionário | padrão: hoje | 200 `{"tarefas": […]}` |
| `GET /api/atividade?limite=` | admin | padrão 8, de 1 a 50 | 200 `{"atividade": […]}` |

**Campos de cada cadastro** (o que não diz "opcional" é obrigatório):

| Cadastro | Campos |
|---|---|
| Imóvel | `nome`, `logradouro`, `numero`, `complemento` (opcional), `bairro`, `cidade`, `uf`, `cep` (opcional), `capacidade` (padrão 2), `valor_diaria`, `horario_entrada` (padrão "15:00"), `horario_saida` (padrão "11:00"), `observacoes` (opcional: as instruções para a equipe) |
| Bloqueio | `data_inicio`, `data_fim`, `motivo` |
| Hóspede | `nome`, `telefone`, `email`, `documento` e `observacoes` (os quatro opcionais) |
| Reserva | `imovel_id`, `hospede_id` **ou** `hospede_novo` (`{"nome", "telefone"}`), `data_entrada`, `data_saida`, `num_hospedes`, `valor_total` (opcional: sem ele, vale o cálculo da R2), `observacoes` (opcional) |
| Tarefa | `tipo`, `imovel_id`, `titulo`, `agendada_para`, `prazo` (opcional), `funcionario_id` (opcional: sem ele, a tarefa fica sem responsável), `reserva_id` (opcional), `descricao` (opcional) |
| Funcionário | `nome`, `funcao`, `telefone` (opcional), `email`, `senha` |

**Regras das rotas:**
- **Sessão:**
  - o e-mail chega sem espaços e em minúsculas;
  - e-mail ou senha errados → 401 "E-mail ou senha não conferem.", com a mesma resposta e o mesmo tempo quando o e-mail não existe (confere um hash falso);
  - senha certa de uma conta desativada → 403 "Este acesso foi desativado. Fale com quem administra o Gemóvel.";
  - o login limpa a sessão anterior e guarda só o id da pessoa.
- **Imóveis:** campos e regras da seção 3. Imóvel de outro administrador → 404.
- **Bloqueios:** o imóvel precisa ser do administrador e estar ativo. Cruzar uma reserva confirmada ou outro bloqueio → 409, com a frase do conflito.
- **Reservas (`POST`):** tudo numa transação só, nesta ordem:
  1. trava o imóvel e confere que é do administrador e está ativo;
  2. confere o hóspede, ou cria o hóspede novo se veio `hospede_novo`;
  3. confere a capacidade (R3) e o conflito (R1);
  4. grava a reserva com a diária do imóvel naquele dia e o total calculado, se ele não veio (R2);
  5. cria a limpeza da saída e a primeira linha do histórico dela, em nome de quem fez a reserva (R4).
- **Tarefas (`POST`):**
  - o imóvel precisa ser do administrador;
  - a reserva ligada precisa ser do mesmo imóvel, e só limpeza liga a uma reserva;
  - o responsável precisa estar ativo, ser do mesmo administrador e da função do tipo (R6);
  - grava a primeira linha do histórico em nome de quem criou.
- **Funcionários (`POST`):**
  - senha com pelo menos 8 caracteres;
  - e-mail único: o repetido dá 409 no campo `email`;
  - grava `usuario` e `funcionario` com o `administrador_id` da sessão.
- **Minhas tarefas:** só as do funcionário logado (R6).
- **Datas no endereço:** `de`, `ate` e `dia` no formato `2026-11-08`. Data inválida, ou `ate` antes de `de`, dá 422 no parâmetro.

## 6. Formato do JSON

- **Nomes:** os campos têm os nomes das colunas.
- **Datas e horas**, sempre na hora local, sem fuso:
  - data: `"2026-11-08"`;
  - horário: `"15:00"`;
  - data com hora: `"2026-11-08T15:00"`.
- **Dinheiro:** texto com duas casas (`"1620.00"`).
- **Outros valores:** booleanos (`ativo`) são `true` ou `false`, e o campo vazio é `null`.
- **Listas:** vêm dentro de um objeto com o nome do assunto.
- **Ordem:** os campos saem na ordem em que foram montados (`sort_keys = False`).
- **Nunca sai:** `senha_hash` e as datas de criação.
- **Calculados:**
  - `codigo`: "IMV-" mais o id com 3 dígitos; "RSV-" mais o id com 4;
  - `endereco`: o `endereco_completo()` do imóvel;
  - `noites` e `situacao`, da reserva;
  - `atrasada`, da tarefa.
- **Um lugar só:** o provedor JSON do app (`formato_json.py`) faz as conversões de data, hora e dinheiro.

**Exemplos:**

```json
{
  "id": 12, "codigo": "RSV-0012",
  "imovel": {"id": 6, "codigo": "IMV-006", "nome": "Apto Jardins"},
  "hospede": {"id": 12, "nome": "Carla Nogueira"},
  "data_entrada": "2026-11-07", "data_saida": "2026-11-11", "noites": 4,
  "num_hospedes": 2, "valor_diaria": "450.00", "valor_total": "1620.00",
  "status": "confirmada", "situacao": "futura", "observacoes": null
}
```

```json
{
  "id": 5, "tipo": "limpeza", "titulo": "Limpeza de saída", "descricao": null,
  "imovel": {"id": 2, "codigo": "IMV-002", "nome": "Cobertura Moema"},
  "reserva_id": 3, "responsavel": {"id": 5, "nome": "Marcos Teixeira"},
  "agendada_para": "2026-11-05T11:00", "prazo": "2026-11-05T15:00",
  "status": "em_andamento", "atrasada": false,
  "iniciada_em": "2026-11-05T11:00", "concluida_em": null
}
```

**Outros assuntos:**

| Assunto | Campos |
|---|---|
| Imóvel | as colunas, mais `codigo` e `endereco` |
| Hóspede | `id`, `nome`, `telefone`, `email`, `documento`, `observacoes` |
| Bloqueio | `id`, `imovel_id`, `data_inicio`, `data_fim`, `motivo` |
| Funcionário | `id`, `nome`, `email`, `telefone`, `funcao`, `ativo` |
| Sessão (`usuario`) | `id`, `nome`, `email`, `perfil` e, só para o funcionário, `funcao` |
| Minhas tarefas | a tarefa, com `imovel` trazendo também `endereco` e `observacoes` |
| Atividade | `id`, `registrado_em`, `status_anterior`, `status_novo`, `observacao`, `usuario` (`id`, `nome`), `tarefa` (`id`, `titulo`), `imovel` (`id`, `nome`) |

## 7. Erros

Todo erro tem o mesmo formato:

```json
{"erro": {"mensagem": "Confira os campos destacados.",
          "campos": {"num_hospedes": "O Apto Jardins recebe até 4 hóspedes."}}}
```

| Código | Quando | `mensagem` |
|---|---|---|
| 400 | o corpo não é JSON | "O pedido não veio em JSON." |
| 401 | sem login, ou a conta foi desativada depois do login | "Entre de novo para continuar." |
| 403 | perfil errado | "Esta área é de outro perfil." |
| 404 | não existe ou é de outro administrador (R6) | "Não encontrado." |
| 409 | conflito | a frase do conflito, também em `campos` |
| 422 | campo inválido | "Confira os campos destacados.", com `campos` |
| 500 | erro inesperado (fica registrado no terminal) | "Algo deu errado do nosso lado. Tente de novo." |
| 503 | banco fora | a mensagem do `BancoIndisponivel` |

**Mensagens dos campos** (os textos aprovados nas telas mandam):

| Caso | Mensagem |
|---|---|
| obrigatório vazio | "Preencha este campo." |
| texto longo demais | "Use até 100 caracteres." (com o limite do campo) |
| data inválida | "Data inválida." |
| datas da reserva | "A saída precisa ser depois da entrada." |
| datas do bloqueio | "O fim precisa ser depois do início." |
| horários do imóvel | "A saída precisa ser antes da entrada, para caber a limpeza." |
| capacidade (R3) | "O Apto Jardins recebe até 4 hóspedes." |
| conflito com reserva (R1, no campo `data_entrada`) | "Conflita com RSV-0002 (Mariana Costa, 4 a 7 nov). Escolha outras datas." |
| conflito com bloqueio (R1, no campo `data_entrada`) | "O imóvel está bloqueado de 8 a 11 nov (troca do aquecedor)." |
| bloqueio sobre uma reserva | "Já há a reserva RSV-0012 (Carla Nogueira, 7 a 11 nov) nessas datas." |
| bloqueio sobre outro bloqueio | "Já há um bloqueio de 8 a 11 nov (troca do aquecedor) nessas datas." |
| prazo | "O prazo não pode ser antes do início." |
| responsável | "Esta pessoa não faz este tipo de tarefa." |
| reserva ligada | "Só a limpeza pode ficar ligada a uma reserva." · "Esta reserva é de outro imóvel." |
| imóvel, hóspede ou pessoa de outro dono, num campo | "Imóvel não encontrado." · "Hóspede não encontrado." · "Pessoa não encontrada." |
| imóvel desativado | "Este imóvel está desativado." |
| e-mail (409) | "Este e-mail já tem acesso ao Gemóvel." |
| senha | "A senha precisa ter pelo menos 8 caracteres." |

- **Período nas frases:**
  - no mesmo mês: "4 a 7 nov";
  - em meses diferentes: "30 out a 2 nov";
  - em anos diferentes: "28 dez 2026 a 2 jan 2027".
- **Meses:** as abreviações vêm de uma lista no código, sem depender do idioma do Windows.
- **Motivo do bloqueio:** entra com a primeira letra minúscula.

## 8. Login e sessão

- **Cookie:** o login usa o cookie de sessão do Flask, assinado com `SEGREDO_SESSAO`, uma chave nova no `.env`. O `.env.example` explica como gerar a chave.
- **Sem a chave:** o app gera uma chave aleatória ao ligar e avisa no terminal. Funciona, mas todo mundo sai quando o Flask reinicia.
- **Proteções do cookie:** `HttpOnly` (o JavaScript da página não lê) e `SameSite=Lax`. A sessão dura até o navegador fechar; "lembrar de mim" fica fora da v1, como nas telas.
- **O que a sessão guarda:** só o `usuario_id`. A cada pedido, `autenticacao.py` busca a pessoa; se ela sumiu ou foi desativada, a resposta é 401.
- **Decorador:** `@exige_login("administrador")`, `@exige_login("funcionario")` ou `@exige_login()` para qualquer perfil. A pessoa logada fica em `g.usuario`.
- **Escritas só em JSON:** o navegador não manda JSON de outro site sem pedir licença ao servidor. Junto com o `SameSite=Lax`, isso impede que um site de fora use a sessão de quem está logado (CSRF).

## 9. Testes

Os testes são escritos antes do código, com o `unittest`, e rodam com o mesmo comando da Etapa 1.

- **Domínio** (sem banco, um arquivo por classe): cada regra da seção 3 com datas fixas, inclusive:
  - sair e entrar no mesmo dia não conflita, e reserva cancelada não conflita;
  - a limpeza da saída usa os horários do imóvel;
  - o atraso vale com e sem prazo;
  - transição proibida levanta erro, e funcionário não reabre tarefa;
  - a senha confere, e o hash nunca é a própria senha.
- **API** (banco de verdade, com o cliente de testes do Flask): para cada rota, o caso que dá certo e os erros principais:
  - 401 sem login e 403 com o perfil errado;
  - isolamento: o Paulo só vê a Casa do Lago, e uma reserva da Marina dá 404 para ele;
  - 409 de conflito, usando uma reserva que já existe nos dados de exemplo;
  - 422 com a mensagem no campo certo;
  - a reserva nova cria a limpeza da saída e a linha do histórico;
  - o funcionário não vê a tarefa de outro.
- **Limpeza do banco:**
  - o que um teste grava, ele apaga no fim (`addCleanup`, na ordem das chaves estrangeiras);
  - assim, as contagens dos dados de exemplo (`6 4 9 15 16 2 18 28`) continuam exatas;
  - se um teste quebrar no meio, recarregue o `01` e o `02`.
- **Login nos testes:** com as contas e a senha dos dados de exemplo, que ficam só no `LEIA-ME.md`, nos dados de exemplo e nos testes.

## 10. Mudanças nos diagramas (junto com a Etapa 2)

- **`classes-dao`:**
  - `Conexao.transacao()` e a classe `Transacao`;
  - `DAOBase(conexao, transacao)`;
  - `ReservaDAO.buscar_conflito()`;
  - `ImovelDAO.buscar_por_id(id, travar)`;
  - `TarefaDAO.inserir(tarefa, criada_por)`.
- **`classes-dominio`:** `Reserva.situacao(agora, imovel)` no lugar de `situacao(hoje)`.
- **Exportação:** atualizar os `.mmd` e exportar de novo o PNG e o SVG.

## 11. Fora desta especificação

- O que fica para a entrega final (seção 1), especificado junto com as telas.
- Limite de tentativas de login, HTTPS e hospedagem: entram quando o sistema for para a internet.
