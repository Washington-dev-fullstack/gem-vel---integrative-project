/* =============================================================
   Gemóvel · painel do admin (direção Lapidado)
   PROTÓTIPO DESCARTÁVEL. Lê os dados de exemplo de admin-data.js
   e não tem back-end. Funcionam: Visão geral e Agenda.
   ============================================================= */
(() => {
  'use strict';
  const D = window.GEMDATA;
  if (!D) return;
  const { DAY, TODAY, NOW, PROPS, RES, TASKS } = D;
  const G = window.gsap;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = Boolean(G) && !reduce;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- Construção de elementos ----------
     Nomes de hóspedes e imóveis entram sempre como TEXTO.
     Só os ícones fixos deste arquivo passam por innerHTML. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  function sv(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
  }
  const tpl = document.createElement('template');
  const fromHtml = (html) => { tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };

  /* ---------- Datas e números (pt-BR) ---------- */
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MOL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const dateOf = (n) => new Date(Math.floor(n) * DAY);
  const dow = (n) => dateOf(n).getUTCDay();
  const dom = (n) => dateOf(n).getUTCDate();
  const mon = (n) => dateOf(n).getUTCMonth();
  const yr = (n) => dateOf(n).getUTCFullYear();
  const dayShort = (n) => `${dom(n)} ${MO[mon(n)]}`;              // 5 nov
  const dayFull = (n) => `${WD[dow(n)]}, ${dom(n)} ${MO[mon(n)]}`; // qui, 5 nov
  const iso = (n) => dateOf(n).toISOString().slice(0, 10);
  const fromIso = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? D.d(s) : NaN);
  const monthStart = (n) => Date.UTC(yr(n), mon(n), 1) / DAY;
  const monthDays = (n) => Date.UTC(yr(n), mon(n) + 1, 1) / DAY - monthStart(n);
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const N1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const money = (v) => BRL.format(Math.round(v));
  const moneyK = (v) => (Math.abs(v) >= 1000 ? `R$ ${N1.format(v / 1000)} mil` : money(v));
  const pct = (v) => `${Math.round(v * 100)}%`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const nights = (n) => plural(n, 'noite', 'noites');
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const CI = 15 / 24, CO = 11 / 24; // entrada 15:00 · saída 11:00

  /* ---------- Status como lapidação (mesma linguagem da exploração) ----------
     pendente = pedra bruta · em andamento = lapidando · concluída = lapidada ·
     atrasada = pedra bruta com alerta. Forma + cor, nunca só cor. */
  const ROUGH = 'M7.2 6.2C9.3 4.4 14.1 3.9 16.6 5.4C19.2 6.9 20.6 10 19.2 13.4C17.8 16.9 14.3 19.6 11.2 19.2C7.7 18.7 4.6 15.8 4.5 12.2C4.4 9.7 5.6 7.6 7.2 6.2Z';
  const CUT = 'M7 4H17L21 9.5L12 20.5L3 9.5Z';
  const CROWN = 'M3 9.5H21M7 4L9.5 9.5L12 4L14.5 9.5L17 4';
  const PAVILION = 'M9.5 9.5L12 20.5L14.5 9.5';
  const GEM_SVG = {
    todo: `<path d="${ROUGH}"/>`,
    doing: `<path d="${CUT}"/><path d="${CROWN}"/>`,
    done: `<path class="fill" d="${CUT}"/><path d="${CROWN} ${PAVILION}"/>`,
    late: `<path d="${ROUGH}"/><path d="M12 8.6v3.6"/><circle class="dot" cx="12" cy="15.1" r="1.1"/>`,
  };
  const iconEl = (s) => fromHtml(`<svg class="gem-ico" viewBox="0 0 24 24" aria-hidden="true">${GEM_SVG[s]}</svg>`);
  const STATUS = { todo: 'Pendente', doing: 'Em andamento', done: 'Concluída', late: 'Atrasada' };
  const READY = { todo: 'Pendente', doing: 'Limpando', done: 'Pronto', late: 'Atrasada' };
  const STAY = { past: 'Finalizada', stay: 'Em curso', future: 'Confirmada', block: 'Bloqueio' };
  const turnStatus = (r) => (r.clean ? r.clean.s : r.out < TODAY ? 'done' : 'todo');
  const stayState = (r) => (r.block ? 'block' : r.out + CO <= NOW ? 'past' : r.in + CI <= NOW ? 'stay' : 'future');
  const shortName = (g) => (/^(Família|Grupo) /.test(g) ? g.split(' ').slice(1).join(' ') : g.split(' ')[0]);

  /* ---------- Contas do mês (tudo sai das reservas) ---------- */
  const MONTHS = Array.from({ length: 12 }, (_, i) => {
    const m = (4 + i) % 12, y = 2026 + Math.floor((4 + i) / 12);
    const start = Date.UTC(y, m, 1) / DAY, end = Date.UTC(y, m + 1, 1) / DAY;
    return { i, m, y, start, end, phase: end <= TODAY ? 'past' : start <= TODAY ? 'now' : 'future' };
  });
  const CUR = MONTHS.findIndex((M) => M.phase === 'now');
  const cache = new Map();
  function perProp(mi) {
    if (cache.has(mi)) return cache.get(mi);
    const M = MONTHS[mi];
    const per = PROPS.map(() => ({ nights: 0, avail: M.end - M.start, rev: 0, real: 0, checkins: 0, stayN: 0 }));
    for (const r of RES) {
      const P = per[r.p], a = Math.max(r.in, M.start), b = Math.min(r.out, M.end);
      if (r.block) { if (b > a) P.avail -= b - a; continue; }   // bloqueio sai da conta de disponíveis
      if (r.in >= M.start && r.in < M.end) { P.checkins++; P.stayN += r.out - r.in; }
      if (b <= a) continue;
      const perNight = r.value / (r.out - r.in);                  // receita reconhecida por noite
      P.nights += b - a;
      P.rev += (b - a) * perNight;
      P.real += Math.max(0, Math.min(b, TODAY) - a) * perNight;   // noites que já aconteceram
    }
    cache.set(mi, per);
    return per;
  }
  function total(mi, prop) {
    const per = perProp(mi), list = prop === 'all' ? per : [per[prop]];
    const t = { nights: 0, avail: 0, rev: 0, real: 0, checkins: 0, stayN: 0 };
    for (const P of list) for (const k in t) t[k] += P[k];
    t.proj = t.rev - t.real;
    t.occ = t.avail ? t.nights / t.avail : 0;
    t.adr = t.nights ? t.rev / t.nights : 0;
    t.avg = t.checkins ? t.stayN / t.checkins : 0;
    return t;
  }

  /* ---------- Dica flutuante, aviso e leitor de tela ---------- */
  const tipEl = $('#tip'), toastEl = $('#toast'), liveEl = $('#live');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  let drag = null, ghost = null, toastTimer = 0;
  function showTip(anchor, data) {
    tipEl.replaceChildren(
      h('div', { class: 'tip__title' }, data.title),
      h('div', { class: 'tip__value' }, data.value),
      ...(data.rows || []).filter((row) => row[1]).map(([color, label, value]) => h('div', { class: 'tip__row' },
        h('i', color ? { style: `--c:${color}` } : { class: 'is-blank' }),
        h('span', null, label),
        value != null ? h('b', null, value) : null)),
    );
    tipEl.hidden = false;
    const r = anchor.getBoundingClientRect(), w = tipEl.offsetWidth, ht = tipEl.offsetHeight;
    let top = r.top - ht - 10;
    if (top < 8) top = r.bottom + 10;
    tipEl.style.left = `${Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))}px`;
    tipEl.style.top = `${top}px`;
  }
  const hideTip = () => { tipEl.hidden = true; };
  function bindTip(el, get, anchor) {
    const show = () => { if (!drag) showTip(anchor ? anchor() : el, get()); };
    el.addEventListener('pointerenter', show);
    el.addEventListener('focus', show);
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('blur', hideTip);
  }
  function say(msg) { liveEl.textContent = ''; setTimeout(() => { liveEl.textContent = msg; }, 60); }
  /* Aviso com ação (Desfazer): fica 10 s, pausa sob o mouse/foco e responde a Ctrl/⌘ Z. */
  let toastAction = null;
  const armToast = (ms) => { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, ms || (toastAction ? 10000 : 4200)); };
  function runToast() { const a = toastAction; hideToast(); if (a) a.run(); }
  function toast(msg, action) {
    if (G) G.killTweensOf(toastEl);
    toastAction = action || null;
    toastEl.replaceChildren(h('span', null, msg));
    if (action) toastEl.append(h('button', { type: 'button', onclick: runToast }, action.label, h('kbd', { 'aria-hidden': 'true' }, isMac ? '⌘Z' : 'Ctrl Z')));
    toastEl.hidden = false;
    if (anim) G.fromTo(toastEl, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power3.out' });
    say(action ? `${msg} Para desfazer, use ${isMac ? 'Command' : 'Control'} Z.` : msg);
    armToast();
  }
  toastEl.addEventListener('pointerenter', () => clearTimeout(toastTimer));
  toastEl.addEventListener('focusin', () => clearTimeout(toastTimer));
  toastEl.addEventListener('pointerleave', () => { if (!toastEl.hidden && !toastEl.contains(document.activeElement)) armToast(4000); });
  toastEl.addEventListener('focusout', (e) => { if (!toastEl.hidden && !toastEl.contains(e.relatedTarget)) armToast(4000); });
  function hideToast() {
    clearTimeout(toastTimer);
    toastAction = null;
    if (toastEl.hidden) return;
    if (anim) G.to(toastEl, { y: 12, opacity: 0, duration: .22, ease: 'power2.in', onComplete: () => { toastEl.hidden = true; } });
    else toastEl.hidden = true;
  }

  /* ---------- Fundo: obsidiana + cáusticas, desenhado UMA vez ----------
     Nada roda em loop: o leve movimento é uma animação CSS só de transform. */
  function drawBg() {
    const c = $('#bg'), dpr = Math.min(devicePixelRatio || 1, 1.5);
    const W = innerWidth, H = innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d'), cw = c.width, ch = c.height, big = Math.max(cw, ch);
    g.fillStyle = '#08080c'; g.fillRect(0, 0, cw, ch);
    const glow = (x, y, r, col) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(8,8,12,0)');
      g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    };
    glow(cw * .2, ch * .02, big * .55, 'rgba(112,88,255,.17)');
    glow(cw * .97, ch * .96, big * .5, 'rgba(40,190,255,.075)');
    glow(cw * .64, ch * .1, big * .3, 'rgba(255,120,210,.05)');
    // Cáusticas: linhas finas onde duas ondas se anulam, em baixa resolução e ampliadas.
    const w = 320, hh = Math.max(1, Math.round(w * H / W));
    const off = document.createElement('canvas'); off.width = w; off.height = hh;
    const og = off.getContext('2d'), img = og.createImageData(w, hh), px = img.data;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const u = (x / w) * 7.5, v = (y / w) * 7.5;
        const a = Math.sin(u * 1.7 + Math.sin(v * 1.3 + u * .45) * 1.9);
        const b = Math.sin(v * 1.9 + Math.sin(u * 1.15 - v * .35) * 1.7);
        const line = Math.pow(Math.max(0, 1 - Math.abs(a + b) * .5), 10);
        const mask = Math.max(0, 1 - Math.hypot((x / w - .3) * 1.1, (y / hh) * .8) / .85);
        const o = (y * w + x) * 4;
        px[o] = 196; px[o + 1] = 204; px[o + 2] = 255; px[o + 3] = line * mask * 255;
      }
    }
    og.putImageData(img, 0, 0);
    g.globalAlpha = .26; g.imageSmoothingQuality = 'high';
    g.drawImage(off, 0, 0, cw, ch);
    g.globalAlpha = 1;
  }

  /* ---------- Vidro líquido: refração real (Chromium) ----------
     Igual ao das explorações (shared.js): um mapa de deslocamento empurra o
     fundo para dentro perto da borda. Fora do Chromium, fica o vidro fosco. */
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  const canRefract = brands.some((b) => /chrom/i.test(b.brand)) && CSS.supports('backdrop-filter', 'url(#a)');
  let lensCount = 0;
  function sdRoundRect(x, y, hw, hh, r) {
    const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }
  function lensMap(w, hgt, r, bezel) {
    const s = Math.min(1, 240 / Math.max(w, hgt));
    const W = Math.max(8, Math.round(w * s)), H = Math.max(8, Math.round(hgt * s));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
    const hw = w / 2, hh = hgt / 2, e = .75;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = (i + .5) / s - hw, y = (j + .5) / s - hh;
        const depth = -sdRoundRect(x, y, hw, hh, r);
        let dx = 0, dy = 0;
        if (depth > 0 && depth < bezel) {
          const gx = sdRoundRect(x + e, y, hw, hh, r) - sdRoundRect(x - e, y, hw, hh, r);
          const gy = sdRoundRect(x, y + e, hw, hh, r) - sdRoundRect(x, y - e, hw, hh, r);
          const len = Math.hypot(gx, gy) || 1, t = 1 - depth / bezel, k = t * t * (3 - 2 * t);
          dx = (-gx / len) * k; dy = (-gy / len) * k;
        }
        const o = (j * W + i) * 4;
        d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }
  function attachLens(el) {
    const id = `lens-${++lensCount}`;
    const filter = sv('filter', { id, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' });
    const map = sv('feImage', { preserveAspectRatio: 'none', result: 'map' });
    const disp = sv('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G' });
    filter.append(map, disp);
    $('#lens-defs').append(filter);
    let lastW = 0, lastH = 0;
    const update = () => {
      const w = el.offsetWidth, hgt = el.offsetHeight;
      if (!w || !hgt || (w === lastW && hgt === lastH)) return;
      lastW = w; lastH = hgt;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16, Math.min(w, hgt) / 2);
      const bezel = +(el.dataset.bezel || Math.min(30, Math.min(w, hgt) / 2.6));
      map.setAttribute('href', lensMap(w, hgt, r, bezel));
      map.setAttribute('x', 0); map.setAttribute('y', 0);
      map.setAttribute('width', w); map.setAttribute('height', hgt);
      disp.setAttribute('scale', el.dataset.lens || 46);
    };
    update();
    new ResizeObserver(update).observe(el);
    el.style.backdropFilter = `url(#${id}) blur(${el.dataset.blur ?? 12}px) saturate(170%)`;
  }

  /* ---------- Navegação entre telas ---------- */
  let view = 'overview';
  const pill = $('.nav__pill');
  const TITLES = { overview: 'Boa tarde, Renata.', agenda: 'Agenda' };
  function movePill(instant) {
    const btn = $(`.nav__item[data-view="${view}"]`);
    if (!btn || !btn.offsetHeight) return;
    const y = btn.offsetTop;
    if (anim && !instant) G.to(pill, { y, duration: .6, ease: 'expo.out' });
    else pill.style.transform = `translateY(${y}px)`;
  }
  function setView(v, first) {
    view = v;
    for (const s of $$('.view')) s.hidden = s.dataset.view !== v;
    for (const b of $$('.nav__item[data-view]')) {
      if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
    $('#page-title').textContent = TITLES[v];
    document.title = `Gemóvel · ${v === 'agenda' ? 'Agenda' : 'Visão geral'}`;
    try { history.replaceState(null, '', location.pathname + location.search + (v === 'agenda' ? '#agenda' : '')); } catch (_) { /* ok */ }
    movePill(first);
    hideTip();
    if (v === 'overview') {
      if (dashDirty) renderDash(true);
      else if (chartPending) drawChart(true);
      placeAvg();
    } else renderAgenda(true);
    if (anim) {
      const sec = $(`#view-${v}`);
      const items = v === 'overview' ? $$('.hello, .today, .sec-head, .kpi, .charts > .card', sec) : $$('.ag-bar, .ag-card, .ag-foot', sec);
      G.fromTo(items, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .65, ease: 'power3.out', stagger: .045, clearProps: 'transform,opacity' });
    }
  }
  for (const b of $$('.nav__item[data-view]')) b.addEventListener('click', () => { if (b.dataset.view !== view) setView(b.dataset.view); });
  for (const b of $$('[data-soon]')) b.addEventListener('click', () => toast(`A tela de ${b.dataset.soon} vem nas próximas etapas.`));

  /* ---------- Hoje ---------- */
  function prevOf(r) {
    let best = null;
    for (const x of RES) if (x.p === r.p && !x.block && x !== r && x.out <= r.in && (!best || x.out > best.out)) best = x;
    return best;
  }
  const readiness = (r) => { const pv = prevOf(r); return pv ? turnStatus(pv) : 'done'; };
  const ALERTS = [
    { s: 'late', title: 'Manutenção 20 min atrasada', lines: ['Studio Vila Madalena · torneira do banheiro', 'Rafael Souza está a caminho'], action: ['Ver na agenda', () => focusTask()] },
    { s: 'doing', title: 'Janela apertada no Loft Pinheiros', lines: ['A limpeza termina às 15:00, mesma hora em que Mariana Costa chega'] },
    { s: 'todo', title: 'Limpeza de amanhã sem responsável', lines: ['Apto Jardins · Camila Rocha chega às 15:00'], action: ['Atribuir', () => toast('Atribuir tarefas vem na tela de Tarefas.')] },
  ];
  function renderToday() {
    const arrivals = RES.filter((r) => !r.block && r.in === TODAY).sort((a, b) => a.arrive.localeCompare(b.arrive) || a.p - b.p);
    const departures = RES.filter((r) => !r.block && r.out === TODAY);
    const cleanDone = departures.filter((r) => turnStatus(r) === 'done').length;
    const late = TASKS.filter((t) => t.s === 'late');
    const nReady = arrivals.filter((r) => readiness(r) === 'done').length, nPrep = arrivals.length - nReady;
    const B = (t) => h('b', null, t);
    const hello = ['Hoje tem ', B(plural(arrivals.length, 'chegada', 'chegadas')), ' e ', B(plural(departures.length, 'saída', 'saídas')), '. '];
    if (arrivals.length && !nPrep) hello.push('Todos os imóveis das chegadas já estão prontos. ');
    else if (arrivals.length) {
      hello.push(B(plural(nReady, 'imóvel', 'imóveis')), nReady === 1 ? ' já está pronto e ' : ' já estão prontos e ',
        B(String(nPrep)), nPrep === 1 ? ' ainda está em preparação. ' : ' ainda estão em preparação. ');
    }
    if (late.length) hello.push('Uma manutenção está ', B('20 min atrasada'), '.');
    $('#hello').replaceChildren(...hello);

    $('#counts').replaceChildren(
      h('div', null, h('b', null, departures.length), h('span', null, departures.length === 1 ? 'saída' : 'saídas')),
      h('div', null, h('b', null, arrivals.length), h('span', null, arrivals.length === 1 ? 'chegada' : 'chegadas')),
      h('div', null, h('b', null, departures.length), h('span', null, `limpezas · ${plural(cleanDone, 'feita', 'feitas')}`)),
      h('div', { class: 'is-late' }, h('b', null, late.length), h('span', null, iconEl('late'), late.length === 1 ? 'atrasada' : 'atrasadas')),
    );
    $('#arrivals').replaceChildren(...(arrivals.length ? arrivals.map((r) => {
      const s = readiness(r);
      return h('li', null,
        h('time', null, r.arrive),
        h('div', null, h('b', null, r.guest), h('small', null, `${PROPS[r.p].name} · ${nights(r.out - r.in)}`)),
        h('span', { class: `chip is-${s}` }, iconEl(s), READY[s]));
    }) : [h('li', null, h('small', null, 'Nenhuma chegada hoje.'))]));
    $('#alerts').replaceChildren(...ALERTS.map((a) => h('li', { class: `is-${a.s}` },
      iconEl(a.s), h('b', null, a.title), ...a.lines.map((l) => h('p', null, l)),
      a.action ? h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: a.action[1] }, a.action[0]) : null)));
  }

  /* ---------- Visão geral: KPIs + gráficos ---------- */
  const dash = { mi: CUR, prop: 'all' };
  let dashDirty = false, chartPending = false, chartW = 0;

  function countTo(el, to, fmt) {
    if (el._tw) el._tw.kill();
    const from = el._cur ?? 0;
    if (!anim || from === to) { el._cur = to; el.textContent = fmt(to); return; }
    const o = { v: from };
    el._tw = G.to(o, { v: to, duration: .9, ease: 'power3.out', onUpdate: () => { el._cur = o.v; el.textContent = fmt(o.v); } });
  }
  const TRI = {
    up: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5L9 8.5H1Z"/></svg>',
    down: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8.5L1 1.5H9Z"/></svg>',
  };
  function setDelta(el, kind, cur, base, vs, phase) {
    el.classList.remove('is-down');
    if (phase === 'future') return el.replaceChildren('Parcial · só reservas já confirmadas');
    if (base == null) return el.replaceChildren('Sem mês anterior para comparar');
    if (kind === 'pct' && !base) return el.replaceChildren(`Sem base em ${vs}`);
    const v = kind === 'pct' ? Math.round(((cur - base) / base) * 100) : Math.round(cur - base);
    if (!v) return el.replaceChildren(`Igual a ${vs}`);
    const up = v > 0, n = Math.abs(v);
    el.classList.toggle('is-down', !up);
    return el.replaceChildren(
      h('b', null, fromHtml(TRI[up ? 'up' : 'down']), h('span', { class: 'sr' }, up ? 'alta de ' : 'queda de '),
        kind === 'pct' ? `${n}%` : kind === 'pp' ? `${n} p.p.` : String(n)),
      ` vs ${vs}`);
  }
  function tween(el, props, plain) {
    if (anim) G.to(el, { ...props, duration: .9, ease: 'power3.out' });
    else Object.assign(el.style, plain || props);
  }
  function renderKpis() {
    const M = MONTHS[dash.mi], t = total(dash.mi, dash.prop);
    const prev = dash.mi > 0 ? total(dash.mi - 1, dash.prop) : null;
    const vs = dash.mi > 0 ? MOL[MONTHS[dash.mi - 1].m] : '';
    countTo($('#k-rev'), t.rev, money);
    countTo($('#k-occ'), t.occ * 100, (v) => `${Math.round(v)}%`);
    countTo($('#k-res'), t.checkins, (v) => String(Math.round(v)));
    countTo($('#k-adr'), t.adr, money);
    setDelta($('#k-rev-d'), 'pct', t.rev, prev ? prev.rev : null, vs, M.phase);
    setDelta($('#k-occ-d'), 'pp', t.occ * 100, prev ? prev.occ * 100 : null, vs, M.phase);
    setDelta($('#k-res-d'), 'abs', t.checkins, prev ? prev.checkins : null, vs, M.phase);
    setDelta($('#k-adr-d'), 'pct', t.adr, prev ? prev.adr : null, vs, M.phase);
    // Uma barra só, dividida: o que já aconteceu × o que está confirmado.
    const real = $('#k-real'), proj = $('#k-proj');
    real.hidden = !(t.real > 0); proj.hidden = !(t.proj > 0);
    tween(real, { flexGrow: t.real }); tween(proj, { flexGrow: t.proj });
    $('#k-real-li').hidden = M.phase === 'future';
    $('#k-proj-li').hidden = M.phase === 'past';
    $('#k-real-v').textContent = moneyK(t.real);
    $('#k-proj-v').textContent = moneyK(t.proj);
    const meter = $('#k-occ-m');
    meter.setAttribute('aria-valuenow', Math.round(t.occ * 100));
    tween(meter.firstElementChild, { width: `${t.occ * 100}%` });
    $('#k-occ-c').textContent = `${t.nights} de ${t.avail} noites`;
    $('#k-res-c').textContent = t.checkins ? `Entradas no mês · média de ${N1.format(t.avg)} noites` : 'Nenhuma entrada no mês';
    $('#m-label').textContent = `${cap(MOL[M.m])} de ${M.y}`;
    $('#m-prev').disabled = dash.mi === 0;
    $('#m-next').disabled = dash.mi === MONTHS.length - 1;
    $('#m-note').textContent = { past: 'Mês fechado', now: 'Até hoje + reservas confirmadas', future: 'Parcial · só reservas já confirmadas' }[M.phase];
  }

  const niceStep = (max) => {
    const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  };
  const tickFmt = (v) => (v === 0 ? '0' : v >= 1000 ? `${N1.format(v / 1000)} mil` : String(v));
  // Coluna: ponta de dados arredondada (4px), base reta.
  function colPath(x, y, w, hgt, r) {
    r = Math.min(r, w / 2, hgt);
    return r > 0
      ? `M${x},${y + hgt}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + hgt}Z`
      : `M${x},${y + hgt}V${y}H${x + w}V${y + hgt}Z`;
  }
  function renderChart(grow) {
    const box = $('#rev-plot');
    if (box.hidden || box.closest('[hidden]')) return false;
    const W = Math.floor(box.clientWidth - 22);
    if (W < 240) return false;
    chartW = box.clientWidth;
    const H = 252, ml = 44, mr = 4, mt = 30, mb = 42, pw = W - ml - mr, ph = H - mt - mb;
    const data = MONTHS.map((M) => total(M.i, dash.prop));
    const max = Math.max(1, ...data.map((t) => t.rev));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const Y = (v) => mt + ph - (v / top) * ph;
    const band = pw / MONTHS.length, bw = Math.min(24, band * .5);
    const refocus = box.contains(document.activeElement) ? +document.activeElement.dataset.i : -1;
    const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Receita por mês, de maio de 2026 a abril de 2027. Valores completos no botão Tabela.' });
    const sx = ml + band * dash.mi;
    svg.append(sv('rect', { class: 'sel-band', x: sx + 2, y: mt - 24, width: band - 4, height: ph + 24 + mb - 4, rx: 10 }));
    for (let v = step; v <= top + 1e-6; v += step) {
      const yy = Math.round(Y(v)) + .5;
      svg.append(sv('line', { class: 'grid', x1: ml, x2: W - mr, y1: yy, y2: yy }));
    }
    for (let v = 0; v <= top + 1e-6; v += step) svg.append(sv('text', { class: 'tick', x: ml - 10, y: Math.round(Y(v)) + 4, 'text-anchor': 'end' }, tickFmt(v)));
    const cols = data.map((t, i) => {
      const x = ml + band * i + (band - bw) / 2, yb = mt + ph, yr = Y(t.real), yt = Y(t.rev);
      const g = sv('g', { class: 'col' });
      if (t.real > 0) g.append(sv('path', { class: 'real', d: colPath(x, yr, bw, yb - yr, t.proj > 0 ? 0 : 4) }));
      if (t.proj > 0) {
        const y1 = t.real > 0 ? yr - 2 : yb; // 2px de respiro entre as partes da pilha
        if (y1 - yt > .5) g.append(sv('path', { class: 'proj', d: colPath(x, yt, bw, y1 - yt, 4) }));
      }
      svg.append(g);
      return g;
    });
    svg.append(sv('line', { class: 'base', x1: ml, x2: W - mr, y1: mt + ph + .5, y2: mt + ph + .5 }));
    MONTHS.forEach((M, i) => {
      const cx = ml + band * i + band / 2;
      svg.append(sv('text', { class: `xl${i === dash.mi ? ' is-sel' : ''}`, x: cx, y: mt + ph + 18, 'text-anchor': 'middle' }, cap(MO[M.m])));
      if (i === 0 || M.m === 0) svg.append(sv('text', { class: 'yr', x: cx, y: mt + ph + 32, 'text-anchor': 'middle' }, M.y));
      if (M.phase === 'now') svg.append(sv('circle', { class: 'today-dot', cx, cy: mt + ph + 30, r: 2 }));
    });
    const ts = data[dash.mi];
    if (ts.rev > 0) svg.append(sv('text', { class: 'cap', x: sx + band / 2, y: Y(ts.rev) - 9, 'text-anchor': 'middle' }, moneyK(ts.rev)));
    // Áreas de toque: a faixa inteira do mês (bem maior que a coluna).
    MONTHS.forEach((M, i) => {
      const t = data[i], name = `${cap(MOL[M.m])} de ${M.y}`;
      const hit = sv('rect', {
        class: 'hit', x: ml + band * i, y: mt - 24, width: band, height: ph + 24 + mb, tabindex: 0, role: 'button', 'data-i': i,
        'aria-pressed': String(i === dash.mi),
        'aria-label': `${name}: ${money(t.rev)}${t.real > 0 && t.proj > 0 ? `, sendo ${money(t.real)} realizado e ${money(t.proj)} previsto` : ''}`,
      });
      bindTip(hit, () => ({
        title: `${name}${M.phase === 'now' ? ' · mês atual' : ''}`,
        value: money(t.rev),
        rows: [
          t.real > 0 ? ['var(--safira)', 'Realizado', money(t.real)] : [],
          t.proj > 0 ? ['var(--safira-2)', M.phase === 'future' ? 'Previsto (confirmadas)' : 'Previsto', money(t.proj)] : [],
          [null, 'Ocupação', pct(t.occ)],
          [null, 'Reservas', String(t.checkins)],
        ],
      }), () => cols[i].lastElementChild || hit);
      const on = () => cols[i].classList.add('is-hover'), off = () => cols[i].classList.remove('is-hover');
      hit.addEventListener('pointerenter', on); hit.addEventListener('focus', on);
      hit.addEventListener('pointerleave', off); hit.addEventListener('blur', off);
      const pickMonth = () => { if (dash.mi !== i) { dash.mi = i; renderDash(false); } };
      hit.addEventListener('click', pickMonth);
      hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickMonth(); } });
      svg.append(hit);
    });
    box.replaceChildren(svg);
    if (refocus >= 0) $(`.hit[data-i="${refocus}"]`, box)?.focus();
    // A origem vai nos DOIS estados: trocar a origem no meio faz o GSAP compensar com uma translação que sobra.
    if (grow && anim) G.fromTo(cols, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, transformOrigin: '50% 100%', duration: .9, ease: 'power3.out', stagger: .035 });
    return true;
  }
  function drawChart(grow) { chartPending = !renderChart(grow); }

  function table(caption, heads, numFrom, rows) {
    return h('table', { class: 'tbl' }, h('caption', { class: 'sr' }, caption),
      h('thead', null, h('tr', null, ...heads.map((c, i) => h('th', { scope: 'col', class: i >= numFrom ? 'num' : null }, c)))),
      h('tbody', null, ...rows));
  }
  function renderRevTable() {
    $('#rev-table').replaceChildren(table('Receita por mês', ['Mês', 'Realizado', 'Previsto', 'Total', 'Ocupação', 'Reservas'], 1,
      MONTHS.map((M) => {
        const t = total(M.i, dash.prop);
        return h('tr', { class: M.i === dash.mi ? 'is-sel' : null },
          h('th', { scope: 'row' }, h('button', { class: 'linkish', type: 'button', onclick: () => { dash.mi = M.i; renderDash(false); } }, `${cap(MOL[M.m])} ${M.y}`)),
          h('td', { class: 'num' }, t.real > 0 ? money(t.real) : '—'),
          h('td', { class: 'num' }, t.proj > 0 ? money(t.proj) : '—'),
          h('td', { class: 'num' }, money(t.rev)),
          h('td', { class: 'num' }, pct(t.occ)),
          h('td', { class: 'num' }, t.checkins));
      })));
  }
  function renderOcc(grow) {
    const per = perProp(dash.mi), all = total(dash.mi, 'all');
    const focusP = dash.prop === 'all' ? null : dash.prop;
    const rows = per.map((P, p) => ({ p, ...P, occ: P.avail ? P.nights / P.avail : 0 })).sort((a, b) => b.occ - a.occ || a.p - b.p);
    const bars = [];
    $('#occ').replaceChildren(...rows.map((r) => {
      const P = PROPS[r.p];
      // Com um imóvel escolhido, os outros viram contexto (cinza) em vez de sumir.
      const bar = h('i', { class: 'occ__bar', style: `width:${r.occ * 100}%${focusP != null && focusP !== r.p ? ';background:rgba(255,255,255,.17)' : ''}` });
      bars.push(bar);
      const row = h('div', { class: 'occ__row', role: 'listitem', tabindex: 0, 'aria-label': `${P.name}: ${pct(r.occ)} de ocupação, ${r.nights} de ${r.avail} noites, receita de ${money(r.rev)}` },
        h('span', { class: 'occ__name' }, P.name), h('span', { class: 'occ__track' }, bar), h('span', { class: 'occ__val' }, pct(r.occ)));
      bindTip(row, () => ({ title: P.name, value: `${pct(r.occ)} de ocupação`, rows: [[null, 'Noites', `${r.nights} de ${r.avail}`], [null, 'Receita', money(r.rev)], [null, 'Diária média', r.nights ? money(r.rev / r.nights) : '—']] }), () => bar);
      return row;
    }), h('div', { class: 'occ__avg', 'aria-hidden': 'true' }, h('span', null, `média ${pct(all.occ)}`)));
    placeAvg();
    $('#occ-sub').textContent = focusP == null ? `${cap(MOL[MONTHS[dash.mi].m])} · noites ocupadas ÷ noites disponíveis` : `${cap(MOL[MONTHS[dash.mi].m])} · destaque para ${PROPS[focusP].name}`;
    if (grow && anim) G.fromTo(bars, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, transformOrigin: '0% 50%', duration: .8, ease: 'power3.out', stagger: .04 });
    $('#occ-table').replaceChildren(table(`Ocupação por imóvel em ${MOL[MONTHS[dash.mi].m]}`, ['Imóvel', 'Ocupação', 'Noites', 'Receita'], 1,
      rows.map((r) => h('tr', { class: focusP === r.p ? 'is-sel' : null },
        h('th', { scope: 'row' }, PROPS[r.p].name), h('td', { class: 'num' }, pct(r.occ)),
        h('td', { class: 'num' }, `${r.nights} de ${r.avail}`), h('td', { class: 'num' }, money(r.rev))))));
  }
  function placeAvg() {
    const box = $('#occ'), tr = $('.occ__track', box), avg = $('.occ__avg', box);
    if (!tr || !avg || !tr.offsetWidth) return;
    avg.style.left = `${tr.offsetLeft + total(dash.mi, 'all').occ * tr.offsetWidth}px`;
  }
  function renderDash(growChart) {
    dashDirty = false;
    hideTip(); // o elemento sob a dica vai ser trocado

    renderKpis();
    renderRevTable();
    renderOcc(true);
    drawChart(growChart);
  }
  function bindToggle(btn, plot, tbl) {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      $(plot).hidden = on; $(tbl).hidden = !on;
      if (!on) { drawChart(false); placeAvg(); }
    });
  }
  bindToggle($('#rev-toggle'), '#rev-plot', '#rev-table');
  bindToggle($('#occ-toggle'), '#occ', '#occ-table');
  $('#m-prev').addEventListener('click', () => { if (dash.mi > 0) { dash.mi--; renderDash(false); } });
  $('#m-next').addEventListener('click', () => { if (dash.mi < MONTHS.length - 1) { dash.mi++; renderDash(false); } });
  $('#m-prop').addEventListener('change', (e) => { dash.prop = e.target.value === 'all' ? 'all' : +e.target.value; renderDash(true); });

  /* ---------- Agenda: imóveis × dias ---------- */
  const ag = { mode: '2w', start: TODAY - 2, show: 'timeline', q: '' };
  const byId = new Map();
  const agLen = () => (ag.mode === 'month' ? monthDays(ag.start) : 14);
  function agLabel() {
    const a = ag.start, b = a + agLen() - 1;
    if (ag.mode === 'month') return `${cap(MOL[mon(a)])} de ${yr(a)}`;
    return mon(a) === mon(b) ? `${dom(a)} – ${dom(b)} ${MO[mon(b)]} ${yr(b)}` : `${dayShort(a)} – ${dayShort(b)} ${yr(b)}`;
  }
  function renderAgenda(animate) {
    ag.start = Math.max(D.START, Math.min(D.END - agLen(), ag.start));
    const n = agLen(), a = ag.start, b = a + n, month = ag.mode === 'month';
    $('#ag-label').textContent = agLabel();
    $('#ag-prev').disabled = a <= D.START;
    $('#ag-next').disabled = b >= D.END;
    byId.clear();
    for (const r of RES) byId.set(r.id, r);
    const head = h('div', { class: 'ag__days' }), grid = h('div', { class: 'ag__grid', 'aria-hidden': 'true' }), foot = h('div', { class: 'ag__days' });
    for (let k = a; k < b; k++) {
      const cls = `${dow(k) % 6 === 0 ? ' is-weekend' : ''}${k === TODAY ? ' is-today' : ''}`;
      head.append(h('div', { class: `ag__day${cls}` }, month ? WD[dow(k)].charAt(0).toUpperCase() : WD[dow(k)], h('b', null, dom(k))));
      grid.append(h('i', { class: cls.trim() || null }));
      let busy = 0, avail = PROPS.length;
      for (const r of RES) if (r.in <= k && r.out > k) { if (r.block) avail--; else busy++; }
      foot.append(h('div', { class: 'ag__occ', title: `${busy} de ${avail} imóveis ocupados na noite de ${dayFull(k)}` },
        `${busy}/${avail}`, h('span', { class: 'meter' }, h('i', { style: `width:${avail ? (busy / avail) * 100 : 0}%` }))));
    }
    const nowX = (NOW - a) / n, showNow = nowX >= 0 && nowX <= 1;
    if (showNow) head.append(h('span', { class: 'ag__now-label', 'aria-hidden': 'true', style: `left:${nowX * 100}%` }, '12:20'));
    const rows = h('div', { class: 'ag__rows' }, grid);
    PROPS.forEach((P, p) => {
      const lane = h('div', { class: 'ag__lane', 'data-p': p });
      for (const r of RES) if (r.p === p && r.out + CO > a && r.in + CI < b) lane.append(barEl(r, a, n, month));
      for (const t of turnovers(p, a, b)) lane.append(gemEl(t, a, n));
      rows.append(h('div', { class: 'ag__row', role: 'group', 'aria-label': P.name },
        h('div', { class: 'ag__prop' }, h('b', null, P.name), h('small', null, `${P.area} · R$ ${P.rate}/noite`)), lane));
    });
    if (showNow) rows.append(h('div', { class: 'ag__now', 'aria-hidden': 'true', style: `left:calc(var(--left) + (100% - var(--left)) * ${nowX.toFixed(5)})` }));
    const inner = h('div', { class: `ag__inner${month ? ' is-month' : ''}`, style: `--days:${n}` },
      h('div', { class: 'ag__head' }, h('div', { class: 'ag__corner' }, 'Imóveis'), head),
      rows,
      h('div', { class: 'ag__foot' }, h('div', { class: 'ag__corner' }, 'Ocupação'), foot));
    $('#ag').replaceChildren(inner);
    ghost = null;
    applyFilter();
    if (ag.show === 'list') renderList();
    if (animate && anim && ag.show === 'timeline') {
      // Cada reserva entra como um corte de lapidação (o --rv revela a faceta da esquerda para a direita).
      G.fromTo($$('.bar', inner), { '--rv': 0 }, { '--rv': 1, duration: .6, ease: 'power3.out', stagger: .008 });
      G.fromTo($$('.gem', inner), { scale: 0 }, { scale: 1, duration: .45, ease: 'back.out(2.2)', stagger: .012, delay: .25 });
    }
  }
  function barEl(r, a, n, month) {
    const x0 = r.in + CI, x1 = r.out + CO, l = Math.max(x0, a), rr = Math.min(x1, a + n);
    const st = stayState(r), P = PROPS[r.p], len = r.out - r.in;
    const label = r.block ? (month ? 'Bloqueio' : `Bloqueio · ${r.block}`) : month ? shortName(r.guest) : r.guest;
    const tiny = rr - l < (month ? 1.2 : .6);
    const el = h('button', {
      class: `bar bar--${st}${tiny ? ' is-tiny' : ''}`, type: 'button', 'data-id': r.id,
      style: `left:${((l - a) / n) * 100}%;width:${((rr - l) / n) * 100}%;${x0 < a ? '--sl:0px;' : ''}${x1 > a + n ? '--sr:0px;' : ''}`,
      'aria-label': r.block
        ? `Bloqueio em ${P.name}: ${r.block}, de ${dayFull(r.in)} a ${dayFull(r.out)}`
        : `${r.guest}, ${P.name}, de ${dayFull(r.in)} a ${dayFull(r.out)}, ${nights(len)}, ${STAY[st].toLowerCase()}`,
    }, h('span', { class: 'bar__name' }, label));
    bindTip(el, () => (r.block
      ? { title: `${P.name} · bloqueio`, value: r.block, rows: [[null, `${dayShort(r.in)} → ${dayShort(r.out)}`, nights(len)]] }
      : { title: `${P.name} · ${STAY[st]}`, value: r.guest, rows: [[null, `${dayShort(r.in)} → ${dayShort(r.out)}`, nights(len)], [null, 'Valor', money(r.value)]] }));
    el.addEventListener('click', () => openRes(r, el));
    return el;
  }
  // Cada saída gera uma limpeza ("virada"). A gema fica no intervalo entre 11:00 e 15:00.
  function turnovers(p, a, b) {
    const list = [];
    for (const r of RES) {
      if (r.p !== p || r.block) continue;
      const t = r.clean && r.clean.at != null ? r.clean.at : r.out + 13 / 24;
      if (t < TODAY || t < a || t > b) continue;
      list.push({ r, p, t, s: turnStatus(r), kind: 'Limpeza', who: r.clean ? r.clean.who : null, note: r.clean ? r.clean.note : null, soon: !r.clean });
    }
    for (const k of TASKS) if (k.p === p && k.at >= a && k.at <= b) list.push({ task: k, p, t: k.at, s: k.s, kind: k.kind, who: k.who, note: k.note, title: k.title });
    return list;
  }
  function gemEl(g, a, n) {
    const P = PROPS[g.p];
    const el = h('button', {
      class: `gem gem--${g.s}${g.soon ? ' gem--soon' : ''}`, type: 'button', style: `left:${((g.t - a) / n) * 100}%`,
      tabindex: g.soon ? -1 : null, 'data-task': g.task ? '1' : null,
      'aria-label': `${g.kind} ${STATUS[g.s].toLowerCase()} em ${P.name}${g.who ? `, ${g.who}` : ''}${g.note ? `. ${g.note}` : ''}`,
    }, iconEl(g.s));
    bindTip(el, () => ({
      title: `${g.kind} · ${STATUS[g.s]}`,
      value: g.title || P.name,
      rows: [g.title ? [null, P.name] : [], [null, g.who || 'Sem responsável ainda'], [null, g.note || (g.r ? `${cap(dayFull(g.r.out))}, depois das 11:00` : '')]],
    }));
    el.addEventListener('click', () => (g.r ? openRes(g.r, el) : toast('O detalhe da tarefa vem na tela de Tarefas.')));
    return el;
  }
  function renderList() {
    const a = ag.start, b = a + agLen();
    const rows = RES.filter((r) => r.out > a && r.in < b && matches(r)).sort((x, y) => x.in - y.in || x.p - y.p);
    $('#ag-list').replaceChildren(table(`Reservas de ${agLabel()}`, ['Hóspede', 'Imóvel', 'Entrada', 'Saída', 'Noites', 'Valor', 'Situação', 'Limpeza da saída'], 99,
      rows.length ? rows.map((r) => {
        const st = stayState(r), ts = turnStatus(r);
        return h('tr', { class: st === 'past' ? 'is-past' : null },
          h('th', { scope: 'row' }, h('button', { class: 'linkish', type: 'button', onclick: (e) => openRes(r, e.currentTarget) }, r.block ? `Bloqueio · ${r.block}` : r.guest)),
          h('td', null, PROPS[r.p].name), h('td', null, dayFull(r.in)), h('td', null, dayFull(r.out)),
          h('td', { class: 'num' }, r.out - r.in), h('td', { class: 'num' }, r.block ? '—' : money(r.value)),
          h('td', null, STAY[st]),
          h('td', null, r.block ? '—' : h('span', { class: `chip is-${ts}` }, iconEl(ts), STATUS[ts])));
      }) : [h('tr', null, h('td', { colspan: 8 }, 'Nenhuma reserva encontrada neste período.'))]));
    for (const th of $$('#ag-list thead th')) if (th.textContent === 'Noites' || th.textContent === 'Valor') th.classList.add('num');
  }

  /* Arrastar numa linha vazia = rascunho de reserva (com checagem de conflito ao vivo). */
  const agEl = $('#ag');
  agEl.addEventListener('scroll', () => agEl.classList.toggle('is-scrolled', agEl.scrollLeft > 0), { passive: true });
  function conflictOf(p, i, o) { return RES.find((r) => r.p === p && r.in < o && r.out > i) || null; }
  function problemOf(p, i, o) {
    if (i < TODAY) return 'A entrada não pode ser antes de hoje.';
    const c = conflictOf(p, i, o);
    if (!c) return null;
    return c.block ? `${PROPS[p].name} está bloqueado de ${dayShort(c.in)} a ${dayShort(c.out)}.` : `Conflito com a reserva de ${c.guest} (${dayShort(c.in)} – ${dayShort(c.out)}).`;
  }
  function placeGhost(p, i, o) {
    const lane = $(`.ag__lane[data-p="${p}"]`, agEl), n = agLen(), a = ag.start;
    const x0 = Math.max(i + CI, a), x1 = Math.min(o + CO, a + n);
    if (!lane || !(o > i) || !(x1 > x0)) { clearGhost(); return; }
    if (!ghost) ghost = h('div', { class: 'ghost', 'aria-hidden': 'true' });
    if (ghost.parentNode !== lane) lane.append(ghost);
    ghost.style.left = `${((x0 - a) / n) * 100}%`;
    ghost.style.width = `${((x1 - x0) / n) * 100}%`;
    const c = conflictOf(p, i, o);
    const bad = i < TODAY ? 'Antes de hoje' : c ? (c.block ? 'Bloqueado' : `Conflito com ${c.guest}`) : null;
    ghost.classList.toggle('is-bad', Boolean(bad));
    ghost.textContent = bad || `${nights(o - i)} · ${money((o - i) * PROPS[p].rate)}`;
  }
  function clearGhost() { if (ghost) ghost.remove(); ghost = null; }
  agEl.addEventListener('pointerdown', (e) => {
    const lane = e.target.closest('.ag__lane');
    if (!lane || e.button !== 0 || e.target.closest('.bar, .gem')) return;
    const rect = lane.getBoundingClientRect(), n = agLen();
    const dayAt = (x) => ag.start + Math.max(0, Math.min(n - 1, Math.floor(((x - rect.left) / rect.width) * n)));
    const k = dayAt(e.clientX);
    drag = { p: +lane.dataset.p, lane, dayAt, k0: k, k1: k, id: e.pointerId };
    lane.setPointerCapture(e.pointerId);
    hideTip();
    placeGhost(drag.p, k, k + 1);
    e.preventDefault();
  });
  agEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const k = drag.dayAt(e.clientX);
    if (k !== drag.k1) { drag.k1 = k; placeGhost(drag.p, Math.min(drag.k0, k), Math.max(drag.k0, k) + 1); }
  });
  agEl.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const i = Math.min(drag.k0, drag.k1), o = Math.max(drag.k0, drag.k1) + 1, { p, lane } = drag;
    drag = null;
    const bad = problemOf(p, i, o);
    if (!bad) { openNew({ p, in: i, out: o }, lane); return; }
    toast(bad);
    if (anim && ghost) G.fromTo(ghost, { x: -5 }, { x: 0, duration: .5, ease: 'elastic.out(1, .3)' });
    const gh = ghost;
    setTimeout(() => { if (ghost === gh) clearGhost(); }, 650);
  });
  agEl.addEventListener('pointercancel', () => { drag = null; clearGhost(); });

  function setSeg(group, v) {
    for (const b of $$('[role="radio"]', group)) {
      const on = b.dataset.v === v;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  }
  function bindSeg(group, onPick) {
    const pick = (b) => { if (b.getAttribute('aria-checked') === 'true') return; setSeg(group, b.dataset.v); onPick(b.dataset.v); };
    group.addEventListener('click', (e) => { const b = e.target.closest('[role="radio"]'); if (b) pick(b); });
    group.addEventListener('keydown', (e) => {
      const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const bs = $$('[role="radio"]', group), i = bs.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const nb = bs[(i + dir + bs.length) % bs.length];
      nb.focus(); pick(nb);
    });
  }
  bindSeg($('#ag-mode'), (v) => {
    const showsToday = TODAY >= ag.start && TODAY < ag.start + agLen();
    ag.mode = v;
    ag.start = v === 'month' ? monthStart(showsToday ? TODAY : ag.start + 7) : showsToday ? TODAY - 2 : ag.start;
    renderAgenda(true);
  });
  function showAs(v) {
    ag.show = v;
    setSeg($('#ag-show'), v);
    $('#ag').hidden = v !== 'timeline';
    $('#ag-list').hidden = v !== 'list';
    if (v === 'list') { clearGhost(); renderList(); } else renderAgenda(true);
  }
  bindSeg($('#ag-show'), showAs);
  $('#ag-today').addEventListener('click', () => { ag.start = ag.mode === 'month' ? monthStart(TODAY) : TODAY - 2; renderAgenda(true); });
  function shift(dir) {
    if (ag.mode === 'month') ag.start = dir < 0 ? monthStart(ag.start - 1) : ag.start + monthDays(ag.start);
    else ag.start += dir * 7;
    renderAgenda(true);
  }
  $('#ag-prev').addEventListener('click', () => shift(-1));
  $('#ag-next').addEventListener('click', () => shift(1));
  function focusTask() {
    if (TODAY < ag.start || TODAY >= ag.start + agLen()) ag.start = ag.mode === 'month' ? monthStart(TODAY) : TODAY - 2;
    if (ag.show !== 'timeline') { ag.show = 'timeline'; setSeg($('#ag-show'), 'timeline'); $('#ag').hidden = false; $('#ag-list').hidden = true; }
    setView('agenda');
    $('#ag .gem[data-task]')?.focus();
  }

  /* Busca: apaga o que não combina; Enter leva à agenda e acha a reserva. */
  const qEl = $('#q');
  const matches = (r) => !ag.q || norm(`${r.guest} ${PROPS[r.p].name} ${PROPS[r.p].area} ${r.id}`).includes(ag.q);
  function applyFilter() {
    for (const b of $$('.bar', agEl)) b.classList.toggle('is-dim', !matches(byId.get(b.dataset.id)));
    for (const g of $$('.gem', agEl)) g.classList.toggle('is-dim', Boolean(ag.q));
  }
  function setQuery(v) { ag.q = norm(v.trim()); applyFilter(); if (ag.show === 'list') renderList(); }
  qEl.addEventListener('input', () => setQuery(qEl.value));
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qEl.value) { e.stopPropagation(); qEl.value = ''; setQuery(''); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (view !== 'agenda') setView('agenda');
    if (!ag.q) return;
    const hits = RES.filter((r) => !r.block && matches(r));
    if (!hits.length) { toast(`Nada encontrado para “${qEl.value.trim()}”.`); return; }
    const a = ag.start, b = a + agLen();
    if (!hits.some((r) => r.out > a && r.in < b)) {
      const next = hits.filter((r) => r.out > TODAY).sort((x, y) => x.in - y.in)[0] || hits[hits.length - 1];
      ag.start = ag.mode === 'month' ? monthStart(next.in) : next.in - 2;
      renderAgenda(true);
    }
    const n = $$('.bar:not(.is-dim)', agEl).length;
    say(`${plural(n, 'reserva encontrada', 'reservas encontradas')} em ${agLabel()}.`);
  });
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
    if (mod && key === 'k') { e.preventDefault(); qEl.focus(); qEl.select(); }
    else if (mod && key === 'z' && !e.shiftKey && toastAction && drawer.hidden && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); runToast(); }
    else if (e.key === 'Escape') { hideTip(); if (!drawer.hidden) closeDrawer(); }
  });

  /* ---------- Gaveta: detalhe da reserva e nova reserva ---------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  let lastFocus = null, onDrawerClose = null, seq = 0;
  const closeBtn = () => h('button', { class: 'drawer__close', type: 'button', 'aria-label': 'Fechar', onclick: () => closeDrawer(), html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
  function openDrawer(content, opts = {}) {
    if (!drawer.hidden) closeDrawer(true);
    lastFocus = opts.trigger || document.activeElement;
    onDrawerClose = opts.onClose || null;
    drawer.replaceChildren(content);
    drawer.hidden = false; scrim.hidden = false;
    hideTip();
    if (anim) {
      G.killTweensOf([drawer, scrim]);
      G.fromTo(drawer, { x: 48, opacity: 0 }, { x: 0, opacity: 1, duration: .55, ease: 'expo.out' });
      G.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: .3 });
    }
    ((opts.focus && $(opts.focus, drawer)) || $('.drawer__close', drawer)).focus();
  }
  function closeDrawer(instant) {
    if (drawer.hidden) return;
    const cb = onDrawerClose; onDrawerClose = null;
    if (cb) cb();
    const done = () => { drawer.hidden = true; scrim.hidden = true; drawer.replaceChildren(); if (G) G.set(drawer, { clearProps: 'transform,opacity' }); };
    if (anim && !instant) {
      G.killTweensOf([drawer, scrim]);
      G.to(drawer, { x: 36, opacity: 0, duration: .26, ease: 'power2.in', onComplete: done });
      G.to(scrim, { opacity: 0, duration: .26 });
    } else done();
    if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }
  scrim.addEventListener('click', () => closeDrawer());
  drawer.addEventListener('keydown', (e) => { // o foco não escapa da gaveta
    if (e.key !== 'Tab') return;
    const f = $$('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])', drawer).filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function openRes(r, trigger) {
    const P = PROPS[r.p], len = r.out - r.in, st = stayState(r);
    const body = [h('div', { class: 'when' },
      h('div', null, h('small', null, 'Entrada'), h('b', null, cap(dayFull(r.in))), h('span', null, r.block ? 'o dia todo' : `a partir das ${r.arrive}`)),
      h('div', { class: 'nights' }, nights(len)),
      h('div', null, h('small', null, 'Saída'), h('b', null, cap(dayFull(r.out))), h('span', null, r.block ? 'o dia todo' : 'até as 11:00')))];
    if (r.block) {
      body.push(h('div', { class: 'cleanbox is-todo' }, iconEl('todo'), h('b', null, r.block), h('p', null, 'Ninguém pode reservar nessas datas. Elas saem da conta de ocupação.')));
    } else {
      const ts = turnStatus(r), cl = r.clean || {};
      body.push(
        h('div', { class: 'money' },
          h('div', null, h('small', null, 'Valor da reserva'), h('b', null, money(r.value))),
          h('span', null, `${money(r.value / len)} × ${nights(len)}`)),
        h('dl', { class: 'facts' },
          h('dt', null, 'Imóvel'), h('dd', null, `${P.name} · ${P.id}`),
          h('dt', null, 'Endereço'), h('dd', null, `${P.area}, ${P.city}`),
          h('dt', null, 'Telefone'), h('dd', null, r.phone || '—'),
          h('dt', null, 'Código'), h('dd', null, r.id)),
        h('div', { class: `cleanbox is-${ts}` }, iconEl(ts),
          h('b', null, `Limpeza da saída · ${STATUS[ts]}`),
          h('p', null, [cl.who || (ts === 'done' ? null : 'Sem responsável ainda'), cl.note || (ts === 'done' ? `Feita em ${dayShort(r.out)}` : `${cap(dayFull(r.out))}, depois das 11:00 · criada automaticamente`)].filter(Boolean).join(' · '))));
    }
    const frag = document.createDocumentFragment();
    frag.append(
      h('div', { class: 'drawer__head' },
        h('p', { class: 'drawer__eyebrow' }, r.block ? `Bloqueio · ${P.id}` : `Reserva · ${r.id}`),
        h('h2', { class: 'drawer__title', id: 'drawer-title' }, r.block ? 'Imóvel bloqueado' : r.guest),
        h('div', { class: 'drawer__meta' }, h('span', { class: `pill${st === 'stay' ? ' pill--stay' : ''}` }, STAY[st]), h('span', null, P.name)),
        closeBtn()),
      h('div', { class: 'drawer__body' }, ...body),
      h('div', { class: 'drawer__foot' },
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => closeDrawer() }, 'Fechar'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => toast('Editar reservas vem na tela de Reservas.') }, r.block ? 'Editar bloqueio' : 'Editar reserva')));
    openDrawer(frag, { trigger });
  }

  function firstFree(len) {
    for (let k = TODAY; k < TODAY + 60; k++) for (let p = 0; p < PROPS.length; p++) if (!conflictOf(p, k, k + len)) return { p, in: k, out: k + len };
    return { p: 0, in: TODAY, out: TODAY + len };
  }
  function openNew(pre, trigger) {
    const start = pre && pre.p != null ? pre : firstFree(2);
    let dirty = false, len = start.out - start.in;
    const field = (id, label, input, hint) => h('div', { class: 'field' },
      h('label', { for: id }, label), input,
      hint ? h('span', { class: 'field__hint', id: `${id}-hint` }, hint) : null,
      h('span', { class: 'field__err', id: `${id}-err` }));
    const sel = h('select', { id: 'f-prop' }, ...PROPS.map((P, p) => h('option', { value: p, selected: p === start.p }, P.name)));
    const fin = h('input', { id: 'f-in', type: 'date', value: iso(start.in), min: iso(TODAY), max: iso(D.END - 1), required: true, 'aria-describedby': 'f-in-err' });
    const fout = h('input', { id: 'f-out', type: 'date', value: iso(start.out), min: iso(start.in + 1), max: iso(D.END), required: true, 'aria-describedby': 'f-out-err' });
    const fname = h('input', { id: 'f-name', type: 'text', autocomplete: 'off', required: true, placeholder: 'Nome de quem vai se hospedar', 'aria-describedby': 'f-name-err' });
    const fphone = h('input', { id: 'f-phone', type: 'tel', inputmode: 'tel', autocomplete: 'off', placeholder: '(11) 90000-0000', 'aria-describedby': 'f-phone-hint' });
    const fval = h('input', { id: 'f-val', type: 'number', min: 0, step: 10, inputmode: 'numeric', 'aria-describedby': 'f-val-calc f-val-err' });
    const calc = h('p', { class: 'calc', id: 'f-val-calc', 'aria-live': 'polite' });
    const formErr = h('p', { class: 'form-err', role: 'alert' });
    const title = h('h2', { class: 'drawer__title', id: 'drawer-title' });
    const meta = h('div', { class: 'drawer__meta' });
    const read = () => ({ p: +sel.value, i: fromIso(fin.value), o: fromIso(fout.value) });
    function sync() {
      const { p, i, o } = read(), ok = Number.isFinite(i) && Number.isFinite(o) && o > i;
      const base = ok ? (o - i) * PROPS[p].rate : 0;
      if (ok) len = o - i;
      if (ok && !dirty) fval.value = base;
      title.textContent = PROPS[p].name;
      meta.textContent = `Diária de ${money(PROPS[p].rate)} · entrada 15:00 · saída 11:00`;
      calc.replaceChildren(...(ok
        ? [`${nights(o - i)} × ${money(PROPS[p].rate)} = `, h('b', null, money(base)), dirty && +fval.value !== base ? ' · valor ajustado à mão' : '']
        : [Number.isFinite(i) && Number.isFinite(o) ? 'A saída precisa ser depois da entrada.' : 'Escolha a entrada e a saída para calcular.']));
      if (Number.isFinite(i)) fout.min = iso(i + 1);
      placeGhost(p, i, o);
      formErr.textContent = '';
    }
    const clearErr = (inp) => {
      const f = inp.closest('.field');
      f.classList.remove('has-error'); inp.removeAttribute('aria-invalid'); $('.field__err', f).textContent = '';
    };
    fin.addEventListener('change', () => { // ao mudar a entrada, a saída acompanha
      const { i, o } = read();
      if (Number.isFinite(i) && !(o > i)) fout.value = iso(i + len);
      sync();
    });
    [sel, fout].forEach((x) => x.addEventListener('change', sync));
    fval.addEventListener('input', () => { dirty = fval.value !== ''; sync(); });
    [fname, fin, fout, fval].forEach((x) => x.addEventListener('input', () => clearErr(x)));

    const form = h('form', { novalidate: true },
      h('div', { class: 'drawer__head' }, h('p', { class: 'drawer__eyebrow' }, 'Nova reserva'), title, meta, closeBtn()),
      h('div', { class: 'drawer__body' },
        field('f-prop', 'Imóvel', sel),
        h('div', { class: 'row2' }, field('f-in', 'Entrada', fin), field('f-out', 'Saída', fout)),
        field('f-name', 'Hóspede', fname),
        field('f-phone', 'Telefone', fphone, 'Opcional. Usado para avisar sobre a chegada.'),
        h('div', { class: 'field' }, h('label', { for: 'f-val' }, 'Valor total (R$)'), fval, calc, h('span', { class: 'field__err', id: 'f-val-err' })),
        formErr),
      h('div', { class: 'drawer__foot' },
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => closeDrawer() }, 'Cancelar'),
        h('button', { class: 'btn btn--primary', type: 'submit' }, 'Criar reserva')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      [fname, fin, fout, fval].forEach(clearErr);
      formErr.textContent = '';
      const { p, i, o } = read(), name = fname.value.trim().replace(/\s+/g, ' '), val = Math.round(+fval.value);
      let first = null;
      const bad = (inp, msg) => {
        const f = inp.closest('.field');
        f.classList.add('has-error'); inp.setAttribute('aria-invalid', 'true'); $('.field__err', f).textContent = msg;
        first = first || inp;
      };
      if (name.length < 2) bad(fname, 'Escreva o nome de quem vai se hospedar.');
      if (!Number.isFinite(i)) bad(fin, 'Escolha a data de entrada.');
      else if (i < TODAY) bad(fin, 'A entrada não pode ser antes de hoje.');
      if (!Number.isFinite(o)) bad(fout, 'Escolha a data de saída.');
      else if (Number.isFinite(i) && o <= i) bad(fout, 'A saída precisa ser depois da entrada.');
      else if (o > D.END) bad(fout, 'A agenda deste protótipo vai até 30 de abril de 2027.');
      if (!(val > 0)) bad(fval, 'Informe o valor total da reserva.');
      if (!first) { const msg = problemOf(p, i, o); if (msg) { formErr.textContent = msg; first = fin; } }
      if (first) { first.focus(); return; }
      createRes({ p, guest: name, in: i, out: o, value: val, phone: fphone.value.trim() || null });
    });
    openDrawer(form, { trigger, focus: '#f-name', onClose: clearGhost });
    sync();
  }
  function createRes(x) {
    const r = Object.assign({ id: `RSV-N${String(++seq).padStart(2, '0')}`, arrive: '15:00' }, x);
    RES.push(r);
    RES.sort((a, b) => a.p - b.p || a.in - b.in);
    cache.clear(); dashDirty = true;
    closeDrawer(true);
    if (r.in + CI >= ag.start + agLen() || r.out + CO <= ag.start) ag.start = ag.mode === 'month' ? monthStart(r.in) : r.in - 2;
    if (ag.show !== 'timeline') { ag.show = 'timeline'; setSeg($('#ag-show'), 'timeline'); $('#ag').hidden = false; $('#ag-list').hidden = true; }
    if (view !== 'agenda') setView('agenda'); else renderAgenda(false);
    renderToday();
    const bar = $(`.bar[data-id="${r.id}"]`, agEl);
    if (bar) {
      bar.classList.add('bar--new');
      if (anim) G.fromTo(bar, { '--rv': 0 }, { '--rv': 1, duration: .9, ease: 'expo.out', delay: .1 });
      bar.focus({ preventScroll: true });
    }
    toast(`Reserva de ${r.guest} criada.`, { label: 'Desfazer', run: () => undoRes(r) });
  }
  function undoRes(r) {
    const i = RES.indexOf(r);
    if (i < 0) return;
    RES.splice(i, 1);
    cache.clear(); dashDirty = true;
    renderAgenda(false); renderToday();
    if (view === 'overview') renderDash(false);
    toast('Reserva desfeita.');
  }
  $('#new-res').addEventListener('click', (e) => openNew(null, e.currentTarget));

  /* ---------- Início ---------- */
  function init() {
    drawBg();
    let rz = 0;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { drawBg(); movePill(true); placeAvg(); }, 180); });
    addEventListener('scroll', hideTip, { passive: true, capture: true });
    const topEl = $('.top'), stuck = () => topEl.classList.toggle('is-stuck', scrollY > 4);
    addEventListener('scroll', stuck, { passive: true }); stuck();
    addEventListener('hashchange', () => { const v = location.hash === '#agenda' ? 'agenda' : 'overview'; if (v !== view) setView(v); });
    $('#q-kbd').textContent = isMac ? '⌘K' : 'Ctrl K';
    $('#m-prop').replaceChildren(h('option', { value: 'all' }, 'Todos os imóveis'), ...PROPS.map((P, p) => h('option', { value: p }, P.name)));
    $('#ag-legend').replaceChildren(
      h('li', null, h('span', { class: 'lg lg--stay' }), 'Em curso'),
      h('li', null, h('span', { class: 'lg lg--future' }), 'Confirmada'),
      h('li', null, h('span', { class: 'lg lg--block' }), 'Bloqueio'),
      h('li', { class: 'sep', 'aria-hidden': 'true' }),
      ...['todo', 'doing', 'done', 'late'].map((s) => h('li', { class: `is-${s}` }, iconEl(s), s === 'todo' ? 'Limpeza pendente' : STATUS[s])));
    setSeg($('#ag-mode'), ag.mode);
    setSeg($('#ag-show'), ag.show);
    new ResizeObserver(() => {
      const w = $('#rev-plot').clientWidth;
      if (w && Math.abs(w - chartW) > 2) drawChart(false);
      placeAvg();
    }).observe($('#rev-plot'));
    renderToday();
    renderDash(true);
    renderAgenda(false);
    setView(location.hash === '#agenda' ? 'agenda' : 'overview', true);
    if (canRefract) { attachLens(pill); attachLens(drawer); }
  }
  init();
})();
