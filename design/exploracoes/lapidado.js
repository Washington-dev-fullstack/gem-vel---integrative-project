/* 01 · Lapidado — casa de cristal em 3D (Three.js) + status "em lapidação" (código DESCARTÁVEL)
   - Fundo: shader de cáusticas (a luz que atravessa um cristal) com leve dispersão de cor.
   - Casa de cristal: material físico com transmissão, dispersão e iridescência.
     Ela refrata o próprio fundo e reage ao mouse.
   - Status: a gema passa de pedra bruta → lapidando → lapidada (forma + cor). */

const GEM = window.GEM || {};
const sec = document.getElementById('lapidado');
const canvas = document.getElementById('lap-canvas');
const art = sec.querySelector('.lap-art');

/* ---------- Status: pedra bruta → lapidando → lapidada ---------- */
const ROUGH = 'M7.2 6.2C9.3 4.4 14.1 3.9 16.6 5.4C19.2 6.9 20.6 10 19.2 13.4C17.8 16.9 14.3 19.6 11.2 19.2C7.7 18.7 4.6 15.8 4.5 12.2C4.4 9.7 5.6 7.6 7.2 6.2Z';
const CUT = 'M7 4H17L21 9.5L12 20.5L3 9.5Z';
// Cada estado alimenta as duas telas: o cartão do admin e a tarefa no celular da Cida.
const STATES = [
  { label: 'Pendente', p: 0, who: 'ainda não começou', tag: 'LIMPEZA · PENDENTE', tone: 'muted', meta: ['LIBERADO 11:00', 'JANELA 4H'], cta: 'Iniciar limpeza' },
  { label: 'Em andamento', p: 62, who: 'está limpando', tag: 'LIMPEZA · EM ANDAMENTO', tone: '', meta: ['ATÉ 15:00', 'RESTAM 2H40'], cta: 'Concluir limpeza' },
  { label: 'Concluída', p: 100, who: 'concluiu às 12:20', tag: 'LIMPEZA · CONCLUÍDA', tone: 'ok', meta: ['ÀS 12:20', 'FOLGA 2H40'], cta: 'Limpeza concluída ✓' },
];
const qTask = sec.querySelector('.lap-q__task');
const qTag = qTask.querySelector('.lap-q__tag');
const qMeta = qTask.querySelectorAll('.lap-q__meta span');
const qBtn = qTask.querySelector('.lap-btn');
const card = sec.querySelector('.lap-prop');
const btn = sec.querySelector('.lap-status');
const body = btn.querySelector('.gem-body');
const facets = [...btn.querySelectorAll('.gem-facet')];
const text = btn.querySelector('.lap-status__text');
const who = sec.querySelector('.lap-prop__who');
const bar = sec.querySelector('.lap-window__bar i');
const gsap = window.gsap;

facets.forEach((f) => { const L = f.getTotalLength(); f.style.strokeDasharray = L; f.style.strokeDashoffset = L; f.dataset.len = L; });

function sparkle() {
  const host = sec.getBoundingClientRect(), r = btn.getBoundingClientRect();
  const cx = r.left - host.left + 18, cy = r.top - host.top + r.height / 2;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    s.className = 'lap-spark';
    sec.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 56;
    gsap.fromTo(s,
      { x: cx, y: cy, scale: 0, rotation: 45, opacity: 1 },
      { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, scale: .5 + Math.random() * .9, opacity: 0, duration: .8 + Math.random() * .6, ease: 'expo.out', onComplete: () => s.remove() });
  }
}

