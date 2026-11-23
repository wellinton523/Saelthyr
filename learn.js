/* Saelthyr — Iniciação: caminho de selos, exercícios, Véu, Ressonância e Vigília (localStorage, sem conta) */
(function () {
  "use strict";

  const LS = "saelthyr.iniciacao.v1";
  const DAILY_GOAL = 30;
  const VEIL_MAX = 3;
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let A = null, root = null;

  /* ---------- estado ---------- */
  const S = { done: {}, res: 0, veil: VEIL_MAX, veilDay: "", vig: { count: 0, last: "" }, daily: { day: "", res: 0 }, sound: false };
  try { const saved = JSON.parse(localStorage.getItem(LS) || "{}"); Object.assign(S, saved); S.vig = Object.assign({ count: 0, last: "" }, saved.vig); S.daily = Object.assign({ day: "", res: 0 }, saved.daily); } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} };

  function dayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
  function refreshDay() {
    const t = dayStr();
    if (S.veilDay !== t) { S.veil = VEIL_MAX; S.veilDay = t; }
    if (S.daily.day !== t) { S.daily = { day: t, res: 0 }; }
    save();
  }
  function vigilState() {
    const t = dayStr();
    if (S.vig.last === t) return { lit: "lit", count: S.vig.count };
    if (S.vig.last === yesterday()) return { lit: "ember", count: S.vig.count };
    return { lit: "out", count: 0 };
  }
  function keepVigil() {
    const t = dayStr();
    if (S.vig.last === t) return;
    S.vig.count = S.vig.last === yesterday() ? S.vig.count + 1 : 1;
    S.vig.last = t;
  }

  /* ---------- dados ---------- */
  const DATA = typeof SAELTHYR_LESSONS !== "undefined" ? SAELTHYR_LESSONS : { units: [] };
  const FLAT = [];
  DATA.units.forEach((u, ui) => u.lessons.forEach((l, li) => FLAT.push({ unit: u, ui, lesson: l, li })));
  const isDone = (id) => !!S.done[id];
  const flatIndex = (id) => FLAT.findIndex((f) => f.lesson.id === id);
  const currentIndex = () => { const i = FLAT.findIndex((f) => !isDone(f.lesson.id)); return i < 0 ? FLAT.length : i; };
  const unlocked = (id) => flatIndex(id) <= currentIndex();

  const ALL_VOCAB = [];
  DATA.units.forEach((u) => u.lessons.forEach((l) => (l.vocab || []).concat(l.words || []).forEach((v) => { if (!ALL_VOCAB.some((x) => x[0] === v[0])) ALL_VOCAB.push(v); })));
  const ALL_SENT = [];
  DATA.units.forEach((u) => u.lessons.forEach((l) => (l.sentences || []).forEach((s) => ALL_SENT.push(s))));
  const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWYZ".split("").concat(["Æ", "Þ"]);
  const latinOf = (g) => (g === "Æ" ? "ae" : g === "Þ" ? "th" : g.toLowerCase());

  /* ---------- utilidades ---------- */
  const rnd = (n) => Math.floor(Math.random() * n);
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pick(arr, n, exclude) { return shuffle(arr.filter((x) => !(exclude || []).includes(x))).slice(0, n); }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\([^)]*\)/g, " ").replace(/[.,;:!?¿¡"“”'’…]/g, " ").replace(/-/g, "").replace(/\s+/g, " ").trim();
  }
  const PT_ART = /\b(o|a|os|as|um|uma|uns|umas)\b/g;
  function normPT(s) { return norm(s).replace(PT_ART, " ").replace(/\s+/g, " ").trim(); }
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  function alts(pt) { return String(pt).split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean); }
  function words(s) { return String(s).replace(/[.,;:!?]/g, " ").split(/\s+/).filter(Boolean); }
  const keepCase = (w) => /^(Preirt|Aelthyr|Aelqor|Thael)$/.test(w.replace(/[.,;!?]/g, ""));
  const tileWord = (w) => (keepCase(w) ? w : w.toLowerCase());

  /* ---------- geração de exercícios ---------- */
  function mcVocab(v, dir, pool) {
    // dir: s2p (mostra saelthyr), p2s (mostra pt), c2p (mostra cruorthyr), c2s (cruorthyr → latim)
    const others = pool.filter((x) => x[0] !== v[0] && x[1] !== v[1]);
    const dis = pick(others, 3);
    const opts = shuffle([v].concat(dis));
    const q = dir === "p2s" ? { text: v[1], mode: "pt" } : dir === "s2p" ? { text: v[0], mode: "sael" } : { text: v[0], mode: "cruor" };
    const optMode = dir === "p2s" ? (Math.random() < 0.35 ? "cruor" : "sael") : dir === "c2s" ? "sael" : "pt";
    const instr = { s2p: "O que significa?", p2s: "Como se diz em Saelthyr?", c2p: "Leia o Cruorthyr. O que significa?", c2s: "Leia o Cruorthyr. Qual é a palavra?" }[dir];
    return { type: "mc", instr, q, options: opts.map((o) => ({ label: optMode === "pt" ? o[1] : o[0], mode: optMode })), correct: opts.indexOf(v), reveal: { sael: v[0], pt: v[1] }, dict: v[0] };
  }
  function mcGlyph(g) {
    const dis = pick(LETTERS, 3, [g]);
    const opts = shuffle([g].concat(dis));
    return { type: "mc", instr: "Que letra é esta?", q: { text: g, mode: "glyph" }, options: opts.map((o) => ({ label: latinOf(o), mode: "sael" })), correct: opts.indexOf(g), reveal: { sael: latinOf(g), pt: "letra " + latinOf(g) } };
  }
  function matchEx(pairs, mode) {
    return { type: "match", instr: mode === "glyph" ? "Ligue cada sinal à sua letra" : "Sele os pares", pairs: pairs.slice(0, 5), mode, reveal: null };
  }
  function buildEx(s, toSael, poolSent) {
    const target = toSael ? s[0] : s[1];
    const tokens = words(target).map(tileWord);
    const otherWords = [];
    poolSent.forEach((o) => { if (o[0] !== s[0]) words(toSael ? o[0] : o[1]).forEach((w) => { w = tileWord(w); if (!tokens.includes(w) && !otherWords.includes(w)) otherWords.push(w); }); });
    if (toSael) ALL_VOCAB.forEach((v) => { if (!/\s/.test(v[0]) && !tokens.includes(v[0]) && !otherWords.includes(v[0])) otherWords.push(v[0]); });
    const dis = pick(otherWords, tokens.length > 5 ? 2 : 3);
    return { type: "build", instr: toSael ? "Monte a frase em Saelthyr" : "Monte a frase em português", prompt: toSael ? s[1] : s[0], promptMode: toSael ? "pt" : "sael",
      tokens, bank: shuffle(tokens.concat(dis)), toSael, reveal: { sael: s[0], pt: s[1] } };
  }
  function typeEx(item, toSael, isSentence) {
    return { type: "type", instr: toSael ? "Escreva em Saelthyr" : "Escreva em português", prompt: toSael ? item[1] : item[0], promptMode: toSael ? "pt" : "sael",
      answers: toSael ? [item[0]] : alts(item[1]), toSael, isSentence, reveal: { sael: item[0], pt: item[1] }, dict: isSentence ? null : item[0] };
  }
  function typeGlyph(g) {
    return { type: "type", instr: "Escreva em letras latinas", prompt: g, promptMode: "glyph", answers: [latinOf(g)], toSael: true, reveal: { sael: latinOf(g), pt: "letra " + latinOf(g) } };
  }
  function typeReadWord(v) {
    return { type: "type", instr: "Leia o Cruorthyr e escreva a palavra", prompt: v[0], promptMode: "cruor", answers: [v[0]], toSael: true, reveal: { sael: v[0], pt: v[1] }, dict: v[0] };
  }

  function buildExercises(l, unit) {
    const ex = [];
    const tip = l.tip || "";
    if (l.kind === "glyphs") {
      const gs = l.glyphs;
      shuffle(gs).forEach((g) => ex.push(mcGlyph(g)));
      if (gs.length >= 4) ex.push(matchEx(pick(gs, 4).map((g) => [g, latinOf(g)]), "glyph"));
      pick(gs, gs.length > 3 ? 2 : 1).forEach((g) => ex.push(typeGlyph(g)));
      (l.words || []).forEach((v, i) => ex.push(i % 2 ? typeReadWord(v) : mcVocab(v, "c2s", ALL_VOCAB)));
      if (l.words && l.words.length >= 4) ex.push(matchEx(l.words.map((v) => [v[0], v[1]]), "cruor"));
    } else {
      const vocab = (l.vocab || []).slice();
      const pool = ALL_VOCAB;
      const vs = shuffle(vocab).slice(0, 5);
      const dirs = l.kind === "words" ? ["c2s", "s2p", "c2p", "p2s", "c2s"] : ["s2p", "p2s", "c2p", "p2s", "s2p"];
      vs.forEach((v, i) => ex.push(mcVocab(v, dirs[i % dirs.length], pool)));
      if (vocab.length >= 3) ex.splice(2, 0, matchEx(pick(vocab, Math.min(5, vocab.length)).map((v) => [v[0], v[1]]), l.kind === "words" ? "cruor" : "sael"));
      const sents = shuffle(l.sentences || []);
      const unitSent = [].concat(...unit.lessons.map((x) => x.sentences || []));
      sents.forEach((s, i) => ex.push(buildEx(s, i !== 1 || sents.length < 3, unitSent.length > 3 ? unitSent : ALL_SENT)));
      if (sents.length) ex.push(typeEx(sents[sents.length - 1], true, true));
      const tv = vocab.filter((v) => !/\s/.test(v[0]));
      if (tv.length) ex.push(typeEx(tv[rnd(tv.length)], Math.random() < 0.6, false));
      if (l.kind === "words") vocab.slice(0, 2).forEach((v) => ex.push(typeReadWord(v)));
    }
    ex.forEach((e) => { e.tip = e.tip || tip; });
    return ex.slice(0, 12);
  }

  function buildReview() {
    const doneL = FLAT.filter((f) => isDone(f.lesson.id) && f.lesson.kind !== "glyphs");
    const voc = [], sen = [];
    doneL.forEach((f) => { (f.lesson.vocab || []).forEach((v) => voc.push(v)); (f.lesson.sentences || []).forEach((s) => sen.push(s)); });
    if (!voc.length) {
      // ainda só o alfabeto: revisa sinais
      const gs = LETTERS.slice(0, 12);
      return pick(gs, 6).map((g) => Object.assign(mcGlyph(g), { tip: "Revisão do Cruorthyr." })).concat([matchEx(pick(gs, 4).map((g) => [g, latinOf(g)]), "glyph")]);
    }
    const ex = [];
    pick(voc, 4).forEach((v, i) => ex.push(mcVocab(v, ["s2p", "p2s", "c2p", "p2s"][i], ALL_VOCAB)));
    if (voc.length >= 4) ex.push(matchEx(pick(voc, 4).map((v) => [v[0], v[1]]), "sael"));
    pick(sen, 3).forEach((s) => ex.push(buildEx(s, true, ALL_SENT)));
    ex.forEach((e) => { e.tip = e.tip || "Revisão: o véu se recose a cada acerto."; });
    return shuffle(ex).slice(0, 9);
  }

  /* ---------- som (desligado por padrão) ---------- */
  let actx = null;
  function tone(ok) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = ok ? 392 : 98;
      g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.12, actx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (ok ? 0.45 : 0.3));
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.5);
    } catch (e) {}
  }

  /* ---------- HUD ---------- */
  function veilHTML(v) {
    let h = '<span class="veil" role="img" aria-label="Véu: ' + v + ' de ' + VEIL_MAX + '">';
    for (let i = 0; i < VEIL_MAX; i++) h += `<span class="veil-pane${i < v ? "" : " torn"}"></span>`;
    return h + "</span>";
  }
  function hudHTML() {
    const vg = vigilState();
    const lvl = S.res % 100;
    const vigText = vg.lit === "lit" ? `${vg.count} ${vg.count === 1 ? "noite" : "noites"}` : vg.lit === "ember" ? `${vg.count} · brasa acesa` : "apagada";
    return `<div class="ini-hud">
      <div class="hud-item hud-vigil" title="Vigília: dias seguidos de estudo">
        <span class="candle ${vg.lit}" aria-hidden="true"><span class="candle-flame"></span></span>
        <span class="hud-text"><span class="hud-label">Vigília</span><span class="hud-val">${vigText}</span></span>
      </div>
      <div class="hud-item hud-res" title="Ressonância acumulada">
        <span class="hud-text"><span class="hud-label">Ressonância</span><span class="hud-val">${S.res}</span></span>
        <span class="res-line" aria-hidden="true"><span style="width:${lvl}%"></span></span>
        <span class="hud-goal">hoje ${Math.min(S.daily.res, DAILY_GOAL)}/${DAILY_GOAL}</span>
      </div>
      <div class="hud-item hud-veil" title="Véu: rasga a cada erro, recose a cada acerto e a cada novo dia">
        <span class="hud-text"><span class="hud-label">Véu</span></span>${veilHTML(S.veil)}
      </div>
      <button type="button" class="hud-sound" id="ini-sound" aria-pressed="${S.sound}" title="Som">${S.sound ? "som: ligado" : "som: desligado"}</button>
    </div>`;
  }

  /* ---------- caminho ---------- */
  const SWAY = [0, 34, 52, 34, 0, -34, -52, -34];
  function renderPath(focusId) {
    refreshDay();
    const cur = currentIndex();
    let k = 0, html = hudHTML() + '<div class="ini-path"><span class="ini-thread" aria-hidden="true"></span>';
    DATA.units.forEach((u, ui) => {
      const firstIdx = flatIndex(u.lessons[0].id);
      const uLocked = firstIdx > cur;
      const uDone = u.lessons.every((l) => isDone(l.id));
      html += `<header class="ini-unit${uLocked ? " locked" : ""}${uDone ? " done" : ""}">
        <span class="ini-unit-num">${ROMAN[ui]}</span>
        <div><h3>${esc(u.title)}</h3><p>${esc(u.intro)}</p></div>
        <span class="cruor ini-unit-sigil" aria-hidden="true">${esc(u.sigil || "")}</span>
      </header>`;
      u.lessons.forEach((l) => {
        const i = flatIndex(l.id);
        const st = isDone(l.id) ? "done" : i === cur ? "current" : "locked";
        const glyph = l.kind === "glyphs" ? l.glyphs[0] : A.toCruor((l.vocab && l.vocab[0] && l.vocab[0][0]) || "s").split(" ")[0].slice(0, 3);
        html += `<div class="seal-row" style="--x:${SWAY[k++ % SWAY.length]}px">
          <button type="button" class="seal ${st}" data-lesson="${esc(l.id)}" aria-label="${esc(l.title)} — ${st === "done" ? "selado" : st === "current" ? "selo atual" : "fechado"}">
            <span class="seal-ring"></span><span class="cruor seal-core" aria-hidden="true">${esc(glyph)}</span>
            ${st === "locked" ? '<span class="seal-crack" aria-hidden="true"></span><span class="seal-veil" aria-hidden="true"></span>' : ""}
          </button>
          <span class="seal-label">${esc(l.title)}</span>
        </div>`;
      });
    });
    html += `</div><div class="ini-foot">
      <button type="button" class="nav-btn" id="ini-review">Vigília de revisão</button>
      <p class="ini-note">Revisa o que você já selou. Não rasga o véu, e cada acerto o recose.</p>
      <button type="button" class="ini-reset" id="ini-reset">Recomeçar a iniciação</button>
    </div><div class="ini-sheet" id="ini-sheet" hidden></div>`;
    root.innerHTML = html;
    const target = focusId ? root.querySelector(`[data-lesson="${focusId}"]`) : root.querySelector(".seal.current");
    if (target && focusId) { target.classList.add("just-sealed"); }
  }

  function openSheet(id) {
    const f = FLAT[flatIndex(id)]; if (!f) return;
    const sheet = $("#ini-sheet");
    const locked = !unlocked(id);
    const n = f.lesson.kind === "glyphs" ? f.lesson.glyphs.length : (f.lesson.vocab || []).length;
    let body;
    if (locked) body = `<p class="sheet-msg">Selo fechado. Rompa os selos anteriores para descer até aqui.</p>`;
    else if (S.veil <= 0) body = `<p class="sheet-msg">O véu está rompido. Faça uma vigília de revisão para recosê-lo, ou volte amanhã.</p><button type="button" class="ini-primary" data-review>Vigília de revisão</button>`;
    else body = `<p class="sheet-tip">${esc(f.lesson.tip || "")}</p>
      <p class="sheet-meta">${f.lesson.kind === "glyphs" ? n + " sinais" : n + " palavras"}${f.lesson.sentences ? " · " + f.lesson.sentences.length + " frases" : ""}${isDone(id) ? " · já selado (repetir dá ressonância)" : ""}</p>
      <button type="button" class="ini-primary" data-start="${esc(id)}">${isDone(id) ? "Repetir o rito" : "Começar o rito"}</button>`;
    sheet.innerHTML = `<div class="sheet-card">
      <button type="button" class="sheet-x" data-close aria-label="Fechar">×</button>
      <div class="sheet-unit">${ROMAN[f.ui]} · ${esc(f.unit.title)}</div>
      <h3 class="sheet-title">${esc(f.lesson.title)}</h3>${body}</div>`;
    sheet.hidden = false;
  }

  /* ---------- sessão ---------- */
  let run = null;
  function startLesson(id) {
    const f = FLAT[flatIndex(id)];
    run = { id, review: false, f, queue: buildExercises(f.lesson, f.unit), idx: 0, first: 0, misses: 0, requeued: new Set() };
    run.total = run.queue.length;
    renderRun();
  }
  function startReview() {
    run = { id: null, review: true, queue: buildReview(), idx: 0, first: 0, misses: 0, requeued: new Set() };
    run.total = run.queue.length;
    renderRun();
  }

  function promptHTML(text, mode) {
    if (mode === "glyph") return `<div class="q-glyph cruor">${esc(text)}</div>`;
    if (mode === "cruor") return `<div class="q-cruor cruor">${esc(A.toCruor(text))}</div>`;
    if (mode === "sael") return `<div class="q-sael">${esc(text)}</div><div class="q-sub cruor">${esc(A.toCruor(text))}</div>`;
    return `<div class="q-pt">${esc(text)}</div>`;
  }

  function renderRun() {
    const ex = run.queue[run.idx];
    const pct = Math.round((Math.min(run.idx, run.total) / run.total) * 100);
    root.innerHTML = `<div class="ini-lesson">
      <div class="ini-top">
        <button type="button" class="ini-close" id="ini-close" aria-label="Sair do rito">×</button>
        <div class="ini-progress" aria-label="Progresso"><span style="width:${pct}%"></span></div>
        ${run.review ? '<span class="hud-label">revisão</span>' : ""}${veilHTML(S.veil)}
      </div>
      <div class="ini-card" id="ini-card" style="--i:0">
        <p class="ini-instr">${esc(ex.instr)}</p>
        <div class="ini-ex" id="ini-ex"></div>
      </div>
      <div class="ini-actions"><button type="button" class="ini-primary" id="ini-check" disabled>Verificar</button></div>
      <div class="ini-fb" id="ini-fb" hidden aria-live="polite"></div>
    </div>`;
    const box = $("#ini-ex");
    run.answer = null;
    ({ mc: renderMC, build: renderBuild, type: renderType, match: renderMatch })[ex.type](box, ex);
  }

  function setReady(v) { const b = $("#ini-check"); if (b) b.disabled = !v; }

  function renderMC(box, ex) {
    box.innerHTML = `<div class="ini-q">${promptHTML(ex.q.text, ex.q.mode)}</div>
      <div class="mc-grid">${ex.options.map((o, i) => `<button type="button" class="mc-opt" data-i="${i}">
        ${o.mode === "cruor" ? `<span class="cruor mc-cruor">${esc(A.toCruor(o.label))}</span>` : `<span class="${o.mode === "sael" ? "mc-sael" : "mc-pt"}">${esc(o.label)}</span>`}
      </button>`).join("")}</div>`;
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".mc-opt"); if (!b || run.locked) return;
      $$(".mc-opt", box).forEach((x) => x.classList.toggle("picked", x === b));
      run.answer = +b.dataset.i; setReady(true);
    });
  }

  function renderBuild(box, ex) {
    const placed = [];
    box.innerHTML = `<div class="ini-q">${promptHTML(ex.prompt, ex.promptMode)}</div>
      <div class="build-answer" id="build-answer" aria-label="Sua frase"><span class="build-hint">toque nas tábuas para montar</span></div>
      ${ex.toSael ? '<div class="cruor build-cruor" id="build-cruor" aria-hidden="true"></div>' : ""}
      <div class="build-bank" id="build-bank">${ex.bank.map((w, i) => tabletHTML(w, i, ex.toSael)).join("")}</div>`;
    const ans = $("#build-answer", box), bank = $("#build-bank", box);
    const sync = () => {
      ans.querySelector(".build-hint").style.display = placed.length ? "none" : "";
      ans.classList.toggle("joined", placed.length > 0);
      const txt = placed.map((i) => ex.bank[i]).join(" ");
      const c = $("#build-cruor", box); if (c) c.textContent = A.toCruor(txt);
      run.answer = txt; setReady(placed.length > 0);
    };
    bank.addEventListener("click", (e) => {
      const t = e.target.closest(".tablet"); if (!t || t.classList.contains("used") || run.locked) return;
      const i = +t.dataset.i; placed.push(i); t.classList.add("used");
      const n = document.createElement("div"); n.innerHTML = tabletHTML(ex.bank[i], i, ex.toSael); const el = n.firstChild; el.classList.add("placed");
      ans.appendChild(el); sync();
    });
    ans.addEventListener("click", (e) => {
      const t = e.target.closest(".tablet"); if (!t || run.locked) return;
      const i = +t.dataset.i; placed.splice(placed.indexOf(i), 1); t.remove();
      const b = bank.querySelector(`.tablet[data-i="${i}"]`); if (b) b.classList.remove("used"); sync();
    });
  }
  function tabletHTML(w, i, sael) {
    return `<button type="button" class="tablet" data-i="${i}"><span class="tablet-word">${esc(w)}</span>${sael ? `<span class="cruor tablet-cruor" aria-hidden="true">${esc(A.toCruor(w))}</span>` : ""}</button>`;
  }

  function renderType(box, ex) {
    box.innerHTML = `<div class="ini-q">${promptHTML(ex.prompt, ex.promptMode)}</div>
      <div class="search-wrap type-wrap"><input type="text" id="type-in" class="type-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ex.toSael ? "em Saelthyr…" : "em português…"}" /></div>
      ${ex.toSael ? '<div class="cruor type-cruor" id="type-cruor" aria-hidden="true"></div>' : ""}`;
    const inp = $("#type-in", box);
    inp.addEventListener("input", () => { run.answer = inp.value; setReady(!!inp.value.trim()); const c = $("#type-cruor", box); if (c) c.textContent = A.toCruor(inp.value); });
    setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }

  function renderMatch(box, ex) {
    const left = shuffle(ex.pairs.map((p, i) => ({ t: p[0], i }))), right = shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
    const lHTML = (o) => ex.mode === "glyph" ? `<span class="cruor match-glyph">${esc(o.t)}</span>` : ex.mode === "cruor" ? `<span class="cruor match-cruor">${esc(A.toCruor(o.t))}</span>` : `<span class="match-sael">${esc(o.t)}</span><span class="cruor match-mini">${esc(A.toCruor(o.t))}</span>`;
    box.innerHTML = `<div class="match" id="match"><svg class="match-svg" id="match-svg" aria-hidden="true"></svg>
      <div class="match-col">${left.map((o) => `<button type="button" class="match-btn" data-side="l" data-i="${o.i}">${lHTML(o)}</button>`).join("")}</div>
      <div class="match-col">${right.map((o) => `<button type="button" class="match-btn" data-side="r" data-i="${o.i}"><span class="match-pt">${esc(o.t)}</span></button>`).join("")}</div></div>`;
    const m = $("#match", box), svg = $("#match-svg", box);
    let sel = null, sealed = 0; const links = [];
    const draw = () => {
      const r = m.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      svg.innerHTML = links.map(([a, b]) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const x1 = ra.right - r.left, y1 = ra.top + ra.height / 2 - r.top, x2 = rb.left - r.left, y2 = rb.top + rb.height / 2 - r.top;
        const mx = (x1 + x2) / 2;
        return `<path class="thread" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
      }).join("");
    };
    window.addEventListener("resize", draw);
    m.addEventListener("click", (e) => {
      const b = e.target.closest(".match-btn"); if (!b || b.classList.contains("sealed") || run.locked) return;
      if (!sel || sel.dataset.side === b.dataset.side) { $$(".match-btn.sel", m).forEach((x) => x.classList.remove("sel")); sel = b; b.classList.add("sel"); return; }
      const a = sel; sel = null; a.classList.remove("sel");
      if (a.dataset.i === b.dataset.i) {
        a.classList.add("sealed"); b.classList.add("sealed");
        links.push(a.dataset.side === "l" ? [a, b] : [b, a]); draw(); sealed++; tone(true);
        if (sealed === ex.pairs.length) { run.answer = "ok"; setTimeout(() => check(), 380); }
      } else {
        [a, b].forEach((x) => { x.classList.remove("shake"); void x.offsetWidth; x.classList.add("shake"); });
        run.matchMiss = (run.matchMiss || 0) + 1;
      }
    });
  }

  function acceptsLexicon(typed, toSael, reveal) {
    const lookup = window.SaelthyrApp && window.SaelthyrApp.lookup;
    if (!lookup || !reveal) return false;
    const hits = lookup(typed) || [];
    if (toSael) {
      const want = normPT(reveal.pt);
      return hits.some((h) => norm(h.saelthyr) === norm(typed) && alts(h.pt).some((a) => normPT(a) === want));
    }
    const want = norm(reveal.sael);
    return hits.some((h) => norm(h.saelthyr) === want && alts(h.pt).some((a) => normPT(a) === normPT(typed)));
  }

  function evaluate(ex) {
    if (ex.type === "mc") return { ok: run.answer === ex.correct };
    if (ex.type === "match") return { ok: true };
    if (ex.type === "build") return { ok: norm(run.answer) === norm(ex.tokens.join(" ")) };
    if (ex.type === "type") {
      const f = ex.toSael ? norm : normPT;
      const got = f(run.answer);
      for (const a of ex.answers) {
        const want = f(a);
        if (got === want) return { ok: true };
        const tol = want.length <= 4 ? 0 : want.length <= 10 ? 1 : 2;
        if (lev(got, want) <= tol) return { ok: true, near: true };
      }
      if (acceptsLexicon(run.answer, ex.toSael, ex.reveal)) return { ok: true };
      return { ok: false };
    }
    return { ok: false };
  }

  function check() {
    if (run.locked) return;
    const ex = run.queue[run.idx];
    const r = evaluate(ex);
    run.locked = true;
    const firstTry = !ex._retry;
    if (r.ok) {
      if (firstTry) run.first++;
      if (S.veil < VEIL_MAX) S.veil++;
    } else {
      run.misses++;
      S.veil = run.review ? Math.max(1, S.veil - 1) : Math.max(0, S.veil - 1);
      if (!run.requeued.has(run.idx)) { run.requeued.add(run.idx); run.queue.push(Object.assign({}, ex, { _retry: true })); run.total = run.queue.length; }
    }
    save();
    tone(r.ok);
    const card = $("#ini-card");
    card.classList.remove("ok", "bad"); void card.offsetWidth; card.classList.add(r.ok ? "ok" : "bad");
    $$(".mc-opt").forEach((b) => { const i = +b.dataset.i; if (i === ex.correct) b.classList.add("right"); else if (b.classList.contains("picked") && !r.ok) b.classList.add("wrong"); });
    const top = $(".ini-top .veil"); if (top) top.outerHTML = veilHTML(S.veil);
    const rv = ex.reveal;
    const fb = $("#ini-fb");
    fb.className = "ini-fb " + (r.ok ? "ok" : "bad");
    fb.innerHTML = `<div class="fb-head"><span class="fb-seal" aria-hidden="true"></span><strong>${r.ok ? (r.near ? "Selo feito, quase exato" : "Selo feito") : "O véu racha"}</strong></div>
      ${rv ? `<div class="fb-form"><span class="fb-label">Forma correta</span>
        <div class="fb-sael">${esc(rv.sael)}</div><div class="cruor fb-cruor">${esc(A.toCruor(rv.sael))}</div><div class="fb-pt">${esc(rv.pt)}</div></div>` : ""}
      ${ex.tip ? `<p class="fb-tip">${esc(ex.tip)}</p>` : ""}
      <div class="fb-actions">${ex.dict ? `<button type="button" class="tr-mini" data-dict="${esc(ex.dict)}">Ver no Dicionário</button>` : ""}
      <button type="button" class="ini-primary" id="ini-next">Continuar</button></div>`;
    fb.hidden = false;
    $("#ini-check").parentElement.hidden = true;
    setTimeout(() => { try { $("#ini-next").focus({ preventScroll: true }); } catch (e) {} }, 40);
    if (!run.review && S.veil <= 0) run.broken = true;
  }

  function next() {
    run.locked = false;
    if (run.broken) return renderBroken();
    run.idx++;
    if (run.idx >= run.queue.length) return finish();
    renderRun();
  }

  function renderBroken() {
    root.innerHTML = `<div class="ini-end broken">
      <div class="end-veil torn" aria-hidden="true"><span></span><span></span></div>
      <h3 class="end-title">O véu se rompeu</h3>
      <p class="end-text">Três erros sem acerto entre eles. Faça uma vigília de revisão para recosê-lo, ou volte amanhã: a cada novo dia o véu amanhece inteiro.</p>
      <div class="end-actions"><button type="button" class="ini-primary" data-review>Vigília de revisão</button><button type="button" class="nav-btn" data-path>Voltar ao caminho</button></div>
    </div>`;
    run = null;
  }

  function finish() {
    const acc = Math.round((run.first / Math.max(1, run.queue.filter((e) => !e._retry).length)) * 100);
    const gain = run.review ? 6 + run.first : 8 + run.first * 2;
    S.res += gain; S.daily.res += gain;
    if (run.review) S.veil = VEIL_MAX;
    let unitDone = null;
    if (!run.review) {
      const wasDone = isDone(run.id);
      S.done[run.id] = true;
      const u = run.f.unit;
      if (!wasDone && u.lessons.every((l) => isDone(l.id))) unitDone = u;
    }
    keepVigil(); save();
    const vg = vigilState();
    const nxt = FLAT[currentIndex()];
    root.innerHTML = `<div class="ini-end${unitDone ? " unit" : ""}">
      ${unitDone ? '<div class="end-veil" aria-hidden="true"><span></span><span></span></div>' : '<div class="end-seal" aria-hidden="true"><span class="cruor">SÆL</span></div>'}
      <h3 class="end-title">${unitDone ? "Unidade selada: " + esc(unitDone.title) : run.review ? "Vigília cumprida" : "Rito concluído"}</h3>
      <p class="end-text">${run.review ? "O véu foi recosido." : esc(run.f.lesson.title) + " está selado."}</p>
      <div class="end-stats">
        <div class="stat"><span class="stat-num">+${gain}</span><span class="stat-label">Ressonância</span></div>
        <div class="stat"><span class="stat-num">${acc}%</span><span class="stat-label">Precisão</span></div>
        <div class="stat"><span class="stat-num">${vg.count}</span><span class="stat-label">Vigília</span></div>
      </div>
      <div class="end-actions">
        ${nxt && !run.review ? `<button type="button" class="ini-primary" data-start="${esc(nxt.lesson.id)}">Próximo selo: ${esc(nxt.lesson.title)}</button>` : ""}
        <button type="button" class="nav-btn" data-path="${run.review ? "" : esc(run.id)}">Voltar ao caminho</button>
      </div>
    </div>`;
    run = null;
  }

  /* ---------- eventos ---------- */
  function bind() {
    root.addEventListener("click", (e) => {
      const t = e.target;
      const seal = t.closest(".seal"); if (seal) return openSheet(seal.dataset.lesson);
      if (t.closest("[data-close]") || t.id === "ini-sheet") { $("#ini-sheet").hidden = true; return; }
      const st = t.closest("[data-start]"); if (st) { if (S.veil <= 0) { renderPath(); return openSheet(st.dataset.start); } return startLesson(st.dataset.start); }
      if (t.closest("[data-review]") || t.closest("#ini-review")) return startReview();
      const p = t.closest("[data-path]"); if (p) return renderPath(p.dataset.path || null);
      if (t.closest("#ini-close")) { if (!run || run.idx === 0 || confirm("Sair do rito? O progresso desta lição se perde.")) { run = null; renderPath(); } return; }
      if (t.closest("#ini-check")) return check();
      if (t.closest("#ini-next")) return next();
      const d = t.closest("[data-dict]"); if (d) return A.openInDictionary(d.dataset.dict);
      if (t.closest("#ini-sound")) { S.sound = !S.sound; save(); const b = $("#ini-sound"); b.setAttribute("aria-pressed", S.sound); b.textContent = S.sound ? "som: ligado" : "som: desligado"; return; }
      if (t.closest("#ini-reset")) { if (confirm("Apagar todo o progresso da Iniciação neste navegador?")) { S.done = {}; S.res = 0; S.veil = VEIL_MAX; S.vig = { count: 0, last: "" }; S.daily = { day: dayStr(), res: 0 }; save(); renderPath(); } }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !run) return;
      const fb = $("#ini-fb");
      if (fb && !fb.hidden) { e.preventDefault(); next(); }
      else if (!$("#ini-check").disabled) { e.preventDefault(); check(); }
    });
  }

  function boot() {
    A = window.SaelthyrApp; root = $("#ini-root");
    if (!A || !root) return;
    bind(); renderPath();
    document.addEventListener("saelthyr:panel", (e) => { if (e.detail && e.detail.id === "iniciacao" && !run) renderPath(); });
  }

  window.SaelthyrInitiation = { current: () => run, buildExercises: (id) => { const f = FLAT[flatIndex(id)]; return buildExercises(f.lesson, f.unit); }, flat: FLAT, state: S, startLesson: (id) => startLesson(id), evaluate: (ex, ans) => { run = run || { answer: null }; run.answer = ans; return evaluate(ex); } };
  window.SaelthyrIniciacao = { accepts: acceptsLexicon };

  if (window.SaelthyrApp) boot(); else document.addEventListener("saelthyr:ready", boot);
})();
