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
  };

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
    return (
      entry.saelthyr.toLowerCase().includes(q) ||
      entry.pt.toLowerCase().includes(q) ||
      (entry.notes && entry.notes.toLowerCase().includes(q))
    );
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

    if (!filtered.length) {
      list.innerHTML =
        '<p class="empty">Nenhuma entrada encontrada. Tente outro termo ou categoria.</p>';
      return;
    }
    list.innerHTML = filtered
      .map((e, i) => renderEntry(e, state.dictQuery, i))
      .join("");
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
    $$(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => setPanel(btn.dataset.panel));
    });

    $$("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => setPanel(el.dataset.goto));
    });

    $("#search")?.addEventListener("input", (e) => {
      state.dictQuery = e.target.value;
      renderDictionary();
    });

    $("#phrase-search")?.addEventListener("input", (e) => {
      state.phraseQuery = e.target.value;
      renderPhrases();
    });

    $("#chips")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.category = btn.dataset.cat;
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
    renderCustomsPanel();
    renderChips();
    renderDictionary();
    renderPhrases();
    bind();
    setPanel("inicio");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
