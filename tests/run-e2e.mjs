/* Testes de ponta a ponta: formulário, duplicatas, dicionário, recarga e GitHub simulado. */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = 8765;
const CDP = 9333;
const ART = "/opt/cursor/artifacts";
const PROFILE = "/tmp/sael-chrome-e2e";

const jsErrors = [];
let chrome, server, ws, seq = 0;
const pending = new Map();

function fail(msg) {
  const err = new Error(msg);
  err.failures = true;
  throw err;
}

async function startServer() {
  server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/words-user.json`);
      if (res.ok) return;
    } catch { /* ainda subindo */ }
    await delay(150);
  }
  fail("servidor local não subiu");
}

async function startChrome() {
  rmSync(PROFILE, { recursive: true, force: true });
  chrome = spawn("/usr/local/bin/google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
    `--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`,
    "--window-size=1280,1000", "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${CDP}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch { /* ainda subindo */ }
    await delay(150);
  }
  fail("Chrome não abriu o depurador");
}

function connect(page) {
  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      const text = (d.exception && d.exception.description) || d.text || "exception";
      jsErrors.push(text);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      const text = msg.params.args.map((a) => a.value || a.description || "").join(" ");
      if (!/favicon/i.test(text)) jsErrors.push("console: " + text);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("websocket do Chrome falhou")));
  });
}

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(expression) {
  const result = await send("Runtime.evaluate", {
    expression: `(async () => {\n${expression}\n})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const d = result.exceptionDetails;
    fail((d.exception && d.exception.description) || d.text || "erro no evaluate");
  }
  return result.result.value;
}

async function navigate(url) {
  const loaded = new Promise((resolve) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Page.loadEventFired") {
        ws.removeEventListener("message", onMsg);
        resolve();
      }
    };
    ws.addEventListener("message", onMsg);
  });
  await send("Page.navigate", { url });
  await Promise.race([loaded, delay(15000).then(() => fail("a página não carregou"))]);
  await evalJs(`return new Promise((r) => { if (window.SaelthyrTranslator && window.SaelthyrUserWords) r(true); else document.addEventListener("saelthyr:ready", () => r(true)); })`);
  await evalJs("return document.fonts.ready");
}

