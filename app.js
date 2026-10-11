/* Saelthyr Dictionary — search, filter, render */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    panel: "inicio",
    dictQuery: "",
    phraseQuery: "",
    category: "all",
    limit: 120,
  };
  const PAGE = 120;

  function catLabel(id) {
    const c = SAELTHYR.categories.find((x) => x.id === id);
    return c ? c.label : id;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const q = query.trim();
    if (!q) return safe;
    try {
      const re = new RegExp(
        "(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
        "ig"
      );
      return safe.replace(re, '<span class="mark">$1</span>');
    } catch {
      return safe;
    }
  }

  function matches(entry, query, category) {
    if (category !== "all" && entry.category !== category) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    if (entry._s === undefined) {
      entry._s = (entry.saelthyr + "\u0001" + entry.pt + "\u0001" + (entry.notes || "")).toLowerCase();
    }
    return entry._s.includes(q);
  }

  function wordEntries() {
    return SAELTHYR.entries.filter((e) => e.category !== "frases");
  }

  function phraseEntries() {
    return SAELTHYR.entries.filter((e) => e.category === "frases");
  }

  function setPanel(id) {
    state.panel = id;
    $$(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.panel === id);
    });
    $$(".panel").forEach((p) => {
      const active = p.id === "panel-" + id;
      if (active) {
        /* retrigger fade/slide when switching tabs */
        p.classList.remove("active");
        void p.offsetWidth;
      }
      p.classList.toggle("active", active);
    });
    if (id === "dicionario") $("#search")?.focus();
    if (id === "frases") $("#phrase-search")?.focus();
    if (id === "rituais") $("#ritual-search")?.focus();
  }

  function toCruor(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ae/g, "\u00c6").replace(/th/g, "\u00de")
      .toUpperCase()
      .replace(/[^A-Z\u00c6\u00de ]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function renderAlphabet() {
    const grid = $("#cruor-grid");
    if (!grid) return;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => [l, l]);
    letters.push(["\u00c6", "Æ · ae"], ["\u00de", "Þ · th"]);
    grid.innerHTML = letters.map(([g, lab]) =>
      `<div class="cruor-cell"><span class="cruor cruor-glyph">${g}</span><span class="cruor-lat">${lab}</span></div>`).join("");
    const inp = $("#cruor-input"), out = $("#cruor-out");
    if (inp && out) {
      const upd = () => { out.textContent = toCruor(inp.value); };
      inp.addEventListener("input", upd);
      upd();
    }
  }

  function renderEntry(entry, query, index) {
    const notes = entry.notes
      ? `<div class="entry-notes">${highlight(entry.notes, query)}</div>`
      : "";
    const phraseClass = entry.category === "frases" ? " phrase-card" : "";
    const stagger = Math.min(index, 24);
    return `
      <article class="entry${phraseClass}" style="--i:${stagger}">
        <div class="entry-sael">${highlight(entry.saelthyr, query)}</div>
        <div class="cruor entry-cruor" aria-hidden="true">${escapeHtml(toCruor(entry.saelthyr))}</div>
        <div class="entry-pt">${highlight(entry.pt, query)}</div>
        <div class="entry-cat">${escapeHtml(catLabel(entry.category))}</div>
        ${notes}
      </article>`;
  }

  function renderDictionary() {
    const list = $("#dict-list");
    const meta = $("#dict-meta");
    if (!list) return;

    const filtered = wordEntries().filter((e) =>
      matches(e, state.dictQuery, state.category)
    );

    meta.textContent =
      filtered.length === 1
        ? "1 entrada"
        : filtered.length +
          " entradas" +
          (state.dictQuery || state.category !== "all" ? " (filtradas)" : "");

    const rit = state.dictQuery.trim() ? ritualMatches(state.dictQuery) : [];
    const ritHtml = rit.length
      ? `<p class="results-meta ritual-hit">Também em ${rit.length} ${rit.length === 1 ? "ritual" : "rituais"}: ${rit.map((r) => `<button type="button" class="chip ritual-jump" data-ritual="${escapeHtml(r.id)}">${escapeHtml(r.title)}</button>`).join(" ")}</p>`
      : "";
    if (!filtered.length) {
      list.innerHTML = ritHtml +
        '<p class="empty">Nenhuma entrada encontrada. Tente outro termo ou categoria.</p>';
      return;
    }
    const shown = filtered.slice(0, state.limit);
    let html = ritHtml + shown.map((e, i) => renderEntry(e, state.dictQuery, i)).join("");
    if (filtered.length > shown.length) {
      html += `<div class="more-wrap"><button type="button" class="nav-btn more-btn" id="dict-more">Mostrar mais (${shown.length} de ${filtered.length})</button></div>`;
    }
    list.innerHTML = html;
  }

  function renderPhrases() {
    const list = $("#phrase-list");
    const meta = $("#phrase-meta");
    if (!list) return;

    const filtered = phraseEntries().filter((e) =>
      matches(e, state.phraseQuery, "frases")
    );

    meta.textContent =
      filtered.length === 1 ? "1 frase" : filtered.length + " frases";

    if (!filtered.length) {
      list.innerHTML = '<p class="empty">Nenhuma frase encontrada.</p>';
      return;
    }
    list.innerHTML = filtered
      .map((e, i) => renderEntry(e, state.phraseQuery, i))
      .join("");
  }

  function rituals() {
    return typeof SAELTHYR_RITUALS !== "undefined" ? SAELTHYR_RITUALS : [];
  }

  function ritualText(r) {
    if (r._s === undefined) {
      r._s = [r.title, r.subtitle || "", r.category]
        .concat(r.lines.map((l) => (l.step || "") + " " + l.sael + " " + l.pt), r.notes || [])
        .join("\u0001").toLowerCase();
    }
    return r._s;
  }

  function ritualMatches(q) {
    q = (q || "").toLowerCase().trim();
    return rituals().filter((r) => !q || ritualText(r).includes(q));
  }

  function renderRituals() {
    const list = $("#ritual-list");
    const meta = $("#ritual-meta");
    if (!list) return;
    const q = state.ritualQuery || "";
    const found = ritualMatches(q);
    meta.textContent = found.length === 1 ? "1 ritual" : found.length + " rituais";
    if (!found.length) {
      list.innerHTML = '<p class="empty">Nenhum ritual encontrado.</p>';
      return;
    }
    const cruor = !!state.ritualCruor;
    list.innerHTML = found.map((r, i) => `
      <article class="ritual-card" id="ritual-${escapeHtml(r.id)}" style="--i:${Math.min(i, 24)}">
        <header class="ritual-head">
          <div>
            <h3 class="ritual-title">${highlight(r.title, q)}</h3>
            ${r.subtitle ? `<div class="ritual-sub">${highlight(r.subtitle, q)}</div>` : ""}
          </div>
          <div class="ritual-actions">
            <span class="entry-cat">${escapeHtml(r.category)}</span>
            <button type="button" class="nav-btn ritual-copy" data-copy="${escapeHtml(r.id)}">Copiar</button>
          </div>
        </header>
        <div class="ritual-lines">
          ${r.lines.map((l) => `
            ${l.step ? `<div class="ritual-step">${highlight(l.step, q)}</div>` : ""}
            <div class="ritual-line">
              <div class="ritual-sael">${highlight(l.sael, q)}</div>
              ${cruor ? `<div class="cruor ritual-cruor" aria-hidden="true">${escapeHtml(toCruor(l.sael))}</div>` : ""}
              ${l.pt ? `<div class="ritual-pt">${highlight(l.pt, q)}</div>` : ""}
            </div>`).join("")}
        </div>
        ${(r.notes || []).map((n) => `<div class="entry-notes">${highlight(n, q)}</div>`).join("")}
      </article>`).join("");
  }

  function copyRitual(id, btn) {
    const r = rituals().find((x) => x.id === id);
    if (!r) return;
    const text = r.lines.map((l) => l.sael).join("\n");
    const done = () => { btn.textContent = "Copiado"; setTimeout(() => { btn.textContent = "Copiar"; }, 1400); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch {}
    ta.remove();
  }

  function renderRules() {
    const grammar = $("#grammar-list");
    if (grammar) {
      grammar.innerHTML = SAELTHYR.grammar
        .map(
          (g) => `
        <article class="card">
          <h3>${escapeHtml(g.title)}</h3>
          <p>${escapeHtml(g.body)}</p>
        </article>`
        )
        .join("");
    }
  }

  function renderCustomsPanel() {
    const list = $("#customs-panel-list");
    if (!list) return;
    list.innerHTML = SAELTHYR.customs
      .map((c) => {
        const warn = /naryth/i.test(c.title) ? " warning-card" : "";
        return `
        <article class="card${warn}">
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.body)}</p>
        </article>`;
      })
      .join("");
  }

  function renderChips() {
    const wrap = $("#chips");
    if (!wrap) return;
    const wordCats = SAELTHYR.categories.filter((c) => c.id !== "frases");
    const chips = [{ id: "all", label: "Todas" }, ...wordCats];
    wrap.innerHTML = chips
      .map(
        (c) =>
          `<button type="button" class="chip${
            c.id === state.category ? " active" : ""
          }" data-cat="${c.id}">${escapeHtml(c.label)}</button>`
      )
      .join("");
  }

  function renderHome() {
    const words = wordEntries().length;
    const phrases = phraseEntries().length;
    const cats = SAELTHYR.categories.filter((c) => c.id !== "frases").length;
    const el = $("#home-stats");
    if (el) {
      el.innerHTML = `
        <div class="stat"><span class="stat-num">${words}</span><span class="stat-label">Palavras</span></div>
        <div class="stat"><span class="stat-num">${phrases}</span><span class="stat-label">Frases</span></div>
        <div class="stat"><span class="stat-num">${cats}</span><span class="stat-label">Categorias</span></div>
        <div class="stat"><span class="stat-num">${SAELTHYR.grammar.length}</span><span class="stat-label">Regras</span></div>
      `;
    }
    const blurb = $("#home-blurb");
    if (blurb) blurb.textContent = SAELTHYR.meta.description;
  }

  function bind() {
    $$(".nav-btn[data-panel]").forEach((btn) => {
      btn.addEventListener("click", () => setPanel(btn.dataset.panel));
    });

    $$("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => setPanel(el.dataset.goto));
    });

    $("#search")?.addEventListener("input", (e) => {
      state.dictQuery = e.target.value;
      state.limit = PAGE;
      clearTimeout(state._t);
      state._t = setTimeout(renderDictionary, 80);
    });

    $("#dict-list")?.addEventListener("click", (e) => {
      const jump = e.target.closest(".ritual-jump");
      if (jump) {
        state.ritualQuery = state.dictQuery;
        const rs = $("#ritual-search");
        if (rs) rs.value = state.dictQuery;
        renderRituals();
        setPanel("rituais");
        document.getElementById("ritual-" + jump.dataset.ritual)?.scrollIntoView({ block: "start" });
        return;
      }
      if (!e.target.closest("#dict-more")) return;
      state.limit += PAGE * 4;
      renderDictionary();
    });

    $("#phrase-search")?.addEventListener("input", (e) => {
      state.phraseQuery = e.target.value;
      renderPhrases();
    });

    $("#ritual-search")?.addEventListener("input", (e) => {
      state.ritualQuery = e.target.value;
      renderRituals();
    });

    $("#ritual-cruor")?.addEventListener("change", (e) => {
      state.ritualCruor = e.target.checked;
      renderRituals();
    });

    $("#ritual-list")?.addEventListener("click", (e) => {
      const b = e.target.closest(".ritual-copy");
      if (b) copyRitual(b.dataset.copy, b);
    });

    $("#chips")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.category = btn.dataset.cat;
      state.limit = PAGE;
      renderChips();
      renderDictionary();
    });
  }

  function init() {
    if (typeof SAELTHYR === "undefined") {
      document.body.innerHTML =
        "<p style='color:#f87171;padding:2rem;font-family:sans-serif'>Erro: data.js não carregou.</p>";
      return;
    }

    document.title = SAELTHYR.meta.name + " — Dicionário";
    const h1 = $("#site-title");
    if (h1) h1.textContent = SAELTHYR.meta.name;
    const sub = $("#site-subtitle");
    if (sub) sub.textContent = SAELTHYR.meta.subtitle;

    renderHome();
    renderRules();
    renderAlphabet();
    renderCustomsPanel();
    renderChips();
    renderDictionary();
    renderPhrases();
    renderRituals();
    bind();
    setPanel("inicio");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
