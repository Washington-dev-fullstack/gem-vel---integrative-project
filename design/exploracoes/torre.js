/* 02 · Torre de Controle — mapa vivo em canvas 2D (código DESCARTÁVEL)
   Desenha uma cidade abstrata (ruas, avenidas, rio), os imóveis como pontos
   com estado, a equipe se deslocando, um radar e uma mira que segue o mouse. */
(() => {
  'use strict';
  const GEM = window.GEM;
  const sec = document.getElementById('torre');
  if (!sec) return;
  const canvas = document.getElementById('torre-canvas');
  const ctx = canvas.getContext('2d');
  const art = sec.querySelector('.torre-art');
  const lens = sec.querySelector('.torre-lens');
  const SIG = '255,107,44', INK = '233,240,236', OK = '91,214,154';
  const FONT = '500 10px "JetBrains Mono", ui-monospace, monospace';

  let W = 1, H = 1, raf = 0, last = 0, time = 0;
  let streets = [], avenues = [], river = [], nodes = [], ambient = [], blips = [];
  let hq = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0, on: false };

  // Gerador pseudoaleatório com semente: o "mapa" é sempre o mesmo.
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build() {
    const R = rng(11);
    const rect = sec.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Ruas: grade irregular
    const step = 88, cols = Math.ceil(W / step) + 3, rows = Math.ceil(H / step) + 3;
    const pts = [];
    for (let j = 0; j < rows; j++) {
      pts.push([]);
      for (let i = 0; i < cols; i++) pts[j].push({ x: (i - 1) * step + (R() - .5) * 30, y: (j - 1) * step + (R() - .5) * 30 });
    }
    streets = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (i < cols - 1 && R() < .84) streets.push([pts[j][i], pts[j][i + 1]]);
      if (j < rows - 1 && R() < .84) streets.push([pts[j][i], pts[j + 1][i]]);
    }
    avenues = [
      [{ x: -40, y: H * .86 }, { x: W + 40, y: H * .16 }],
      [{ x: W * .18, y: -40 }, { x: W * .66, y: H + 40 }],
      [{ x: -40, y: H * .38 }, { x: W + 40, y: H * .58 }],
    ];
    river = [];
    for (let x = -60; x <= W + 60; x += 20) river.push({ x, y: H * .74 + Math.sin(x / 230) * 50 + Math.sin(x / 95) * 9 });

    // Imóveis: posições relativas à composição (artboard), nos espaços livres
    const ar = art.getBoundingClientRect(), lr = lens.getBoundingClientRect();
    const ox = ar.left - rect.left, oy = ar.top - rect.top, aw = ar.width, ah = ar.height;
    const P = (fx, fy) => ({ x: ox + aw * fx, y: oy + ah * fy });
    nodes = [
      { id: 'IMV-022', x: lr.left - rect.left - 26, y: lr.top - rect.top + 30, s: 'late', left: true },
      { id: 'IMV-014', ...P(.09, .33), s: 'clean' },
      { id: 'IMV-008', ...P(.25, .30), s: 'busy' },
      { id: 'IMV-031', ...P(.47, .29), s: 'done' },
      { id: 'IMV-027', ...P(.63, .31), s: 'busy', left: true },
      { id: 'IMV-045', ...P(.06, .53), s: 'pending' },
      { id: 'IMV-019', ...P(.21, .58), s: 'pending' },
      { id: 'IMV-036', ...P(.67, .58), s: 'idle', left: true },
    ];
    hq = P(.30, .45);
    ambient = [];
    for (let k = 0; k < 14; k++) ambient.push({ x: R() * W, y: R() * H });
    // Equipe: Rafael indo para o imóvel atrasado (bate com o cartão em vidro)
    blips = [
      { a: 1, b: 0, t: .35, sp: .03, label: 'RS', min: .3, max: .96 },
      { a: 5, b: 6, t: .1, sp: .05, label: 'JL' },
      { a: 3, b: 4, t: .6, sp: .045, label: 'MT' },
    ];
  }

  /* ---------- primitivas ---------- */
  function poly(pts, off = 0) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + off) : ctx.moveTo(p.x, p.y + off))); }
  function ring(x, y, r, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function square(x, y, s, fill, stroke) {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x - s / 2 + .5, y - s / 2 + .5, s - 1, s - 1); }
  }

  function drawNode(n, t) {
    const { x, y } = n;
    if (n.s === 'late') {
      const p = (t * .8) % 1;
      ring(x, y, 8 + p * 30, `rgba(${SIG},${(.8 * (1 - p)).toFixed(3)})`, 1.5);
      ring(x, y, 10, `rgba(${SIG},.9)`, 1.2);
      square(x, y, 6, `rgb(${SIG})`);
    } else if (n.s === 'clean') {
      const p = (t * .55 + .3) % 1;
      ring(x, y, 7 + p * 20, `rgba(${INK},${(.45 * (1 - p)).toFixed(3)})`, 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.2); ctx.setLineDash([3, 4]); ring(0, 0, 11, `rgba(${INK},.7)`, 1); ctx.restore();
      square(x, y, 5, `rgb(${INK})`);
    } else if (n.s === 'pending') {
      square(x, y, 7, null, `rgba(${INK},.6)`);
    } else if (n.s === 'done') {
      ring(x, y, 8, `rgba(${OK},.4)`, 1); dot(x, y, 3.5, `rgb(${OK})`);
    } else if (n.s === 'busy') {
      square(x, y, 6, `rgba(${INK},.85)`);
    } else {
      square(x, y, 5, null, `rgba(${INK},.25)`);
    }
    ctx.fillStyle = n.s === 'late' ? `rgb(${SIG})` : n.s === 'idle' ? `rgba(${INK},.3)` : `rgba(${INK},.62)`;
    const w = ctx.measureText(n.id).width;
    ctx.fillText(n.id, n.left ? x - 15 - w : x + 15, y);
  }

  function drawBlip(b, dt) {
    const lo = b.min ?? 0, hi = b.max ?? 1;
    b.t += b.sp * dt;
    if (b.t > hi) b.t = lo;
    const A = nodes[b.a], B = nodes[b.b];
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.abs(dx) + Math.abs(dy);
    const pos = (tt) => {
      const d = tt * L;
      return d < Math.abs(dx) ? { x: A.x + Math.sign(dx) * d, y: A.y } : { x: B.x, y: A.y + Math.sign(dy) * (d - Math.abs(dx)) };
    };
    ctx.setLineDash([1, 4]); ctx.strokeStyle = `rgba(${INK},.22)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 8; k >= 1; k--) {
      const p = pos(Math.max(lo, b.t - k * .006));
      dot(p.x, p.y, 2.2 * (1 - k / 10), `rgba(${INK},${(.5 * (1 - k / 9)).toFixed(3)})`);
    }
    const p = pos(b.t);
    dot(p.x, p.y, 3.4, `rgb(${INK})`);
    ring(p.x, p.y, 7, `rgba(${INK},.35)`, 1);
    ctx.fillStyle = `rgba(${INK},.85)`;
    ctx.fillText(b.label, p.x + 10, p.y - 11);
  }

  function crosshair() {
    ctx.strokeStyle = `rgba(${INK},.18)`; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(mouse.x + .5, 0); ctx.lineTo(mouse.x + .5, H); ctx.moveTo(0, mouse.y + .5); ctx.lineTo(W, mouse.y + .5); ctx.stroke();
    ctx.setLineDash([]);
    const lat = (-23.5505 - (mouse.y / H - .5) * .12).toFixed(4);
    const lon = (-46.6333 + (mouse.x / W - .5) * .2).toFixed(4);
    const txt = `${lat}  ${lon}`;
    const w = ctx.measureText(txt).width + 14;
    ctx.fillStyle = 'rgba(10,12,11,.88)'; ctx.fillRect(mouse.x + 10, mouse.y + 10, w, 20);
    ctx.strokeStyle = `rgba(${INK},.25)`; ctx.strokeRect(mouse.x + 10.5, mouse.y + 10.5, w - 1, 19);
    ctx.fillStyle = `rgba(${INK},.88)`; ctx.fillText(txt, mouse.x + 17, mouse.y + 20.5);
  }

  function ticks() {
    ctx.strokeStyle = `rgba(${INK},.18)`; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < W; x += 10) { const l = x % 100 === 0 ? 10 : x % 50 === 0 ? 6 : 3; ctx.moveTo(x + .5, H); ctx.lineTo(x + .5, H - l); }
    for (let y = 0; y < H; y += 10) { const l = y % 100 === 0 ? 10 : y % 50 === 0 ? 6 : 3; ctx.moveTo(W, y + .5); ctx.lineTo(W - l, y + .5); }
    ctx.stroke();
  }

  function draw(t, dt) {
    ctx.fillStyle = '#0a0c0b'; ctx.fillRect(0, 0, W, H);
    // malha fina
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${INK},.03)`; ctx.beginPath();
    for (let x = .5; x < W; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = .5; y < H; y += 24) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // rio
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(64,132,140,.10)'; ctx.lineWidth = 34; poly(river); ctx.stroke();
    ctx.strokeStyle = 'rgba(96,170,178,.16)'; ctx.lineWidth = 1; poly(river, -17); ctx.stroke(); poly(river, 17); ctx.stroke();
    // ruas e avenidas
    ctx.strokeStyle = `rgba(${INK},.075)`; ctx.lineWidth = 1; ctx.beginPath();
    for (const [a, b] of streets) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    ctx.strokeStyle = `rgba(${INK},.13)`; ctx.lineWidth = 2; ctx.beginPath();
    for (const [a, b] of avenues) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    ctx.lineCap = 'butt';
    // radar: varredura com rastro
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(t * .55, hq.x, hq.y);
      g.addColorStop(0, `rgba(${SIG},0)`); g.addColorStop(.86, `rgba(${SIG},0)`); g.addColorStop(1, `rgba(${SIG},.13)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hq.x, hq.y, Math.max(W, H) * .62, 0, Math.PI * 2); ctx.fill();
    }
    ctx.setLineDash([2, 6]);
    for (const r of [110, 220, 330, 440]) ring(hq.x, hq.y, r, `rgba(${SIG},.14)`, 1);
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(${SIG},.9)`; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(hq.x - 7, hq.y); ctx.lineTo(hq.x + 7, hq.y); ctx.moveTo(hq.x, hq.y - 7); ctx.lineTo(hq.x, hq.y + 7); ctx.stroke();
    ring(hq.x, hq.y, 4, `rgba(${SIG},.9)`, 1);
    // pontos de fundo (outros imóveis, apagados)
    for (const a of ambient) square(a.x, a.y, 4, null, `rgba(${INK},.12)`);
    // equipe e imóveis
    ctx.font = FONT; ctx.textBaseline = 'middle';
    for (const b of blips) drawBlip(b, dt);
    for (const n of nodes) drawNode(n, t);
    ticks();
    if (mouse.on) crosshair();
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now; time += dt;
    draw(time, dt);
    raf = requestAnimationFrame(frame);
  }

  /* ---------- relógio simulado (12:20) e cronômetro da tarefa ---------- */
  const clock = document.getElementById('torre-clock');
  const timer = document.getElementById('torre-timer');
  const t0 = Date.now();
  const base = new Date(); base.setHours(12, 20, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const d = new Date(base.getTime() + Date.now() - t0);
    clock.textContent = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} — ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const s = Math.floor((d.getTime() - new Date(d).setHours(11, 0, 0, 0)) / 1000);
    timer.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- linha do "agora" na linha do dia ---------- */
  const nowEl = sec.querySelector('.torre-now');
  const timeline = sec.querySelector('.torre-timeline');
  const track = sec.querySelector('.torre-track');
  function placeNow() {
    const tr = track.getBoundingClientRect(), lr = timeline.getBoundingClientRect();
    const s = lr.width / timeline.offsetWidth || 1;
    const h = 12 + 20 / 60;
    nowEl.style.left = ((tr.left - lr.left + tr.width * (h - 6) / 16) / s).toFixed(1) + 'px';
  }

  sec.addEventListener('pointermove', (e) => {
    const r = sec.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  });
  sec.addEventListener('pointerleave', () => { mouse.on = false; });
  window.addEventListener('gem:layout', () => { build(); placeNow(); if (!raf) draw(time, 0); });

  build();
  placeNow();
  GEM.register('torre', {
    start() { last = 0; if (GEM.reduce) { draw(time, 0); return; } raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  });
})();
