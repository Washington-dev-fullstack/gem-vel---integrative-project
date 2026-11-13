// Servidor simulado da demonstração no GitHub Pages: responde às rotas da API do Flask com o mesmo JSON e
// o mesmo formato de erro ({"erro": {"mensagem", "campos"}}), sobre os dados de exemplo. É uma porta enxuta
// de backend/gemovel (domínio, DAOs e rotas): as regras principais (R1 a R7) e os campos obrigatórios.
// Não toca no DOM nem no localStorage (quem guarda os dados é demo/navegador.js): os testes rodam no Node.

const PREENCHA = "Preencha este campo.";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE",
  "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const TIPOS = ["limpeza", "manutencao"];
const ESTADOS = ["pendente", "em_andamento", "concluida"];
const ABERTAS = ["pendente", "em_andamento"];
const NOME_DA_FUNCAO = {limpeza: "limpeza", manutencao: "manutenção"};
const EMAIL_REPETIDO = "Este e-mail já tem acesso ao Gemóvel.";
const SEGUNDOS_PARA_DESFAZER = 10;
const TAREFAS_POR_PAGINA = 30;
const CRIADO = Symbol("201");

class Recusa {
  constructor(status, mensagem, campos = {}) {
    Object.assign(this, {status, mensagem, campos});
  }
}
const invalido = (campos) => new Recusa(422, "Confira os campos destacados.", campos);
const conflito = (mensagem, campo) => new Recusa(409, mensagem, campo ? {[campo]: mensagem} : {});
const naoEncontrado = () => new Recusa(404, "Não encontrado.");
const criado = (corpo) => ({[CRIADO]: true, corpo});

// Datas como texto: "2026-11-13" (dia), "2026-11-13T10:00:00" (momento, guardado com os segundos) e
// "15:00" (horário). Na resposta, os momentos saem sem os segundos, como no Flask.

