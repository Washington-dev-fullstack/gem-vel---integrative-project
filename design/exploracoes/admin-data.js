/* =============================================================
   Gemóvel · dados de exemplo do protótipo do admin
   O "relógio" é fixo (quinta, 5 nov 2026, 12:20) para a história
   fechar: as reservas de 23/out a 4/dez foram escritas à mão e o
   resto do ano é gerado com semente fixa (sai igual toda vez).
   Painel e agenda leem SÓ daqui, então os números sempre batem.
   Na versão real, este arquivo vira chamadas à API em Python.
   ============================================================= */
(function (root) {
  'use strict';
  const DAY = 864e5;
  const d = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY;
  const TODAY = d('2026-11-05');
  const NOW = TODAY + (12 * 60 + 20) / 1440;
  const START = d('2026-05-01');
  const END = d('2027-05-01');

  // A diária (rate) não está no documento do projeto: é a proposta para calcular receita.
  const PROPS = [
    { id: 'IMV-014', name: 'Loft Pinheiros', area: 'Pinheiros', city: 'São Paulo', rate: 380, stay: 3.6, kind: 'city' },
    { id: 'IMV-045', name: 'Cobertura Moema', area: 'Moema', city: 'São Paulo', rate: 620, stay: 3.4, kind: 'city' },
    { id: 'IMV-031', name: 'Casa Lapa', area: 'Lapa', city: 'São Paulo', rate: 340, stay: 3.8, kind: 'city' },
    { id: 'IMV-022', name: 'Studio Vila Madalena', area: 'Vila Madalena', city: 'São Paulo', rate: 260, stay: 3.2, kind: 'city' },
    { id: 'IMV-019', name: 'Loft Vila Mariana', area: 'Vila Mariana', city: 'São Paulo', rate: 300, stay: 4, kind: 'city' },
    { id: 'IMV-008', name: 'Apto Jardins', area: 'Jardins', city: 'São Paulo', rate: 450, stay: 3.8, kind: 'city' },
    { id: 'IMV-051', name: 'Casa da Praia', area: 'Ubatuba', city: 'Ubatuba', rate: 520, stay: 4.6, kind: 'beach' },
    { id: 'IMV-063', name: 'Chalé da Serra', area: 'Campos do Jordão', city: 'Campos do Jordão', rate: 480, stay: 2.8, kind: 'mountain' },
  ];

  const STAFF = [
    { name: 'Cida Ramos', role: 'Limpeza' },
    { name: 'Júlia Lima', role: 'Limpeza' },
    { name: 'Marcos Teixeira', role: 'Limpeza' },
    { name: 'Rafael Souza', role: 'Manutenção' },
  ];

  /* ---------- Reservas escritas à mão (a semana da história) ----------
     clean = a limpeza da SAÍDA dessa reserva (a "virada" para o próximo hóspede). */
  const HAND = [];
  const add = (p, guest, a, b, x) => HAND.push(Object.assign({ p, guest, in: d(a), out: d(b) }, x));
  // 0 · Loft Pinheiros
  add(0, 'Thiago Ribeiro', '2026-10-24', '2026-10-28');
  add(0, 'Helena Duarte', '2026-10-29', '2026-11-05', { clean: { s: 'doing', who: 'Cida Ramos', note: 'Começou 11:00 · termina 15:00' } });
  add(0, 'Mariana Costa', '2026-11-05', '2026-11-08');
  add(0, 'Gabriel Moura', '2026-11-09', '2026-11-13');
  add(0, 'Larissa Campos', '2026-11-14', '2026-11-16');
  add(0, 'André Barros', '2026-11-18', '2026-11-23');
  add(0, 'Fernanda Lima', '2026-11-24', '2026-11-27');
  add(0, 'Igor Santos', '2026-11-28', '2026-12-02');
  // 1 · Cobertura Moema
  add(1, 'Paula Mendes', '2026-10-26', '2026-10-31');
  add(1, 'Ricardo Gomes', '2026-11-01', '2026-11-05', { clean: { s: 'todo', who: 'Cida Ramos', note: 'Começa 15:30' } });
  add(1, 'Pedro Alves', '2026-11-05', '2026-11-07', { arrive: '18:00' });
  add(1, 'Juliana Prado', '2026-11-08', '2026-11-12');
  add(1, 'Bruno Teixeira', '2026-11-13', '2026-11-15');
  add(1, 'Sofia Andrade', '2026-11-15', '2026-11-19');
  add(1, 'Natália Freitas', '2026-11-20', '2026-11-24');
  add(1, 'Caio Moreira', '2026-11-26', '2026-11-29');
  add(1, 'Diego Ferreira', '2026-11-29', '2026-12-03');
  // 2 · Casa Lapa
  add(2, 'Vinícius Rocha', '2026-10-27', '2026-11-02');
  add(2, 'Aline Souza', '2026-11-03', '2026-11-05', { clean: { s: 'done', who: 'Marcos Teixeira', note: 'Concluída 10:40' } });
  add(2, 'Rodrigo Lopes', '2026-11-07', '2026-11-11');
  add(2, 'Patrícia Nogueira', '2026-11-12', '2026-11-14');
  add(2, 'Marcelo Dias', '2026-11-17', '2026-11-22');
  add(2, 'Joana Prates', '2026-11-23', '2026-11-26');
  add(2, 'Clara Batista', '2026-11-27', '2026-11-30');
  // 3 · Studio Vila Madalena
  add(3, 'Leonardo Cruz', '2026-10-25', '2026-10-30');
  add(3, 'Sabrina Melo', '2026-10-31', '2026-11-04', { clean: { s: 'done', who: 'Júlia Lima', note: 'Concluída ontem 14:10' } });
  add(3, 'Lucas Martins', '2026-11-07', '2026-11-10');
  add(3, 'Eduarda Pires', '2026-11-11', '2026-11-16');
  add(3, 'Felipe Costa', '2026-11-19', '2026-11-21');
  add(3, 'Tatiane Reis', '2026-11-23', '2026-11-28');
  add(3, 'Hugo Pacheco', '2026-11-28', '2026-12-01');
  // 4 · Loft Vila Mariana
  add(4, 'Henrique Araújo', '2026-10-28', '2026-11-03');
  add(4, 'Beatriz Nunes', '2026-11-04', '2026-11-09');
  add(4, 'Otávio Lima', '2026-11-12', '2026-11-15');
  add(4, 'Renan Castro', '2026-11-16', '2026-11-19');
  add(4, 'Kátia Moreira', '2026-11-20', '2026-11-24');
  add(4, 'Mirela Santos', '2026-11-25', '2026-11-30');
  // 5 · Apto Jardins
  add(5, 'Daniel Vieira', '2026-10-30', '2026-11-04', { clean: { s: 'todo', who: null, at: d('2026-11-06') + 10 / 24, note: 'Amanhã 10:00 · sem responsável' } });
  add(5, 'Camila Rocha', '2026-11-06', '2026-11-10');
  add(5, 'Vitória Alves', '2026-11-11', '2026-11-13');
  add(5, 'Família Oliveira', '2026-11-14', '2026-11-21');
  add(5, 'Gustavo Neri', '2026-11-23', '2026-11-26');
  add(5, 'Lívia Rangel', '2026-11-27', '2026-12-01');
  // 6 · Casa da Praia
  add(6, 'Família Souza', '2026-10-23', '2026-10-30');
  add(6, 'Família Carvalho', '2026-10-31', '2026-11-05', { clean: { s: 'done', who: 'Júlia Lima', note: 'Concluída 12:05' } });
  add(6, 'Família Tanaka', '2026-11-05', '2026-11-10');
  add(6, 'Ana Beatriz Lima', '2026-11-10', '2026-11-13');
  add(6, 'Marina Reis', '2026-11-13', '2026-11-17');
  add(6, 'Grupo Andrade', '2026-11-19', '2026-11-22');
  add(6, 'Família Duarte', '2026-11-22', '2026-11-26');
  add(6, 'Família Pacheco', '2026-11-27', '2026-12-04');
  // 7 · Chalé da Serra
  add(7, 'Sérgio Ramos', '2026-10-30', '2026-11-02');
  add(7, 'Débora Lins', '2026-11-06', '2026-11-08');
  add(7, 'Bloqueio', '2026-11-09', '2026-11-12', { block: 'Manutenção da lareira' });
  add(7, 'Nicolas Prado', '2026-11-13', '2026-11-15');
  add(7, 'Paulo Henrique', '2026-11-16', '2026-11-19');
  add(7, 'Rebeca Torres', '2026-11-20', '2026-11-23');
  add(7, 'Murilo Bastos', '2026-11-28', '2026-11-30');

  /* ---------- O resto do ano: gerado com semente fixa ---------- */
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(51120);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const FIRST = ['Ana', 'Bruno', 'Carla', 'Daniela', 'Eduardo', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Karina', 'Leandro', 'Manuela', 'Nelson', 'Olívia', 'Paulo', 'Raquel', 'Samuel', 'Teresa', 'Vítor', 'Yasmin', 'Rafaela', 'Gustavo', 'Letícia', 'Matheus', 'Bianca', 'Caio', 'Lorena', 'Renato', 'Priscila', 'Alice', 'Bernardo', 'Cecília', 'Davi', 'Elisa', 'Fernando', 'Giovana', 'Íris', 'Júlio', 'Laura'];
  const LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Moreira', 'Cardoso', 'Teixeira', 'Correia', 'Mendes', 'Freitas', 'Castro', 'Campos', 'Dias', 'Vieira', 'Monteiro', 'Pinto'];
  // Ocupação típica por mês do calendário (jan … dez) e preço relativo da temporada.
  const OCC = {
    city: [.5, .56, .6, .6, .55, .56, .64, .57, .62, .66, .72, .55],
    beach: [.93, .86, .6, .44, .34, .3, .52, .34, .4, .5, .78, .9],
    mountain: [.4, .34, .4, .5, .62, .84, .95, .7, .5, .44, .52, .62],
  };
  const PRICE = {
    city: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    beach: [1.25, 1.2, 1, 1, .95, .95, 1.1, .95, 1, 1, 1, 1.25],
    mountain: [1, 1, 1, 1, 1.05, 1.25, 1.3, 1.15, 1, 1, 1, 1.1],
  };
  // Quanto antes as pessoas costumam reservar (dias): o futuro só tem o que já foi confirmado.
  const LEAD = { city: 35, beach: 120, mountain: 70 };
  const monthOf = (t) => new Date(t * DAY).getUTCMonth();

  function occAt(p, t) {
    const k = PROPS[p].kind;
    let o = OCC[k][monthOf(t)];
    if (t >= TODAY) o *= Math.min(1, Math.exp(-(t - TODAY - 10) / LEAD[k]));
    return Math.min(.97, Math.max(.012, o));
  }
  function guestName(p) {
    return PROPS[p].kind !== 'city' && rand() < .45 ? `Família ${pick(LAST)}` : `${pick(FIRST)} ${pick(LAST)}`;
  }
  function fill(p, from, to, list) {
    const P = PROPS[p];
    let t = from;
    for (;;) {
      const o = occAt(p, t);
      const len = Math.max(P.kind === 'beach' ? 2 : 1, Math.round(P.stay + (rand() - .5) * 3));
      t += Math.round(-Math.log(1 - rand()) * P.stay * (1 - o) / o);
      if (t + len > to) break;
      list.push({ p, guest: guestName(p), in: t, out: t + len, gen: true });
      t += len;
    }
  }
  const GEN = [];
  PROPS.forEach((P, p) => {
    const mine = HAND.filter((r) => r.p === p);
    fill(p, START, Math.min(...mine.map((r) => r.in)), GEN);
    fill(p, Math.max(...mine.map((r) => r.out)), END, GEN);
  });

  const phone = () => `(11) 9${String(1000 + Math.floor(rand() * 9000))}-${String(Math.floor(rand() * 10000)).padStart(4, '0')}`;
  const RES = [...GEN, ...HAND].sort((a, b) => a.p - b.p || a.in - b.in);
  RES.forEach((r, i) => {
    r.id = `RSV-${String(1001 + i)}`;
    if (r.block) return;
    const P = PROPS[r.p], n = r.out - r.in;
    r.value = r.gen ? Math.round(n * P.rate * PRICE[P.kind][monthOf(r.in)] / 10) * 10 : n * P.rate;
    r.arrive = r.arrive || '15:00';
    r.phone = phone();
  });

  // Tarefas avulsas de hoje (as limpezas de virada vêm das próprias reservas).
  const TASKS = [
    { p: 3, kind: 'Manutenção', title: 'Trocar a torneira do banheiro', who: 'Rafael Souza', at: TODAY + 12 / 24, s: 'late', note: 'Era 12:00 · 20 min de atraso, a caminho' },
  ];

  root.GEMDATA = { DAY, d, TODAY, NOW, START, END, PROPS, STAFF, RES, TASKS };
})(typeof window !== 'undefined' ? window : globalThis);