async function shot(name) {
  mkdirSync(ART, { recursive: true });
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${ART}/${name}.png`, Buffer.from(data, "base64"));
}

const UNIT = `
  const U = window.SaelthyrUserWords;
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  const has = (list, sael) => (list || []).some((e) => String(e.saelthyr).toLowerCase() === sael);
  const src = (sael, pt, origin) => ({ saelthyr: sael, pt, origin: origin || "data.js", category: "substantivos", notes: "" });

  ok(U.canFetchRemote("https:") === true, "https deve buscar words-user.json");
  ok(U.canFetchRemote("file:") === false, "file:// não busca words-user.json");

  const fix = [src("kylor", "amigo"), src("sael", "alma"), src("vaelth", "saber / conhecer"), src("myrath", "precioso")];
  const dup = (sael, pt, extra) => U.checkDuplicates(Object.assign({ saelthyr: sael, pt, category: "substantivos" }, extra || {}), { sources: fix });

  let r = dup("KYLOR", "zzzunico");
  ok(r.blocked && has(r.exact, "kylor"), "maiúsculas: KYLOR é a mesma grafia");
  r = dup("Kýlor", "zzzunico");
  ok(r.blocked && has(r.exact, "kylor"), "acento: Kýlor é a mesma grafia");
  r = dup("kylorim", "zzzunico");
  ok(r.blocked && has(r.exact, "kylor"), "plural -im bloqueia");
  r = dup("sæl", "zzzunico");
  ok(r.blocked && has(r.exact, "sael"), "æ conta como ae");

  r = dup("qalvorynth", "amigo");
  ok(!r.blocked && r.warn && has(r.pt, "kylor"), "português amigo avisa e não bloqueia");
  r = dup("qalvorynth", "Amigos");
  ok(!r.blocked && has(r.pt, "kylor"), "plural -s do português avisa");
  r = dup("qalvorynth", "Você");
  ok(!has(r.pt, "kylor"), "você não é amigo");

  r = dup("kilor", "zzzunico");
  ok(!r.blocked && r.near.some((e) => e.saelthyr === "kylor" && e.reason === "fold"), "y/i: kilor soa como kylor");
  r = dup("sel", "zzzunico");
  ok(!r.blocked && r.near.some((e) => e.saelthyr === "sael" && e.reason === "fold"), "ae/e: sel soa como sael");
  r = dup("vaeltha", "zzzunico");
  ok(r.near.some((e) => e.saelthyr === "vaelth" && e.reason === "lev"), "Levenshtein 1: vaeltha ~ vaelth");
  r = dup("qqqqvxzynth", "zzzorbulqqq");
  ok(!r.blocked && !r.warn, "palavra distante não gera aviso: " + JSON.stringify(r.near.map((e) => e.saelthyr)));

  r = U.checkDuplicates({ saelthyr: "fromfile", pt: "outro", category: "substantivos" }, { sources: [src("fromfile", "sentido publicado", "words-user.json")] });
  ok(r.blocked && r.exact[0].origin === "words-user.json" && r.exact[0].pt === "sentido publicado", "words-user.json entra na conferência");
  r = U.checkDuplicates({ saelthyr: "fromfile", pt: "sentido publicado", category: "substantivos" }, { mode: "publish", sources: [src("fromfile", "sentido publicado", "words-user.json")] });
  ok(!r.blocked, "republicar a mesma entrada não bloqueia");

  const self = [src("bruvyneth", "brumaquieta", "local")];
  self[0].id = "uw-self";
  r = U.checkDuplicates({ saelthyr: "bruvyneth", pt: "brumaquieta" }, { sources: self, ignoreId: "uw-self" });
  ok(!r.blocked && !r.warn, "editar a própria palavra não acusa ela mesma");
  r = U.checkDuplicates({ saelthyr: "bruvyneth", pt: "outra" }, { sources: self });
  ok(r.blocked && r.exact[0].origin === "local", "localStorage entra na conferência");

  const live = U.checkDuplicates({ saelthyr: "kylorim", pt: "zzzunicoqq", category: "substantivos" });
  ok(live.blocked && live.exact.some((e) => e.origin === "data.js" && /amigo/i.test(e.pt)), "núcleo data.js: kylorim bloqueia e mostra amigo");
  const livePt = U.checkDuplicates({ saelthyr: "qalvorynth", pt: "amigos", category: "substantivos" });
  ok(!livePt.blocked && livePt.pt.some((e) => e.origin === "data.js"), "núcleo: amigos avisa");
  const liveNear = U.checkDuplicates({ saelthyr: "kilor", pt: "zzzunicoqq", category: "substantivos" });
  ok(liveNear.near.some((e) => e.saelthyr === "kylor" && e.origin === "data.js"), "núcleo: kilor parece kylor");

  const chosen = ["qalvorynth", "bruvyneth", "xarvethyn", "dremvoryn"].find((sael) => {
    const hit = U.checkDuplicates({ saelthyr: sael, pt: "zorbulante", category: "substantivos" });
    return !hit.blocked && !hit.warn;
  });
  ok(!!chosen, "há uma grafia limpa para o teste de tela");
  return { fails, chosen: chosen || "" };
`;

async function run() {
  mkdirSync(ART, { recursive: true });
  await startServer();
  const page = await startChrome();
  await connect(page);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(`http://127.0.0.1:${PORT}/`);
  if (jsErrors.length) fail("erros de JS ao abrir:\\n" + jsErrors.join("\\n"));

  const unit = await evalJs(UNIT);
  if (unit.fails.length) fail("duplicatas:\\n- " + unit.fails.join("\\n- "));
  const sael = unit.chosen;
  const pt = "zorbulante";

  await evalJs(`
    document.querySelector('[data-panel="tradutor"]').click();
    const inp = document.querySelector("#tr-input");
    inp.value = ${JSON.stringify(pt)};
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    true
  `);
  await delay(250);
  const opened = await evalJs(`
    const w = document.querySelector(".tr-unknown");
    if (!w) return { ok: false, html: document.querySelector("#tr-dst-layers").innerText.slice(0, 400) };
    w.click();
    const pt = document.querySelector("#uw-pt");
    const sael = document.querySelector("#uw-sael");
    return { ok: !!pt && !document.querySelector("#uw-overlay").hidden, pre: pt && pt.value, sael: sael && sael.value, cats: document.querySelectorAll("#uw-cat option").length };
  `);
  if (!opened.ok) fail("o clique na palavra desconhecida não abriu o formulário: " + JSON.stringify(opened));
  if (opened.pre !== pt) fail("português não veio preenchido: " + opened.pre);
  if (opened.sael) fail("Saelthyr deveria começar vazio");
  if (opened.cats < 8) fail("a lista de classes não veio das categorias");

  await evalJs(`
    const s = document.querySelector("#uw-sael");
    s.value = ${JSON.stringify(sael)};
    s.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#uw-note").value = "exemplo do teste";
    document.querySelector("#uw-cat").value = "substantivos";
    true
  `);
  await delay(250);
  const preview = await evalJs(`return ({
    cruor: document.querySelector("#uw-cruor").textContent,
    expect: window.SaelthyrApp.toCruor(${JSON.stringify(sael)}),
    live: document.querySelector("#uw-live").innerText.slice(0, 240)
  })`);
  if (preview.cruor !== preview.expect || !preview.expect) fail("Cruorthyr ao vivo divergiu: " + JSON.stringify(preview));
  if (!/Nenhuma palavra igual/.test(preview.live)) fail("a palavra de teste não está limpa: " + preview.live);
  await shot("formulario_adicionar_palavra");

  await evalJs(`document.querySelector("#uw-form").requestSubmit()`);
  await delay(200);
  const saved = await evalJs(`return ({
    closed: document.querySelector("#uw-overlay").hidden,
    toast: document.querySelector("#uw-toasts").innerText,
    out: window.SaelthyrTranslator.ptToSael(${JSON.stringify(pt)}),
    unknown: !!document.querySelector("#tr-dst-layers .tr-unknown"),
    layer: document.querySelector("#tr-dst-layers").innerText.slice(0, 200)
  })`);
  if (!saved.closed) fail("o formulário não fechou ao salvar");
  if (!/salva/i.test(saved.toast)) fail("faltou o aviso de sucesso: " + saved.toast);
  if (!new RegExp(sael, "i").test(saved.out)) fail("não traduziu depois de salvar: " + saved.out);
  if (saved.unknown) fail("a palavra continuou como desconhecida: " + saved.layer);

  await evalJs(`window.SaelthyrApp.openInDictionary(${JSON.stringify(sael)}); document.querySelector(".uw-badge") && document.querySelector(".uw-badge").scrollIntoView({ block: "center" }); true`);
  await delay(150);
  const dict = await evalJs(`return ({
    badge: (document.querySelector(".uw-badge") || {}).textContent || "",
    text: (document.querySelector(".entry-user") || {}).innerText || "",
    panel: document.querySelector("#panel-dicionario").classList.contains("active")
  })`);
  if (!dict.panel) fail("não abriu o Dicionário");
  if (dict.badge !== "adicionada por você") fail("selo errado: " + dict.badge);
  if (!dict.text.includes(pt) || !new RegExp(sael, "i").test(dict.text)) fail("a entrada não mostra a palavra: " + dict.text);
  await shot("badge_dicionario");

  await navigate(`http://127.0.0.1:${PORT}/`);
  if (jsErrors.length) fail("erros de JS depois da recarga:\\n" + jsErrors.join("\\n"));
  const again = await evalJs(`return ({
    out: window.SaelthyrTranslator.ptToSael(${JSON.stringify(pt)}),
    n: window.SaelthyrUserWords.readStore().length
  })`);
  if (!new RegExp(sael, "i").test(again.out) || again.n < 1) fail("não sobreviveu à recarga: " + JSON.stringify(again));
  await evalJs(`window.SaelthyrApp.openInDictionary(${JSON.stringify(sael)}); true`);
  const badgeAgain = await evalJs(`return (document.querySelector(".uw-badge") || {}).textContent || ""`);
  if (badgeAgain !== "adicionada por você") fail("o selo sumiu depois da recarga");

  const ini = await evalJs(`return ({
    sim: window.SaelthyrIniciacao.accepts(${JSON.stringify(sael)}, true, { sael: "x", pt: ${JSON.stringify(pt)} }),
    nao: window.SaelthyrIniciacao.accepts(${JSON.stringify(sael)}, true, { sael: "x", pt: "alma" }),
    pt: window.SaelthyrIniciacao.accepts(${JSON.stringify(pt)}, false, { sael: ${JSON.stringify(sael)}, pt: "outro" })
  })`);
  if (!ini.sim || ini.nao || !ini.pt) fail("Iniciação não consultou a palavra nova: " + JSON.stringify(ini));

  await evalJs(`
    document.querySelector('[data-panel="tradutor"]').click();
    document.querySelector("#tr-swap").click();
    const inp = document.querySelector("#tr-input");
    inp.value = "xyzzynqq";
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    true
  `);
  await delay(250);
  const rev = await evalJs(`
    const w = document.querySelector(".tr-unknown");
    if (!w) return { ok: false, html: document.querySelector("#tr-output").innerText.slice(0, 200) };
    w.click();
    return { ok: true, sael: document.querySelector("#uw-sael").value, pt: document.querySelector("#uw-pt").value };
  `);
  if (!rev.ok || rev.sael !== "xyzzynqq" || rev.pt !== "") fail("no sentido Saelthyr → português o campo não inverteu: " + JSON.stringify(rev));
  await evalJs(`document.querySelector("#uw-pt").value = ""; document.querySelector("#uw-sael").value = ""; document.querySelector("#uw-form").requestSubmit(); true`);
  await delay(100);
  const missing = await evalJs(`return document.querySelector("#uw-toasts").innerText`);
  if (!/Preencha o português e o Saelthyr/.test(missing)) fail("faltou aviso de campo obrigatório: " + missing);
  await evalJs(`document.querySelector("[data-uw-close]").click(); true`);

  await evalJs(`
    window.SaelthyrUserWords.openForm({ word: "zzzcampo", dir: "pt2s" });
    document.querySelector("#uw-sael").value = "kylor";
    document.querySelector("#uw-sael").dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#uw-form").requestSubmit();
    true
  `);
  await delay(200);
  const blocked = await evalJs(`return ({
    title: (document.querySelector("#uw-block-title") || {}).textContent || "",
    text: (document.querySelector("#uw-overlay-top") || {}).innerText || "",
    saved: window.SaelthyrUserWords.readStore().some((e) => e.saelthyr === "kylor")
  })`);
  if (blocked.title !== "Não salva" || !/amigo/i.test(blocked.text) || blocked.saved) fail("duplicata exata não bloqueou: " + JSON.stringify(blocked));
  await evalJs(`document.querySelector("#uw-overlay-top [data-uw-top-close]").click(); document.querySelector("[data-uw-close]").click(); true`);

  await evalJs(`
    window.SaelthyrUserWords.openForm({ word: "amigos", dir: "pt2s" });
    document.querySelector("#uw-sael").value = "qalvorynth2";
    document.querySelector("#uw-sael").dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#uw-form").requestSubmit();
    true
  `);
  await delay(300);
  const warned = await evalJs(`return ({
    anyway: !!document.querySelector("#uw-anyway"),
    text: (document.querySelector("#uw-overlay-top") || {}).innerText || ""
  })`);
  if (!warned.anyway || !/amigo/i.test(warned.text)) fail("aviso de português sem Salvar mesmo assim: " + JSON.stringify(warned));
  await evalJs(`document.querySelector("#uw-overlay-top [data-uw-top-close]").click(); true`);
  await delay(50);
  const cancelled = await evalJs(`return window.SaelthyrUserWords.readStore().some((e) => e.saelthyr === "qalvorynth2")`);
  if (cancelled) fail("Cancelar gravou a palavra");
  await evalJs(`document.querySelector("#uw-form").requestSubmit(); true`);
  await delay(150);
  await evalJs(`document.querySelector("#uw-anyway").click(); true`);
  await delay(200);
  const forced = await evalJs(`return window.SaelthyrUserWords.readStore().some((e) => e.saelthyr === "qalvorynth2")`);
  if (!forced) fail("Salvar mesmo assim não gravou");
  await evalJs(`
    const id = window.SaelthyrUserWords.readStore().find((e) => e.saelthyr === "qalvorynth2").id;
    document.querySelector('[data-uw-del="' + id + '"]') || null;
    window.SaelthyrUserWords.openEdit(id);
    true
  `);
  await delay(100);
  await evalJs(`
    const id = window.SaelthyrUserWords.readStore().find((e) => e.saelthyr === "qalvorynth2").id;
    document.body.insertAdjacentHTML("beforeend", '<button type="button" id="tmp-del" data-uw-del="' + id + '">x</button>');
    document.querySelector("#tmp-del").click();
    true
  `);
  await delay(80);
  await evalJs(`document.querySelector("#uw-do-del").click(); true`);
  await delay(100);
  const gone = await evalJs(`return window.SaelthyrUserWords.readStore().some((e) => e.saelthyr === "qalvorynth2")`);
  if (gone) fail("apagar não removeu a palavra");

  const imported = await evalJs(`return window.SaelthyrUserWords.importList([{ saelthyr: "importvyn", pt: "importadaqq", category: "substantivos", notes: "veio de json" }], false)`);
  if (imported.ok !== 1) fail("importar JSON limpo falhou: " + JSON.stringify(imported));
  const blockedImp = await evalJs(`return window.SaelthyrUserWords.importList([{ saelthyr: "kylor", pt: "zzzimport" }], false)`);
  if (blockedImp.blocked !== 1 || blockedImp.ok !== 0) fail("importar grafia existente não bloqueou: " + JSON.stringify(blockedImp));
  await evalJs(`document.querySelector("[data-uw-top-close]").click(); true`);
  const exp = await evalJs(`return window.SaelthyrUserWords.exportWords().map((e) => e.saelthyr).sort().join(",")`);
  if (!exp.includes(sael) || !exp.includes("importvyn")) fail("exportar não devolveu as palavras: " + exp);

  await evalJs(`document.querySelector('[data-panel="dicionario"]').click(); window.SaelthyrApp.openInDictionary(${JSON.stringify(sael)}); true`);
  await delay(100);
  await evalJs(`document.querySelector("[data-uw-pub]").click(); true`);
  await delay(150);
  const noToken = await evalJs(`return ({
    toast: document.querySelector("#uw-toasts").innerText,
    settings: (document.querySelector("#uw-tok-title") || {}).textContent || ""
  })`);
  if (!/Token ausente/.test(noToken.toast) || !/Token do GitHub/.test(noToken.settings)) fail("token ausente não avisou: " + JSON.stringify(noToken));
  await evalJs(`
    document.querySelector("#uw-token").value = "github_pat_teste";
    document.querySelector("#uw-tok-form").requestSubmit();
    true
  `);
  await delay(100);
  const tok = await evalJs(`return localStorage.getItem(window.SaelthyrUserWords.LS_TOKEN)`);
  if (tok !== "github_pat_teste") fail("o token não ficou só no localStorage");

  await evalJs(`
    window.__gh = { calls: [], mode: "401", puts: 0, gets: 0, remote: [], sha: "abc" };
    const orig = window.fetch;
    window.fetch = async (url, opts) => {
      const u = String(url);
      if (!u.includes("api.github.com")) return orig(url, opts);
      const method = (opts && opts.method) || "GET";
      const body = opts && opts.body ? JSON.parse(opts.body) : null;
      window.__gh.calls.push({ method, body, url: u });
      if (window.__gh.mode === "network") throw new TypeError("Failed to fetch");
      if (window.__gh.mode === "401") {
        return new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      if (method === "GET") {
        window.__gh.gets++;
        const sha = window.__gh.gets > 1 ? "sha-nova" : "sha-velha";
        const json = JSON.stringify(window.__gh.remote || []);
        const bytes = new TextEncoder().encode(json);
        let bin = "";
        bytes.forEach((b) => { bin += String.fromCharCode(b); });
        return new Response(JSON.stringify({ sha, encoding: "base64", content: btoa(bin) }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      window.__gh.puts++;
      if (window.__gh.mode === "twice" ) {
        return new Response(JSON.stringify({ message: "mismatch" }), { status: 409 });
      }
      if (window.__gh.mode === "once" && window.__gh.puts === 1) {
        return new Response(JSON.stringify({ message: "mismatch" }), { status: 422 });
      }
      return new Response(JSON.stringify({ content: { sha: "ok" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    true
  `);

  await evalJs(`document.querySelector("[data-uw-pub]").click(); true`);
  await delay(200);
  const badTok = await evalJs(`return document.querySelector("#uw-toasts").innerText`);
  if (!/inválido/.test(badTok)) fail("token inválido não avisou: " + badTok);

  await evalJs(`window.__gh.mode = "network"; window.__gh.calls = []; document.querySelector("[data-uw-pub]").click(); true`);
  await delay(200);
  const net = await evalJs(`return document.querySelector("#uw-toasts").innerText`);
  if (!/Falha de rede/.test(net)) fail("falha de rede não avisou: " + net);

  await evalJs(`
    window.__gh.mode = "ok";
    window.__gh.remote = [{ saelthyr: ${JSON.stringify(sael)}, pt: "outro sentido", category: "substantivos" }];
    window.__gh.puts = 0;
    window.__gh.calls = [];
    document.querySelector("[data-uw-pub]").click();
    true
  `);
  await delay(300);
  const remoteDup = await evalJs(`return ({
    text: (document.querySelector("#uw-overlay-top") || {}).innerText || "",
    puts: window.__gh.puts,
    pending: window.SaelthyrUserWords.readStore().some((e) => e.saelthyr === ${JSON.stringify(sael)} && e.pending)
  })`);
  if (!/outro sentido/.test(remoteDup.text) || remoteDup.puts !== 0 || !remoteDup.pending) fail("não bloqueou a grafia nova no GitHub: " + JSON.stringify(remoteDup));
  await evalJs(`document.querySelector("[data-uw-top-close]").click(); true`);

  await evalJs(`
    window.__gh.mode = "twice";
    window.__gh.remote = [];
    window.__gh.puts = 0;
    window.__gh.gets = 0;
    window.__gh.calls = [];
    document.querySelector("[data-uw-pub]").click();
    true
  `);
  await delay(400);
  const conflict = await evalJs(`return ({
    toast: document.querySelector("#uw-toasts").innerText,
    puts: window.__gh.puts,
    pending: window.SaelthyrUserWords.readStore().some((e) => e.saelthyr === ${JSON.stringify(sael)} && e.pending)
  })`);
  if (conflict.puts !== 2 || !/Conflito/.test(conflict.toast) || !conflict.pending) fail("conflito não tentou uma vez e parou: " + JSON.stringify(conflict));

  await evalJs(`
    window.__gh.mode = "once";
    window.__gh.remote = [];
    window.__gh.puts = 0;
    window.__gh.gets = 0;
    window.__gh.calls = [];
    document.querySelector("[data-uw-pub]").click();
    true
  `);
  await delay(400);
  const published = await evalJs(`{
    const puts = window.__gh.calls.filter((c) => c.method === "PUT");
    const last = puts[puts.length - 1];
    let words = [];
    if (last) {
      const bin = atob(last.body.content);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      words = JSON.parse(new TextDecoder().decode(bytes));
    }
    const row = window.SaelthyrUserWords.readStore().find((e) => e.saelthyr === ${JSON.stringify(sael)});
    return {
      puts: puts.length,
      sha: last && last.body.sha,
      message: last && last.body.message,
      branch: last && last.body.branch,
      words,
      pending: row && row.pending,
      toast: document.querySelector("#uw-toasts").innerText,
      still: window.SaelthyrTranslator.ptToSael(${JSON.stringify(pt)})
    };
  }`);
  if (published.puts !== 2) fail("não releu e tentou de novo: " + JSON.stringify(published));
  if (published.sha !== "sha-nova") fail("o segundo envio não usou o sha novo: " + published.sha);
  if (published.message !== `Adicionar palavra: ${pt} = ${sael}`) fail("mensagem do commit: " + published.message);
  if (published.branch !== "main") fail("ramo errado");
  const row = published.words.find((w) => w.saelthyr === sael);
  if (!row || row.pt !== pt || row.category !== "substantivos" || row.notes !== "exemplo do teste") fail("JSON publicado: " + JSON.stringify(published.words));
  if (published.pending !== false) fail("não tirou da lista pendente");
  if (!/publicada/.test(published.toast) || !/1 minuto/.test(published.toast)) fail("aviso de publicação: " + published.toast);
  if (!new RegExp(sael, "i").test(published.still)) fail("sumiu do tradutor depois de publicar");

  await evalJs(`
    document.querySelector("#uw-forget") && document.querySelector("#uw-forget").click();
    true
  `);
  await evalJs(`document.querySelector("[data-uw-token]").click(); true`);
  await delay(80);
  await evalJs(`document.querySelector("#uw-forget").click(); true`);
  await delay(80);
  const forgot = await evalJs(`return localStorage.getItem(window.SaelthyrUserWords.LS_TOKEN)`);
  if (forgot) fail("esquecer token não limpou o localStorage");

  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const motion = await evalJs(`return ({
    mq: matchMedia("(prefers-reduced-motion: reduce)").matches,
    name: getComputedStyle(document.querySelector(".uw-toast") || document.body).animationName
  })`);
  if (!motion.mq) fail("prefers-reduced-motion não foi respeitado");

  if (jsErrors.length) fail("erros de JS durante o teste:\\n" + jsErrors.join("\\n"));
  console.log("ok " + sael + " = " + pt);
}

try {
  await run();
} catch (err) {
  console.error(err && err.stack || err);
  if (jsErrors.length) console.error("JS:\\n" + jsErrors.join("\\n"));
  process.exitCode = 1;
} finally {
  if (ws) try { ws.close(); } catch { /* já fechado */ }
  if (chrome) chrome.kill("SIGKILL");
  if (server) server.kill("SIGKILL");
}
