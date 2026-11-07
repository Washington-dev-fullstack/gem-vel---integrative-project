/* =============================================================
   Gemóvel · folha de componentes, lote A (DESCARTÁVEL)
   Topo (tema, nível, movimento, índice) igual ao de sistema.js.
   Dados de admin-data.js (o mesmo relógio fixo: qui, 5 nov 2026).
   ============================================================= */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const G = window.gsap || null;
  const D = window.GEMDATA;
  const NS = 'http://www.w3.org/2000/svg';
  const osReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => osReduce.matches || root.dataset.motion === 'reduce';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* sem armazenamento: só não lembra */ } },
  };
  const live = $('#live');
  const say = (msg) => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60); };
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const DEC2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  /** <svg class="ico"><use href="#l-…"/></svg>, sempre escondido do leitor de tela. */
  function ico(name, cls = '') {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', ('ico ' + cls).trim());
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#l-' + name);
    svg.append(use);
    return svg;
  }
  const GEM = { todo: 'g-todo', doing: 'g-doing', done: 'g-done', late: 'g-late' };
  function gem(s) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', `gem-ico is-${s}`);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#' + GEM[s]);
    svg.append(use);
    return svg;
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
  /** Aparece com um esmaecer curto (vale também com movimento reduzido: só opacidade, ≤160ms). */
  function fadeIn(el) {
    if (!G) return;
    G.fromTo(el, { opacity: 0 }, { opacity: 1, duration: reduced() ? 0.16 : 0.28, ease: 'power2.out', overwrite: true, clearProps: 'opacity' });
  }
  /** Botão em espera: mantém a largura, troca o rótulo pelo gerúndio. Devolve a função que desfaz. */
  function busy(btn, label) {
    const kids = [...btn.childNodes];
    btn.style.minWidth = btn.offsetWidth + 'px';
    btn.setAttribute('aria-busy', 'true');
    btn.replaceChildren(h('span', { class: 'spin', 'aria-hidden': 'true' }), label);
    return () => { btn.replaceChildren(...kids); btn.removeAttribute('aria-busy'); btn.style.minWidth = ''; };
  }

  /* ---------- Datas (dias contados desde 1970, em UTC, como admin-data.js) ---------- */
  const TODAY = D.TODAY;
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const WD_FULL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MON_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const ymd = (n) => { const x = new Date(n * D.DAY); return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), w: x.getUTCDay() }; };
  const dayOf = (y, m, d) => Date.UTC(y, m, d) / D.DAY;
  const fmtDay = (n) => { const a = ymd(n); return `${WD[a.w]}, ${a.d} ${MON[a.m]}`; };
  const fmtLong = (n) => { const a = ymd(n); return `${WD_FULL[a.w]}, ${a.d} de ${MON_FULL[a.m]}`; };
  const fmtRange = (a, b) => { const A = ymd(a), B = ymd(b); return A.m === B.m ? `${A.d}–${B.d} ${MON[B.m]}` : `${A.d} ${MON[A.m]}–${B.d} ${MON[B.m]}`; };
  const iso = (n) => new Date(n * D.DAY).toISOString().slice(0, 10);
  const fromIso = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? D.d(s) : null);
  const nights = (n) => (n === 1 ? '1 noite' : `${n} noites`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Tarefas de hoje (contadas dos dados, nunca escritas à mão) ---------- */
  const READY = { todo: 'Pendente', doing: 'Limpando', done: 'Pronto', late: 'Atrasada' };
  const tasksToday = [];
  D.RES.forEach((r) => { if (r.clean && r.out === TODAY) tasksToday.push({ who: r.clean.who, s: r.clean.s }); });
  D.TASKS.forEach((t) => { if (Math.floor(t.at) === TODAY) tasksToday.push({ who: t.who, s: t.s }); });
  const tasksOf = (name) => tasksToday.filter((t) => t.who === name);
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

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

  /* ---------- Nível de efeito ---------- */
  const TIERS = ['completo', 'padrao', 'leve'];
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  const canRefract = brands.some((b) => /chrom/i.test(b.brand)) && CSS.supports('backdrop-filter', 'url(#a)');
  function detectTier() {
    const mq = (q) => matchMedia(q).matches;
    const conn = navigator.connection;
    const weak = mq('(prefers-reduced-transparency: reduce)') || (conn && conn.saveData)
      || (!CSS.supports('backdrop-filter', 'blur(1px)') && !CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))
      || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    if (weak) return 'leve';
    return canRefract && mq('(pointer: fine)') ? 'completo' : 'padrao';
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
  $$('[data-toast]').forEach((b) => b.addEventListener('click', () => showToast(b.dataset.toast)));
  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); showToast(okMsg); } catch (e) { showToast(`Não deu para copiar aqui. O nome é ${text}.`); }
  }

  /* ---------- 02 · Dicionário de ícones ---------- */
  const ICONS = [
    ['Navegar', [['arrow-right', 'Ir para'], ['arrow-up-right', 'Abre em outra aba'], ['chevron-left', 'Anterior'], ['chevron-right', 'Próximo'], ['chevron-down', 'Abre a lista'], ['layout-dashboard', 'Painel'], ['calendar-days', 'Agenda · datas'], ['list-checks', 'Tarefas'], ['chart-column', 'Relatórios'], ['log-out', 'Sair da conta']]],
    ['Agir', [['plus', 'Adicionar'], ['calendar-plus', 'Nova reserva'], ['house-plus', 'Cadastrar imóvel'], ['pencil', 'Editar'], ['trash-2', 'Excluir'], ['copy', 'Copiar'], ['check', 'Confirmar · concluir'], ['x', 'Fechar · limpar'], ['minus', 'Diminuir'], ['ellipsis', 'Mais ações'], ['search', 'Buscar'], ['funnel', 'Filtrar'], ['refresh-cw', 'Atualizar · tentar de novo'], ['rotate-ccw', 'Desfazer'], ['eye', 'Mostrar senha'], ['eye-off', 'Esconder senha'], ['camera', 'Foto da limpeza']]],
    ['Assunto', [['house', 'Imóvel'], ['users', 'Hóspedes'], ['user-round', 'Pessoa · sem responsável'], ['moon', 'Noites'], ['clock', 'Horário'], ['banknote', 'Valor · diária'], ['key-round', 'Entrada · chave'], ['sparkles', 'Limpeza'], ['wrench', 'Manutenção'], ['lock', 'Bloqueio'], ['map-pin', 'Endereço'], ['phone', 'Telefone'], ['mail', 'E-mail'], ['bell', 'Avisos'], ['sun', 'Dia livre']]],
    ['Retorno', [['info', 'Informação'], ['circle-check', 'Deu certo'], ['triangle-alert', 'Atenção'], ['octagon-alert', 'Erro'], ['wifi-off', 'Sem internet'], ['search-x', 'Sem resultado']]],
  ];
  $('#icon-dict').append(...ICONS.flatMap(([group, list]) => [
    h('h4', { class: 'icon-dict__group' }, `${group} · ${list.length}`),
    ...list.map(([name, meaning]) => h('button', { type: 'button', class: 'ico-tile', onclick: () => copy(name, `Copiado: ${name}.`) },
      ico(name), h('b', {}, meaning), h('code', {}, name))),
  ]));

  /* ---------- 03 · Botões e links ---------- */
  const hitBtn = $('#hit-toggle');
  hitBtn.addEventListener('click', () => {
    const on = hitBtn.getAttribute('aria-pressed') !== 'true';
    hitBtn.setAttribute('aria-pressed', String(on));
    $('#btn-card').classList.toggle('show-hit', on);
  });
  const refreshBtn = $('#refresh-now');
  refreshBtn.addEventListener('click', () => {
    refreshBtn.previousSibling.textContent = 'Atualizado agora · ';
    showToast('Dados atualizados.');
  });
  $$('[data-kbd]').forEach((k) => { k.textContent = kbdText(k.dataset.kbd); });

  /* ---------- 05 · Campos ---------- */
  function describe(el, id, on) {
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== id);
    if (on) ids.unshift(id);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
  }
  /** Mostra ou limpa o erro de um campo. O texto diz o que houve e como resolver. */
  function setError(input, msg) {
    const field = input.closest('.field');
    const id = input.id + '-e';
    let p = document.getElementById(id);
    if (!p && msg) {
      p = h('p', { class: 'field__error', id });
      (input.closest('.control') || input).after(p);
      describe(input, id, true);
    }
    if (p) { p.hidden = !msg; p.replaceChildren(...(msg ? [ico('octagon-alert'), msg] : [])); }
    field.classList.toggle('has-error', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const emailMsg = (v) => (v && !EMAIL.test(v) ? 'Escreva o e-mail completo, como nome@exemplo.com.' : '');
  $$('[data-validate="email"]').forEach((inp) => {
    const check = () => setError(inp, emailMsg(inp.value.trim()));
    inp.addEventListener('blur', check);
    inp.addEventListener('input', () => { if (inp.getAttribute('aria-invalid')) check(); });
  });

  function maskTel(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    const rest = d.slice(2), cut = d.length === 11 ? 5 : 4;
    return rest.length <= 4 ? `(${d.slice(0, 2)}) ${rest}` : `(${d.slice(0, 2)}) ${rest.slice(0, cut)}-${rest.slice(cut)}`;
  }
  $$('[data-mask="tel"]').forEach((inp) => {
    inp.addEventListener('input', () => { inp.value = maskTel(inp.value); if (inp.getAttribute('aria-invalid')) inp.dispatchEvent(new Event('blur')); });
    inp.addEventListener('blur', () => {
      const n = inp.value.replace(/\D/g, '').length;
      setError(inp, n && n < 10 ? 'Confira o número: são 10 ou 11 dígitos, com o DDD.' : '');
    });
  });

  $$('[data-reveal]').forEach((btn) => {
    const inp = document.getElementById(btn.getAttribute('aria-controls'));
    const use = $('use', btn);
    btn.addEventListener('click', () => {
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      use.setAttribute('href', show ? '#l-eye-off' : '#l-eye');
    });
  });
  $$('input[type="password"]').forEach((inp) => {
    const warn = document.getElementById(inp.id + '-caps');
    if (!warn) return;
    const upd = (e) => { if (e.getModifierState) warn.hidden = !e.getModifierState('CapsLock'); };
    inp.addEventListener('keydown', upd);
    inp.addEventListener('keyup', upd);
    inp.addEventListener('blur', () => { warn.hidden = true; });
  });

  const parseMoney = (s) => {
    let t = s.replace(/[^\d,.]/g, '');
    if (!t) return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (!/^\d+\.\d{1,2}$/.test(t)) t = t.replace(/\./g, '');   // "520.50" vale como decimal
    return Number(t);
  };
  $$('[data-money]').forEach((inp) => {
    inp.addEventListener('blur', () => {
      if (!inp.value.trim()) { setError(inp, ''); return; }
      const n = parseMoney(inp.value);
      if (!Number.isFinite(n)) { setError(inp, 'Use só números, como 520,00.'); return; }
      setError(inp, '');
      inp.value = DEC2.format(n);
    });
  });

  $$('[data-stepper]').forEach((box) => {
    const inp = $('input', box), btns = $$('[data-step]', box);
    const min = +inp.min, max = +inp.max;
    const word = (n) => (n === 1 ? 'hóspede' : 'hóspedes');
    const sync = () => {
      const v = +inp.value;
      btns.forEach((b) => {
        const atLimit = +b.dataset.step < 0 ? v <= min : v >= max;
        if (atLimit) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      });
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      const step = +b.dataset.step, next = (+inp.value || min) + step;
      if (next < min || next > max) { say(step > 0 ? `Este imóvel recebe até ${max} hóspedes.` : `O mínimo é ${min} ${word(min)}.`); return; }
      inp.value = next;
      sync();
      say(`${next} ${word(next)}.`);
    }));
    inp.addEventListener('input', sync);
    inp.addEventListener('change', () => { inp.value = Math.min(max, Math.max(min, Math.round(+inp.value) || min)); sync(); });
    sync();
  });

  $$('[data-count-for]').forEach((c) => {
    const ta = document.getElementById(c.dataset.countFor), max = ta.maxLength;
    const upd = () => { c.textContent = `${ta.value.length} de ${max}`; c.classList.toggle('is-near', ta.value.length >= max * 0.9); };
    ta.addEventListener('input', upd);
    upd();
  });
  if (!CSS.supports('field-sizing', 'content')) {
    $$('.textarea').forEach((ta) => {
      const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 240) + 'px'; };
      ta.addEventListener('input', fit);
      fit();
    });
  }

  // Entrar (app da equipe): erro por campo; credencial errada não diz qual das duas.
  const login = $('#login');
  login.addEventListener('submit', (e) => {
    e.preventDefault();
    const mail = $('#lg-mail'), pass = $('#lg-pass'), err = $('#login-err'), btn = $('button[type="submit"]', login);
    if (btn.getAttribute('aria-busy') === 'true') return;
    err.hidden = true;
    const m = mail.value.trim();
    const okMail = setError(mail, !m ? 'Escreva seu e-mail.' : emailMsg(m));
    const okPass = setError(pass, !pass.value ? 'Escreva sua senha.' : '');
    if (!okMail || !okPass) { (okMail ? pass : mail).focus(); return; }
    const done = busy(btn, 'Entrando…');
    setTimeout(() => {
      done();
      err.hidden = false;
      const title = $('.banner__title', err);
      title.textContent = title.textContent;   // reescreve para o leitor de tela anunciar
      pass.value = '';
      pass.focus();
    }, 900);
  });
  $$('#lg-mail, #lg-pass').forEach((inp) => inp.addEventListener('input', () => { if (inp.getAttribute('aria-invalid')) setError(inp, ''); }));

  /* ---------- 06 · Lista suspensa ---------- */
  const canBase = CSS.supports('appearance', 'base-select');
  function fillProps(sel, value) {
    D.PROPS.forEach((P) => sel.append(h('option', { value: P.id }, P.name)));
    sel.value = value;
  }
  fillProps($('#sel-prop'), 'IMV-051');
  const sResp = $('#sel-resp');
  sResp.append(h('option', { value: '' },
    h('span', { class: 'opt__avatar opt__avatar--none', 'aria-hidden': 'true' }),
    h('span', { class: 'opt__text' }, h('span', { class: 'opt__name' }, 'Ninguém ainda'), h('span', { class: 'opt__sep' }, ' · '), h('span', { class: 'opt__meta' }, 'decidir depois'))));
  D.STAFF.forEach((s) => {
    const t = tasksOf(s.name), n = t.length;
    const load = n === 0 ? 'nenhuma tarefa hoje' : n === 1 ? '1 tarefa hoje' : `${n} tarefas hoje`;
    sResp.append(h('option', { value: s.name },
      h('span', { class: 'opt__avatar', 'data-initials': initials(s.name), 'aria-hidden': 'true' }),
      h('span', { class: 'opt__text' }, h('span', { class: 'opt__name' }, s.name), h('span', { class: 'opt__sep' }, ' · '), h('span', { class: 'opt__meta' }, `${s.role} · ${load}`)),
      n ? h('span', { class: 'opt__gems', 'aria-hidden': 'true' }, t.map((x) => gem(x.s))) : null));
  });
  sResp.value = 'Cida Ramos';
  $('#sel-support').replaceChildren(
    ico(canBase ? 'circle-check' : 'info', 'ico--sm'),
    canBase ? h('span', {}, 'Este navegador abre a lista com o ', h('b', {}, 'acabamento Lapidado'), '. Abra as duas e use as setas.')
      : h('span', {}, 'Este navegador mostra a ', h('b', {}, 'lista do sistema'), ', com o mesmo texto. Chrome, Edge e Safari 27 mostram o acabamento.'));
  const nativeBtn = $('#sel-native');
  if (!canBase) { nativeBtn.disabled = true; nativeBtn.setAttribute('aria-pressed', 'true'); nativeBtn.title = 'Este navegador já mostra a lista do sistema.'; }
  nativeBtn.addEventListener('click', () => {
    const on = nativeBtn.getAttribute('aria-pressed') !== 'true';
    nativeBtn.setAttribute('aria-pressed', String(on));
    $('#sel-demos').classList.toggle('is-native', on);
    say(on ? 'Mostrando a lista do sistema.' : 'Mostrando a lista com acabamento.');
  });

  /* ---------- 07 · Escolhas ---------- */
  $$('[data-mixed]').forEach((c) => { c.indeterminate = true; });
  const fltAll = $('#flt-all'), fltKids = $('#flt-kids');
  const SHOWN = new Set(['IMV-014', 'IMV-045', 'IMV-031', 'IMV-022', 'IMV-051', 'IMV-063']);
  D.PROPS.forEach((P) => fltKids.append(h('label', { class: 'choice' },
    h('input', { class: 'check', type: 'checkbox', value: P.id, checked: SHOWN.has(P.id) }),
    h('span', { class: 'choice__text' }, h('span', { class: 'choice__label' }, P.name)))));
  const boxes = $$('input', fltKids);
  function syncAll(announce) {
    const n = boxes.filter((b) => b.checked).length;
    fltAll.checked = n === boxes.length;
    fltAll.indeterminate = n > 0 && n < boxes.length;
    if (announce) say(`${n} de ${boxes.length} imóveis na agenda.`);
  }
  boxes.forEach((b) => b.addEventListener('change', () => syncAll(true)));
  fltAll.addEventListener('change', () => { boxes.forEach((b) => { b.checked = fltAll.checked; }); syncAll(true); });
  syncAll(false);

  // Interruptor: vale na hora, então oferece Desfazer.
  function liveSwitch(sw, paint, msgOn, msgOff) {
    sw.addEventListener('change', () => {
      paint();
      const on = sw.checked;
      showToast(on ? msgOn : msgOff, { action: 'Desfazer', onAction: () => { sw.checked = !on; paint(); showToast(!on ? msgOn : msgOff); } });
    });
  }
  const swOpen = $('#sw-open'), swOpenDesc = $('.choice__desc', swOpen.closest('.choice'));
  const paintOpen = () => { swOpenDesc.textContent = swOpen.checked ? 'Casa da Praia aparece livre na agenda.' : 'Ninguém consegue reservar até você ligar de novo.'; };
  liveSwitch(swOpen, paintOpen, 'Casa da Praia voltou a receber reservas.', 'Casa da Praia não recebe mais reservas.');
  liveSwitch($('#sw-cents'), () => {}, 'Valores agora com centavos.', 'Valores agora sem centavos.');

  /* ---------- 08 · Seletor de datas ---------- */
  const cal = { p: 6, y: 0, m: 0, focus: TODAY, a: null, b: null, hover: null, warn: '' };
  let RESP = [];
  const occAt = (n) => RESP.find((r) => r.in <= n && n < r.out) || null;   // quem ocupa a noite n
  const nextIn = (n) => RESP.reduce((best, r) => (r.in > n && (!best || r.in < best.in) ? r : best), null);
  const rate = () => D.PROPS[cal.p].rate;
  const minMonth = ymd(TODAY);
  const elField = $('#dp-field'), elCal = $('#cal'), elGrid = $('#cal-grid'), elTitle = $('#cal-title');
  const elStatus = $('#cal-status'), elSum = $('#cal-sum'), elPrev = $('#cal-prev'), elNext = $('#cal-next');

  /** O que acontece se a pessoa escolher o dia n agora. */
  function dayInfo(n) {
    if (n < TODAY) return { ok: false, tag: 'já passou', reason: `${cap(fmtDay(n))} já passou.` };
    if (cal.a != null && cal.b == null) {
      const nx = nextIn(cal.a);
      if (n > cal.a && (!nx || n <= nx.in)) return { ok: true, kind: 'out' };
      if (nx && n > nx.in) {
        return { ok: false, tag: 'depois da saída possível', reason: `A saída pode ser até ${fmtDay(nx.in)}: nesse dia ${nx.block ? 'começa o bloqueio' : 'chega ' + nx.guest}.` };
      }
    }
    const r = occAt(n);
    if (r) {
      return r.block
        ? { ok: false, tag: 'bloqueado', reason: `${cap(fmtDay(n))} está bloqueado: ${r.block} (${fmtRange(r.in, r.out)}).` }
        : { ok: false, tag: 'reservado', reason: `${cap(fmtDay(n))} está reservado: ${r.guest} (${fmtRange(r.in, r.out)}).` };
    }
    return { ok: true, kind: cal.a != null && cal.b == null ? 'restart' : 'in' };
  }

  /** Trecho de barra numa semana: do meio do dia de entrada (a) ao meio do dia de saída (b).
      Linhas da grade: dia i ocupa as colunas 2i+1 e 2i+2; o meio dele é a linha 2i+2. */
  function seg(a, b, rs, lo, hi) {
    if (b < lo || a > hi) return null;
    const cutL = a >= lo, cutR = b <= hi;
    const s = cutL ? 2 * (a - rs) + 2 : 2 * (lo - rs) + 1;
    const e = cutR ? 2 * (b - rs) + 2 : 2 * (hi - rs) + 3;
    return e > s ? { s, e, cutL, cutR } : null;
  }

  function renderBands() {
    $$('.cal__band', elGrid).forEach((x) => x.remove());
    if (cal.a == null) return;
    const end = cal.b != null ? cal.b : cal.hover;
    if (end == null) return;
    $$('.cal__week', elGrid).forEach((row) => {
      const g = seg(cal.a, end, +row.dataset.rs, +row.dataset.lo, +row.dataset.hi);
      if (g) row.prepend(h('i', { class: 'cal__band' + (cal.b == null ? ' is-preview' : ''), 'aria-hidden': 'true', style: `grid-column:${g.s} / ${g.e}` }));
    });
  }

  function renderMonth() {
    const hadFocus = elGrid.contains(document.activeElement);
    const first = dayOf(cal.y, cal.m, 1), last = dayOf(cal.y, cal.m + 1, 1) - 1;
    const lead = ymd(first).w, rows = Math.ceil((lead + last - first + 1) / 7);
    elTitle.textContent = cap(`${MON_FULL[cal.m]} de ${cal.y}`);
    const atMin = cal.y === minMonth.y && cal.m === minMonth.m;
    if (atMin) { elPrev.setAttribute('aria-disabled', 'true'); elPrev.title = 'Não dá para reservar no passado'; } else { elPrev.removeAttribute('aria-disabled'); elPrev.title = 'Mês anterior'; }
    const out = [h('div', { role: 'row', class: 'cal__dow' }, WD.map((w, i) => h('span', { role: 'columnheader', 'aria-label': WD_FULL[i] }, w)))];
    for (let k = 0; k < rows; k++) {
      const rs = first - lead + k * 7, lo = Math.max(rs, first), hi = Math.min(rs + 6, last);
      const row = h('div', { role: 'row', class: 'cal__week', 'data-rs': rs, 'data-lo': lo, 'data-hi': hi });
      RESP.forEach((r) => {
        const g = seg(r.in, r.out, rs, lo, hi);
        if (g) row.append(h('i', { class: 'cal__bar' + (r.block ? ' cal__bar--block' : ''), 'aria-hidden': 'true', style: `grid-column:${g.s} / ${g.e};--l:${g.cutL ? 'var(--cut-sm)' : '0px'};--r:${g.cutR ? 'var(--cut-sm)' : '0px'}` }));
      });
      for (let i = 0; i < 7; i++) {
        const n = rs + i, col = `grid-column:${2 * i + 1} / span 2`;
        if (n < first || n > last) { row.append(h('span', { role: 'gridcell', class: 'cal__pad', style: col })); continue; }
        const info = dayInfo(n), end = n === cal.a || n === cal.b, inRange = cal.a != null && cal.b != null && n > cal.a && n < cal.b;
        const bits = [fmtLong(n)];
        if (n === TODAY) bits.push('hoje');
        if (n === cal.a) bits.push('entrada escolhida');
        else if (n === cal.b) bits.push('saída escolhida');
        else if (inRange) bits.push('dentro da sua escolha');
        else if (!info.ok) bits.push(info.tag);
        else if (info.kind === 'out') bits.push('pode ser a saída');
        row.append(h('span', {
          role: 'gridcell', class: 'cal__day', style: col, 'data-n': n, tabindex: n === cal.focus ? '0' : '-1',
          'aria-label': bits.join(', '), 'aria-selected': end ? 'true' : null, 'aria-disabled': info.ok ? null : 'true',
          'aria-current': n === TODAY ? 'date' : null,
        }, String(ymd(n).d)));
      }
      out.push(row);
    }
    elGrid.replaceChildren(...out);
    renderBands();
    if (hadFocus) focusCell();
  }
  const focusCell = () => { const c = $(`[data-n="${cal.focus}"]`, elGrid); if (c) c.focus({ preventScroll: false }); };

  function renderStatus() {
    elStatus.classList.toggle('is-warn', !!cal.warn);
    elSum.hidden = !(cal.a != null && cal.b != null);
    if (cal.warn) { elStatus.textContent = cal.warn; return; }
    if (cal.a == null) { elStatus.textContent = 'Escolha a entrada. As barras embaixo dos dias são as noites já ocupadas.'; return; }
    if (cal.b == null) {
      const nx = nextIn(cal.a);
      elStatus.replaceChildren('Entrada ', h('b', {}, fmtDay(cal.a)), '. Agora escolha a saída', nx ? h('span', {}, ', até ', h('b', {}, fmtDay(nx.in))) : '', '.');
      return;
    }
    const n = cal.b - cal.a;
    elStatus.replaceChildren(h('b', {}, `${fmtDay(cal.a)} → ${fmtDay(cal.b)}`), ` · ${nights(n)} · ${BRL.format(n * rate())}`);
    elSum.replaceChildren(h('span', {}, `${nights(n)} × ${BRL.format(rate())}`), h('b', {}, BRL.format(n * rate())), h('small', {}, 'Valor sugerido. Dá para mudar na reserva.'));
  }
  function renderField() {
    const vin = $('#dp-in-v'), vout = $('#dp-out-v');
    vin.textContent = cal.a != null ? fmtDay(cal.a) : 'Escolha';
    vin.classList.toggle('is-empty', cal.a == null);
    vout.textContent = cal.b != null ? fmtDay(cal.b) : cal.a != null ? 'Escolha' : '—';
    vout.classList.toggle('is-empty', cal.b == null);
  }
  const renderAll = () => { renderMonth(); renderStatus(); renderField(); };

  function showMonth(n) { const a = ymd(n); cal.y = a.y; cal.m = a.m; }
  function moveFocus(n) {
    const lo = dayOf(minMonth.y, minMonth.m, 1);
    n = Math.max(n, lo);
    const a = ymd(n), changed = a.y !== cal.y || a.m !== cal.m;
    cal.focus = n;
    if (changed) { showMonth(n); cal.hover = null; renderMonth(); }
    else {
      $$('.cal__day', elGrid).forEach((c) => { c.tabIndex = +c.dataset.n === n ? 0 : -1; });
      previewTo(n);
    }
    focusCell();
  }
  function previewTo(n) {
    const want = cal.a != null && cal.b == null && n != null && dayInfo(n).kind === 'out' ? n : null;
    if (want !== cal.hover) { cal.hover = want; renderBands(); }
  }
  function pick(n) {
    const info = dayInfo(n);
    cal.focus = n;
    if (!info.ok) { cal.warn = info.reason; renderStatus(); $$('.cal__day', elGrid).forEach((c) => { c.tabIndex = +c.dataset.n === n ? 0 : -1; }); return; }
    cal.warn = '';
    if (info.kind === 'out') cal.b = n; else { cal.a = n; cal.b = null; }
    cal.hover = null;
    renderAll();
    focusCell();
  }
  function shiftMonth(n, k) {
    const a = ymd(n), t = new Date(Date.UTC(a.y, a.m + k, 1));
    const len = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    return dayOf(t.getUTCFullYear(), t.getUTCMonth(), Math.min(a.d, len));
  }
  elGrid.addEventListener('keydown', (e) => {
    const cell = e.target.closest('.cal__day');
    if (!cell) return;
    const n = +cell.dataset.n, a = ymd(n);
    const first = dayOf(a.y, a.m, 1), last = dayOf(a.y, a.m + 1, 1) - 1;
    const keys = {
      ArrowLeft: n - 1, ArrowRight: n + 1, ArrowUp: n - 7, ArrowDown: n + 7,
      Home: Math.max(first, n - a.w), End: Math.min(last, n + 6 - a.w),
      PageUp: shiftMonth(n, e.shiftKey ? -12 : -1), PageDown: shiftMonth(n, e.shiftKey ? 12 : 1),
    };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n); return; }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); elField.focus(); return; }
    if (!(e.key in keys)) return;
    e.preventDefault();
    moveFocus(keys[e.key]);
  });
  elGrid.addEventListener('click', (e) => { const c = e.target.closest('.cal__day'); if (c) pick(+c.dataset.n); });
  elGrid.addEventListener('pointerover', (e) => { const c = e.target.closest('.cal__day'); if (c) previewTo(+c.dataset.n); });
  elGrid.addEventListener('pointerleave', () => previewTo(null));
  elPrev.addEventListener('click', () => {
    if (elPrev.getAttribute('aria-disabled') === 'true') { say('Não dá para reservar no passado.'); return; }
    cal.focus = shiftMonth(cal.focus, -1); showMonth(cal.focus); cal.hover = null; renderMonth();
  });
  elNext.addEventListener('click', () => { cal.focus = shiftMonth(cal.focus, 1); showMonth(cal.focus); cal.hover = null; renderMonth(); });
  $('#cal-clear').addEventListener('click', () => {
    cal.a = cal.b = cal.hover = null; cal.warn = ''; cal.focus = Math.max(TODAY, cal.focus);
    renderAll();
    say('Datas limpas. Escolha a entrada.');
  });
  function setOpen(open) {
    elCal.hidden = !open;
    elField.setAttribute('aria-expanded', String(open));
  }
  elField.addEventListener('click', () => {
    const open = elField.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) focusCell();
  });

  // Imóvel e diária
  const dpProp = $('#dp-prop');
  fillProps(dpProp, D.PROPS[cal.p].id);
  function useProp(p) {
    cal.p = p;
    RESP = D.RES.filter((r) => r.p === p);
    $('#dp-rate').replaceChildren('Diária de ', h('b', {}, BRL.format(rate())), ' · entrada às 15:00, saída às 11:00');
  }
  dpProp.addEventListener('change', () => {
    useProp(D.PROPS.findIndex((P) => P.id === dpProp.value));
    cal.a = cal.b = cal.hover = null; cal.warn = '';
    renderAll(); renderSlots(); checkMobile();
    say(`${D.PROPS[cal.p].name}: datas limpas.`);
  });

  // No celular: noites livres primeiro, depois o seletor do sistema.
  const mIn = $('#m-in'), mOut = $('#m-out'), mMsg = $('#m-msg'), slots = $('#slots');
  mIn.min = iso(TODAY);
  mOut.min = iso(TODAY + 1);
  function freeRuns(from, to) {
    const runs = [];
    let start = null;
    for (let n = from; n < to; n++) {
      const free = !occAt(n);
      if (free && start == null) start = n;
      if (!free && start != null) { runs.push([start, n]); start = null; }
    }
    return runs;   // só trechos fechados: o que passa da janela fica de fora
  }
  function renderSlots() {
    const runs = freeRuns(TODAY, TODAY + 45).slice(0, 4);
    slots.replaceChildren(...(runs.length ? runs.map(([a, b]) => h('li', {}, h('button', {
      type: 'button', class: 'slot', 'aria-pressed': 'false', 'data-a': a, 'data-b': b,
      onclick: () => { mIn.value = iso(a); mOut.value = iso(b); checkMobile(); },
    }, fmtRange(a, b), h('span', {}, ' · ' + nights(b - a))))) : [h('li', { class: 'slots__none' }, 'Nenhuma noite livre nesse período.')]));
  }
  function checkMobile() {
    const a = fromIso(mIn.value), b = fromIso(mOut.value);
    const mark = (x, bad) => { if (bad) x.setAttribute('aria-invalid', 'true'); else x.removeAttribute('aria-invalid'); x.closest('.field').classList.toggle('has-error', bad); };
    const msg = (kids, bad) => { mMsg.classList.toggle('is-error', !!bad); mMsg.replaceChildren(...(bad ? [ico('octagon-alert')] : []), h('span', {}, ...kids)); };
    mark(mIn, false); mark(mOut, false);
    $$('.slot', slots).forEach((s) => s.setAttribute('aria-pressed', String(+s.dataset.a === a && +s.dataset.b === b)));
    if (a != null && a < TODAY) { mark(mIn, true); msg(['A entrada já passou. Escolha hoje ou depois.'], true); return; }
    if (a == null || b == null) { msg([a != null ? 'Agora a saída.' : 'Toque numa noite livre ou escolha as datas.'], false); return; }
    if (b <= a) { mark(mOut, true); msg(['A saída precisa ser depois da entrada.'], true); return; }
    const r = RESP.find((x) => x.in < b && x.out > a);
    if (r) {
      mark(mIn, true); mark(mOut, true);
      msg([`Essas datas batem com ${r.block ? `o bloqueio “${r.block}”` : `a reserva de ${r.guest}`} (${fmtRange(r.in, r.out)}). Escolha outras datas.`], true);
      return;
    }
    msg([h('b', {}, fmtRange(a, b)), ` · ${nights(b - a)} · ${BRL.format((b - a) * rate())}`], false);
  }
  mIn.addEventListener('change', () => { if (mIn.value && !mOut.value) mOut.min = iso(fromIso(mIn.value) + 1); checkMobile(); });
  mOut.addEventListener('change', checkMobile);

  /* ---------- 10 · Faixa de aviso ---------- */
  $$('.banner__close').forEach((btn) => btn.addEventListener('click', () => {
    const bn = btn.closest('.banner'), title = $('#t-faixa');
    const hide = () => { bn.hidden = true; };
    if (G && !reduced()) G.to(bn, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: hide, clearProps: 'opacity' }); else hide();
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
    showToast('Aviso fechado.', { action: 'Desfazer', onAction: () => { bn.hidden = false; fadeIn(bn); btn.focus(); } });
  }));
  $('#bn-retry').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (btn.getAttribute('aria-busy') === 'true') return;
    const done = busy(btn, 'Tentando…');
    setTimeout(() => { done(); showToast('Reservas carregadas.'); }, 1400);
  });
  const offBanner = $('#bn-off'), offBtn = $('#off-toggle');
  let simOff = false;
  function paintOff() {
    const isOff = simOff || navigator.onLine === false;
    const was = !offBanner.hidden;
    offBanner.hidden = !isOff;
    offBtn.setAttribute('aria-pressed', String(simOff));
    if (isOff && !was) { fadeIn(offBanner); say('Você está sem internet. O que aparece pode estar desatualizado.'); }
    if (!isOff && was) say('A conexão voltou.');
  }
  offBtn.addEventListener('click', () => { simOff = !simOff; paintOff(); });
  addEventListener('online', paintOff);
  addEventListener('offline', paintOff);

  /* ---------- 12 · Estados de dados ---------- */
  const dsBody = $('#ds-body'), dsSub = $('#ds-sub');
  const ARR = D.RES.filter((r) => r.in === TODAY && !r.block).map((r) => {
    const prev = D.RES.find((x) => x.p === r.p && x.out === TODAY && x.clean);
    return { r, s: prev ? prev.clean.s : 'done' };
  }).sort((x, y) => x.r.arrive.localeCompare(y.r.arrive) || D.PROPS[x.r.p].name.localeCompare(D.PROPS[y.r.p].name));
  const arrRows = () => ARR.map(({ r, s }) => h('div', { class: 'arr' },
    h('span', { class: 'arr__time' }, r.arrive),
    h('span', { class: 'arr__who' }, h('b', {}, r.guest), h('span', {}, `${D.PROPS[r.p].name} · ${nights(r.out - r.in)}`)),
    h('span', { class: `chip is-${s}` }, gem(s), READY[s])));
  const skRows = () => h('div', { class: 'sk-group', 'aria-hidden': 'true', style: 'gap:var(--space-2)' }, [62, 48, 70].map((w) => h('div', { class: 'arr arr--sk' },
    h('i', { class: 'sk sk--line', style: '--w:40px' }),
    h('span', { class: 'arr__who' }, h('i', { class: 'sk sk--line', style: `--w:${w}%` }), h('i', { class: 'sk sk--thin', style: `--w:${w - 18}%` })),
    h('i', { class: 'sk sk--tag' }))));
  const head = () => `${cap(fmtDay(TODAY))} · ${ARR.length} chegadas`;
  let dsTimer = 0;
  function dsRender(state) {
    clearTimeout(dsTimer);
    dsBody.setAttribute('aria-busy', String(state === 'loading'));
    if (state === 'loading') {
      dsSub.replaceChildren('Carregando…');
      dsBody.replaceChildren(h('p', { class: 'sr' }, 'Carregando as chegadas de hoje'), skRows());
    } else if (state === 'data') {
      dsSub.replaceChildren(head());
      dsBody.replaceChildren(...arrRows());
    } else if (state === 'refresh') {
      dsSub.replaceChildren(head(), h('span', { class: 'pill pill--busy' }, h('span', { class: 'spin', 'aria-hidden': 'true' }), 'Atualizando…'));
      dsBody.replaceChildren(...arrRows());
    } else if (state === 'error') {
      dsSub.replaceChildren('Última atualização às 12:05');
      const retry = h('button', { type: 'button', class: 'btn btn--secondary btn--sm' }, ico('refresh-cw'), 'Tentar de novo');
      retry.addEventListener('click', () => {
        if (retry.getAttribute('aria-busy') === 'true') return;
        busy(retry, 'Tentando…');
        dsTimer = setTimeout(() => {
          // O botão sai da tela com a falha: o foco vai para o título do bloco, não se perde.
          const hadFocus = document.activeElement === retry;
          segDs.set('data', { silent: true });
          dsRender('data');
          if (hadFocus) { const t = $('#ds .card__title'); t.tabIndex = -1; t.focus({ preventScroll: true }); }
          say('Chegadas atualizadas.');
        }, 1200);
      });
      dsBody.replaceChildren(h('div', { class: 'banner banner--err', role: 'alert' }, ico('octagon-alert', 'banner__ico'),
        h('div', { class: 'banner__body' }, h('p', { class: 'banner__title' }, 'Não deu para atualizar as chegadas'),
          h('p', { class: 'banner__text' }, 'Confira a conexão e tente de novo. Abaixo, as chegadas como estavam às 12:05.'),
          h('p', { class: 'banner__actions' }, retry))), ...arrRows());
    } else {
      dsSub.replaceChildren(cap(fmtDay(TODAY)));
      dsBody.replaceChildren(h('p', { class: 'empty-line' }, ico('calendar-days'), h('span', {}, 'Nenhuma chegada hoje. A próxima é amanhã, às 15:00.')));
    }
    fadeIn(dsBody);
  }
  const DS_NAME = { loading: 'carregando', data: 'com dados', refresh: 'atualizando', error: 'erro', empty: 'vazio' };
  const segDs = initSeg($('#seg-ds'), (v) => { dsRender(v); say(`Estado da área: ${DS_NAME[v]}.`); });

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
  const tier = TIERS.includes(saved.tier) ? saved.tier : detectTier();
  root.dataset.theme = theme;
  root.dataset.tier = tier;
  if (saved.motion === 'reduce') root.dataset.motion = 'reduce';

  // A troca lê sempre a escolha MAIS RECENTE: se duas transições se atropelam, a ordem dos retornos não importa.
  let wantTheme = theme;
  const applyTheme = () => { if (root.dataset.theme !== wantTheme) root.dataset.theme = wantTheme; };
  const segTheme = initSeg($('#seg-theme'), (v, b) => {
    store.set('gem-theme', v);
    wantTheme = v;
    if (document.startViewTransition && !reduced() && document.visibilityState === 'visible') {
      const vt = document.startViewTransition(applyTheme);
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
    } else applyTheme();
    say(`Tema ${b.textContent}.`);
  });
  const segTier = initSeg($('#seg-tier'), (v, b) => { store.set('gem-tier', v); root.dataset.tier = v; say(`Nível de efeito: ${b.textContent}.`); });
  segTheme.set(theme, { instant: true, silent: true });
  segTier.set(tier, { instant: true, silent: true });
  syncMotion();
  syncOffsets();
  setCurrent(tocLinks[0], true);

  // Calendário começa mostrando uma escolha pronta (17 → 19 nov na Casa da Praia).
  useProp(cal.p);
  cal.a = D.d('2026-11-17');
  cal.b = D.d('2026-11-19');
  cal.focus = cal.a;
  showMonth(TODAY);
  renderAll();
  renderSlots();
  checkMobile();
  dsRender('data');
})();