function setState(s, instant) {
  const st = STATES[s];
  btn.dataset.state = s;
  card.dataset.state = s;
  text.textContent = st.label;
  who.textContent = st.who;
  // Celular da equipe: mesma tarefa, mesmo estado (é o "tempo real" da história).
  qTag.textContent = st.tag;
  qTag.className = 'mono lap-q__tag' + (st.tone ? ' lap-q__tag--' + st.tone : '');
  qMeta[0].textContent = st.meta[0];
  qMeta[1].textContent = st.meta[1];
  qBtn.textContent = st.cta;
  qBtn.classList.toggle('is-done', s === 2);
  qBtn.setAttribute('aria-disabled', String(s === 2));

  const d = s === 0 ? ROUGH : CUT;
  const showFacet = (i) => s === 2 || (s === 1 && i < 2);
  if (!gsap) {
    body.setAttribute('d', d);
    facets.forEach((f, i) => { f.style.strokeDashoffset = showFacet(i) ? 0 : f.dataset.len; });
    bar.style.width = st.p + '%';
    return;
  }
  const k = instant || GEM.reduce ? 0 : 1;
  if (window.MorphSVGPlugin) gsap.to(body, { morphSVG: d, duration: .7 * k, ease: 'expo.inOut' });
  else body.setAttribute('d', d);
  facets.forEach((f, i) => {
    const show = showFacet(i);
    gsap.to(f, { strokeDashoffset: show ? 0 : +f.dataset.len, duration: .6 * k, delay: show ? (.25 + i * .12) * k : 0, ease: 'power2.out' });
  });
  gsap.to(bar, { width: st.p + '%', duration: .9 * k, ease: 'expo.out' });
  if (k) gsap.fromTo(qTask, { scale: .97 }, { scale: 1, duration: .55, ease: 'back.out(3)' });
  if (s === 2 && !instant) {
    if (!GEM.reduce) sparkle();
    window.dispatchEvent(new Event('lap:polished'));
  }
}
btn.addEventListener('click', () => setState((+btn.dataset.state + 1) % 3));
// No celular só se avança: iniciar → concluir. (Voltar é coisa do admin.)
qBtn.addEventListener('click', () => { const s = +btn.dataset.state; if (s < 2) setState(s + 1); });
setState(1, true);

/* ---------- Cena 3D ---------- */
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

