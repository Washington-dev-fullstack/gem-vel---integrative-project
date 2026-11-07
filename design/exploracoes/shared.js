/* Gemóvel · exploração de direções — código DESCARTÁVEL, só para escolher a direção.
   Este arquivo cuida do que é comum às três direções:
   - escala dos "artboards" (as composições têm tamanho fixo e encolhem para caber)
   - liga/desliga as cenas de canvas quando a seção aparece/some (economia de bateria)
   - navegação do topo
   - vidro líquido: refração real via filtro SVG (só navegadores Chromium)
   - brilho especular que segue o ponteiro e paralaxe por profundidade
   - animações de entrada com GSAP (cada direção tem a sua personalidade) */
(() => {
  'use strict';
  const GEM = (window.GEM = window.GEM || {});
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  GEM.reduce = reduce;
  const hasGsap = !!window.gsap;
  if (hasGsap) gsap.registerPlugin(...[window.ScrollTrigger, window.MorphSVGPlugin, window.ScrambleTextPlugin].filter(Boolean));

  /* ---------- Artboards escalonados ---------- */
  const boards = [...document.querySelectorAll('.artboard')];
  function fitBoards() {
    for (const b of boards) {
      const s = Math.min(1.3, b.parentElement.clientWidth / 860);
      b.style.setProperty('--s', s.toFixed(4));
    }
    window.dispatchEvent(new CustomEvent('gem:layout'));
  }
  fitBoards();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitBoards, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBoards);

  /* ---------- Cenas de canvas: só rodam quando a seção está visível ---------- */
  const scenes = new Map();
  const visible = new Set();
  function run(id, on) {
    const s = scenes.get(id);
    if (!s || s.running === on) return;
    s.running = on;
    try { on ? s.start() : s.stop(); } catch (err) { console.error(err); }
  }
  GEM.register = (id, api) => {
    scenes.set(id, { ...api, running: false });
    if (visible.has(id)) run(id, true);
  };
  const sections = [...document.querySelectorAll('.dir')];
  const sceneIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { visible.add(e.target.id); run(e.target.id, true); }
      else { visible.delete(e.target.id); run(e.target.id, false); }
    }
  }, { rootMargin: '80px 0px' });
  sections.forEach((s) => sceneIO.observe(s));

  /* ---------- Navegação do topo ---------- */
  const links = [...document.querySelectorAll('.shell__nav a')];
  const pill = document.querySelector('.shell__pill');
  let active = 0;
  function setActive(i, instant) {
    if (i < 0 || !links[i]) return;
    active = i;
    links.forEach((a, k) => {
      a.classList.toggle('is-active', k === i);
      if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    const target = { x: links[i].offsetLeft, width: links[i].offsetWidth };
    if (!hasGsap) { pill.style.transform = `translateX(${target.x}px)`; pill.style.width = target.width + 'px'; return; }
    if (instant || reduce) gsap.set(pill, target);
    else gsap.to(pill, { ...target, duration: .6, ease: 'expo.out', overwrite: true });
  }
  const navIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) setActive(sections.indexOf(e.target));
  }, { rootMargin: '-50% 0px -50% 0px' });
  sections.forEach((s) => navIO.observe(s));
  setActive(0, true);
  window.addEventListener('gem:layout', () => setActive(active, true));

  /* ---------- Vidro líquido: refração real (Chromium) ----------
     Geramos, para cada painel, um "mapa de deslocamento": uma imagem em que
     vermelho/verde dizem para onde empurrar cada pixel do fundo. Perto da borda
     o fundo é puxado para dentro (como a borda de uma lente); no centro, nada muda.
     Safari e Firefox não aplicam filtro SVG no backdrop-filter: lá fica o vidro fosco. */
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  const isChromium = brands.some((b) => /chrom/i.test(b.brand));
  const canRefract = isChromium && CSS.supports('backdrop-filter', 'url(#a)');
  GEM.canRefract = canRefract;
  document.documentElement.classList.toggle('can-refract', canRefract);

  const SVGNS = 'http://www.w3.org/2000/svg';
  const defs = document.getElementById('lens-defs');
  let lensCount = 0;

  // Distância assinada até a borda de um retângulo arredondado (negativa dentro).
  function sdRoundRect(x, y, hw, hh, r) {
    const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function lensMap(w, h, r, bezel) {
    const s = Math.min(1, 240 / Math.max(w, h));
    const W = Math.max(8, Math.round(w * s)), H = Math.max(8, Math.round(h * s));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H), d = img.data;
    const hw = w / 2, hh = h / 2, e = .75;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = (i + .5) / s - hw, y = (j + .5) / s - hh;
        const depth = -sdRoundRect(x, y, hw, hh, r);
        let dx = 0, dy = 0;
        if (depth > 0 && depth < bezel) {
          const gx = sdRoundRect(x + e, y, hw, hh, r) - sdRoundRect(x - e, y, hw, hh, r);
          const gy = sdRoundRect(x, y + e, hw, hh, r) - sdRoundRect(x, y - e, hw, hh, r);
          const len = Math.hypot(gx, gy) || 1;
          const t = 1 - depth / bezel;          // 1 na borda, 0 no fim do bisel
          const k = t * t * (3 - 2 * t);        // curva suave: mais forte na borda
          dx = (-gx / len) * k;
          dy = (-gy / len) * k;
        }
        const o = (j * W + i) * 4;
        d[o] = 128 + dx * 127;
        d[o + 1] = 128 + dy * 127;
        d[o + 2] = 128;
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  function attachLens(el) {
    const id = 'lens-' + (++lensCount);
    const filter = document.createElementNS(SVGNS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
    filter.setAttribute('width', '1'); filter.setAttribute('height', '1');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const map = document.createElementNS(SVGNS, 'feImage');
    map.setAttribute('preserveAspectRatio', 'none');
    map.setAttribute('result', 'map');
    const disp = document.createElementNS(SVGNS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'map');
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');
    filter.append(map, disp);
    defs.append(filter);

    let lastW = 0, lastH = 0;
    const update = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16, Math.min(w, h) / 2);
      const bezel = +(el.dataset.bezel || Math.min(30, Math.min(w, h) / 2.6));
      map.setAttribute('href', lensMap(w, h, r, bezel));
      map.setAttribute('x', '0'); map.setAttribute('y', '0');
      map.setAttribute('width', w); map.setAttribute('height', h);
      disp.setAttribute('scale', el.dataset.lens || 46);
    };
    update();
    new ResizeObserver(update).observe(el);
    const blur = el.dataset.blur || 12;
    el.style.backdropFilter = `url(#${id}) blur(${blur}px) saturate(170%)`;
  }
  if (canRefract) document.querySelectorAll('[data-lens]').forEach(attachLens);

  /* ---------- Brilho que segue o ponteiro + paralaxe ---------- */
  const glassEls = [...document.querySelectorAll('.glass, .glass-light, .glass-sky, .glass-dark')];
  const depthEls = [...document.querySelectorAll('[data-depth]')];
  let px = innerWidth * .5, py = innerHeight * .3, praf = 0;
  window.addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (!praf) praf = requestAnimationFrame(onPointer);
  }, { passive: true });
  function onPointer() {
    praf = 0;
    for (const el of glassEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) continue;
      el.style.setProperty('--mx', ((px - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((py - r.top) / r.height * 100).toFixed(1) + '%');
    }
    if (reduce) return;
    const nx = px / innerWidth - .5, ny = py / innerHeight - .5;
    for (const el of depthEls) {
      const d = +el.dataset.depth;
      el.style.translate = `${(-nx * d * 7).toFixed(2)}px ${(-ny * d * 6).toFixed(2)}px`;
    }
  }

  /* ---------- Entradas com GSAP: cada direção tem um jeito de aparecer ---------- */
  if (!hasGsap || !window.ScrollTrigger) return;
  const SPEC = '.dir__num, .dir__name, .dir__theme, .dir__pitch, .dir__traits li, .swatch, .dir__type, .dir__fit';
  // Lapidado: o painel "abre" como uma faceta (octógono que vira retângulo).
  const FACET_FROM = 'polygon(50% 42%, 50% 42%, 58% 50%, 58% 50%, 50% 58%, 50% 58%, 42% 50%, 42% 50%)';
  const FACET_TO = 'polygon(0% 0%, 100% 0%, 100% 0%, 100% 100%, 100% 100%, 0% 100%, 0% 100%, 0% 0%)';
  const intros = {
    lapidado(tl, els) {
      tl.fromTo(els,
        { clipPath: FACET_FROM, opacity: 0, filter: 'blur(14px) brightness(1.8)' },
        { clipPath: FACET_TO, opacity: 1, filter: 'blur(0px) brightness(1)', duration: 1.3, ease: 'expo.out', stagger: .16, clearProps: 'clipPath,filter' }, .25);
    },
    // Torre: os painéis são "varridos" da esquerda para a direita e os rótulos se decodificam.
    torre(tl, els, sec) {
      tl.fromTo(els,
        { clipPath: 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'power4.inOut', stagger: .1, clearProps: 'clipPath' }, .15);
      if (window.ScrambleTextPlugin) {
        sec.querySelectorAll('[data-scramble]').forEach((el, i) => {
          tl.to(el, { duration: 1.2, scrambleText: { text: el.textContent, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', speed: .5, revealDelay: .2 } }, .35 + i * .06);
        });
      }
    },
    // Céu: os painéis sobem flutuando, com mola.
    ceu(tl, els) {
      tl.from(els, { y: 70, opacity: 0, scale: .92, rotationX: 12, transformPerspective: 1000, duration: 1.5, ease: 'elastic.out(1, .8)', stagger: .1 }, .15);
    },
  };
  function startFloat(sec) {
    if (reduce || sec.id === 'torre') return;
    sec.querySelectorAll('[data-enter]').forEach((el, i) => {
      gsap.to(el, { y: (i % 2 ? -1 : 1) * 7, duration: 3.2 + i * .6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
  }
  sections.forEach((sec) => {
    const tl = gsap.timeline({ paused: true });
    if (!reduce) {
      tl.from(sec.querySelectorAll(SPEC), { y: 22, opacity: 0, duration: .9, ease: 'expo.out', stagger: .05 }, 0);
      intros[sec.id](tl, sec.querySelectorAll('[data-enter]'), sec);
    }
    tl.add(() => startFloat(sec));
    ScrollTrigger.create({ trigger: sec, start: 'top 72%', once: true, onEnter: () => tl.play() });
  });
})();
