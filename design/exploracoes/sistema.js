/* =============================================================
   Gemóvel · folha visual do sistema (DESCARTÁVEL)
   Lê os tokens ao vivo do CSS (getComputedStyle) e calcula no
   navegador o contraste, a origem e o OKLCH de cada cor: a folha
   não guarda nenhum valor de cor próprio.
   ============================================================= */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const G = window.gsap || null;
  const osReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => osReduce.matches || root.dataset.motion === 'reduce';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* sem armazenamento: só não lembra */ } },
  };
  const live = $('#live');
  const say = (msg) => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60); };
  const N1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const NP = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const isMac = /mac|iphone|ipad/i.test(plat);
  const kbdText = (k) => (isMac ? '⌘' + k : 'Ctrl ' + k);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  function sv(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }
  /** Move pílulas: desliza com GSAP quando pode; salta direto com movimento reduzido ou sem GSAP. */
  function glide(el, props, instant) {
    if (G && !instant && !reduced()) return G.to(el, { ...props, duration: 0.6, ease: 'expo.out', overwrite: true });
    if (G) return G.set(el, { ...props, overwrite: true });
    const t = [];
    if ('x' in props) t.push(`translateX(${props.x}px)`);
    if ('y' in props) t.push(`translateY(${props.y}px)`);
    if (t.length) el.style.transform = t.join(' ');
    if ('width' in props) el.style.width = props.width + 'px';
    if ('opacity' in props) el.style.opacity = props.opacity;
    return null;
  }

  /* ---------- Cor: leitura ao vivo e contas ---------- */
  const probe = h('i', { 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none' });
  document.body.append(probe);
  const isSet = (t) => getComputedStyle(root).getPropertyValue('--' + t).trim() !== '';
  function parseColor(s) {
    let m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = /^color\(srgb\s+([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null;
  }
  /** Valor resolvido de um token de cor no tema atual, ou null se o tema não o define. */
  function read(t) {
    if (!isSet(t)) return null;
    probe.style.color = `var(--${t})`;
    return parseColor(getComputedStyle(probe).color);
  }
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  function oklch(c) {
    const R = lin(c.r), Gc = lin(c.g), B = lin(c.b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * Gc + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * Gc + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * Gc + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const C = Math.hypot(a, bb);
    if (C < 0.002) return `oklch(${(L * 100).toFixed(1)}% 0 0)`;
    const H = (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360;
    return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3).replace(/^0/, '')} ${Math.round(H)})`;
  }

  /* ---------- Primitivos (iguais nos dois temas) ---------- */
  const NEUTRALS = ['0', '50', '100', '400', '500', '600', '700', '850', '900', '950'].map((s) => 'neutral-' + s);
  const RAMPS = [
    ['Âmbar', 'em andamento', 'ambar', [100, 300, 600, 700]],
    ['Esmeralda', 'concluída · bom', 'esmeralda', [100, 300, 600, 700]],
    ['Rubi', 'atrasada · ruim', 'rubi', [100, 400, 700]],
    ['Safira', 'dado · informação', 'safira', [100, 400, 700]],
  ];
  const PRIM = {};
  [...NEUTRALS, ...RAMPS.flatMap(([, , key, steps]) => steps.map((s) => `${key}-${s}`))].forEach((t) => { PRIM[t] = read(t); });
  /** De onde vem uma cor: o primitivo que bate com ela (e a opacidade, se houver). */
  function origin(c) {
    const hit = Object.entries(PRIM).find(([, p]) => p && Math.abs(p.r - c.r) < 0.75 && Math.abs(p.g - c.g) < 0.75 && Math.abs(p.b - c.b) < 0.75);
    return (hit ? hit[0] : hex(c)) + (c.a < 0.995 ? ` a ${NP.format(c.a * 100)}%` : '');
  }

  function swatch(t) {
    const c = PRIM[t];
    return h('button', { class: 'sw', type: 'button', 'data-token': t },
      h('i', { class: 'sw__chip', style: `background:var(--${t})`, 'aria-hidden': 'true' }),
      h('code', {}, t),
      h('span', { class: 'sw__hex' }, hex(c)),
      h('span', { class: 'sw__ok' }, oklch(c)),
      h('span', { class: 'badge' }));
  }
  function buildSwatches() {
    $('#sw-neutral').append(...NEUTRALS.map(swatch));
    $('#sw-gems').append(...RAMPS.map(([name, role, key, steps]) => h('div', { class: 'ramp' },
      h('div', { class: 'ramp__name' }, h('b', {}, name), h('span', {}, role)),
      ...steps.map((s) => swatch(`${key}-${s}`)),
      ...Array.from({ length: 4 - steps.length }, () => h('i', { class: 'ramp__empty', 'aria-hidden': 'true' })))));
  }
  function paintSwatches() {
    const s1 = read('color-surface-1');
    $$('.sw').forEach((el) => {
      const t = el.dataset.token, r = ratio(PRIM[t], s1), n = N1.format(r);
      const [cls, word] = r >= 7 ? ['badge--aaa', 'AAA'] : r >= 4.5 ? ['badge--aa', 'AA'] : r >= 3 ? ['badge--ui', 'só UI'] : ['', '—'];
      const b = $('.badge', el);
      b.className = 'badge ' + cls;
      b.textContent = `${n} · ${word}`;
      el.title = `Contraste como texto sobre surface-1: ${n}:1. Clique para copiar var(--${t}).`;
      el.setAttribute('aria-label', `${t}, ${hex(PRIM[t])}, contraste ${n} para 1 sobre a superfície. Copiar token.`);
    });
  }

  /* ---------- Tabela de semânticos ---------- */
  const LABEL = { todo: 'pendente', doing: 'em andamento', done: 'concluída', late: 'atrasada' };
  const STATES = Object.keys(LABEL);
  const TEXT = { vs: ['color-surface-1', 'color-bg'], min: 4.5 };
  const SEM = [
    ['Superfícies · contraste do texto sobre elas'],
    ['color-bg', 'fundo da página', { on: 'color-text', min: 4.5 }],
    ['color-surface-1', 'cartão, tabela; base das contas', { on: 'color-text', min: 4.5 }],
    ['color-surface-2', 'campo, linha em destaque, menu', { on: 'color-text', min: 4.5 }],
    ['color-surface-inverse', 'ação primária, “hoje”', { on: 'color-text-on-inverse', min: 4.5 }],
    ['Texto · pior caso entre surface-1 e bg'],
    ['color-text', 'texto principal', TEXT],
    ['color-text-muted', 'texto secundário', TEXT],
    ['color-text-subtle', 'rótulo, metadado, placeholder', TEXT],
    ['color-text-disabled', 'controle desabilitado', { vs: ['color-surface-1'], info: 'isento' }],
    ['Linhas e foco'],
    ['color-border', 'linha fina', { vs: ['color-surface-1'], info: 'decorativa' }],
    ['color-border-strong', 'divisão que importa', { vs: ['color-surface-1'], info: 'decorativa' }],
    ['color-border-control', 'borda de campo (meta 3:1)', { vs: ['color-surface-1', 'color-surface-2'], min: 3 }],
    ['color-focus', 'anel de foco (meta 3:1)', { vs: ['color-surface-1', 'color-bg'], min: 3 }],
    ['Status · inclui a própria tinta do chip'],
    ...STATES.map((s) => [`status-${s}-fg`, `texto: ${LABEL[s]}`, { vs: ['color-surface-1', 'color-bg', `@status-${s}-bg`], min: 4.5 }]),
    ...STATES.map((s) => [`status-${s}-icon`, `gema: ${LABEL[s]} (meta 3:1)`, { vs: ['color-surface-1', `@status-${s}-bg`], min: 3 }]),
    ['Informação e dados (meta 3:1)'],
    ['color-info', 'ícone de informação', { vs: ['color-surface-1', '@color-info-bg'], min: 3 }],
    ['data-realized', 'barra de receita realizada', { vs: ['color-surface-1'], min: 3 }],
    ['data-projected', 'barra de receita prevista', { vs: ['color-surface-1'], min: 3 }],
  ];
  function bgOf(k, s1) {
    const c = read(k.replace(/^@/, ''));
    if (!c) return s1;
    return c.a < 1 ? over(c, s1) : c;
  }
  function badgeFor(r, rule) {
    const n = N1.format(r);
    if (rule.info) return h('span', { class: 'badge', title: `${n}:1 (${rule.info}: sem meta de contraste)` }, `${n} · ${rule.info}`);
    const ok = r >= rule.min;
    const word = !ok ? 'abaixo' : rule.min >= 4.5 ? (r >= 7 ? 'AAA' : 'AA') : '≥3 ✓';
    return h('span', { class: 'badge ' + (ok ? 'badge--aa' : 'badge--fail'), title: `${n}:1 · meta ${N1.format(rule.min)}:1` }, `${n} · ${word}`);
  }
  function renderSem() {
    const tb = $('#sem-table tbody'), s1 = read('color-surface-1');
    tb.replaceChildren(...SEM.map((row) => {
      if (row.length === 1) return h('tr', { class: 'tbl__group' }, h('td', { colspan: 5 }, row[0]));
      const [t, why, rule] = row, c = read(t);
      let from, badge;
      if (!c) {
        from = 'não definido neste tema';
        badge = h('span', { class: 'badge' }, '—');
      } else {
        from = origin(c);
        let r;
        if (rule.on) {
          const bg = c.a < 1 ? over(c, s1) : c, fg = read(rule.on);
          r = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
        } else {
          r = Math.min(...rule.vs.map((k) => { const bg = bgOf(k, s1); return ratio(c.a < 1 ? over(c, bg) : c, bg); }));
        }
        badge = badgeFor(r, rule);
      }
      return h('tr', {},
        h('td', {}, h('code', {}, t)),
        h('td', {}, h('span', { class: 'tbl__sw' + (c ? '' : ' is-none'), style: c ? `--x:var(--${t})` : null, 'aria-hidden': 'true' })),
        h('td', { class: 'tbl__from' }, from),
        h('td', { class: 'tbl__why' }, why),
        h('td', { class: 'num' }, badge));
    }));
  }
  const renderColors = () => { paintSwatches(); renderSem(); };

  /* ---------- Espaço ---------- */
  const SPACES = [['0-5', 2], ['1', 4], ['1-5', 6], ['2', 8], ['3', 12], ['4', 16], ['5', 20], ['6', 24], ['8', 32], ['10', 40], ['12', 48], ['16', 64]];
  function buildSpaces() {
    $('#spaces').append(...SPACES.map(([k, px]) => h('li', {},
      h('code', {}, `space-${k}`), h('span', {}, px), h('i', { style: `width:var(--space-${k})`, 'aria-hidden': 'true' }))));
  }

  /* ---------- Controle segmentado (rádio com pílula que desliza) ---------- */
  function initSeg(el, onChange) {
    const pill = $('.seg__pill', el), btns = $$('[role="radio"]', el);
    const current = () => btns.find((b) => b.getAttribute('aria-checked') === 'true') || btns[0];
    const place = (instant) => { const b = current(); glide(pill, { x: b.offsetLeft, width: b.offsetWidth }, instant); };
    function select(b, opt = {}) {
      const changed = b !== current();
      btns.forEach((x) => { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      place(opt.instant);
      if (!opt.silent && changed) onChange(b.dataset.value, b);
    }
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        const n = btns.length;
        const j = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault();
        btns[j].focus();
        select(btns[j]);
      });
    });
    el.classList.add('is-ready');
    place(true);
    new ResizeObserver(() => place(true)).observe(el);
    if (document.fonts) document.fonts.ready.then(() => place(true));
    return { set(v, opt) { const b = btns.find((x) => x.dataset.value === v); if (b) select(b, opt); } };
  }

  /* ---------- Nível de efeito: detecção ---------- */
  const TIERS = ['completo', 'padrao', 'leve'];
  const TIER_NAME = { completo: 'Completo', padrao: 'Padrão', leve: 'Leve' };
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  const canRefract = brands.some((b) => /chrom/i.test(b.brand)) && CSS.supports('backdrop-filter', 'url(#a)');
  function detectTier() {
    const mq = (q) => matchMedia(q).matches, why = [];
    const conn = navigator.connection;
    if (mq('(prefers-reduced-transparency: reduce)')) why.push('transparência reduzida no sistema');
    if (conn && conn.saveData) why.push('economia de dados ligada');
    if (!CSS.supports('backdrop-filter', 'blur(1px)') && !CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) why.push('sem desfoque de fundo');
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) why.push(`${NP.format(navigator.deviceMemory)} GB de memória`);
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) why.push(`${navigator.hardwareConcurrency} núcleos`);
    if (why.length) return { tier: 'leve', why };
    if (canRefract && mq('(pointer: fine)')) return { tier: 'completo', why: ['Chromium com mouse, lente disponível'] };
    return { tier: 'padrao', why: [canRefract ? 'tela de toque' : 'navegador sem lente de refração'] };
  }
  const det = detectTier();
  function renderDetected() {
    const cur = root.dataset.tier;
    $('#tier-detected').replaceChildren('Este aparelho: ', h('b', {}, TIER_NAME[det.tier]), ` (${det.why.join(', ')}).`,
      cur !== det.tier ? ` Você escolheu ver o nível ${TIER_NAME[cur]}.` : '');
  }

  /* ---------- Lente (mapa de deslocamento SVG; só Chromium, só no Completo) ---------- */
  function sdRoundRect(x, y, hw, hh, r) {
    const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }
  function lensMap(w, hgt, r, bezel) {
    const s = Math.min(1, 240 / Math.max(w, hgt));
    const W = Math.max(8, Math.round(w * s)), H = Math.max(8, Math.round(hgt * s));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
    const hw = w / 2, hh = hgt / 2, e = 0.75;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) / s - hw, y = (j + 0.5) / s - hh;
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
  let lensN = 0;
  function attachLens(el) {
    const id = 'lens-' + (++lensN);
    const filter = sv('filter', { id, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' });
    const map = sv('feImage', { preserveAspectRatio: 'none', result: 'map' });
    const disp = sv('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G' });
    filter.append(map, disp);
    $('#lens-defs').append(filter);
    let on = false;
    const update = () => {
      if (!on) return;
      const w = el.offsetWidth, hgt = el.offsetHeight;
      if (!w || !hgt) return;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, hgt / 2);
      map.setAttribute('href', lensMap(w, hgt, r, +(el.dataset.bezel || 12)));
      map.setAttribute('x', 0); map.setAttribute('y', 0); map.setAttribute('width', w); map.setAttribute('height', hgt);
      disp.setAttribute('scale', Math.min(14, +(el.dataset.scale || 14)));
      el.style.backdropFilter = `url(#${id}) blur(${el.dataset.blur ?? 12}px) saturate(170%)`;
    };
    new ResizeObserver(update).observe(el);
    return { enable(v) { on = v; if (v) update(); else el.style.backdropFilter = ''; } };
  }
  function lensDrag(el) {
    const stage = el.parentElement;
    let drag = false, sx = 0, sy = 0, ox = 0, oy = 0;
    const put = (x, y) => {
      const mx = stage.clientWidth - el.offsetWidth, my = stage.clientHeight - el.offsetHeight;
      el.style.left = Math.max(0, Math.min(mx, x)) + 'px';
      el.style.top = Math.max(0, Math.min(my, y)) + 'px';
    };
    el.addEventListener('pointerdown', (e) => { drag = true; el.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop; });
    el.addEventListener('pointermove', (e) => { if (drag) put(ox + e.clientX - sx, oy + e.clientY - sy); });
    const end = () => { drag = false; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => {
      const st = e.shiftKey ? 48 : 16;
      const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (!d) return;
      e.preventDefault();
      put(el.offsetLeft + d[0], el.offsetTop + d[1]);
    });
  }
  const lensEl = $('.lens-demo');
  const lens = attachLens(lensEl);
  lensDrag(lensEl);
  const LENS_NOTE = {
    refr: 'Lente ativa: nas bordas, o vidro curva o que está atrás (mapa de deslocamento SVG, só Chromium). Arraste ou use as setas.',
    flat: 'Este navegador não faz refração: no Completo, a lente vira vidro fosco comum.',
    padrao: 'No Padrão a lente vira vidro fosco comum. Escolha Completo no topo para ver a refração.',
    leve: 'No Leve não há vidro: a lente e os cartões ficam sólidos.',
  };
  function applyTier(v) {
    root.dataset.tier = v;
    const refr = v === 'completo' && canRefract;
    lens.enable(refr);
    $('#lens-note').textContent = refr ? LENS_NOTE.refr : v === 'completo' ? LENS_NOTE.flat : LENS_NOTE[v];
    $$('.tier').forEach((t) => t.classList.toggle('is-current', t.dataset.for === v));
    renderDetected();
  }

  /* ---------- Aviso com desfazer (mesma lógica do protótipo) ---------- */
  const toastEl = $('#toast');
  let toastTimer = 0, toastAction = null;
  function armToast(ms) { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, ms); }
  function showToast(msg, opt = {}) {
    clearTimeout(toastTimer);
    toastAction = opt.onAction || null;
    toastEl.replaceChildren(h('span', {}, msg));
    if (opt.action) toastEl.append(h('button', { type: 'button', onclick: runToastAction }, opt.action, ' ', h('kbd', {}, kbdText('Z'))));
    toastEl.hidden = false;
    if (G && !reduced()) G.fromTo(toastEl, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', overwrite: true });
    else if (G) G.set(toastEl, { y: 0, opacity: 1, overwrite: true });
    armToast(opt.action ? 10000 : 4200);
    say(msg + (opt.action ? ` Para desfazer, ${kbdText('Z')}.` : ''));
  }
  function hideToast() {
    clearTimeout(toastTimer);
    toastAction = null;
    if (toastEl.hidden) return;
    const done = () => { toastEl.hidden = true; };
    if (G && !reduced()) G.to(toastEl, { y: 8, opacity: 0, duration: 0.22, ease: 'power2.in', overwrite: true, onComplete: done });
    else done();
  }
  function runToastAction() { const fn = toastAction; hideToast(); if (fn) fn(); }
  toastEl.addEventListener('pointerenter', () => clearTimeout(toastTimer));
  toastEl.addEventListener('pointerleave', () => { if (!toastEl.hidden) armToast(4000); });
  toastEl.addEventListener('focusin', () => clearTimeout(toastTimer));
  toastEl.addEventListener('focusout', () => { if (!toastEl.hidden) armToast(4000); });
  document.addEventListener('keydown', (e) => {
    if (!toastAction || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    runToastAction();
  });
  $('#toast-demo').addEventListener('click', () => showToast('Reserva excluída.', { action: 'Desfazer', onAction: () => showToast('Reserva restaurada.') }));

  /* Copiar token ao clicar numa amostra */
  document.addEventListener('click', (e) => {
    const sw = e.target.closest('.sw');
    if (!sw) return;
    const txt = `var(--${sw.dataset.token})`;
    const ok = () => showToast(`Copiado: ${txt}. Em componente, use um token semântico.`);
    const fail = () => showToast('Não deu para copiar aqui; o nome do token está na amostra.');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, fail); else fail();
  });

  /* ---------- Movimento: durações e curvas ---------- */
  const STD = 'cubic-bezier(.2,.7,.2,1)';
  // O corredor anda pela variável --p (0 a 1); o CSS converte em distância pela largura da pista.
  function runCss(r, ms, easing) {
    r.getAnimations().forEach((a) => a.cancel());
    if (reduced()) { r.style.setProperty('--p', '1'); return; }
    r.style.removeProperty('--p');
    r.animate([{ '--p': 0 }, { '--p': 1 }], { duration: ms, easing, fill: 'forwards' });
  }
  function playDurs() { $$('#durs li').forEach((li) => runCss($('.runner', li), +li.dataset.ms, STD)); }

  const EASE_FALLBACK = {
    'back.out(2)': (p) => { p -= 1; return p * p * (3 * p + 2) + 1; },
    'elastic.out(1, .3)': (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 2 ** (-10 * p) * Math.sin((p - 0.075) * (2 * Math.PI / 0.3)) + 1),
  };
  const easeFn = (str) => (G && G.parseEase(str)) || EASE_FALLBACK[str];
  const X0 = 8, X1 = 92, Y0 = 62, YS = 40; // valor 0 → y 62, valor 1 → y 22; folga para o exagero do pop e do tremor
  function drawCurves() {
    $$('#eases li').forEach((li) => {
      let pts;
      if (li.dataset.css) {
        const [x1, y1, x2, y2] = li.dataset.css.match(/[\d.]+/g).map(Number);
        pts = Array.from({ length: 65 }, (_, i) => {
          const t = i / 64, u = 1 - t;
          return [3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3, 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3];
        });
      } else {
        const f = easeFn(li.dataset.gsap);
        pts = Array.from({ length: 97 }, (_, i) => [i / 96, f(i / 96)]);
      }
      const P = ([x, v]) => `${(X0 + x * (X1 - X0)).toFixed(2)} ${(Y0 - v * YS).toFixed(2)}`;
      $('.curve', li).replaceChildren(
        sv('path', { class: 'g', d: `M${X0} ${Y0}H${X1}M${X0} ${Y0 - YS}H${X1}` }),
        sv('path', { class: 'c', d: 'M' + pts.map(P).join('L') }));
    });
  }
  // pop: o back.out(2) passa ~13% do alvo, então ele para em 88% e o pico cabe na pista.
  // tremor: fica no meio (--p .5) e treme pelo --dx. Só variáveis: o x do GSAP zeraria o translate do CSS.
  const POP_END = 0.88;
  const easeGeometry = (li) => (li.hasAttribute('data-shake')
    ? { from: { '--p': 0.5, '--dx': '-16px' }, end: { '--p': 0.5, '--dx': '0px' }, dur: 0.5 }
    : { from: { '--p': 0 }, end: { '--p': POP_END }, dur: 0.9 });
  function placeShake() { $('#eases li[data-shake] .runner').style.setProperty('--p', '0.5'); }
  function playEases() {
    $$('#eases li').forEach((li) => {
      const r = $('.runner', li);
      if (li.dataset.css) { runCss(r, 900, li.dataset.css); return; }
      const { from, end, dur } = easeGeometry(li);
      if (!G) { r.style.setProperty('--p', String(end['--p'])); return; }
      if (reduced()) G.set(r, { ...end, overwrite: true });
      else G.fromTo(r, from, { ...end, duration: dur, ease: li.dataset.gsap, overwrite: true });
    });
  }

  /* ---------- Movimento: transições-assinatura ---------- */
  function tween(t, from, to) {
    if (!G) return;
    G.killTweensOf(t);
    if (reduced()) { const { duration, ease, stagger, delay, ...end } = to; G.set(t, end); return; }
    G.fromTo(t, from, to);
  }
  function playFacet() {
    tween($$('#sig-facet .res-bar'), { '--rv': 0 }, { '--rv': 1, duration: 0.6, ease: 'expo.out', stagger: 0.08 });
    tween($('#sig-facet .now-line'), { opacity: 0, scaleY: 0.4 }, { opacity: 1, scaleY: 1, duration: 0.4, ease: 'power3.out', delay: 0.28 });
  }
  const miniPill = $('.mini-nav__pill'), miniBtns = $$('.mini-nav button');
  let pillTimers = [];
  function miniGo(btn, instant) {
    miniBtns.forEach((b) => { if (b === btn) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    glide(miniPill, { y: btn.offsetTop }, instant);
  }
  miniBtns.forEach((b) => b.addEventListener('click', () => { pillTimers.forEach(clearTimeout); miniGo(b); }));
  function playPill() {
    pillTimers.forEach(clearTimeout);
    if (reduced()) { miniGo(miniBtns[0], true); return; }
    pillTimers = [1, 2, 0].map((i, k) => setTimeout(() => miniGo(miniBtns[i]), k * 700));
  }
  function playCascade() {
    tween($$('#sig-cascade .cascade i'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out', stagger: 0.045 });
  }
  const growNum = $('#grow-num'), GROW_TO = 48920, count = { v: GROW_TO };
  function playGrow() {
    tween($$('#sig-grow .grow__bars i'), { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 100%', duration: 0.9, ease: 'power3.out', stagger: 0.04 });
    if (!G || reduced()) { growNum.textContent = BRL.format(GROW_TO); return; }
    G.fromTo(count, { v: 0 }, { v: GROW_TO, duration: 0.9, ease: 'power3.out', overwrite: true, onUpdate: () => { growNum.textContent = BRL.format(Math.round(count.v)); } });
  }
  function playSignatures() { playFacet(); playPill(); playCascade(); playGrow(); }
  const PLAY = { durs: playDurs, eases: playEases, facet: playFacet, pill: playPill, cascade: playCascade, grow: playGrow };
  $$('[data-play]').forEach((b) => b.addEventListener('click', () => PLAY[b.dataset.play]()));
  $('#play-all').addEventListener('click', () => { playDurs(); playEases(); playSignatures(); });

  /* ---------- Movimento reduzido (do sistema ou simulado) ---------- */
  const motionBtn = $('#motion-toggle');
  function syncMotion() {
    if (osReduce.matches) {
      motionBtn.setAttribute('aria-pressed', 'true');
      motionBtn.disabled = true;
      motionBtn.title = 'O sistema operacional já pede movimento reduzido.';
    } else {
      motionBtn.disabled = false;
      motionBtn.removeAttribute('title');
      motionBtn.setAttribute('aria-pressed', String(root.dataset.motion === 'reduce'));
    }
  }
  /** Leva tudo que está em andamento direto ao estado final. */
  function finishAll() {
    pillTimers.forEach(clearTimeout);
    if (G) G.globalTimeline.getChildren(true, true, false).forEach((t) => t.progress(1));
    document.getAnimations().forEach((a) => { const it = a.effect && a.effect.getTiming().iterations; if (it !== Infinity) a.finish(); });
  }
  motionBtn.addEventListener('click', () => {
    const on = root.dataset.motion !== 'reduce';
    if (on) root.dataset.motion = 'reduce'; else delete root.dataset.motion;
    store.set('gem-motion', on ? 'reduce' : '');
    syncMotion();
    if (on) finishAll();
    say(on ? 'Movimento reduzido ligado.' : 'Movimento reduzido desligado.');
  });
  osReduce.addEventListener('change', () => { syncMotion(); if (reduced()) finishAll(); });

  /* ---------- Índice lateral, alturas presas e rolagem ---------- */
  const bar = $('.bar'), toc = $('.toc'), tocPill = $('.toc__pill'), tocLinks = $$('.toc a');
  const secs = tocLinks.map((a) => $(a.getAttribute('href')));
  const horiz = matchMedia('(max-width: 1180px)');
  let curLink = null, lockUntil = 0;
  function setCurrent(a, instant) {
    if (!a || (a === curLink && !instant)) return;
    curLink = a;
    tocLinks.forEach((l) => { if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    if (horiz.matches) {
      if (toc.scrollWidth > toc.clientWidth) toc.scrollTo({ left: a.offsetLeft - (toc.clientWidth - a.offsetWidth) / 2, behavior: instant || reduced() ? 'auto' : 'smooth' });
      return;
    }
    glide(tocPill, { y: a.offsetTop, opacity: 1 }, instant);
  }
  const io = new IntersectionObserver((entries) => {
    if (performance.now() < lockUntil) return;
    entries.forEach((en) => { if (en.isIntersecting) setCurrent(tocLinks[secs.indexOf(en.target)]); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  secs.forEach((s) => io.observe(s));
  tocLinks.forEach((a) => a.addEventListener('click', () => { setCurrent(a); lockUntil = performance.now() + 1000; }));
  addEventListener('scroll', () => {
    if (performance.now() < lockUntil) return;
    if (innerHeight + scrollY >= root.scrollHeight - 4) setCurrent(tocLinks[tocLinks.length - 1]);
  }, { passive: true });
  function syncOffsets() {
    const bh = bar.offsetHeight;
    root.style.setProperty('--bar-h', bh + 'px');
    const barSticky = getComputedStyle(bar).position === 'sticky';
    root.style.scrollPaddingTop = (barSticky ? bh : 0) + (horiz.matches ? toc.offsetHeight : 0) + 16 + 'px';
  }
  new ResizeObserver(syncOffsets).observe(bar);
  new ResizeObserver(() => { if (curLink) setCurrent(curLink, true); }).observe(toc);
  horiz.addEventListener('change', () => { syncOffsets(); if (curLink) setCurrent(curLink, true); });

  /* ---------- Início ---------- */
  const saved = { theme: store.get('gem-theme'), tier: store.get('gem-tier'), motion: store.get('gem-motion') };
  const theme = saved.theme === 'quartzo' ? 'quartzo' : 'obsidiana';
  const tier = TIERS.includes(saved.tier) ? saved.tier : det.tier;
  root.dataset.theme = theme;
  if (saved.motion === 'reduce') root.dataset.motion = 'reduce';

  buildSwatches();
  buildSpaces();
  drawCurves();
  placeShake();
  renderColors();
  $$('[data-kbd]').forEach((k) => { k.textContent = kbdText(k.dataset.kbd); });

  // A troca lê sempre a escolha MAIS RECENTE: se duas transições se atropelam, a ordem dos retornos não importa.
  let wantTheme = theme;
  const applyTheme = () => { if (root.dataset.theme !== wantTheme) { root.dataset.theme = wantTheme; renderColors(); } };
  const segTheme = initSeg($('#seg-theme'), (v, b) => {
    store.set('gem-theme', v);
    wantTheme = v;
    const go = applyTheme;
    if (document.startViewTransition && !reduced() && document.visibilityState === 'visible') {
      // Se a transição for interrompida (outra troca, aba oculta), o tema troca do mesmo jeito; só silencia o aviso.
      const vt = document.startViewTransition(go);
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
    } else go();
    say(`Tema ${b.textContent}.`);
  });
  const segTier = initSeg($('#seg-tier'), (v, b) => { store.set('gem-tier', v); applyTier(v); say(`Nível de efeito: ${b.textContent}.`); });
  initSeg($('#seg-cvd'), (v, b) => { $('#cvd-target').style.filter = v ? `url(#${v})` : ''; say(`Simulação de visão: ${b.textContent}.`); });
  segTheme.set(theme, { instant: true, silent: true });
  segTier.set(tier, { instant: true, silent: true });
  applyTier(tier);
  syncMotion();
  syncOffsets();
  miniGo(miniBtns.find((b) => b.getAttribute('aria-current') === 'true') || miniBtns[0], true);
  setCurrent(tocLinks[0], true);

  /* Cada bloco de movimento toca sozinho uma vez, quando aparece na tela */
  const ONCE = new Map([[$('#movimento .motion-grid'), () => { playDurs(); playEases(); }], [$('#movimento .sig-grid'), playSignatures]]);
  const ioMove = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      ioMove.unobserve(en.target);
      ONCE.get(en.target)();
    });
  }, { threshold: 0.25 });
  ONCE.forEach((_, el) => ioMove.observe(el));
})();