const dois = (n) => String(n).padStart(2, "0");
const diaDe = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const momentoDe = (d) => `${diaDe(d)}T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
const utc = (dia) => Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10));
const somarDias = (dia, n) => new Date(utc(dia) + n * 864e5).toISOString().slice(0, 10);
const diasEntre = (de, ate) => Math.round((utc(ate) - utc(de)) / 864e5);
const fimDoMes = (dia) => new Date(Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7), 0)).toISOString().slice(0, 10);
const momento = (dia, horario) => `${dia}T${horario}:00`;
const curto = (valor) => (valor ? valor.slice(0, 16) : null);
const segundos = (valor) => utc(valor) / 1000 + (+valor.slice(11, 13)) * 3600 + (+valor.slice(14, 16)) * 60 + (+valor.slice(17, 19) || 0);
const maior = (a, b) => (a > b ? a : b);
const menor = (a, b) => (a < b ? a : b);

function mesesAte(mes, quantos) {
  const indice = +mes.slice(0, 4) * 12 + +mes.slice(5, 7) - 1;
  return Array.from({length: quantos}, (_, k) => {
    const i = indice - quantos + 1 + k;
    return `${Math.floor(i / 12)}-${dois((i % 12) + 1)}`;
  });
}

/** "4 a 7 nov", "30 out a 2 nov" ou "28 dez 2026 a 2 jan 2027" (formato_json.periodo). */
function periodo(inicio, fim) {
  const diaEMes = (d) => `${+d.slice(8, 10)} ${MESES[+d.slice(5, 7) - 1]}`;
  if (inicio.slice(0, 4) !== fim.slice(0, 4)) return `${diaEMes(inicio)} ${inicio.slice(0, 4)} a ${diaEMes(fim)} ${fim.slice(0, 4)}`;
  if (inicio.slice(5, 7) !== fim.slice(5, 7)) return `${diaEMes(inicio)} a ${diaEMes(fim)}`;
  return `${+inicio.slice(8, 10)} a ${diaEMes(fim)}`;
}

const DATA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

/** Anda todas as datas dos dados `dias` dias para a frente (ou para trás), mantendo o horário. */
export function deslocarDatas(dados, dias) {
  if (!dias) return dados;
  for (const lista of Object.values(dados)) {
    if (!Array.isArray(lista)) continue;
    for (const item of lista) {
      for (const [chave, valor] of Object.entries(item)) {
        if (typeof valor === "string" && DATA.test(valor)) item[chave] = somarDias(valor.slice(0, 10), dias) + valor.slice(10);
      }
    }
  }
  return dados;
}

// Dinheiro em centavos; na resposta, texto com duas casas ("300.00").
const centavos = (valor) => Math.round(Number(valor) * 100);
const reais = (c) => `${c < 0 ? "-" : ""}${Math.floor(Math.abs(c) / 100)}.${dois(Math.abs(c) % 100)}`;

// Busca sem acento nem caixa, como o LIKE do MySQL.
const simples = (texto) => String(texto ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const contem = (texto, termo) => simples(texto).includes(simples(termo));
const digitos = (texto) => String(texto ?? "").replace(/\D/g, "");

/** Ordena pelas chaves, em ordem; `-chave` inverte aquela chave. */
const ordem = (...chaves) => (a, b) => {
  for (const chave of chaves) {
    const inverso = chave.startsWith("-");
    const nome = inverso ? chave.slice(1) : chave;
    const [x, y] = nome === "nome" ? [simples(a.nome), simples(b.nome)] : [a[nome], b[nome]];
    if (x !== y) return (x < y ? -1 : 1) * (inverso ? -1 : 1);
  }
  return 0;
};

const vazio = (valor) => valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === "");

/** O Validador do domínio: junta a primeira frase de cada campo e recusa tudo de uma vez (422). */
class Validador {
  erros = {};

  erro(campo, mensagem) {
    this.erros[campo] ??= mensagem;
  }

  texto(campo, valor, maximo, obrigatorio = true) {
    if (vazio(valor)) {
      if (obrigatorio) this.erro(campo, PREENCHA);
      return null;
    }
    const texto = String(valor).trim();
    if (texto.length > maximo) this.erro(campo, `Use até ${maximo} caracteres.`);
    return texto;
  }

  email(campo, valor, obrigatorio = true) {
    const texto = this.texto(campo, valor, 160, obrigatorio)?.toLowerCase() ?? null;
    if (texto !== null && !this.erros[campo] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto)) this.erro(campo, "E-mail inválido.");
    return texto;
  }

  opcao(campo, valor, opcoes) {
    if (vazio(valor)) {
      this.erro(campo, PREENCHA);
      return null;
    }
    if (!opcoes.includes(valor)) {
      this.erro(campo, "Escolha uma das opções.");
      return null;
    }
    return valor;
  }

  inteiro(campo, valor) {
    if (vazio(valor)) {
      this.erro(campo, PREENCHA);
      return null;
    }
    if (!Number.isInteger(valor)) this.erro(campo, "Valor inválido.");
    return valor;
  }

  dinheiro(campo, valor, obrigatorio = true) {
    if (vazio(valor)) {
      if (obrigatorio) this.erro(campo, PREENCHA);
      return null;
    }
    const numero = typeof valor === "boolean" ? NaN : Number(valor);
    if (!Number.isFinite(numero)) {
      this.erro(campo, "Valor inválido.");
      return null;
    }
    return Math.round(numero * 100);
  }

  // Dia "AAAA-MM-DD", momento "AAAA-MM-DDTHH:MM" e horário "HH:MM", como o Leitor das rotas lê.
  formato(campo, valor, padrao, obrigatorio = true) {
    if (vazio(valor)) {
      if (obrigatorio) this.erro(campo, PREENCHA);
      return null;
    }
    if (!padrao.test(valor)) {
      this.erro(campo, "Valor inválido.");
      return null;
    }
    return valor;
  }

  dia(campo, valor, obrigatorio = true) {
    return this.formato(campo, valor, /^\d{4}-\d{2}-\d{2}$/, obrigatorio);
  }

  momento(campo, valor, obrigatorio = true) {
    const lido = this.formato(campo, valor, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, obrigatorio);
    return lido && lido.length === 16 ? `${lido}:00` : lido;
  }

  horario(campo, valor) {
    return this.formato(campo, valor, /^\d{2}:\d{2}$/);
  }

  conferir(prefixo = "") {
    const campos = Object.entries(this.erros);
    if (campos.length) throw invalido(Object.fromEntries(campos.map(([campo, frase]) => [prefixo + campo, frase])));
  }
}

const codigoImovel = (id) => `IMV-${String(id).padStart(3, "0")}`;
const codigoReserva = (id) => `RSV-${String(id).padStart(4, "0")}`;
const enderecoDe = (i) =>
  `${i.logradouro}, ${i.numero}${i.complemento ? `, ${i.complemento}` : ""} · ${i.bairro}, ${i.cidade}/${i.uf}`;
const proximoId = (lista) => lista.reduce((maximo, item) => Math.max(maximo, item.id), 0) + 1;

/** O servidor sobre `dados` (as tabelas do banco, em listas). `agora()` dá a hora do relógio. */
export function criarServidor(dados, {agora = () => new Date()} = {}) {
  const agoraTexto = () => momentoDe(agora());
  const hoje = () => diaDe(agora());

  const usuario = (id) => dados.usuarios.find((u) => u.id === id);
  const imovel = (id) => dados.imoveis.find((i) => i.id === id);
  const hospede = (id) => dados.hospedes.find((h) => h.id === id);
  const reserva = (id) => dados.reservas.find((r) => r.id === id);
  const tarefa = (id) => dados.tarefas.find((t) => t.id === id);
  const doAdmin = (imovelId, admin) => imovel(imovelId)?.administrador_id === admin.id;
  const imoveisDe = (admin) => dados.imoveis.filter((i) => i.administrador_id === admin.id).sort(ordem("nome", "id"));
  const reservasDe = (admin) => dados.reservas.filter((r) => doAdmin(r.imovel_id, admin)).sort(ordem("data_entrada", "id"));
  const tarefasDe = (admin) => dados.tarefas.filter((t) => doAdmin(t.imovel_id, admin)).sort(ordem("agendada_para", "id"));
  const historicoDe = (t) => dados.historico.filter((h) => h.tarefa_id === t.id).sort(ordem("registrado_em", "id"));
  const limpezaDe = (r) => dados.tarefas.filter((t) => t.reserva_id === r.id && t.tipo === "limpeza").sort(ordem("id"))[0] ?? null;

  function exigir(...perfis) {
    const eu = usuario(dados.sessao);
    if (!eu || !eu.ativo) throw new Recusa(401, "Entre de novo para continuar.");
    if (perfis.length && !perfis.includes(eu.perfil)) throw new Recusa(403, "Esta área é de outro perfil.");
    return eu;
  }

  function doDono(achado, dono) {
    if (!achado || !dono(achado)) throw naoEncontrado();
    return achado;
  }
  const meuImovel = (eu, id) => doDono(imovel(id), (i) => i.administrador_id === eu.id);
  const meuHospede = (eu, id) => doDono(hospede(id), (h) => h.administrador_id === eu.id);
  const minhaReserva = (eu, id) => doDono(reserva(id), (r) => doAdmin(r.imovel_id, eu));
  const minhaPessoa = (eu, id) => doDono(usuario(id), (u) => u.perfil === "funcionario" && u.administrador_id === eu.id);
  const minhaTarefa = (eu, id) => doDono(tarefa(id), (t) =>
    (eu.perfil === "administrador" ? doAdmin(t.imovel_id, eu) : t.funcionario_id === eu.id));

  // O JSON das rotas (rotas/formato_json.py).

  const usuarioJson = (u) => ({id: u.id, nome: u.nome, email: u.email, perfil: u.perfil,
    ...(u.perfil === "funcionario" ? {funcao: u.funcao} : {})});
  const pessoaResumo = (id) => (usuario(id) ? {id, nome: usuario(id).nome} : null);
  const imovelResumo = (i) => ({id: i.id, codigo: codigoImovel(i.id), nome: i.nome});
  const imovelJson = (i) => ({...i, codigo: codigoImovel(i.id), endereco: enderecoDe(i)});
  const hospedeJson = ({id, nome, telefone, email, documento, observacoes}) => ({id, nome, telefone, email, documento, observacoes});
  const bloqueioJson = ({id, imovel_id, data_inicio, data_fim, motivo}) => ({id, imovel_id, data_inicio, data_fim, motivo});
  const funcionarioJson = ({id, nome, email, telefone, funcao, ativo}) => ({id, nome, email, telefone, funcao, ativo});

  /** Não concluída e já passou do prazo; sem prazo, do horário agendado (R7). */
  const atrasada = (t) => t.status !== "concluida" && agoraTexto() > (t.prazo ?? t.agendada_para);

  function tarefaJson(t, {comEndereco = false} = {}) {
    const i = imovel(t.imovel_id);
    return {id: t.id, tipo: t.tipo, titulo: t.titulo, descricao: t.descricao,
      imovel: {...imovelResumo(i), ...(comEndereco ? {endereco: enderecoDe(i), observacoes: i.observacoes} : {})},
      reserva_id: t.reserva_id, responsavel: pessoaResumo(t.funcionario_id), agendada_para: curto(t.agendada_para),
      prazo: curto(t.prazo), status: t.status, atrasada: atrasada(t), iniciada_em: curto(t.iniciada_em),
      concluida_em: curto(t.concluida_em)};
  }

  function tarefaCompleta(t, opcoes) {
    const r = t.reserva_id ? reserva(t.reserva_id) : null;
    return {...tarefaJson(t, opcoes),
      historico: historicoDe(t).map((h) => ({registrado_em: curto(h.registrado_em), status_anterior: h.status_anterior,
        status_novo: h.status_novo, observacao: h.observacao, usuario: pessoaResumo(h.usuario_id)})),
      reserva: r ? {id: r.id, codigo: codigoReserva(r.id), data_saida: r.data_saida} : null};
  }

  const noites = (r) => diasEntre(r.data_entrada, r.data_saida);

  /** futura antes da entrada (no horário de entrada), em_curso até a saída (no horário de saída). */
  function situacao(r) {
    if (r.status === "cancelada") return "cancelada";
    const i = imovel(r.imovel_id);
    if (agoraTexto() < momento(r.data_entrada, i.horario_entrada)) return "futura";
    if (agoraTexto() < momento(r.data_saida, i.horario_saida)) return "em_curso";
    return "concluida";
  }

  function reservaJson(r) {
    const h = hospede(r.hospede_id);
    return {id: r.id, codigo: codigoReserva(r.id), imovel: imovelResumo(imovel(r.imovel_id)), hospede: {id: h.id, nome: h.nome},
      data_entrada: r.data_entrada, data_saida: r.data_saida, noites: noites(r), num_hospedes: r.num_hospedes,
      valor_diaria: r.valor_diaria, valor_total: r.valor_total, status: r.status, situacao: situacao(r),
      observacoes: r.observacoes};
  }

  const reservaCompleta = (r) => {
    const limpeza = limpezaDe(r);
    return {...reservaJson(r), hospede: hospedeJson(hospede(r.hospede_id)), limpeza: limpeza ? tarefaJson(limpeza) : null};
  };

  // Indicadores (dominio/indicadores.py).

  const noitesNoPeriodo = (r, inicio, fim) =>
    Math.max(diasEntre(maior(r.data_entrada, inicio), menor(r.data_saida, somarDias(fim, 1))), 0);
  const receitaNoPeriodo = (r, inicio, fim) =>
    (r.status === "cancelada" ? 0 : Math.round((centavos(r.valor_total) * noitesNoPeriodo(r, inicio, fim)) / noites(r)));
  const percentual = (parte, todo) => (todo ? Math.round((parte * 100) / todo) : 0);
  const soma = (lista, valor) => lista.reduce((total, item) => total + valor(item), 0);

  function prontidao(i, confirmadas) {
    const emCurso = confirmadas.find((r) => situacao(r) === "em_curso");
    if (emCurso) return {estado: "hospedes", ate: emCurso.data_saida};
    const sairam = confirmadas.filter((r) => momento(r.data_saida, i.horario_saida) <= agoraTexto());
    if (!sairam.length) return {estado: "pronto"};
    const ultima = sairam.sort(ordem("-data_saida", "-id"))[0];
    const limpeza = dados.tarefas.find((t) => t.reserva_id === ultima.id && t.tipo === "limpeza" && ABERTAS.includes(t.status));
    if (!limpeza) return {estado: "pronto"};
    if (limpeza.status === "em_andamento") return {estado: "limpando"};
    return {estado: atrasada(limpeza) ? "limpeza_atrasada" : "limpeza_pendente"};
  }

  function proximaEntrada(i, confirmadas) {
    const futura = confirmadas.filter((r) => momento(r.data_entrada, i.horario_entrada) > agoraTexto())[0];
    if (!futura) return null;
    const h = hospede(futura.hospede_id);
    return {data_hora: curto(momento(futura.data_entrada, i.horario_entrada)), hospede: {id: h.id, nome: h.nome}};
  }

  function comIndicadores(i, {receita = false} = {}) {
    const inicio = `${hoje().slice(0, 7)}-01`;
    const fim = fimDoMes(inicio);
    const confirmadas = dados.reservas.filter((r) => r.imovel_id === i.id && r.status === "confirmada").sort(ordem("data_entrada", "id"));
    const noitesDoMes = soma(confirmadas, (r) => noitesNoPeriodo(r, inicio, fim));
    const diasDoMes = +fim.slice(8, 10);
    return {...imovelJson(i), prontidao: prontidao(i, confirmadas), proxima_entrada: proximaEntrada(i, confirmadas),
      ocupacao_mes: {percentual: percentual(noitesDoMes, diasDoMes), noites: noitesDoMes, noites_mes: diasDoMes},
      reservas_futuras: confirmadas.filter((r) => momento(r.data_saida, i.horario_saida) > agoraTexto()).length,
      ...(receita ? {receita_mes: reais(soma(confirmadas, (r) => receitaNoPeriodo(r, inicio, fim)))} : {})};
  }
  const detalheDoImovel = (i) => comIndicadores(i, {receita: true});

  function resumoDoMes(reservas, ativos, inicio, fim) {
    const noMes = reservas.filter((r) => r.status !== "cancelada").map((r) => [r, noitesNoPeriodo(r, inicio, fim)])
      .filter(([, n]) => n > 0);
    const receita = soma(noMes, ([r]) => receitaNoPeriodo(r, inicio, fim));
    const vendidas = soma(noMes, ([, n]) => n);
    const idsAtivos = new Set(ativos.map((i) => i.id));
    const ocupadas = soma(noMes, ([r, n]) => (idsAtivos.has(r.imovel_id) ? n : 0));
    const possiveis = idsAtivos.size * (diasEntre(inicio, fim) + 1);
    return {receita: reais(receita), ocupacao: {percentual: percentual(ocupadas, possiveis), noites: ocupadas, noites_possiveis: possiveis},
      reservas: noMes.length, diaria_media: vendidas ? reais(Math.round(receita / vendidas)) : null};
  }

  // Leitura dos pedidos.

  function periodoDaBusca(busca) {
    const v = new Validador();
    const de = v.dia("de", busca.get("de") || `${hoje().slice(0, 7)}-01`);
    const ate = v.dia("ate", busca.get("ate") || fimDoMes(hoje()));
    v.conferir();
    if (ate < de) throw invalido({ate: "O fim não pode ser antes do início."});
    return [de, ate];
  }

  function conflitoDeDatas(imovelId, entrada, saida, ignorar = null) {
    const r = dados.reservas.filter((x) => x.imovel_id === imovelId && x.status === "confirmada" && x.id !== ignorar
      && x.data_entrada < saida && entrada < x.data_saida).sort(ordem("data_entrada", "id"))[0];
    if (r) return {reserva: r};
    const b = dados.bloqueios.filter((x) => x.imovel_id === imovelId && x.data_inicio < saida && entrada < x.data_fim)
      .sort(ordem("data_inicio", "id"))[0];
    return b ? {bloqueio: b} : null;
  }

  function fraseConflito({reserva: r, bloqueio: b}, criando) {
    if (r) {
      const texto = `${codigoReserva(r.id)} (${hospede(r.hospede_id).nome}, ${periodo(r.data_entrada, r.data_saida)})`;
      return criando === "reserva" ? `Conflita com ${texto}. Escolha outras datas.` : `Já há a reserva ${texto} nessas datas.`;
    }
    const texto = `${periodo(b.data_inicio, b.data_fim)} (${b.motivo.slice(0, 1).toLowerCase()}${b.motivo.slice(1)})`;
    return criando === "reserva" ? `O imóvel está bloqueado de ${texto}.` : `Já há um bloqueio de ${texto} nessas datas.`;
  }

  function lerImovel(corpo, eu) {
    const v = new Validador();
    const novo = {administrador_id: eu.id, nome: v.texto("nome", corpo.nome, 100),
      logradouro: v.texto("logradouro", corpo.logradouro, 150), numero: v.texto("numero", corpo.numero, 10),
      complemento: v.texto("complemento", corpo.complemento, 60, false), bairro: v.texto("bairro", corpo.bairro, 80),
      cidade: v.texto("cidade", corpo.cidade, 80), uf: v.opcao("uf", vazio(corpo.uf) ? null : String(corpo.uf).toUpperCase(), UFS),
      cep: v.texto("cep", corpo.cep, 9, false), observacoes: v.texto("observacoes", corpo.observacoes, 2000, false)};
    if (novo.cep && /^\d{8}$/.test(novo.cep)) novo.cep = `${novo.cep.slice(0, 5)}-${novo.cep.slice(5)}`;
    if (novo.cep && !/^\d{5}-\d{3}$/.test(novo.cep)) v.erro("cep", "Use o formato 00000-000.");
    const capacidade = "capacidade" in corpo ? corpo.capacidade : 2;
    if (vazio(capacidade)) v.erro("capacidade", PREENCHA);
    else if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 255) v.erro("capacidade", "Use um número de 1 a 255.");
    novo.capacidade = capacidade;
    const diaria = v.dinheiro("valor_diaria", corpo.valor_diaria);
    if (diaria !== null && diaria <= 0) v.erro("valor_diaria", "Use um valor maior que zero.");
    novo.valor_diaria = diaria === null ? null : reais(diaria);
    novo.horario_entrada = v.horario("horario_entrada", "horario_entrada" in corpo ? corpo.horario_entrada : "15:00");
    novo.horario_saida = v.horario("horario_saida", "horario_saida" in corpo ? corpo.horario_saida : "11:00");
    if (novo.horario_entrada && novo.horario_saida && !(novo.horario_saida < novo.horario_entrada)) {
      v.erro("horario_saida", "A saída precisa ser antes da entrada, para caber a limpeza.");
    }
    v.conferir();
    return novo;
  }

  function lerHospede(corpo, eu, prefixo = "") {
    const v = new Validador();
    const novo = {administrador_id: eu.id, nome: v.texto("nome", corpo.nome, 120), telefone: v.texto("telefone", corpo.telefone, 20, false),
      email: v.email("email", corpo.email, false), documento: v.texto("documento", corpo.documento, 20, false),
      observacoes: v.texto("observacoes", corpo.observacoes, 2000, false)};
    v.conferir(prefixo);
    return novo;
  }

  function imovelDaReserva(eu, id) {
    if (vazio(id)) throw invalido({imovel_id: PREENCHA});
    const i = imovel(id);
    if (!i || i.administrador_id !== eu.id) throw invalido({imovel_id: "Imóvel não encontrado."});
    if (!i.ativo) throw invalido({imovel_id: "Este imóvel está desativado."});
    return i;
  }

  function hospedeDaReserva(eu, id) {
    if (vazio(id)) throw invalido({hospede_id: PREENCHA});
    const h = hospede(id);
    if (!h || h.administrador_id !== eu.id) throw invalido({hospede_id: "Hóspede não encontrado."});
    return h;
  }

  /** Datas, hóspedes e total (R2: sem total, diária × noites); depois a capacidade (R3) e o conflito (R1). */
  function lerReserva(corpo, i, base) {
    const v = new Validador();
    const entrada = v.dia("data_entrada", corpo.data_entrada);
    const saida = v.dia("data_saida", corpo.data_saida);
    if (entrada && saida && !(saida > entrada)) v.erro("data_saida", "A saída precisa ser depois da entrada.");
    const pessoas = v.inteiro("num_hospedes", corpo.num_hospedes);
    if (Number.isInteger(pessoas) && pessoas < 1) v.erro("num_hospedes", "Use pelo menos 1 hóspede.");
    const total = v.dinheiro("valor_total", corpo.valor_total, false);
    if (total !== null && total < 0) v.erro("valor_total", "O total não pode ser negativo.");
    const observacoes = v.texto("observacoes", corpo.observacoes, 2000, false);
    v.conferir();
    const nova = {...base, data_entrada: entrada, data_saida: saida, num_hospedes: pessoas, observacoes,
      valor_total: reais(total ?? centavos(base.valor_diaria) * diasEntre(entrada, saida))};
    if (pessoas > i.capacidade) {
      throw invalido({num_hospedes: `${i.nome} recebe até ${i.capacidade} ${i.capacidade === 1 ? "hóspede" : "hóspedes"}.`});
    }
    const achado = conflitoDeDatas(i.id, entrada, saida, base.id);
    if (achado) throw conflito(fraseConflito(achado, "reserva"), "data_entrada");
    return nova;
  }

  function registrar(t, eu, anterior, observacao = null) {
    dados.historico.push({id: proximoId(dados.historico), tarefa_id: t.id, usuario_id: eu.id, status_anterior: anterior,
      status_novo: t.status, observacao, registrado_em: agoraTexto()});
  }

  function inserirTarefa(campos, eu) {
    const t = {id: proximoId(dados.tarefas), ...campos, status: "pendente", iniciada_em: null, concluida_em: null};
    dados.tarefas.push(t);
    registrar(t, eu, null);
    return t;
  }

  function apagarTarefa(t) {
    dados.tarefas = dados.tarefas.filter((x) => x !== t);
    dados.historico = dados.historico.filter((h) => h.tarefa_id !== t.id);
  }

  function lerTarefa(corpo, eu) {
    const v = new Validador();
    const tipo = v.opcao("tipo", corpo.tipo, TIPOS);
    const campos = {tipo, titulo: v.texto("titulo", corpo.titulo, 120), descricao: v.texto("descricao", corpo.descricao, 2000, false),
      agendada_para: v.momento("agendada_para", corpo.agendada_para), prazo: v.momento("prazo", corpo.prazo, false),
      imovel_id: corpo.imovel_id ?? null, reserva_id: corpo.reserva_id ?? null, funcionario_id: corpo.funcionario_id ?? null};
    if (campos.agendada_para && campos.prazo && campos.prazo < campos.agendada_para) v.erro("prazo", "O prazo não pode ser antes do início.");
    if (vazio(campos.imovel_id)) v.erro("imovel_id", PREENCHA);
    if (campos.reserva_id !== null && tipo && tipo !== "limpeza") v.erro("reserva_id", "Só a limpeza pode ficar ligada a uma reserva.");
    v.conferir();
    const i = imovel(campos.imovel_id);
    if (!i || i.administrador_id !== eu.id) throw invalido({imovel_id: "Imóvel não encontrado."});
    if (campos.reserva_id !== null) {
      const r = reserva(campos.reserva_id);
      if (!r || !doAdmin(r.imovel_id, eu)) throw invalido({reserva_id: "Reserva não encontrada."});
      if (r.imovel_id !== i.id) throw invalido({reserva_id: "Esta reserva é de outro imóvel."});
    }
    if (campos.funcionario_id !== null) {
      const p = usuario(campos.funcionario_id);
      if (!p || p.perfil !== "funcionario" || p.administrador_id !== eu.id || !p.ativo) {
        throw invalido({funcionario_id: "Pessoa não encontrada."});
      }
      if (p.funcao !== tipo) throw invalido({funcionario_id: "Esta pessoa não faz este tipo de tarefa."});
    }
    return campos;
  }

  function lerPessoa(corpo) {
    const v = new Validador();
    const pessoa = {nome: v.texto("nome", corpo.nome, 120), email: v.email("email", corpo.email),
      telefone: v.texto("telefone", corpo.telefone, 20, false), funcao: v.opcao("funcao", corpo.funcao, TIPOS)};
    return [pessoa, v];
  }

  function conferirSenha(v, senha) {
    if (vazio(senha)) v.erro("senha", PREENCHA);
    else if (String(senha).length < 8) v.erro("senha", "A senha precisa ter pelo menos 8 caracteres.");
  }

  /** As tarefas que a tela Equipe resume: as do dia, as em andamento e as pendentes daqui para a frente. */
  function tarefasDaEquipe(eu, dia) {
    const amanha = somarDias(dia, 1);
    return tarefasDe(eu).filter((t) => t.funcionario_id !== null && ((t.agendada_para >= dia && t.agendada_para < amanha)
      || t.status === "em_andamento" || (t.status === "pendente" && t.agendada_para >= agoraTexto())));
  }

  function pessoaJson(u, tarefas, dia) {
    const dela = tarefas.filter((t) => t.funcionario_id === u.id);
    const doDia = dela.filter((t) => t.agendada_para.slice(0, 10) === dia);
    const emAndamento = dela.find((t) => t.status === "em_andamento");
    const pendentes = dela.filter((t) => t.status === "pendente" && t.agendada_para >= agoraTexto());
    const lugar = (t) => ({id: t.imovel_id, nome: imovel(t.imovel_id).nome});
    return {...funcionarioJson(u),
      dia: {total: doDia.length, concluidas: doDia.filter((t) => t.status === "concluida").length, estados: doDia.map((t) => t.status)},
      agora: emAndamento ? {id: emAndamento.id, titulo: emAndamento.titulo, imovel: lugar(emAndamento)} : null,
      proxima: pendentes.length ? {agendada_para: curto(pendentes[0].agendada_para), imovel: lugar(pendentes[0])} : null,
      futuras_pendentes: pendentes.filter((t) => t.agendada_para > agoraTexto()).length};
  }
  const pessoaDeHoje = (eu, u) => pessoaJson(u, tarefasDaEquipe(eu, hoje()), hoje());

  const casaHospede = (h, termo) => contem(h.nome, termo) || contem(h.telefone, termo)
    || (/^[\d\s()-]+$/.test(termo) && digitos(termo) !== "" && digitos(h.telefone).includes(digitos(termo)));

  // As rotas: [método, caminho, função(ids, corpo, busca)].

  const rotas = [
    ["POST", /^\/api\/sessao$/, (_, corpo) => {
      const v = new Validador();
      const email = v.texto("email", corpo.email, 160);
      if (vazio(corpo.senha)) v.erro("senha", PREENCHA);
      v.conferir();
      const u = dados.usuarios.find((x) => x.email === email.toLowerCase());
      if (!u) throw new Recusa(401, "E-mail ou senha não conferem.");
      if (!u.ativo) throw new Recusa(403, "Este acesso foi desativado. Fale com quem administra o Gemóvel.");
      dados.sessao = u.id;
      return {usuario: usuarioJson(u)};
    }],
    ["GET", /^\/api\/sessao$/, () => ({usuario: usuarioJson(exigir())})],
    ["DELETE", /^\/api\/sessao$/, () => {
      dados.sessao = null;
      return null;
    }],

    ["GET", /^\/api\/imoveis$/, () => ({imoveis: imoveisDe(exigir("administrador")).map((i) => comIndicadores(i))})],
    ["GET", /^\/api\/imoveis\/(\d+)$/, ([id]) => detalheDoImovel(meuImovel(exigir("administrador"), id))],
    ["POST", /^\/api\/imoveis$/, (_, corpo) => {
      const i = {id: proximoId(dados.imoveis), ...lerImovel(corpo, exigir("administrador")), ativo: true};
      dados.imoveis.push(i);
      return criado(imovelJson(i));
    }],
    ["PATCH", /^\/api\/imoveis\/(\d+)$/, ([id], corpo) => {
      const eu = exigir("administrador");
      const i = meuImovel(eu, id);
      Object.assign(i, lerImovel(corpo, eu));
      return detalheDoImovel(i);
    }],
    ["POST", /^\/api\/imoveis\/(\d+)\/desativar$/, ([id]) => {
      const i = meuImovel(exigir("administrador"), id);
      const futuras = comIndicadores(i).reservas_futuras;
      if (futuras) throw conflito(futuras === 1 ? "Há 1 reserva futura neste imóvel." : `Há ${futuras} reservas futuras neste imóvel.`);
      i.ativo = false;
      return detalheDoImovel(i);
    }],
    ["POST", /^\/api\/imoveis\/(\d+)\/reativar$/, ([id]) => {
      const i = meuImovel(exigir("administrador"), id);
      i.ativo = true;
      return detalheDoImovel(i);
    }],
    ["GET", /^\/api\/imoveis\/(\d+)\/bloqueios$/, ([id]) => {
      const i = meuImovel(exigir("administrador"), id);
      return {bloqueios: dados.bloqueios.filter((b) => b.imovel_id === i.id).sort(ordem("data_inicio", "id")).map(bloqueioJson)};
    }],
    ["POST", /^\/api\/imoveis\/(\d+)\/bloqueios$/, ([id], corpo) => {
      const i = meuImovel(exigir("administrador"), id);
      const v = new Validador();
      const inicio = v.dia("data_inicio", corpo.data_inicio);
      const fim = v.dia("data_fim", corpo.data_fim);
      if (inicio && fim && !(fim > inicio)) v.erro("data_fim", "O fim precisa ser depois do início.");
      const motivo = v.texto("motivo", corpo.motivo, 120);
      v.conferir();
      if (!i.ativo) throw conflito("Este imóvel está desativado.");
      const achado = conflitoDeDatas(i.id, inicio, fim);
      if (achado) throw conflito(fraseConflito(achado, "bloqueio"), "data_inicio");
      const b = {id: proximoId(dados.bloqueios), imovel_id: i.id, data_inicio: inicio, data_fim: fim, motivo};
      dados.bloqueios.push(b);
      return criado(bloqueioJson(b));
    }],
    ["GET", /^\/api\/bloqueios$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const [de, ate] = periodoDaBusca(busca);
      return {bloqueios: dados.bloqueios.filter((b) => doAdmin(b.imovel_id, eu) && b.data_inicio <= ate && b.data_fim > de)
        .sort(ordem("data_inicio", "id")).map(bloqueioJson)};
    }],
    ["DELETE", /^\/api\/bloqueios\/(\d+)$/, ([id]) => {
      const eu = exigir("administrador");
      const b = doDono(dados.bloqueios.find((x) => x.id === id), (x) => doAdmin(x.imovel_id, eu));
      dados.bloqueios = dados.bloqueios.filter((x) => x !== b);
      return null;
    }],

    ["GET", /^\/api\/hospedes$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const termo = (busca.get("busca") ?? "").trim();
      let lista = dados.hospedes.filter((h) => h.administrador_id === eu.id && (!termo || casaHospede(h, termo))).sort(ordem("nome", "id"));
      if (termo) lista = lista.slice(0, 20);
      return {hospedes: lista.map((h) => {
        const dele = dados.reservas.filter((r) => r.hospede_id === h.id);
        return {...hospedeJson(h), num_reservas: dele.length,
          ultima_reserva: dele.reduce((ultima, r) => (ultima && ultima > r.data_entrada ? ultima : r.data_entrada), null)};
      })};
    }],
    ["GET", /^\/api\/hospedes\/(\d+)$/, ([id]) => {
      const h = meuHospede(exigir("administrador"), id);
      const reservas = dados.reservas.filter((r) => r.hospede_id === h.id).sort(ordem("-data_entrada", "-id"));
      return {...hospedeJson(h), reservas: reservas.map((r) => ({id: r.id, codigo: codigoReserva(r.id), imovel: imovelResumo(imovel(r.imovel_id)),
        data_entrada: r.data_entrada, data_saida: r.data_saida, status: r.status, situacao: situacao(r)}))};
    }],
    ["POST", /^\/api\/hospedes$/, (_, corpo) => {
      const h = {id: proximoId(dados.hospedes), ...lerHospede(corpo, exigir("administrador"))};
      dados.hospedes.push(h);
      return criado(hospedeJson(h));
    }],
    ["PATCH", /^\/api\/hospedes\/(\d+)$/, ([id], corpo) => {
      const eu = exigir("administrador");
      const h = meuHospede(eu, id);
      Object.assign(h, lerHospede(corpo, eu));
      return hospedeJson(h);
    }],
    ["DELETE", /^\/api\/hospedes\/(\d+)$/, ([id]) => {
      const h = meuHospede(exigir("administrador"), id);
      if (dados.reservas.some((r) => r.hospede_id === h.id)) throw conflito("Este hóspede tem reservas e não pode ser excluído.");
      dados.hospedes = dados.hospedes.filter((x) => x !== h);
      return null;
    }],

    ["GET", /^\/api\/reservas$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const [de, ate] = periodoDaBusca(busca);
      return {reservas: reservasDe(eu).filter((r) => r.data_entrada <= ate && r.data_saida > de).map(reservaJson)};
    }],
    ["GET", /^\/api\/reservas\/(\d+)$/, ([id]) => reservaCompleta(minhaReserva(exigir("administrador"), id))],
    ["POST", /^\/api\/reservas$/, (_, corpo) => {
      const eu = exigir("administrador");
      let hospedeId = corpo.hospede_id ?? null;
      if (corpo.hospede_novo && typeof corpo.hospede_novo === "object") {
        const novo = {id: proximoId(dados.hospedes), ...lerHospede(corpo.hospede_novo, eu, "hospede_novo.")};
        dados.hospedes.push(novo);
        hospedeId = novo.id;
      }
      const i = imovelDaReserva(eu, corpo.imovel_id);
      const h = hospedeDaReserva(eu, hospedeId);
      const r = lerReserva(corpo, i, {id: proximoId(dados.reservas), imovel_id: i.id, hospede_id: h.id,
        valor_diaria: i.valor_diaria, status: "confirmada"});
      dados.reservas.push(r);
      const limpeza = inserirTarefa({tipo: "limpeza", titulo: "Limpeza de saída", descricao: null, imovel_id: i.id,
        reserva_id: r.id, funcionario_id: null, agendada_para: momento(r.data_saida, i.horario_saida),
        prazo: momento(r.data_saida, i.horario_entrada)}, eu);
      return criado({...reservaJson(r), limpeza: tarefaJson(limpeza)});
    }],
    ["PATCH", /^\/api\/reservas\/(\d+)$/, ([id], corpo) => {
      const eu = exigir("administrador");
      const r = minhaReserva(eu, id);
      if (r.status === "cancelada") throw conflito("Esta reserva está cancelada.");
      const i = imovelDaReserva(eu, corpo.imovel_id);
      const h = hospedeDaReserva(eu, corpo.hospede_id);
      const diaria = i.id === r.imovel_id ? r.valor_diaria : i.valor_diaria;
      const nova = lerReserva(corpo, i, {...r, imovel_id: i.id, hospede_id: h.id, valor_diaria: diaria});
      const mudouLugarOuSaida = nova.imovel_id !== r.imovel_id || nova.data_saida !== r.data_saida;
      Object.assign(r, nova);
      const limpeza = limpezaDe(r);
      if (limpeza?.status === "pendente" && mudouLugarOuSaida) {
        Object.assign(limpeza, {imovel_id: i.id, agendada_para: momento(r.data_saida, i.horario_saida),
          prazo: momento(r.data_saida, i.horario_entrada)});
      }
      return reservaCompleta(r);
    }],
    ["POST", /^\/api\/reservas\/(\d+)\/cancelar$/, ([id]) => {
      const r = minhaReserva(exigir("administrador"), id);
      if (r.status === "cancelada") throw invalido({status: "Esta reserva já está cancelada."});
      r.status = "cancelada";
      const limpeza = limpezaDe(r);
      if (limpeza?.status === "pendente") apagarTarefa(limpeza);
      return reservaCompleta(r);
    }],

    ["GET", /^\/api\/tarefas$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const minhas = tarefasDe(eu);
      if (busca.get("imovel_id")) {
        const i = meuImovel(eu, Number(busca.get("imovel_id")));
        const de = busca.get("de") || hoje();
        const pular = Math.max(Number(busca.get("pular")) || 0, 0);
        const lista = minhas.filter((t) => t.imovel_id === i.id && t.agendada_para >= de);
        return {tarefas: lista.slice(pular, pular + TAREFAS_POR_PAGINA).map((t) => tarefaJson(t)),
          tem_mais: lista.length > pular + TAREFAS_POR_PAGINA};
      }
      const dia = busca.get("dia");
      const lista = dia ? minhas.filter((t) => t.agendada_para.slice(0, 10) === dia) : minhas.filter((t) => ABERTAS.includes(t.status));
      return {tarefas: lista.map((t) => tarefaJson(t))};
    }],
    ["GET", /^\/api\/tarefas\/(\d+)$/, ([id]) => tarefaCompleta(minhaTarefa(exigir("administrador"), id))],
    ["POST", /^\/api\/tarefas$/, (_, corpo) => {
      const eu = exigir("administrador");
      return criado(tarefaJson(inserirTarefa(lerTarefa(corpo, eu), eu)));
    }],
    ["PATCH", /^\/api\/tarefas\/(\d+)$/, ([id], corpo) => {
      const eu = exigir("administrador");
      const t = minhaTarefa(eu, id);
      Object.assign(t, lerTarefa(corpo, eu));
      return tarefaCompleta(t);
    }],
    ["DELETE", /^\/api\/tarefas\/(\d+)$/, ([id]) => {
      apagarTarefa(minhaTarefa(exigir("administrador"), id));
      return null;
    }],
    ["POST", /^\/api\/tarefas\/(\d+)\/estado$/, ([id], corpo) => {
      const eu = exigir();
      const t = minhaTarefa(eu, id);
      const v = new Validador();
      const novo = v.opcao("status", corpo.status, ESTADOS);
      const observacao = v.texto("observacao", corpo.observacao, 255, false);
      v.conferir();
      const anterior = t.status;
      const admin = eu.perfil === "administrador";
      if (novo === "em_andamento") {
        if (anterior !== "pendente") throw invalido({status: "Só uma tarefa pendente pode começar."});
        t.iniciada_em = agoraTexto();
      } else if (novo === "concluida") {
        if (anterior === "concluida") throw invalido({status: "Esta tarefa já está concluída."});
        if (!admin && anterior === "pendente") throw conflito("Comece a tarefa antes de concluir.");
        t.concluida_em = agoraTexto();
        t.iniciada_em ??= t.concluida_em;
      } else {
        if (!admin) throw invalido({status: "Só quem administra pode reabrir uma tarefa."});
        if (anterior !== "concluida") throw invalido({status: "Só uma tarefa concluída pode ser reaberta."});
        t.iniciada_em = null;
        t.concluida_em = null;
      }
      t.status = novo;
      registrar(t, eu, anterior, observacao);
      return tarefaJson(t, {comEndereco: !admin});
    }],
    ["POST", /^\/api\/tarefas\/(\d+)\/desfazer$/, ([id]) => {
      const eu = exigir();
      const t = minhaTarefa(eu, id);
      const ultimo = historicoDe(t).at(-1);
      const daPraDesfazer = ultimo && ultimo.usuario_id === eu.id && ultimo.status_novo === t.status
        && ["em_andamento", "concluida"].includes(t.status) && ultimo.status_anterior
        && segundos(agoraTexto()) - segundos(ultimo.registrado_em) <= SEGUNDOS_PARA_DESFAZER;
      if (!daPraDesfazer) throw invalido({status: "Não dá mais para desfazer."});
      t.status = ultimo.status_anterior;
      t.concluida_em = null;
      if (t.status === "pendente") t.iniciada_em = null;
      dados.historico = dados.historico.filter((h) => h !== ultimo);
      return tarefaJson(t, {comEndereco: eu.perfil === "funcionario"});
    }],
    ["GET", /^\/api\/minhas-tarefas$/, (_, __, busca) => {
      const eu = exigir("funcionario");
      const dia = busca.get("dia") || hoje();
      const amanha = somarDias(dia, 1);
      const tarefas = dados.tarefas.filter((t) => t.funcionario_id === eu.id && t.agendada_para < amanha
        && (t.agendada_para >= dia || t.status !== "concluida")).sort(ordem("agendada_para", "id"));
      return {tarefas: tarefas.map((t) => tarefaJson(t, {comEndereco: true}))};
    }],

    ["GET", /^\/api\/funcionarios$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const dia = busca.get("dia") || hoje();
      const tarefas = tarefasDaEquipe(eu, dia);
      const equipe = dados.usuarios.filter((u) => u.perfil === "funcionario" && u.administrador_id === eu.id).sort(ordem("nome", "id"));
      return {funcionarios: equipe.map((u) => pessoaJson(u, tarefas, dia))};
    }],
    ["POST", /^\/api\/funcionarios$/, (_, corpo) => {
      const eu = exigir("administrador");
      const [pessoa, v] = lerPessoa(corpo);
      conferirSenha(v, corpo.senha);
      v.conferir();
      if (dados.usuarios.some((u) => u.email === pessoa.email)) throw conflito(EMAIL_REPETIDO, "email");
      const u = {id: proximoId(dados.usuarios), ...pessoa, perfil: "funcionario", ativo: true, administrador_id: eu.id};
      dados.usuarios.push(u);
      return criado(pessoaDeHoje(eu, u));
    }],
    ["PATCH", /^\/api\/funcionarios\/(\d+)$/, ([id], corpo) => {
      const eu = exigir("administrador");
      const u = minhaPessoa(eu, id);
      const [pessoa, v] = lerPessoa(corpo);
      v.conferir();
      if (dados.usuarios.some((x) => x.email === pessoa.email && x.id !== u.id)) throw conflito(EMAIL_REPETIDO, "email");
      const abertas = dados.tarefas.some((t) => t.funcionario_id === u.id && ABERTAS.includes(t.status));
      if (pessoa.funcao !== u.funcao && abertas) {
        throw conflito(`Esta pessoa tem tarefas pendentes de ${NOME_DA_FUNCAO[u.funcao]}. `
          + "Passe as tarefas para outra pessoa antes de mudar a função.", "funcao");
      }
      Object.assign(u, pessoa);
      return pessoaDeHoje(eu, u);
    }],
    ["POST", /^\/api\/funcionarios\/(\d+)\/senha$/, ([id], corpo) => {
      minhaPessoa(exigir("administrador"), id);
      const v = new Validador();
      conferirSenha(v, corpo.senha);
      v.conferir();
      return null; // a demonstração não guarda senha: qualquer uma entra
    }],
    ["POST", /^\/api\/funcionarios\/(\d+)\/desativar$/, ([id]) => {
      const eu = exigir("administrador");
      const u = minhaPessoa(eu, id);
      u.ativo = false;
      const liberadas = dados.tarefas.filter((t) => t.funcionario_id === u.id && t.status === "pendente" && t.agendada_para > agoraTexto());
      for (const t of liberadas) t.funcionario_id = null;
      return {funcionario: pessoaDeHoje(eu, u), tarefas_liberadas: liberadas.length};
    }],
    ["POST", /^\/api\/funcionarios\/(\d+)\/reativar$/, ([id]) => {
      const eu = exigir("administrador");
      const u = minhaPessoa(eu, id);
      u.ativo = true;
      return pessoaDeHoje(eu, u);
    }],

    ["GET", /^\/api\/visao-geral$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const mes = /^\d{4}-\d{2}$/.test(busca.get("mes") ?? "") ? busca.get("mes") : hoje().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = fimDoMes(inicio);
      const meses = mesesAte(mes, 12);
      const reservas = reservasDe(eu).filter((r) => r.data_entrada <= fim && r.data_saida > `${meses[0]}-01`);
      const ativos = imoveisDe(eu).filter((i) => i.ativo);
      const dia = hoje();
      const confirmadas = reservasDe(eu).filter((r) => r.status === "confirmada");
      const porHorario = (horario) => (a, b) => ordem("h", "nome", "id")(
        {h: imovel(a.imovel_id)[horario], nome: imovel(a.imovel_id).nome, id: a.id},
        {h: imovel(b.imovel_id)[horario], nome: imovel(b.imovel_id).nome, id: b.id});
      return {mes, indicadores: resumoDoMes(reservas, ativos, inicio, fim),
        receita_por_mes: meses.map((m) => ({mes: m, receita: reais(soma(reservas, (r) => receitaNoPeriodo(r, `${m}-01`, fimDoMes(`${m}-01`))))})),
        ocupacao_por_imovel: ativos.map((i) => {
          const n = soma(reservas.filter((r) => r.imovel_id === i.id && r.status === "confirmada"), (r) => noitesNoPeriodo(r, inicio, fim));
          return {imovel: imovelResumo(i), percentual: percentual(n, +fim.slice(8, 10)), noites: n};
        }),
        hoje: {chegadas: confirmadas.filter((r) => r.data_entrada === dia).sort(porHorario("horario_entrada")).map(reservaJson),
          saidas: confirmadas.filter((r) => r.data_saida === dia).sort(porHorario("horario_saida")).map(reservaJson),
          atencao: tarefasDe(eu).filter((t) => ABERTAS.includes(t.status) && (atrasada(t)
            || (t.tipo === "limpeza" && t.funcionario_id === null && t.agendada_para.slice(0, 10) === dia))).map((t) => tarefaJson(t))}};
    }],
    ["GET", /^\/api\/busca$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const termo = (busca.get("q") ?? "").trim();
      if (termo.length < 2) return {imoveis: [], reservas: [], hospedes: []};
      const idImovel = Number(/^imv-?(\d{1,9})$/i.exec(termo)?.[1]);
      const idReserva = Number(/^rsv-?(\d{1,9})$/i.exec(termo)?.[1]);
      const imoveis = imoveisDe(eu).filter((i) => contem(i.nome, termo) || i.id === idImovel).slice(0, 5);
      const reservas = reservasDe(eu).filter((r) => contem(hospede(r.hospede_id).nome, termo) || r.id === idReserva)
        .sort(ordem("-data_entrada", "-id")).slice(0, 5);
      const hospedes = dados.hospedes.filter((h) => h.administrador_id === eu.id && casaHospede(h, termo)).sort(ordem("nome", "id")).slice(0, 5);
      return {imoveis: imoveis.map((i) => ({...imovelResumo(i), bairro: i.bairro, ativo: i.ativo})),
        reservas: reservas.map((r) => ({id: r.id, codigo: codigoReserva(r.id), hospede: {id: r.hospede_id, nome: hospede(r.hospede_id).nome},
          imovel: imovelResumo(imovel(r.imovel_id)), data_entrada: r.data_entrada, data_saida: r.data_saida, status: r.status})),
        hospedes: hospedes.map((h) => ({id: h.id, nome: h.nome, telefone: h.telefone}))};
    }],
    ["GET", /^\/api\/atividade$/, (_, __, busca) => {
      const eu = exigir("administrador");
      const limite = Math.min(Math.max(Number(busca.get("limite")) || 8, 1), 50);
      const minhas = new Set(tarefasDe(eu).map((t) => t.id));
      const linhas = dados.historico.filter((h) => minhas.has(h.tarefa_id)).sort(ordem("-registrado_em", "-id")).slice(0, limite);
      return {atividade: linhas.map((h) => {
        const t = tarefa(h.tarefa_id);
        const i = imovel(t.imovel_id);
        return {id: h.id, registrado_em: curto(h.registrado_em), status_anterior: h.status_anterior, status_novo: h.status_novo,
          observacao: h.observacao, usuario: pessoaResumo(h.usuario_id), tarefa: {id: t.id, titulo: t.titulo}, imovel: {id: i.id, nome: i.nome}};
      })};
    }],
  ];

  /** Responde a um pedido como o Flask: {status, corpo}, com corpo null no 204. Uma recusa no meio de
   * uma escrita desfaz o que ela já tinha mudado, como a transação do banco. */
  function responder(metodo, endereco, corpo = null) {
    const [caminho, consulta = ""] = endereco.split("?");
    const busca = new URLSearchParams(consulta);
    const rota = rotas.find(([m, padrao]) => m === metodo && padrao.test(caminho));
    if (!rota) return {status: 404, corpo: {erro: {mensagem: "Não encontrado.", campos: {}}}};
    const antes = metodo === "GET" ? null : JSON.stringify(dados);
    try {
      const resposta = rota[2](rota[1].exec(caminho).slice(1).map(Number), corpo ?? {}, busca);
      if (resposta === null) return {status: 204, corpo: null};
      return resposta[CRIADO] ? {status: 201, corpo: resposta.corpo} : {status: 200, corpo: resposta};
    } catch (erro) {
      if (!(erro instanceof Recusa)) throw erro;
      if (antes) Object.assign(dados, JSON.parse(antes));
      return {status: erro.status, corpo: {erro: {mensagem: erro.mensagem, campos: erro.campos}}};
    }
  }

  return {responder, dados};
}
