/* 03 · Céu Vivo — céu em canvas 2D que segue a hora real (código DESCARTÁVEL)
   O gradiente, o sol/lua, as nuvens e as estrelas mudam com a hora.
   A interface acompanha: texto claro à noite, saudação certa, agenda que "passa". */
(() => {
  'use strict';
  const GEM = window.GEM;
  const sec = document.getElementById('ceu');
  if (!sec) return;
  const canvas = document.getElementById('ceu-canvas');
  const ctx = canvas.getContext('2d');
  const range = document.getElementById('ceu-range');
  const label = document.getElementById('ceu-time-label');
  const nowBtn = document.getElementById('ceu-now');
  const greets = sec.querySelectorAll('[data-greet]');
  const agenda = sec.querySelectorAll('[data-h]');
  const badge = sec.querySelector('.ceu-badge');
  const badgeText = sec.querySelector('.ceu-badge__text');
  const phoneClock = sec.querySelector('.ceu-phone .phone__status span');

  let W = 1, H = 1, raf = 0, last = 0, live = true, minutes = nowMin(), isNight = null, lastVars = '';
  let clouds = [], stars = [];

  // Paleta do céu ao longo do dia (minutos desde 0h): topo, meio, horizonte.
  const KEYS = [
    [0,    '#070b22', '#0f1840', '#1d2a5c'],
    [300,  '#0d1433', '#2a2f66', '#5a4f8a'],
    [390,  '#3d4f9a', '#b48bb5', '#ffbfa0'],
    [480,  '#5b8fe0', '#a9cdf5', '#ffe2c6'],
    [720,  '#3f8ef5', '#86bdfa', '#d8ecff'],
    [960,  '#4a86e8', '#9cc3f2', '#ffe0b8'],
    [1050, '#4b5fc4', '#e58f8f', '#ffb070'],
    [1125, '#26296a', '#7a4a86', '#f07a6a'],
    [1230, '#0b1030', '#18204d', '#2b3570'],
    [1440, '#070b22', '#0f1840', '#1d2a5c'],
  ].map(([m, a, b, c]) => ({ m, top: hex(a), mid: hex(b), bot: hex(c) }));

  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');
  function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }

  function skyAt(m) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const a = KEYS[i], b = KEYS[i + 1];
      if (m >= a.m && m <= b.m) {
        const t = (m - a.m) / (b.m - a.m), s = t * t * (3 - 2 * t);
        return { top: mix(a.top, b.top, s), mid: mix(a.mid, b.mid, s), bot: mix(a.bot, b.bot, s) };
      }
    }
    return KEYS[0];
  }
  function nightness(h) { // 1 = noite, 0 = dia
    if (h < 5.5 || h > 19.5) return 1;
    if (h > 7 && h < 18) return 0;
    return h <= 7 ? 1 - (h - 5.5) / 1.5 : (h - 18) / 1.5;
  }
  function warmth(h) { // perto do nascer e do pôr do sol
    return clamp(1 - Math.abs(h - 17.7) / 1.3, 0, 1) + clamp(1 - Math.abs(h - 6.6) / 1, 0, 1);
  }
  function phase(h) {
    if (h < 5) return 'madrugada';
    if (h < 7) return 'amanhecer';
    if (h < 12) return 'manhã';
    if (h < 17) return 'tarde';
    if (h < 18.8) return 'pôr do sol';
    return 'noite';
  }
  function greeting(h) { return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build() {
    const R = rng(5);
    const rect = sec.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clouds = Array.from({ length: 8 }, () => {
      const s = 50 + R() * 110;
      return {
        x: R() * W, y: H * (.08 + R() * .6), w: s * 2.4, v: 5 + R() * 9,
        puffs: Array.from({ length: 6 + Math.floor(R() * 4) }, () => ({ dx: (R() - .5) * s * 2.2, dy: (R() - .5) * s * .45, r: s * (.42 + R() * .5) })),
      };
    });
    stars = Array.from({ length: 170 }, () => ({ x: R() * W, y: R() * H * .8, r: .25 + R() * 1.15, p: R() * 6.28 }));
  }

  function disc(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function glow(x, y, r, c, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(.3, `rgba(${c},${a * .35})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function draw(t, dt) {
    const h = minutes / 60, sky = skyAt(minutes), n = nightness(h), warm = clamp(warmth(h), 0, 1);
    // céu
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(sky.top)); g.addColorStop(.55, rgb(sky.mid)); g.addColorStop(1, rgb(sky.bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // estrelas
    if (n > .02) {
      for (const s of stars) {
        const a = n * (.4 + .6 * (.5 + .5 * Math.sin(t * 1.7 + s.p)));
        disc(s.x, s.y, s.r, `rgba(255,255,255,${(a * .9).toFixed(3)})`);
      }
    }
    // sol (6h → 18h30) ou lua
    const dayT = (h - 6) / 12.5;
    if (dayT > -.04 && dayT < 1.04) {
      const k = clamp(dayT, 0, 1);
      const x = W * (.12 + .76 * k), y = H * (.8 - Math.sin(Math.PI * k) * .62);
      const core = warm > .4 ? '255,190,130' : '255,248,225';
      glow(x, y, 220, core, .55);
      disc(x, y, 26, 'rgba(255,253,245,.96)');
    } else {
      const nightT = (((h - 18.5) + 24) % 24) / 11.5;
      const k = clamp(nightT, 0, 1);
      const x = W * (.15 + .7 * k), y = H * (.78 - Math.sin(Math.PI * k) * .56);
      glow(x, y, 150, '210,220,255', .32);
      disc(x, y, 18, 'rgba(244,241,230,.95)');
      disc(x + 7, y - 4, 16, rgb(mix(sky.top, sky.mid, .35))); // sombra da lua crescente
    }
    // nuvens
    let c = mix([255, 255, 255], [255, 212, 192], warm * .85);
    c = mix(c, [46, 56, 106], n);
    const alpha = .8 - n * .4;
    for (const cl of clouds) {
      cl.x += cl.v * dt;
      if (cl.x - cl.w > W) cl.x = -cl.w;
      for (const p of cl.puffs) {
        const x = cl.x + p.dx, y = cl.y + p.dy;
        const rg = ctx.createRadialGradient(x, y - p.r * .3, 0, x, y, p.r);
        rg.addColorStop(0, `rgba(${c},${alpha})`); rg.addColorStop(.6, `rgba(${c},${alpha * .5})`); rg.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    applyTheme(sky, n, h);
  }

  function applyTheme(sky, n, h) {
    const vars = rgb(sky.top) + rgb(sky.bot);
    if (vars !== lastVars) {
      lastVars = vars;
      sec.style.setProperty('--sky-top', rgb(sky.top));
      sec.style.setProperty('--sky-bot', rgb(sky.bot));
    }
    const night = n > .55;
    if (night !== isNight) { isNight = night; sec.classList.toggle('is-night', night); }
    const gr = greeting(h);
    greets.forEach((el) => { if (el.textContent !== gr) el.textContent = gr; });
    agenda.forEach((li) => li.classList.toggle('is-past', h > +li.dataset.h));
    const busy = h >= +badge.dataset.checkin;
    badge.classList.toggle('is-busy', busy);
    const bt = busy ? 'Ocupada · Família Tanaka' : 'Livre até 15:00';
    if (badgeText.textContent !== bt) badgeText.textContent = bt;
    const hh = pad(Math.floor(h) % 24), mm = pad(Math.floor(minutes % 60));
    const txt = `${hh}:${mm} · ${phase(h)}${live ? ' · ao vivo' : ''}`;
    if (label.textContent !== txt) label.textContent = txt;
    if (phoneClock.textContent !== `${hh}:${mm}`) phoneClock.textContent = `${hh}:${mm}`;
    if (document.activeElement !== range) range.value = Math.floor(minutes);
    nowBtn.setAttribute('aria-pressed', String(live));
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    if (live) minutes = nowMin();
    draw(now / 1000, dt);
    raf = requestAnimationFrame(frame);
  }

  range.addEventListener('input', () => { live = false; minutes = +range.value; if (!raf) draw(0, 0); });
  nowBtn.addEventListener('click', () => { live = true; minutes = nowMin(); if (!raf) draw(0, 0); });

  /* ---------- barra de abas com bolha líquida ---------- */
  const bar = sec.querySelector('.ceu-tabbar');
  const blob = bar.querySelector('.ceu-blob');
  const tabs = [...bar.querySelectorAll('button')];
  let cur = 0;
  function placeBlob(i, animate) {
    const b = tabs[i], x = b.offsetLeft, w = b.offsetWidth;
    tabs.forEach((el, k) => el.classList.toggle('is-on', k === i));
    cur = i;
    if (!window.gsap) { blob.style.transform = `translateX(${x}px)`; blob.style.width = w + 'px'; return; }
    if (!animate || GEM.reduce) { gsap.set(blob, { x, width: w }); return; }
    const from = gsap.getProperty(blob, 'x'), stretch = w * 1.6, mid = (from + x) / 2 - (stretch - w) / 2;
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(blob, { x: mid, width: stretch, scaleY: .82, duration: .16, ease: 'power2.in' })
      .to(blob, { x, width: w, scaleY: 1, duration: .75, ease: 'elastic.out(1.1, .5)' });
  }
  tabs.forEach((b, i) => b.addEventListener('click', () => placeBlob(i, true)));

  window.addEventListener('gem:layout', () => { build(); placeBlob(cur, false); if (!raf) draw(0, 0); });
  build();
  requestAnimationFrame(() => placeBlob(0, false));
  draw(0, 0);
  GEM.register('ceu', {
    start() { last = 0; if (GEM.reduce) { draw(0, 0); return; } raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  });
})();
