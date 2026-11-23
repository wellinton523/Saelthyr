/* Saelthyr — palavras acrescentadas no navegador e publicadas em words-user.json */
(function () {
  "use strict";

  const LS_WORDS = "saelthyr.userwords.v1";
  const LS_TOKEN = "saelthyr.github.token";
  const REPO = "wellinton523/Saelthyr";
  const BRANCH = "main";
  const FILE_PATH = "words-user.json";
  const API = "https://api.github.com/repos/" + REPO + "/contents/" + FILE_PATH;

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  if (typeof SAELTHYR === "undefined") return;

  const lexiconFrom = typeof SAELTHYR._lexiconFrom === "number" ? SAELTHYR._lexiconFrom : SAELTHYR.entries.length;
  const dataEntries = SAELTHYR.entries.slice(0, lexiconFrom).map(copyEntry);
  const lexEntries = SAELTHYR.entries.slice(lexiconFrom).map(copyEntry);

  let remoteWords = [];
  let memoryWords = null;
  let memoryToken = null;

  function copyEntry(e) {
    return {
      saelthyr: e.saelthyr,
      pt: e.pt,
      category: e.category,
      notes: e.notes || "",
      id: e.id || e.userId || "",
    };
  }

  function uid() {
    return "uw-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function fold(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/æ/g, "ae")
      .replace(/þ/g, "th")
      .replace(/ð/g, "th");
  }

  function clean(s) {
    return fold(s).replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function saelKeys(s) {
    const keys = new Set();
    const k = clean(s).replace(/'/g, "");
    if (!k) return keys;
    const add = (w) => {
      if (!w) return;
      keys.add(w);
      if (w.length > 3 && w.endsWith("im")) keys.add(w.slice(0, -2));
    };
    add(k);
    if (k.includes(" ")) {
      const parts = k.split(" ");
      const last = parts[parts.length - 1];
      if (last.length > 3 && last.endsWith("im")) {
        parts[parts.length - 1] = last.slice(0, -2);
        keys.add(parts.join(" "));
      }
    }
    return keys;
  }

  function ptKeys(s) {
    const keys = new Set();
    String(s || "").split(/\s*\/\s*|\s*;\s*/).forEach((part) => {
      const k = clean(part);
      if (!k) return;
      const add = (w) => {
        if (!w) return;
        keys.add(w);
        if (w.length > 3 && /[^s]s$/.test(w)) keys.add(w.slice(0, -1));
      };
      add(k);
      if (k.includes(" ")) {
        const parts = k.split(" ");
        const last = parts[parts.length - 1];
        if (last.length > 3 && /[^s]s$/.test(last)) {
          parts[parts.length - 1] = last.slice(0, -1);
          keys.add(parts.join(" "));
        }
      }
    });
    return keys;
  }

  function collapseSael(s) {
    return clean(s).replace(/ae/g, "e").replace(/y/g, "i");
  }

  function intersects(a, b) {
    for (const k of a) if (b.has(k)) return true;
    return false;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const d = Math.abs(a.length - b.length);
    if (d > 1) return d;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function catLabel(id) {
    const c = (SAELTHYR.categories || []).find((x) => x.id === id);
    return c ? c.label : (id || "");
  }

  function knownCategory(id) {
    return (SAELTHYR.categories || []).some((c) => c.id === id);
  }

  function defaultCategory() {
    if (knownCategory("substantivos")) return "substantivos";
    const c = (SAELTHYR.categories || []).find((x) => x.id !== "frases");
    return c ? c.id : "substantivos";
  }

  const ORIGIN_LABEL = {
    "data.js": "núcleo (data.js)",
    "lexicon.js": "léxico (lexicon.js)",
    "words-user.json": "words-user.json",
    local: "suas palavras neste navegador",
  };

  function readStore() {
    try {
      const raw = localStorage.getItem(LS_WORDS);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return data.filter((e) => e && e.saelthyr && e.pt && e.id);
      }
    } catch (e) { /* ignora armazenamento ilegível */ }
    return memoryWords ? memoryWords.slice() : [];
  }

  function writeStore(list) {
    memoryWords = list.slice();
    try { localStorage.setItem(LS_WORDS, JSON.stringify(list)); } catch (e) { /* modo privado */ }
  }

  function readToken() {
    try {
      const t = localStorage.getItem(LS_TOKEN);
      if (t) return t;
    } catch (e) {}
    return memoryToken || "";
  }

  function writeToken(token) {
    memoryToken = token || "";
    try {
      if (token) localStorage.setItem(LS_TOKEN, token);
      else localStorage.removeItem(LS_TOKEN);
    } catch (e) {}
  }

  function publicShape(e) {
    const out = {
      saelthyr: String(e.saelthyr || "").trim(),
      pt: String(e.pt || "").trim(),
      category: knownCategory(e.category) ? e.category : defaultCategory(),
    };
    const notes = String(e.notes || "").trim();
    if (notes) out.notes = notes;
    return out;
  }

  function collectSources(opts) {
    const remote = opts && opts.remote ? opts.remote : remoteWords;
    const list = [];
    dataEntries.forEach((e) => list.push(Object.assign({ origin: "data.js" }, e)));
    lexEntries.forEach((e) => list.push(Object.assign({ origin: "lexicon.js" }, e)));
    (remote || []).forEach((e) => {
      if (e && e.saelthyr && e.pt) list.push(Object.assign({ origin: "words-user.json" }, copyEntry(e)));
    });
    readStore().forEach((e) => list.push(Object.assign({ origin: "local" }, copyEntry(e), { id: e.id })));
    return list;
  }

  function sameMeaning(a, b) {
    return clean(a || "") === clean(b || "");
  }

  /**
   * Conferência contra data.js, lexicon.js, words-user.json e as palavras locais.
   * mode "publish": a mesma grafia já gravada em words-user.json com o mesmo português
   * é a própria entrada (atualização), não um segundo vocábulo.
   */
  function checkDuplicates(candidate, opts) {
    opts = opts || {};
    const sources = opts.sources || collectSources(opts);
    const ignoreId = opts.ignoreId || "";
    const mode = opts.mode || "save";
    const exact = [];
    const pt = [];
    const near = [];
    const candSael = saelKeys(candidate.saelthyr);
    const candPt = ptKeys(candidate.pt);
    const candPlain = clean(candidate.saelthyr);
    const candFold = collapseSael(candidate.saelthyr);
    if (!candPlain || !candPt.size) return { exact, pt, near, blocked: false, warn: false };

    sources.forEach((e) => {
      if (ignoreId && e.id && e.id === ignoreId) return;
      const eSael = saelKeys(e.saelthyr);
      if (intersects(candSael, eSael)) {
        if (mode === "publish" && e.origin === "words-user.json" && sameMeaning(candidate.pt, e.pt)) return;
        exact.push(e);
        return;
      }
      if (intersects(candPt, ptKeys(e.pt))) pt.push(e);

      const ePlain = clean(e.saelthyr);
      if (!ePlain || candPlain.length < 3 || ePlain.length < 3) return;
      if (candPlain.includes(" ") !== ePlain.includes(" ")) return;
      const eFold = collapseSael(e.saelthyr);
      let reason = "";
      let distance = levenshtein(candPlain, ePlain);
      if (candFold === eFold && candPlain !== ePlain) reason = "fold";
      else if (distance === 1) reason = "lev";
      else {
        const cStem = stemOf(candPlain);
        const eStem = stemOf(ePlain);
        if (cStem !== candPlain || eStem !== ePlain) {
          const cf = collapseSael(cStem);
          const ef = collapseSael(eStem);
          distance = levenshtein(cStem, eStem);
          if (cStem.length >= 3 && eStem.length >= 3 && cf === ef && cStem !== eStem) reason = "fold";
          else if (distance === 1) reason = "lev";
        }
      }
      if (reason) near.push(Object.assign({ reason, distance: reason === "fold" ? 0 : distance }, e));
    });

    near.sort((a, b) => a.distance - b.distance || String(a.saelthyr).localeCompare(String(b.saelthyr), "pt"));
    return { exact, pt, near, blocked: exact.length > 0, warn: pt.length > 0 || near.length > 0 };
  }

  function stemOf(plain) {
    if (plain.length > 3 && plain.endsWith("im") && !plain.includes(" ")) return plain.slice(0, -2);
    return plain;
  }

  function remoteHasSael(e) {
    const keys = saelKeys(e.saelthyr);
    return remoteWords.some((r) => r && intersects(saelKeys(r.saelthyr), keys));
  }

  function pruneStored() {
    const list = readStore().filter((e) => {
      if (e.pending) return true;
      return !remoteHasSael(e);
    });
    const cur = readStore();
    if (list.length !== cur.length) writeStore(list);
    return list;
  }

  function syncEntries() {
    const keep = SAELTHYR.entries.filter((e) => !e._fromUserFile && !e._fromLocal);
    SAELTHYR.entries.length = 0;
    keep.forEach((e) => SAELTHYR.entries.push(e));

    const taken = new Set();
    dataEntries.concat(lexEntries).forEach((e) => saelKeys(e.saelthyr).forEach((k) => taken.add(k)));

    remoteWords.forEach((e) => {
      if (!e || !e.saelthyr || !e.pt) return;
      const keys = saelKeys(e.saelthyr);
      let clash = false;
      keys.forEach((k) => { if (taken.has(k)) clash = true; });
      if (clash) return;
      const row = publicShape(e);
      row._fromUserFile = true;
      if (!row.notes) row.notes = "";
      SAELTHYR.entries.push(row);
      keys.forEach((k) => taken.add(k));
    });

    pruneStored().forEach((e) => {
      const row = publicShape(e);
      row.notes = row.notes || "";
      row.userAdded = true;
      row.userPending = !!e.pending;
      row.userId = e.id;
      row._fromLocal = true;
      delete row._s;
      SAELTHYR.entries.push(row);
    });
  }

  function announce() {
    document.dispatchEvent(new CustomEvent("saelthyr:userwords"));
    if (window.SaelthyrApp && window.SaelthyrApp.refresh) window.SaelthyrApp.refresh();
    updateBars();
  }

  /* ---------- alertas ---------- */
  let toastBox = null;
  function toast(message, kind) {
    if (!toastBox) return;
    const el = document.createElement("div");
    el.className = "uw-toast " + (kind || "ok");
    el.setAttribute("role", kind === "bad" ? "alert" : "status");
    el.textContent = message;
    toastBox.appendChild(el);
    const ttl = kind === "bad" ? 7000 : 4600;
    setTimeout(() => {
      el.remove();
    }, ttl);
  }

  let overlay = null;
  let topOverlay = null;
  let lastFocus = null;

  function trap(root, ev) {
    if (ev.key !== "Tab" || !root) return;
    const nodes = [...root.querySelectorAll("button, [href], input, select, textarea")].filter((n) => !n.disabled && n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  function closeTop() {
    if (!topOverlay) return;
    topOverlay.hidden = true;
    topOverlay.innerHTML = "";
    if (overlay && !overlay.hidden) {
      const f = overlay.querySelector("input, select, textarea, button");
      if (f) f.focus();
    } else {
      document.body.classList.remove("uw-lock");
    }
  }

  function closeForm() {
    closeTop();
    if (!overlay) return;
    overlay.hidden = true;
    overlay.innerHTML = "";
    document.body.classList.remove("uw-lock");
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) {}
    }
    lastFocus = null;
  }

  function openShell(html, onReady) {
    lastFocus = document.activeElement;
    overlay.innerHTML = html;
    overlay.hidden = false;
    document.body.classList.add("uw-lock");
    if (onReady) onReady(overlay);
    const f = overlay.querySelector("[data-autofocus], input, select, textarea, button");
    if (f) setTimeout(() => f.focus(), 20);
  }

  function openTop(html, onReady) {
    topOverlay.innerHTML = html;
    topOverlay.hidden = false;
    document.body.classList.add("uw-lock");
    if (onReady) onReady(topOverlay);
    const f = topOverlay.querySelector("[data-autofocus], button, input");
    if (f) setTimeout(() => f.focus(), 20);
  }

  function hitList(entries, limit) {
    const slice = entries.slice(0, limit || 8);
    const more = entries.length - slice.length;
    const html = slice.map((e) => {
      const why = e.reason === "fold" ? " · soa igual se y/i ou ae/e mudam" : e.reason === "lev" ? " · difere por uma letra" : "";
      return `<li class="uw-hit"><span class="uw-hit-sael">${esc(e.saelthyr)}</span> <span class="uw-hit-pt">${esc(e.pt)}</span><span class="uw-hit-meta">${esc(ORIGIN_LABEL[e.origin] || e.origin)} · ${esc(catLabel(e.category))}${esc(why)}</span>${e.notes ? `<span class="uw-hit-note">${esc(e.notes)}</span>` : ""}</li>`;
    }).join("");
    return `<ul class="uw-hits">${html}</ul>` + (more > 0 ? `<p class="uw-more">e mais ${more}</p>` : "");
  }

  function reportHtml(report) {
    let html = "";
    if (report.exact.length) {
      html += `<section class="uw-alert"><h3>A grafia em Saelthyr já existe</h3><p>Não dá para gravar outra palavra com a mesma forma (maiúsculas, acentos e o plural -im contam como a mesma).</p>${hitList(report.exact)}</section>`;
    }
    if (report.pt.length) {
      html += `<section class="uw-alert uw-warn"><h3>Esse português já tem tradução</h3><p>Há uma palavra Saelthyr para esse sentido (também no plural -s).</p>${hitList(report.pt)}</section>`;
    }
    if (report.near.length) {
      const shown = report.near.filter((e) => !report.pt.some((p) => p.saelthyr === e.saelthyr && p.pt === e.pt && p.origin === e.origin));
      if (shown.length) {
        html += `<section class="uw-alert uw-warn"><h3>Grafia parecida com uma palavra existente</h3><p>Pode soar como algo que já está no léxico.</p>${hitList(shown)}</section>`;
      }
    }
    return html;
  }

  /* ---------- formulário ---------- */
  let editingId = "";
  let prefillDir = "pt2s";

  function cruorOf(s) {
    const app = window.SaelthyrApp;
    return app && app.toCruor ? app.toCruor(s) : "";
  }

  function formValues(root) {
    return {
      id: editingId,
      pt: $("#uw-pt", root).value.trim(),
      saelthyr: $("#uw-sael", root).value.trim(),
      category: $("#uw-cat", root).value,
      notes: $("#uw-note", root).value.trim(),
    };
  }

  function paintCruor(root) {
    const out = $("#uw-cruor", root);
    const cr = cruorOf($("#uw-sael", root).value);
    out.classList.toggle("is-empty", !cr);
    out.classList.toggle("cruor", !!cr);
    out.textContent = cr || "A escrita aparece aqui";
  }

  let liveTimer = 0;
  function paintLive(root) {
    const box = $("#uw-live", root);
    const v = formValues(root);
    if (!v.pt || !v.saelthyr) { box.innerHTML = ""; return; }
    const report = checkDuplicates(v, { ignoreId: editingId, mode: "save" });
    if (!report.blocked && !report.warn) {
      box.innerHTML = `<p class="uw-live-ok">Nenhuma palavra igual ou parecida no núcleo, no léxico, em words-user.json nem nas suas.</p>`;
      return;
    }
    box.innerHTML = reportHtml(report);
  }

  function openForm(opts) {
    opts = opts || {};
    closeTop();
    const entry = opts.entry || null;
    editingId = entry ? entry.id || entry.userId || "" : "";
    prefillDir = opts.dir || "pt2s";
    const pt = entry ? entry.pt : (prefillDir === "s2pt" ? "" : (opts.word || ""));
    const sael = entry ? entry.saelthyr : (prefillDir === "s2pt" ? (opts.word || "") : "");
    const cat = entry && knownCategory(entry.category) ? entry.category : defaultCategory();
    const note = entry ? (entry.notes || "") : "";
    const cats = (SAELTHYR.categories || []).map((c) =>
      `<option value="${esc(c.id)}"${c.id === cat ? " selected" : ""}>${esc(c.label)}</option>`
    ).join("");
    openShell(`
      <div class="uw-card" role="dialog" aria-modal="true" aria-labelledby="uw-title">
        <h2 class="uw-title" id="uw-title">${editingId ? "Editar palavra" : "Acrescentar ao léxico"}</h2>
        <p class="uw-lead">Fica neste navegador na hora. Publicar no GitHub grava em words-user.json para todo mundo.</p>
        <form id="uw-form" novalidate>
          <label class="uw-field" for="uw-pt">Português
            <input id="uw-pt" name="pt" type="text" maxlength="200" autocomplete="off" value="${esc(pt)}" ${pt ? "" : "data-autofocus"} />
          </label>
          <label class="uw-field" for="uw-sael">Saelthyr
            <input id="uw-sael" name="sael" type="text" maxlength="200" autocomplete="off" spellcheck="false" value="${esc(sael)}" ${pt && !sael ? "data-autofocus" : ""} />
          </label>
          <div class="uw-cruor-wrap">
            <span class="uw-cruor-label">Cruorthyr</span>
            <div class="cruor uw-cruor is-empty" id="uw-cruor">A escrita aparece aqui</div>
          </div>
          <label class="uw-field" for="uw-cat">Classe
            <select id="uw-cat">${cats}</select>
          </label>
          <label class="uw-field" for="uw-note">Nota ou exemplo <span class="uw-opt">(opcional)</span>
            <textarea id="uw-note" rows="2" maxlength="500">${esc(note)}</textarea>
          </label>
          <div id="uw-live" class="uw-live" aria-live="polite"></div>
          <div class="uw-actions">
            <button type="submit" class="uw-primary" id="uw-save">Salvar</button>
            <button type="button" class="uw-ghost" data-uw-close>Cancelar</button>
          </div>
        </form>
      </div>`, (root) => {
      paintCruor(root);
      paintLive(root);
      $("#uw-sael", root).addEventListener("input", () => { paintCruor(root); scheduleLive(root); });
      $("#uw-pt", root).addEventListener("input", () => scheduleLive(root));
      $("#uw-form", root).addEventListener("submit", (ev) => {
        ev.preventDefault();
        submitForm(root, false);
      });
    });
  }

  function scheduleLive(root) {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { if (!overlay.hidden) paintLive(root); }, 120);
  }

  function submitForm(root, force) {
    const v = formValues(root);
    if (!v.pt || !v.saelthyr) {
      toast("Preencha o português e o Saelthyr.", "bad");
      const missing = !v.pt ? $("#uw-pt", root) : $("#uw-sael", root);
      if (missing) missing.focus();
      return;
    }
    if (!knownCategory(v.category)) {
      toast("Escolha uma classe.", "bad");
      return;
    }
    const report = checkDuplicates(v, { ignoreId: editingId, mode: "save" });
    if (report.blocked) {
      openTop(`
        <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-block-title">
          <h2 class="uw-title" id="uw-block-title">Não salva</h2>
          <p class="uw-lead">Já existe uma palavra Saelthyr com essa grafia. Abaixo está o sentido que ela tem hoje.</p>
          ${reportHtml(report)}
          <div class="uw-actions"><button type="button" class="uw-primary" data-autofocus data-uw-top-close>Fechar</button></div>
        </div>`);
      return;
    }
    if (report.warn && !force) {
      openTop(`
        <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-warn-title">
          <h2 class="uw-title" id="uw-warn-title">Conferir antes de salvar</h2>
          <p class="uw-lead">Dá para guardar mesmo assim, se for de propósito outra palavra.</p>
          ${reportHtml(report)}
          <div class="uw-actions">
            <button type="button" class="uw-primary" data-autofocus id="uw-anyway">Salvar mesmo assim</button>
            <button type="button" class="uw-ghost" data-uw-top-close>Cancelar</button>
          </div>
        </div>`, (top) => {
        $("#uw-anyway", top).addEventListener("click", () => {
          closeTop();
          submitForm(root, true);
        });
      });
      return;
    }
    const list = readStore();
    if (editingId) {
      const i = list.findIndex((e) => e.id === editingId);
      if (i >= 0) {
        list[i] = {
          id: editingId,
          saelthyr: v.saelthyr,
          pt: v.pt,
          category: v.category,
          notes: v.notes,
          pending: true,
          addedAt: list[i].addedAt || Date.now(),
        };
      } else {
        list.push({ id: editingId, saelthyr: v.saelthyr, pt: v.pt, category: v.category, notes: v.notes, pending: true, addedAt: Date.now() });
      }
    } else {
      list.push({ id: uid(), saelthyr: v.saelthyr, pt: v.pt, category: v.category, notes: v.notes, pending: true, addedAt: Date.now() });
    }
    writeStore(list);
    syncEntries();
    closeForm();
    announce();
    toast(editingId ? "Palavra atualizada neste navegador." : "Palavra salva neste navegador.", "ok");
  }

  function openEdit(id) {
    const e = readStore().find((x) => x.id === id);
    if (!e) { toast("Essa palavra não está mais na lista deste navegador.", "bad"); return; }
    openForm({ entry: e });
  }

  function openDelete(id) {
    const e = readStore().find((x) => x.id === id);
    if (!e) return;
    openTop(`
      <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-del-title">
        <h2 class="uw-title" id="uw-del-title">Apagar palavra</h2>
        <p class="uw-lead">Tira <strong>${esc(e.saelthyr)}</strong> — ${esc(e.pt)} só deste navegador.</p>
        ${e.pending ? "" : `<p class="uw-lead">Se já foi publicada, a cópia em words-user.json continua no repositório e volta quando o site atualizar.</p>`}
        <div class="uw-actions">
          <button type="button" class="uw-primary" data-autofocus id="uw-do-del">Apagar</button>
          <button type="button" class="uw-ghost" data-uw-top-close>Cancelar</button>
        </div>
      </div>`, (top) => {
      $("#uw-do-del", top).addEventListener("click", () => {
        writeStore(readStore().filter((x) => x.id !== id));
        syncEntries();
        closeTop();
        if (overlay && !overlay.hidden) closeForm();
        announce();
        toast("Palavra apagada deste navegador.", "ok");
      });
    });
  }

  /* ---------- GitHub ---------- */
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function b64decode(b64) {
    const bin = atob(String(b64 || "").replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function ghHeaders() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + readToken(),
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
  }

  function netError(err) {
    const status = err && err.status;
    if (err && err.kind === "conflict") return "Conflito ao publicar. A lista mudou no repositório; tente de novo.";
    if (err && err.kind === "token") return "Token inválido ou sem permissão neste repositório.";
    if (err && err.kind === "network") return "Falha de rede ao falar com o GitHub.";
    if (err && err.kind === "rate") return "O GitHub limitou os pedidos. Espere um pouco e tente de novo.";
    if (err && err.kind === "parse") return "words-user.json no repositório está ilegível. Não publiquei por cima.";
    if (status === 404) return "Repositório ou arquivo inacessível com esse token.";
    return "Não foi possível publicar.";
  }

  async function rejectStatus(res) {
    let msg = "";
    try { msg = ((await res.json()) || {}).message || ""; } catch (e) {}
    if (res.status === 401 || res.status === 403) {
      if (/rate limit/i.test(msg)) throw Object.assign(new Error("rate"), { kind: "rate", status: res.status });
      throw Object.assign(new Error("token"), { kind: "token", status: res.status });
    }
    throw Object.assign(new Error("http"), { kind: "http", status: res.status, message: msg });
  }

  async function githubGet() {
    let res;
    try {
      res = await fetch(API + "?ref=" + encodeURIComponent(BRANCH), { headers: ghHeaders(), cache: "no-store" });
    } catch (e) {
      throw Object.assign(new Error("network"), { kind: "network" });
    }
    if (res.status === 404) return { sha: null, words: [] };
    if (!res.ok) await rejectStatus(res);
    let data;
    try { data = await res.json(); } catch (e) { throw Object.assign(new Error("parse"), { kind: "parse" }); }
    if (!data.content) {
      if (data.download_url) {
        const raw = await fetch(data.download_url, { cache: "no-store" });
        if (!raw.ok) throw Object.assign(new Error("parse"), { kind: "parse" });
        const text = await raw.text();
        return { sha: data.sha || null, words: parseWords(text) };
      }
      return { sha: data.sha || null, words: [] };
    }
    return { sha: data.sha || null, words: parseWords(b64decode(data.content)) };
  }

  function parseWords(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw Object.assign(new Error("parse"), { kind: "parse" }); }
    if (!Array.isArray(data)) throw Object.assign(new Error("parse"), { kind: "parse" });
    return data.filter((e) => e && e.saelthyr && e.pt);
  }

  function mergeLists(base, incoming) {
    const out = base.map((e) => publicShape(e));
    incoming.forEach((w) => {
      const pub = publicShape(w);
      const key = clean(pub.saelthyr);
      const idx = out.findIndex((e) => clean(e.saelthyr) === key);
      if (idx >= 0) out[idx] = pub;
      else out.push(pub);
    });
    return out;
  }

  function commitMessage(words) {
    const bits = words.map((w) => String(w.pt).trim() + " = " + String(w.saelthyr).trim());
    const shown = bits.slice(0, 12);
    const extra = bits.length > shown.length ? "; e mais " + (bits.length - shown.length) : "";
    return "Adicionar palavra: " + shown.join("; ") + extra;
  }

  async function githubPut(words, sha, message) {
    const body = {
      message: message,
      content: b64encode(JSON.stringify(words, null, 2) + "\n"),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;
    let res;
    try {
      res = await fetch(API, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
    } catch (e) {
      throw Object.assign(new Error("network"), { kind: "network" });
    }
    if (res.status === 409 || res.status === 422) return { ok: false, conflict: true, status: res.status };
    if (!res.ok) await rejectStatus(res);
    return { ok: true };
  }

  function publishReport(words, remoteList) {
    const exact = [];
    const pt = [];
    const near = [];
    words.forEach((w) => {
      const report = checkDuplicates(w, { ignoreId: w.id, mode: "publish", remote: remoteList });
      report.exact.forEach((e) => exact.push(Object.assign({ word: w }, e)));
      report.pt.forEach((e) => pt.push(Object.assign({ word: w }, e)));
      report.near.forEach((e) => near.push(Object.assign({ word: w }, e)));
    });
    return { exact, pt, near, blocked: exact.length > 0, warn: pt.length > 0 || near.length > 0 };
  }

  let publishing = false;

  async function publishWords(ids, force) {
    if (publishing) return { ok: false, reason: "busy" };
    const token = readToken().trim();
    if (!token) {
      toast("Token ausente. Cole um token nas configurações.", "bad");
      openSettings();
      return { ok: false, reason: "token" };
    }
    const all = readStore().filter((e) => e.pending && (!ids || ids.includes(e.id)));
    if (!all.length) {
      toast("Nenhuma palavra por publicar.", "bad");
      return { ok: false, reason: "empty" };
    }
    let remote;
    try { remote = await githubGet(); }
    catch (err) { toast(netError(err), "bad"); return { ok: false, reason: err.kind || "error" }; }

    const report = publishReport(all, remote.words);
    if (report.blocked) {
      openTop(`
        <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-pub-block">
          <h2 class="uw-title" id="uw-pub-block">Não publiquei</h2>
          <p class="uw-lead">Conferi de novo, inclusive o words-user.json que está no GitHub agora. A grafia Saelthyr já existe.</p>
          ${reportHtml(report)}
          <div class="uw-actions"><button type="button" class="uw-primary" data-autofocus data-uw-top-close>Fechar</button></div>
        </div>`);
      return { ok: false, reason: "exact", report };
    }
    if (report.warn && !force) {
      openTop(`
        <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-pub-warn">
          <h2 class="uw-title" id="uw-pub-warn">Conferir antes de publicar</h2>
          <p class="uw-lead">O arquivo no GitHub foi lido agora. Há sentido repetido ou grafia parecida.</p>
          ${reportHtml(report)}
          <div class="uw-actions">
            <button type="button" class="uw-primary" data-autofocus id="uw-pub-anyway">Publicar mesmo assim</button>
            <button type="button" class="uw-ghost" data-uw-top-close>Cancelar</button>
          </div>
        </div>`, (top) => {
        $("#uw-pub-anyway", top).addEventListener("click", () => {
          closeTop();
          publishWords(ids, true);
        });
      });
      return { ok: false, reason: "warn", report };
    }

    const message = commitMessage(all);
    let sha = remote.sha;
    let base = remote.words;
    publishing = true;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          const again = await githubGet();
          sha = again.sha;
          base = again.words;
          const againReport = publishReport(all, base);
          if (againReport.blocked) {
            openTop(`
              <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-pub-block2">
                <h2 class="uw-title" id="uw-pub-block2">Não publiquei</h2>
                <p class="uw-lead">O arquivo mudou enquanto publicava. A grafia Saelthyr já existe.</p>
                ${reportHtml(againReport)}
                <div class="uw-actions"><button type="button" class="uw-primary" data-autofocus data-uw-top-close>Fechar</button></div>
              </div>`);
            return { ok: false, reason: "exact", report: againReport };
          }
        }
        const merged = mergeLists(base, all);
        const put = await githubPut(merged, sha, message);
        if (put.ok) {
          const done = new Set(all.map((w) => w.id));
          writeStore(readStore().map((w) => done.has(w.id) ? Object.assign({}, w, { pending: false }) : w));
          syncEntries();
          announce();
          const n = all.length;
          toast(n === 1
            ? "Palavra publicada. O GitHub Pages leva cerca de 1 minuto para atualizar."
            : n + " palavras publicadas. O GitHub Pages leva cerca de 1 minuto para atualizar.", "ok");
          return { ok: true, count: n };
        }
        if (!put.conflict) break;
      }
      toast("Conflito ao publicar. A lista mudou no repositório; tente de novo.", "bad");
      return { ok: false, reason: "conflict" };
    } catch (err) {
      toast(netError(err), "bad");
      return { ok: false, reason: err.kind || "error" };
    } finally {
      publishing = false;
    }
  }

  function openSettings() {
    const has = !!readToken();
    openTop(`
      <div class="uw-card" role="dialog" aria-modal="true" aria-labelledby="uw-tok-title">
        <h2 class="uw-title" id="uw-tok-title">Token do GitHub</h2>
        <p class="uw-lead">O token fica só neste navegador (localStorage). Não entra no repositório e só é enviado à API do GitHub quando você publica.</p>
        <p class="uw-lead">Use um token de acesso pessoal de granularidade fina, só no repositório ${esc(REPO)}, com Contents em leitura e escrita.</p>
        <p class="uw-status" id="uw-tok-status">${has ? "Um token está guardado neste navegador." : "Nenhum token guardado."}</p>
        <form id="uw-tok-form">
          <label class="uw-field" for="uw-token">Token
            <input id="uw-token" type="password" autocomplete="off" spellcheck="false" data-autofocus placeholder="${has ? "colar outro token para substituir" : "github_pat_…"}" />
          </label>
          <div class="uw-actions">
            <button type="submit" class="uw-primary">Guardar token</button>
            <button type="button" class="uw-ghost" id="uw-forget"${has ? "" : " disabled"}>Esquecer token</button>
            <button type="button" class="uw-ghost" data-uw-top-close>Fechar</button>
          </div>
        </form>
      </div>`, (top) => {
      $("#uw-tok-form", top).addEventListener("submit", (ev) => {
        ev.preventDefault();
        const v = $("#uw-token", top).value.trim();
        if (!v) {
          toast(has ? "O token atual foi mantido." : "Cole o token.", has ? "ok" : "bad");
          if (!has) $("#uw-token", top).focus();
          return;
        }
        writeToken(v);
        $("#uw-token", top).value = "";
        toast("Token guardado só neste navegador.", "ok");
        closeTop();
        updateBars();
      });
      $("#uw-forget", top).addEventListener("click", () => {
        writeToken("");
        toast("Token esquecido neste navegador.", "ok");
        closeTop();
        updateBars();
      });
    });
  }

  /* ---------- importar / exportar ---------- */
  function exportWords() {
    const data = readStore().map(publicShape);
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "palavras-saelthyr.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast(data.length ? "JSON exportado (" + data.length + ")." : "Exportei uma lista vazia.", "ok");
    return data;
  }

  function normalizeImport(item) {
    if (!item || typeof item !== "object") return null;
    const saelthyr = String(item.saelthyr || item.sael || "").trim();
    const pt = String(item.pt || item.portugues || "").trim();
    if (!saelthyr || !pt) return null;
    return {
      saelthyr: saelthyr.slice(0, 200),
      pt: pt.slice(0, 200),
      category: knownCategory(item.category) ? item.category : defaultCategory(),
      notes: String(item.notes || "").trim().slice(0, 500),
    };
  }

  function importList(items, force) {
    const cleanItems = [];
    const invalid = [];
    (items || []).forEach((item, i) => {
      const n = normalizeImport(item);
      if (!n) invalid.push(i + 1);
      else cleanItems.push(n);
    });
    const blocked = [];
    const warned = [];
    const ok = [];
    const virtual = [];
    cleanItems.forEach((item) => {
      const report = checkDuplicates(item, {
        mode: "save",
        sources: collectSources().concat(virtual.map((e) => Object.assign({ origin: "local", id: "batch" }, e))),
      });
      if (report.blocked) blocked.push({ item, report });
      else if (report.warn) { warned.push({ item, report }); virtual.push(item); }
      else { ok.push(item); virtual.push(item); }
    });
    const take = ok.concat(force ? warned.map((w) => w.item) : []);
    if (take.length) {
      const list = readStore();
      take.forEach((item) => list.push(Object.assign({ id: uid(), pending: true, addedAt: Date.now() }, item)));
      writeStore(list);
      syncEntries();
      announce();
    }
    if (!force && (blocked.length || warned.length)) {
      const blockHtml = blocked.map((b) => `<p class="uw-lead">${esc(b.item.pt)} = ${esc(b.item.saelthyr)} não entrou.</p>${hitList(b.report.exact)}`).join("");
      const warnHtml = warned.map((w) => `<p class="uw-lead">${esc(w.item.pt)} = ${esc(w.item.saelthyr)}</p>${hitList(w.report.pt.concat(w.report.near))}`).join("");
      openTop(`
        <div class="uw-card" role="alertdialog" aria-modal="true" aria-labelledby="uw-imp-title">
          <h2 class="uw-title" id="uw-imp-title">${warned.length ? "Conferir a importação" : "Algumas não entraram"}</h2>
          <p class="uw-lead">${ok.length ? ok.length + " já foram salvas. " : ""}${blocked.length ? blocked.length + " repetem uma grafia Saelthyr. " : ""}${warned.length ? warned.length + " têm aviso." : ""}</p>
          ${blocked.length ? `<section class="uw-alert"><h3>A grafia em Saelthyr já existe</h3>${blockHtml}</section>` : ""}
          ${warned.length ? `<section class="uw-alert uw-warn"><h3>Português repetido ou grafia parecida</h3>${warnHtml}</section>` : ""}
          <div class="uw-actions">
            ${warned.length ? `<button type="button" class="uw-primary" data-autofocus id="uw-imp-anyway">Salvar mesmo assim</button>` : ""}
            <button type="button" class="${warned.length ? "uw-ghost" : "uw-primary"}" ${warned.length ? "" : "data-autofocus"} data-uw-top-close>${warned.length ? "Cancelar" : "Fechar"}</button>
          </div>
        </div>`, (top) => {
        const btn = $("#uw-imp-anyway", top);
        if (btn) btn.addEventListener("click", () => {
          closeTop();
          importList(warned.map((w) => w.item), true);
        });
      });
    }
    if (invalid.length) toast("Linhas sem português ou Saelthyr foram ignoradas.", "bad");
    if (take.length && (force || !warned.length)) {
      toast(take.length === 1 ? "1 palavra importada." : take.length + " palavras importadas.", "ok");
    } else if (ok.length && warned.length) {
      toast(ok.length + " importadas. Falta decidir as parecidas.", "ok");
    } else if (!ok.length && !warned.length && blocked.length) {
      toast("Nada importado: a grafia Saelthyr já existe.", "bad");
    }
    return { ok: ok.length, blocked: blocked.length, warned: warned.length, invalid: invalid.length };
  }

  async function importFile(file) {
    let text = "";
    try { text = await file.text(); } catch (e) { toast("Não consegui ler o arquivo.", "bad"); return; }
    let data;
    try { data = JSON.parse(text); } catch (e) { toast("JSON inválido.", "bad"); return; }
    if (!Array.isArray(data)) { toast("O arquivo precisa ser uma lista de palavras.", "bad"); return; }
    importList(data, false);
  }

  /* ---------- barras ---------- */
  function barHtml(suffix) {
    const list = readStore();
    const pending = list.filter((e) => e.pending).length;
    return `
      <p class="uw-bar-meta" id="uw-meta-${suffix}">${list.length} ${list.length === 1 ? "sua" : "suas"} · ${pending} por publicar</p>
      <div class="uw-bar-actions">
        <button type="button" class="tr-mini" data-uw-pub-all ${pending ? "" : "disabled"}>Publicar todas</button>
        <button type="button" class="tr-mini" data-uw-export>Exportar JSON</button>
        <button type="button" class="tr-mini" data-uw-import>Importar JSON</button>
        <button type="button" class="tr-mini" data-uw-token>Token do GitHub</button>
      </div>`;
  }

  function updateBars() {
    ["dict", "tr"].forEach((id) => {
      const el = document.getElementById("uw-bar-" + id);
      if (el) el.innerHTML = barHtml(id);
    });
  }

  function mount() {
    toastBox = document.createElement("div");
    toastBox.className = "uw-toasts";
    toastBox.id = "uw-toasts";
    toastBox.setAttribute("aria-live", "polite");
    document.body.appendChild(toastBox);

    overlay = document.createElement("div");
    overlay.className = "uw-overlay";
    overlay.id = "uw-overlay";
    overlay.hidden = true;
    document.body.appendChild(overlay);

    topOverlay = document.createElement("div");
    topOverlay.className = "uw-overlay uw-overlay-top";
    topOverlay.id = "uw-overlay-top";
    topOverlay.hidden = true;
    document.body.appendChild(topOverlay);

    const file = document.createElement("input");
    file.type = "file";
    file.id = "uw-file";
    file.accept = "application/json,.json";
    file.hidden = true;
    document.body.appendChild(file);
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      file.value = "";
      if (f) importFile(f);
    });

    const dict = $("#panel-dicionario");
    if (dict && !$("#uw-bar-dict")) {
      const bar = document.createElement("div");
      bar.className = "uw-bar";
      bar.id = "uw-bar-dict";
      const intro = dict.querySelector(".panel-intro");
      if (intro && intro.nextSibling) dict.insertBefore(bar, intro.nextSibling);
      else dict.insertBefore(bar, dict.firstChild);
    }
    const tr = $("#panel-tradutor .tr-under");
    if (tr && !$("#uw-bar-tr")) {
      const bar = document.createElement("div");
      bar.className = "uw-bar";
      bar.id = "uw-bar-tr";
      tr.appendChild(bar);
    }
    updateBars();

    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (t.closest("[data-uw-close]")) { closeForm(); return; }
      if (t.closest("[data-uw-top-close]")) { closeTop(); return; }
      if (t.closest("[data-uw-token]")) { openSettings(); return; }
      if (t.closest("[data-uw-export]")) { exportWords(); return; }
      if (t.closest("[data-uw-import]")) { file.click(); return; }
      if (t.closest("[data-uw-pub-all]")) { publishWords(null, false); return; }
      const edit = t.closest("[data-uw-edit]");
      if (edit) { openEdit(edit.getAttribute("data-uw-edit")); return; }
      const del = t.closest("[data-uw-del]");
      if (del) { openDelete(del.getAttribute("data-uw-del")); return; }
      const pub = t.closest("[data-uw-pub]");
      if (pub) { publishWords([pub.getAttribute("data-uw-pub")], false); return; }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        if (topOverlay && !topOverlay.hidden) { ev.preventDefault(); closeTop(); return; }
        if (overlay && !overlay.hidden) { ev.preventDefault(); closeForm(); return; }
      }
      if (topOverlay && !topOverlay.hidden) trap(topOverlay, ev);
      else if (overlay && !overlay.hidden) trap(overlay, ev);
    });
  }

  function canFetchRemote(protocol) {
    return protocol !== "file:";
  }

  async function loadRemote() {
    if (!canFetchRemote(location.protocol)) return;
    try {
      const res = await fetch(FILE_PATH, { cache: "no-cache" });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      remoteWords = data.filter((e) => e && e.saelthyr && e.pt);
      syncEntries();
      announce();
    } catch (e) { /* arquivo ausente, file:// ou JSON inválido */ }
  }

  syncEntries();
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
  loadRemote();

  window.SaelthyrUserWords = {
    openForm,
    openEdit,
    openSettings,
    checkDuplicates,
    publishWords,
    exportWords,
    importList,
    readStore,
    canFetchRemote,
    saelKeys,
    ptKeys,
    clean,
    collapseSael,
    levenshtein,
    LS_WORDS,
    LS_TOKEN,
  };
})();