// Cáusticas: bordas de células de Voronoi animadas, com o canal R/G/B
// levemente deslocado (dispersão). Mais fortes perto da casa de cristal.
const FRAG = /* glsl */`
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uFocus;
  varying vec2 vUv;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  float cells(vec2 p, float t) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.45 * sin(t + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; }
        else if (d < f2) { f2 = d; }
      }
    }
    float e = sqrt(f2) - sqrt(f1);
    return pow(1.0 - smoothstep(0.0, 0.18, e), 5.0);
  }
  vec3 caustic(vec2 p, float t) {
    vec2 w = p + 0.25 * vec2(sin(p.y * 1.5 + t * 0.8), cos(p.x * 1.2 - t * 0.7));
    float o = 0.02;
    return vec3(cells(w + vec2(o, 0.0), t), cells(w, t), cells(w - vec2(o, 0.0), t));
  }
  void main() {
    vec2 asp = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    vec2 uv = (vUv - 0.5) * asp;
    float t = uTime * 0.3;
    vec3 c = caustic(uv * 3.2, t) + 0.5 * caustic(uv * 6.4 + 4.7, t * 1.3);
    vec2 f = (uFocus - 0.5) * asp;
    float pool = smoothstep(1.1, 0.0, length((uv - f) * vec2(0.85, 1.2)));
    vec3 tint = mix(vec3(0.66, 0.6, 1.0), vec3(0.5, 0.95, 1.0), clamp(vUv.x, 0.0, 1.0));
    tint = mix(tint, vec3(1.0, 0.72, 0.88), smoothstep(0.55, 1.0, vUv.y) * 0.4);
    vec3 col = vec3(0.028, 0.027, 0.045);
    col += c * tint * (0.02 + 0.34 * pool * pool);
    col += vec3(0.16, 0.13, 0.32) * 0.35 * pool * pool;
    float gr = fract(sin(dot(vUv * uRes + fract(uTime * 0.37) * 113.0, vec2(12.9898, 78.233))) * 43758.5453);
    col += (gr - 0.5) * 0.018;
    col = pow(max(col, 0.0), vec3(2.2));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

try {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  initScene(THREE, RoomEnvironment);
} catch (err) {
  console.warn('Cena 3D indisponível, usando fundo estático.', err);
  sec.classList.add('no-webgl');
}

function initScene(THREE, RoomEnvironment) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = .6;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 11);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();

  const bgMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: new THREE.Vector2(.6, .55) } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bg.frustumCulled = false;
  bg.renderOrder = -1;
  scene.add(bg);

  // Silhueta de casa extrudada com bisel facetado = casa lapidada.
  const shape = new THREE.Shape();
  shape.moveTo(-1, -1.05);
  shape.lineTo(1, -1.05);
  shape.lineTo(1, .32);
  shape.lineTo(0, 1.22);
  shape.lineTo(-1, .32);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .72, bevelEnabled: true, bevelThickness: .34, bevelSize: .27, bevelSegments: 2, curveSegments: 1 });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: .03,
    transmission: 1, thickness: 1.5, ior: 2.15, dispersion: 5,
    iridescence: .7, iridescenceIOR: 1.4, iridescenceThicknessRange: [140, 520],
    clearcoat: 1, clearcoatRoughness: .04, specularIntensity: 1, envMapIntensity: 2.2,
    attenuationColor: new THREE.Color('#e6defe'), attenuationDistance: 2.6,
    flatShading: true,
  });
  const crystal = new THREE.Mesh(geo, mat);
  scene.add(crystal);

  const key = new THREE.PointLight('#bfefff', 40, 0, 2); key.position.set(3.5, 4, 6); scene.add(key);
  const rim = new THREE.PointLight('#ffb3e8', 26, 0, 2); rim.position.set(-4.5, -2.5, 3); scene.add(rim);

  const base = new THREE.Vector2();
  function layout() {
    const r = sec.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    bgMat.uniforms.uRes.value.set(w, h);
    const ar = art.getBoundingClientRect();
    const fx = (ar.left - r.left + ar.width * .52) / w;
    const fy = (ar.top - r.top + ar.height * .43) / h;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const vw = vh * camera.aspect;
    base.set((fx - .5) * vw, (.5 - fy) * vh);
    crystal.scale.setScalar(((ar.height / h) * vh * .5) / 2.95);
    bgMat.uniforms.uFocus.value.set(fx, 1 - fy);
  }

  let raf = 0, last = 0, time = 0;
  const tilt = { x: 0, y: 0 }, aim = { x: 0, y: 0 }, extra = { v: 0 };
  window.addEventListener('pointermove', (e) => {
    aim.x = (e.clientY / innerHeight - .5) * .45;
    aim.y = (e.clientX / innerWidth - .5) * .8;
  }, { passive: true });
  // Quando uma limpeza é concluída, o cristal dá uma volta completa.
  window.addEventListener('lap:polished', () => { if (gsap) gsap.to(extra, { v: extra.v + Math.PI * 2, duration: 2, ease: 'expo.out' }); });

  function render(dt) {
    time += dt;
    const k = Math.min(1, dt * 3);
    tilt.x += (aim.x - tilt.x) * k;
    tilt.y += (aim.y - tilt.y) * k;
    crystal.rotation.set(-.12 + tilt.x + Math.sin(time * .5) * .05, time * .22 + tilt.y + extra.v, Math.sin(time * .35) * .05);
    crystal.position.set(base.x, base.y + Math.sin(time * .9) * .07, 0);
    bgMat.uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    render(dt);
    raf = requestAnimationFrame(frame);
  }

  layout();
  render(0);
  window.addEventListener('gem:layout', () => { layout(); if (!raf) render(0); });
  if (GEM.register) {
    GEM.register('lapidado', {
      start() { last = 0; if (GEM.reduce) { render(0); return; } raf = requestAnimationFrame(frame); },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    });
  }
}
