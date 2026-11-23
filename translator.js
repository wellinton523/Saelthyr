/* Saelthyr — Tradutor aproximado PT ⇄ Saelthyr (sem build; usa data.js + lexicon.js) */
(function () {
  "use strict";

  const LS_KEY = "saelthyr.tradutor.v1";
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- normalização ---------- */
  function strip(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function cleanKey(s) {
    return strip(s).replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
  }

  /* ---------- tabelas gramaticais (PT → Saelthyr) ---------- */
  // consultadas com acento primeiro (é ≠ e, nós ≠ nos)
  const PRON = {
    "eu": "zer", "tu": "ryn", "você": "ryn", "voce": "ryn", "ele": "ael", "ela": "ael",
    "nós": "zerim", "a gente": "zerim", "vocês": "rynim", "voces": "rynim", "eles": "aelim", "elas": "aelim",
  };
  const CLITIC = { "me": "zer", "te": "ryn", "lhe": "ael", "nos": "zerim", "lhes": "aelim", "mim": "zer", "ti": "ryn", "comigo": "kym zer", "contigo": "kym ryn" };
  const ARTICLES = new Set(["o", "a", "os", "as", "um", "uma", "uns", "umas"]);
  const POSS_PRE = {
    meu: "zer", minha: "zer", meus: "zer", minhas: "zer",
    teu: "ryn", tua: "ryn", teus: "ryn", tuas: "ryn",
    seu: "ryn", sua: "ryn", seus: "ryn", suas: "ryn",
    nosso: "zerim", nossa: "zerim", nossos: "zerim", nossas: "zerim",
    vosso: "rynim", vossa: "rynim", vossos: "rynim", vossas: "rynim",
  };
  const POSS_POST = { dele: "va ael", dela: "va ael", deles: "va aelim", delas: "va aelim" };
  const CONTRACT = {
    "do": "va", "da": "va", "dos": "va", "das": "va", "dum": "va", "duma": "va",
    "no": "yn", "na": "yn", "nos": "yn", "nas": "yn", "num": "yn", "numa": "yn",
    "ao": "tor", "aos": "tor", "à": "tor", "às": "tor", "pelo": "dun", "pela": "dun", "pelos": "dun", "pelas": "dun",
  };
  // verbos irregulares: forma → [infinitivo, tempo]  (p = presente, v = passado, n = futuro)
  const IRR = {};
  function irr(inf, tense, forms) { forms.split(" ").forEach((f) => { if (!IRR[f]) IRR[f] = [inf, tense]; }); }
  irr("ser", "p", "sou és é somos são sois");
  irr("ser", "v", "era eras éramos eram fui foste foi fomos foram");
  irr("ser", "n", "serei serás será seremos serão");
  irr("estar", "p", "estou estás está estamos estão");
  irr("estar", "v", "estava estavas estávamos estavam estive estiveste esteve estivemos estiveram");
  irr("estar", "n", "estarei estarás estará estaremos estarão");
  irr("ter", "p", "tenho tens tem temos têm");
  irr("ter", "v", "tinha tinhas tínhamos tinham tive tiveste teve tivemos tiveram");
  irr("ter", "n", "terei terás terá teremos terão");
  irr("haver", "p", "há");
  irr("ir", "p", "vou vais vai vamos vão");
  irr("ir", "v", "ia iam");
  irr("ir", "n", "irei irás irá iremos irão");
  irr("vir", "p", "venho vens vem vimos vêm");
  irr("vir", "v", "vim veio vieram viemos");
  irr("vir", "n", "virei virá viremos virão");
  irr("saber", "p", "sei sabes sabe sabemos sabem");
  irr("saber", "v", "sabia sabiam soube souberam");
  irr("saber", "n", "saberei saberá saberemos saberão");
  irr("querer", "p", "quero queres quer queremos querem");
  irr("querer", "v", "queria queriam quis quiseram");
  irr("poder", "p", "posso podes pode podemos podem");
  irr("poder", "v", "podia podiam pude pôde puderam");
  irr("poder", "n", "poderei poderá poderemos poderão");
  irr("ver", "p", "vejo vês vê vemos veem");
  irr("ver", "v", "vi viu viram vimos");
  irr("ver", "n", "verei verá veremos verão");
  irr("dizer", "p", "digo dizes diz dizemos dizem");
  irr("dizer", "v", "disse disseram dissemos");
  irr("dizer", "n", "direi dirá diremos dirão");
  irr("fazer", "p", "faço fazes faz fazemos fazem");
  irr("fazer", "v", "fiz fez fizemos fizeram");
  irr("fazer", "n", "farei fará faremos farão");
  irr("dar", "p", "dou dás dá damos dão");
  irr("dar", "v", "dei deu demos deram");
  irr("dar", "n", "darei dará daremos darão");
  irr("conhecer", "p", "conheço");
  irr("proteger", "p", "protejo");
  irr("ouvir", "p", "ouço");
  irr("pedir", "p", "peço");

  const PHRASE_OVR = {
    "de novo": "yn faeth thaenyr", "por enquanto": "dun qeldur",
    "prazer em te conhecer": "Haelth qyr zer naereth ryn", "prazer em conhecer voce": "Haelth qyr zer naereth ryn",
    "para sempre": "yrael", "mesmo se": "qed sy", "obrigado": "graeth", "obrigada": "graeth",
    "de nada": "nael", "por favor": "shyr", "ola": "hael", "oi": "hael", "tudo bem": "pael", "estou bem": "essyr pael",
  };
  const RITUAL_OVR = { "adeus": "faren va hushyr", "sim": "eyth", "ate logo": "faren va hushyr" };

  /* ---------- índices ---------- */
  let PT2S = null, S2PT = null, VERBS = null, MAXN = 1;

  function addPT(key, entry, prio) {
    if (!key) return;
    const cur = PT2S.get(key);
    if (cur && cur.prio <= prio) return;
    PT2S.set(key, { sael: entry.saelthyr, entry, prio });
    const n = key.split(" ").length;
    if (n > MAXN) MAXN = Math.min(n, 12);
  }

  function buildIndex() {
    PT2S = new Map(); S2PT = new Map(); VERBS = new Map();
    const entries = (typeof SAELTHYR !== "undefined" && SAELTHYR.entries) || [];
    entries.forEach((e, i) => {
      const prio = i; // data.js vem antes do lexicon.js → prioridade
      const isPhrase = e.category === "frases";
      if (isPhrase) {
        addPT(cleanKey(e.pt), e, prio);
      } else {
        String(e.pt).split(/\s*\/\s*|\s*;\s*/).forEach((v) => {
          const k = cleanKey(v);
          if (!k || k === "negacao" || k === "particula interrogativa" || k.startsWith("marcador")) return;
          addPT(k, e, prio);
          if (e.category === "verbos" && /(ar|er|ir|or)$/.test(k) && !VERBS.has(k)) VERBS.set(k, e);
        });
      }
      const sk = cleanKey(e.saelthyr);
      if (sk && !S2PT.has(sk)) S2PT.set(sk, e);
    });
    // regras gramaticais têm prioridade
    Object.entries(PHRASE_OVR).forEach(([k, v]) => {
      PT2S.set(k, { sael: v, entry: findSael(v) || { saelthyr: v, pt: k, category: "frases" }, prio: -1 });
      MAXN = Math.max(MAXN, k.split(" ").length);
    });
    Object.entries(PHRASE_OVR).forEach(([k, v]) => {
      const sk = cleanKey(v);
      if (sk.split(" ").length >= 3 && !S2PT.has(sk)) S2PT.set(sk, { saelthyr: v, pt: k, category: "frases" });
    });
    // nomes fáceis de verbos que não estão em -ar/-er/-ir no léxico
    [["ser", "essyr"], ["estar", "essyr"], ["ter", "haveth"], ["haver", "haveth"], ["saber", "vaelth"], ["querer", "volyth"], ["poder", "poth"],
     ["ver", "vyth"], ["vir", "vyn"], ["ir", "ir"], ["dizer", "dyreth"], ["fazer", "draveth"], ["dar", "delyth"], ["conhecer", "naereth"]]
      .forEach(([pt, s]) => VERBS.set(pt, findSael(s) || { saelthyr: s, pt, category: "verbos" }));
    // gramática Saelthyr → PT
    const GR = { zer: "eu", ryn: "você", ael: "ele/ela", zerim: "nós", rynim: "vocês", aelim: "eles/elas", essyr: "ser / estar", haveth: "ter", va: "de", yn: "em", kae: "?", mael: "o que", nyth: "agora", ensel: "também", pael: "paz / bem" };
    Object.entries(GR).forEach(([s, p]) => { if (!S2PT.has(s)) S2PT.set(s, { saelthyr: s, pt: p, category: "particulas" }); });
  }

  function findSael(s) {
    const k = cleanKey(s);
    if (S2PT && S2PT.has(k)) return S2PT.get(k);
    return (typeof SAELTHYR !== "undefined" && SAELTHYR.entries.find((e) => cleanKey(e.saelthyr) === k)) || null;
  }

  /* ---------- tokenização ---------- */
  function tokenize(line) {
    const re = /[\p{L}\p{M}]+(?:[-'][\p{L}\p{M}]+)*|\d+|\[[^\]]*\]|[^\s]/gu;
    const out = []; let m;
    while ((m = re.exec(line))) {
      const t = m[0];
      out.push({ raw: t, word: /[\p{L}\d\[]/u.test(t[0]) });
    }
    return out;
  }

  function singular(k) {
    const c = [];
    if (/oes$/.test(k)) c.push(k.replace(/oes$/, "ao"));
    if (/aes$/.test(k)) c.push(k.replace(/aes$/, "ao"));
    if (/ais$/.test(k)) c.push(k.replace(/ais$/, "al"));
    if (/eis$/.test(k)) c.push(k.replace(/eis$/, "el"));
    if (/ns$/.test(k)) c.push(k.replace(/ns$/, "m"));
    if (/(r|z|s)es$/.test(k)) c.push(k.replace(/es$/, ""));
    if (/s$/.test(k)) c.push(k.replace(/s$/, ""));
    return c;
  }

  function verbLookup(k) {
    // devolve {entry, tense, form}
    const tryInf = (inf, tense, form) => (VERBS.has(inf) ? { entry: VERBS.get(inf), tense, form: form || "fin" } : null);
    let r;
    if (/(ando|endo|indo)$/.test(k)) {
      const st = k.slice(0, -4);
      if ((r = tryInf(st + (k.endsWith("ando") ? "ar" : k.endsWith("endo") ? "er" : "ir"), "p", "ger"))) return r;
    }
    if (/(ado|ada|ados|adas)$/.test(k)) { const st = k.replace(/(ado|ada|ados|adas)$/, ""); if ((r = tryInf(st + "ar", "v", "part"))) return r; }
    if (/(ido|ida|idos|idas)$/.test(k)) { const st = k.replace(/(ido|ida|idos|idas)$/, ""); if ((r = tryInf(st + "er", "v", "part")) || (r = tryInf(st + "ir", "v", "part"))) return r; }
    // futuro: infinitivo + ei/a/as/emos/ao
    for (const suf of ["emos", "ao", "as", "ei", "a"]) {
      if (k.endsWith(suf)) { const inf = k.slice(0, -suf.length); if (/(ar|er|ir)$/.test(inf) && (r = tryInf(inf, "n"))) return r; }
    }
    // passado
    const past = [["aram", "ar"], ["avam", "ar"], ["ava", "ar"], ["aste", "ar"], ["amos", "ar"], ["ou", "ar"], ["ei", "ar"],
      ["eram", "er"], ["eu", "er"], ["iam", "er"], ["ia", "er"], ["iram", "ir"], ["iu", "ir"], ["iam", "ir"], ["ia", "ir"], ["i", "er"], ["i", "ir"]];
    for (const [suf, end] of past) if (k.endsWith(suf) && k.length > suf.length + 1 && (r = tryInf(k.slice(0, -suf.length) + end, "v"))) return r;
    // presente
    const pres = [["amos", "ar"], ["am", "ar"], ["as", "ar"], ["a", "ar"], ["o", "ar"], ["emos", "er"], ["em", "er"], ["es", "er"], ["e", "er"], ["o", "er"],
      ["imos", "ir"], ["em", "ir"], ["es", "ir"], ["e", "ir"], ["o", "ir"]];
    for (const [suf, end] of pres) if (k.endsWith(suf) && k.length > suf.length + 1 && (r = tryInf(k.slice(0, -suf.length) + end, "p"))) return r;
    if (VERBS.has(k)) return { entry: VERBS.get(k), tense: "p", form: "inf" };
    return null;
  }

  /* ---------- PT → Saelthyr ---------- */
  function lookupPT(tokens, i, isQuestion, register) {
    const t = tokens[i];
    const low = t.raw.toLowerCase();
    const k = strip(low);
    if (/^\[.*\]$/.test(t.raw)) return { n: 1, item: { kind: "name", sael: t.raw, src: t.raw } };
    // frases (mais longas primeiro)
    for (let n = Math.min(MAXN, tokens.length - i); n >= 2; n--) {
      const slice = tokens.slice(i, i + n);
      if (slice.some((x) => !x.word)) continue;
      const key = cleanKey(slice.map((x) => x.raw).join(" "));
      if (isQuestion && key === "o que") return { n, item: { kind: "word", sael: "mael", src: "o que", entry: findSael("mael") } };
      if (register === "ritual" && RITUAL_OVR[key]) return { n, item: { kind: "word", sael: RITUAL_OVR[key], src: key, entry: findSael(RITUAL_OVR[key]) } };
      if (PRON[key]) return { n, item: { kind: "pron", sael: PRON[key], src: slice.map((x) => x.raw).join(" ") } };
      const hit = PT2S.get(key);
      if (hit) return { n, item: { kind: "word", sael: hit.sael.replace(/[.!?]+$/, ""), src: slice.map((x) => x.raw).join(" "), entry: hit.entry } };
    }
    if (register === "ritual" && RITUAL_OVR[k]) return { n: 1, item: { kind: "word", sael: RITUAL_OVR[k], src: t.raw, entry: findSael(RITUAL_OVR[k]) } };
    if (PRON[low] || (PRON[k] && k !== "nos")) return { n: 1, item: { kind: "pron", sael: PRON[low] || PRON[k], src: t.raw } };
    if (k === "nao") return { n: 1, item: { kind: "neg", src: t.raw } };
    if (ARTICLES.has(low)) return { n: 1, item: { kind: "art", src: t.raw } };
    if (POSS_PRE[k]) return { n: 1, item: { kind: "poss", owner: POSS_PRE[k], src: t.raw } };
    if (POSS_POST[k]) return { n: 1, item: { kind: "word", sael: POSS_POST[k], src: t.raw } };
    if (CLITIC[k] && k !== "nos") return { n: 1, item: { kind: "clitic", sael: CLITIC[k], src: t.raw } };
    if (CONTRACT[low]) return { n: 1, item: { kind: "word", sael: CONTRACT[low], src: t.raw, entry: findSael(CONTRACT[low]) } };
    if (k === "de") return { n: 1, item: { kind: "word", sael: "va", src: t.raw, entry: findSael("va") } };
    const irrHit = IRR[low] || IRR[k];
    if (irrHit && !(k === "e" && low === "e")) {
      const v = VERBS.get(irrHit[0]);
      if (v) return { n: 1, item: { kind: "verb", sael: v.saelthyr, tense: irrHit[1], inf: irrHit[0], src: t.raw, entry: v } };
    }
    const exact = PT2S.get(k);
    if (exact && exact.entry.category !== "verbos") return { n: 1, item: { kind: "word", sael: exact.sael, src: t.raw, entry: exact.entry } };
    if (exact) return { n: 1, item: { kind: "verb", sael: exact.sael, tense: "p", form: "inf", src: t.raw, entry: exact.entry } };
    const vb = verbLookup(k);
    if (vb) return { n: 1, item: { kind: "verb", sael: vb.entry.saelthyr, tense: vb.tense, form: vb.form, src: t.raw, entry: vb.entry } };
    for (const sg of singular(k)) {
      const h = PT2S.get(sg);
      if (h && !/\s/.test(h.sael) && !/im$/.test(h.sael) && h.entry.category !== "verbos" && h.entry.category !== "particulas") {
        return { n: 1, item: { kind: "word", sael: h.sael + "im", src: t.raw, entry: h.entry, plural: true } };
      }
    }
    if (/^\d+$/.test(k)) return { n: 1, item: { kind: "word", sael: numToSael(k), src: t.raw } };
    return { n: 1, item: { kind: "unknown", sael: t.raw, src: t.raw } };
  }

  function numToSael(d) {
    const D = ["vaen", "aen", "dwyr", "thryn", "kaeth", "pyrn", "hesk", "vyl", "oryn", "nyrr"];
    return d.split("").map((c) => D[+c]).join("");
  }

  function ptToSael(text, register) {
    const lines = String(text).split(/\n/);
    return lines.map((line) => {
      const toks = tokenize(line);
      const isQ = /\?\s*$/.test(line);
      const raw = [];
      for (let i = 0; i < toks.length;) {
        if (!toks[i].word) { raw.push({ kind: "punct", sael: toks[i].raw, src: toks[i].raw }); i++; continue; }
        const r = lookupPT(toks, i, isQ, register);
        raw.push(r.item); i += r.n;
      }
      // passe gramatical
      const out = [];
      let neg = null, poss = null, aux = null;
      const nextVerbIdx = (from) => { for (let j = from; j < raw.length && j < from + 3; j++) { if (raw[j].kind === "verb") return j; if (raw[j].kind === "punct") return -1; } return -1; };
      for (let i = 0; i < raw.length; i++) {
        const it = raw[i];
        if (it.kind === "art") continue;
        if (it.kind === "neg") {
          if (nextVerbIdx(i + 1) >= 0) { neg = it; continue; }
          out.push({ kind: "word", sael: "kel", src: it.src, entry: findSael("kel") }); continue;
        }
        if (it.kind === "poss") { poss = it; continue; }
        if (it.kind === "clitic") {
          const vj = nextVerbIdx(i + 1);
          if (vj >= 0) { raw[vj].after = (raw[vj].after || []).concat([it]); continue; }
          out.push({ kind: "pron", sael: it.sael, src: it.src }); continue;
        }
        if (it.kind === "verb") {
          // "vou/vai + infinitivo" → nelth + verbo
          if (it.inf === "ir" && it.tense === "p") {
            const vj = nextVerbIdx(i + 1);
            if (vj >= 0 && (raw[vj].form === "inf" || raw[vj].form === "fin")) { aux = { tense: "n", src: it.src, neg }; neg = null; continue; }
          }
          // "estou/está + gerúndio" → verbo simples
          if (it.inf === "estar") { const vj = nextVerbIdx(i + 1); if (vj === i + 1 && raw[vj].form === "ger") { aux = { tense: "p", src: it.src, neg }; neg = null; continue; } }
          let tense = it.tense, src = it.src, n = neg;
          if (aux) { tense = aux.tense; src = aux.src + " " + it.src; n = aux.neg || neg; aux = null; }
          neg = null;
          if (it.form === "part") {
            out.push({ kind: "verb", sael: "velth " + (n ? "kel-" : "") + it.sael, src: (n ? n.src + " " : "") + src, entry: it.entry, tense: "v" });
          } else {
            const marker = tense === "v" ? "velth " : tense === "n" ? "nelth " : "";
            out.push({ kind: "verb", sael: marker + (n ? "kel-" : "") + it.sael, src: (n ? n.src + " " : "") + src, entry: it.entry, tense });
          }
          (it.after || []).forEach((c) => out.push({ kind: "pron", sael: c.sael, src: c.src }));
          continue;
        }
        if (it.kind === "punct" && it.sael === "?") {
          if (!out.some((o) => /(^|\s)kae$/i.test(o.sael || ""))) out.push({ kind: "word", sael: "kae", src: "?", entry: findSael("kae") });
          out.push(it); continue;
        }
        out.push(it);
        if (poss && (it.kind === "word" || it.kind === "unknown")) {
          out.push({ kind: "word", sael: "va " + poss.owner, src: poss.src, entry: findSael("va") });
          poss = null;
        }
      }
      if (neg) out.push({ kind: "word", sael: "kel", src: neg.src });
      if (poss) out.push({ kind: "word", sael: "va " + poss.owner, src: poss.src });
      // maiúscula no início da frase
      let start = true;
      out.forEach((o) => {
        if (o.kind === "punct") { if (/[.!?]/.test(o.sael)) start = true; return; }
        if (start && o.sael) { o.sael = o.sael.charAt(0).toUpperCase() + o.sael.slice(1); start = false; }
      });
      if (register === "ritual") {
        const last = out[out.length - 1];
        if (out.length && (!last || last.kind !== "punct")) out.push({ kind: "punct", sael: ".", src: "" });
      }
      return out;
    });
  }

  /* ---------- Saelthyr → PT ---------- */
  const PT_IRR_PAST = {
    ser: ["fui", "foi", "foi", "fomos", "foram"], estar: ["estive", "esteve", "esteve", "estivemos", "estiveram"], ter: ["tive", "teve", "teve", "tivemos", "tiveram"],
    ir: ["fui", "foi", "foi", "fomos", "foram"], vir: ["vim", "veio", "veio", "viemos", "vieram"], ver: ["vi", "viu", "viu", "vimos", "viram"],
    dizer: ["disse", "disse", "disse", "dissemos", "disseram"], fazer: ["fiz", "fez", "fez", "fizemos", "fizeram"], saber: ["soube", "soube", "soube", "soubemos", "souberam"],
    querer: ["quis", "quis", "quis", "quisemos", "quiseram"], poder: ["pude", "pôde", "pôde", "pudemos", "puderam"], dar: ["dei", "deu", "deu", "demos", "deram"],
  };
  PT_IRR_PAST["ser / estar"] = PT_IRR_PAST.ser;
  const FUT_STEM = { fazer: "far", dizer: "dir", trazer: "trar", "ser / estar": "ser" };
  const PT_IRR_PRES = {
    "ser / estar": ["sou", "é", "é", "somos", "são"], ser: ["sou", "é", "é", "somos", "são"], ter: ["tenho", "tem", "tem", "temos", "têm"],
    ir: ["vou", "vai", "vai", "vamos", "vão"], vir: ["venho", "vem", "vem", "vimos", "vêm"], ver: ["vejo", "vê", "vê", "vemos", "veem"],
    dizer: ["digo", "diz", "diz", "dizemos", "dizem"], fazer: ["faço", "faz", "faz", "fazemos", "fazem"], saber: ["sei", "sabe", "sabe", "sabemos", "sabem"],
    querer: ["quero", "quer", "quer", "queremos", "querem"], poder: ["posso", "pode", "pode", "podemos", "podem"], dar: ["dou", "dá", "dá", "damos", "dão"],
    proteger: ["protejo", "protege", "protege", "protegemos", "protegem"], conhecer: ["conheço", "conhece", "conhece", "conhecemos", "conhecem"],
  };
  const PERSON = { zer: 0, ryn: 1, ael: 2, zerim: 3, rynim: 4, aelim: 4 };
  const POSS_PT = { zer: ["meu", true], ryn: ["teu", true], ael: ["dele", false], zerim: ["nosso", true], rynim: ["de vocês", false], aelim: ["deles", false] };

  function firstPT(e) {
    return String(e.pt).split(/\s*\/\s*/)[0].replace(/\s*\([^)]*\)/g, "").trim();
  }
  function conjugate(ptInf, tense, person) {
    const inf = ptInf.trim();
    const base = inf.split(/\s*\/\s*/)[0];
    const p = person == null ? 2 : person;
    if (/\s/.test(base) && !PT_IRR_PRES[inf]) return base;
    if (tense === "v") {
      const t = PT_IRR_PAST[inf] || PT_IRR_PAST[base]; if (t) return t[p];
      const P = { ar: ["ei", "ou", "ou", "amos", "aram"], er: ["i", "eu", "eu", "emos", "eram"], ir: ["i", "iu", "iu", "imos", "iram"] };
      const m = base.match(/^(.*)(ar|er|ir)$/); return m ? m[1] + P[m[2]][p] : base;
    }
    if (tense === "n") {
      const stem = FUT_STEM[inf] || FUT_STEM[base] || (/(ar|er|ir|or)$/.test(base) ? base : null);
      return stem ? stem + ["ei", "á", "á", "emos", "ão"][p] : base;
    }
    const t = PT_IRR_PRES[inf] || PT_IRR_PRES[base];
    if (t) return t[p];
    const m = base.match(/^(.*)(ar|er|ir)$/);
    if (!m || /\s/.test(base)) return base;
    const st = m[1], c = m[2];
    const E = { ar: ["o", "a", "a", "amos", "am"], er: ["o", "e", "e", "emos", "em"], ir: ["o", "e", "e", "imos", "em"] };
    return st + E[c][p];
  }
  function pluralPT(w) {
    if (/ão$/.test(w)) return w.replace(/ão$/, "ões");
    if (/[aeiou]l$/.test(w)) return w.replace(/l$/, "is");
    if (/[rz]$/.test(w)) return w + "es";
    if (/m$/.test(w)) return w.replace(/m$/, "ns");
    if (/s$/.test(w)) return w;
    return w + "s";
  }

  function lookupS(k) {
    let e = S2PT.get(k);
    if (e) return { entry: e, plural: false };
    if (/im$/.test(k) && k.length > 3) { e = S2PT.get(k.slice(0, -2)); if (e) return { entry: e, plural: true }; }
    return null;
  }

  function saelToPT(text) {
    return String(text).split(/\n/).map((line) => {
      const toks = tokenize(line);
      const out = [];
      let tense = null, person = null, neg = false, sawKae = false;
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (!t.word) {
          if (t.raw === "?" ) { sawKae = false; }
          out.push({ kind: "punct", pt: t.raw, sael: t.raw });
          if (/[.!?;,]/.test(t.raw)) person = null;
          continue;
        }
        if (/^\[.*\]$/.test(t.raw)) { out.push({ kind: "name", pt: t.raw, sael: t.raw }); continue; }
        // frases multi-palavra
        let matched = false;
        for (let n = Math.min(6, toks.length - i); n >= 2; n--) {
          const sl = toks.slice(i, i + n);
          if (sl.some((x) => !x.word)) continue;
          const key = cleanKey(sl.map((x) => x.raw).join(" "));
          if (/^va (zer|ryn|ael|zerim|rynim|aelim)$/.test(key)) break;
          const e = S2PT.get(key);
          if (e) { out.push({ kind: "word", pt: e.category === "frases" ? e.pt.replace(/[.!?]+$/, "") : firstPT(e), sael: sl.map((x) => x.raw).join(" "), entry: e }); i += n - 1; matched = true; break; }
        }
        if (matched) continue;
        let k = cleanKey(t.raw);
        if (k === "velth" || k === "nelth") { tense = k === "velth" ? "v" : "n"; out.push({ kind: "marker", pt: "", sael: t.raw, gloss: k === "velth" ? "(passado)" : "(futuro)", entry: findSael(k) }); continue; }
        if (k === "kae") { sawKae = true; out.push({ kind: "marker", pt: "", sael: t.raw, gloss: "(pergunta)", entry: findSael("kae") }); continue; }
        if (k === "va" && toks[i + 1] && PERSON[cleanKey(toks[i + 1].raw)] != null) {
          const owner = cleanKey(toks[i + 1].raw);
          const [w, pre] = POSS_PT[owner];
          let j = out.length - 1; while (j >= 0 && out[j].kind === "punct") j--;
          if (pre && j >= 0 && out[j].kind !== "marker") out[j].pt = w + " " + out[j].pt;
          else out.push({ kind: "word", pt: w, sael: "" });
          out.push({ kind: "word", pt: "", sael: t.raw + " " + toks[i + 1].raw, gloss: w, entry: findSael("va") });
          i++; continue;
        }
        if (/^(sed|et|qyr|qel|qer|qed|qen)$/.test(k)) person = null;
        if (k.startsWith("kel-") && k.length > 4) { neg = true; k = k.slice(4); }
        if (PERSON[k] != null) person = PERSON[k];
        const hit = lookupS(k);
        if (!hit) { out.push({ kind: "unknown", pt: t.raw, sael: t.raw }); tense = null; neg = false; continue; }
        const e = hit.entry;
        let pt = firstPT(e);
        if (k === "ryn") pt = "você";
        if (e.category === "verbos" || k === "essyr" || k === "haveth") {
          pt = conjugate(e.pt.split(/\s*\/\s*/).length > 1 && /ser/.test(e.pt) ? "ser / estar" : firstPT(e), tense || "p", person);
        } else if (hit.plural) pt = pluralPT(pt);
        if (neg) pt = "não " + pt;
        if (person == null && PERSON[k] == null && !(e.category === "verbos") && e.category !== "particulas") person = hit.plural || /im$/.test(k) ? 4 : 2;
        out.push({ kind: "word", pt, sael: t.raw, entry: e, gloss: pt });
        tense = null; neg = false;
      }
      if (sawKae && !out.some((o) => o.pt === "?")) out.push({ kind: "punct", pt: "?", sael: "" });
      let start = true;
      out.forEach((o) => {
        if (o.kind === "punct") { if (/[.!?]/.test(o.pt)) start = true; return; }
        if (start && o.pt) { o.pt = o.pt.charAt(0).toUpperCase() + o.pt.slice(1); start = false; }
      });
      return out;
    });
  }

  /* ---------- render ---------- */
  const st = { dir: "pt2s", text: "", register: "cotidiano" };
  try { Object.assign(st, JSON.parse(localStorage.getItem(LS_KEY) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} };

  let A = null; // SaelthyrApp
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ENTRY_REG = [];
  function regEntry(e) { if (!e) return ""; let i = ENTRY_REG.indexOf(e); if (i < 0) { ENTRY_REG.push(e); i = ENTRY_REG.length - 1; } return String(i); }

  function joinTokens(items, field) {
    let s = "";
    items.forEach((o) => {
      const v = o[field]; if (!v) return;
      if (o.kind === "punct" && /^[.,!?;:)\]…]$/.test(v)) s += v;
      else if (s && !/[(\[]$/.test(s)) s += " " + v; else s += v;
    });
    return s.trim();
  }

  function block(sael, gloss, entry, unknown) {
    const cr = A.toCruor(sael);
    return `<span class="tr-w${unknown ? " tr-unknown" : ""}" tabindex="0" data-e="${regEntry(entry)}" data-word="${esc(sael)}"${unknown ? ' title="não está no léxico"' : ""}>
      <span class="tr-w-sael">${esc(sael)}</span>
      <span class="cruor tr-w-cruor" aria-hidden="true">${esc(cr || "\u00a0")}</span>
      <span class="tr-w-gloss">${esc(unknown ? "não está no léxico" : gloss || "\u00a0")}</span></span>`;
  }

  function renderLayersPT2S(lines) {
    return lines.map((items) => `<div class="tr-line">${items.map((o) => {
      if (o.kind === "punct") return `<span class="tr-p">${esc(o.sael)}</span>`;
      // frase pronta: uma camada por palavra, cada uma com a sua glosa
      if (o.entry && o.entry.category === "frases" && /\s/.test(o.sael)) {
        let person = null, tense = null, capped = false;
        return o.sael.split(/\s+/).map((w) => {
          const bare = w.replace(/[.,;!?]+$/, "");
          const k = cleanKey(bare);
          if (k === "velth" || k === "nelth") {
            tense = k === "velth" ? "v" : "n";
            const h = lookupS(k);
            return block(bare, k === "velth" ? "marcador de passado" : "marcador de futuro", h ? h.entry : o.entry, false);
          }
          const stem = k.replace(/^kel-/, "");
          const h = lookupS(stem);
          let g = "";
          if (h) {
            if (PERSON[stem] != null) person = PERSON[stem];
            const e = h.entry;
            const isVerb = e.category === "verbos" || stem === "essyr" || stem === "haveth";
            if (isVerb && (person != null || tense)) {
              g = conjugate(e.pt.split(/\s*\/\s*/).length > 1 && /ser/.test(e.pt) ? "ser / estar" : firstPT(e), tense || "p", person);
              tense = null;
            } else g = firstPT(e) + (h.plural ? " (pl.)" : "");
            if (k.startsWith("kel-")) g = "não " + g;
          }
          if (!capped && g) { g = g.charAt(0).toUpperCase() + g.slice(1); capped = true; }
          return block(bare, g, h ? h.entry : o.entry, false);
        }).join("");
      }
      return block(o.sael, o.src, o.entry, o.kind === "unknown");
    }).join("")}</div>`).join("");
  }
  function renderLayersS2PT(lines) {
    return lines.map((items) => `<div class="tr-line">${items.map((o) => {
      if (o.kind === "punct") return o.sael ? `<span class="tr-p">${esc(o.sael)}</span>` : "";
      if (!o.sael) return "";
      return block(o.sael, o.gloss || o.pt, o.entry, o.kind === "unknown");
    }).join("")}</div>`).join("");
  }
  function renderPTOut(lines) {
    return lines.map((items) => {
      const parts = []; let prev = "";
      items.forEach((o) => {
        if (!o.pt) return;
        const tight = o.kind === "punct" && /^[.,!?;:)\]…]$/.test(o.pt);
        const html = o.kind === "unknown"
          ? `<span class="tr-unknown tr-inline" tabindex="0" title="não está no léxico" data-word="${esc(o.pt)}">${esc(o.pt)}</span>`
          : o.entry ? `<span class="tr-inline tr-hover" tabindex="0" data-e="${regEntry(o.entry)}" data-word="${esc(o.sael)}">${esc(o.pt)}</span>` : esc(o.pt);
        parts.push((parts.length && !tight ? " " : "") + html); prev = o.pt;
      });
      return `<div class="tr-line-pt">${parts.join("") || "&nbsp;"}</div>`;
    }).join("");
  }

  let lastSael = "", lastPlain = "";
  function update() {
    const inp = $("#tr-input");
    st.text = inp.value; save();
    const srcL = $("#tr-src-layers"), dstL = $("#tr-dst-layers"), out = $("#tr-output");
    const empty = !st.text.trim();
    if (st.dir === "pt2s") {
      const lines = ptToSael(st.text, st.register);
      srcL.hidden = true; srcL.innerHTML = "";
      out.innerHTML = ""; out.hidden = true;
      dstL.innerHTML = empty ? '<p class="tr-empty">A tradução aparece aqui, em três camadas: palavra, Cruorthyr e glosa.</p>' : renderLayersPT2S(lines);
      lastSael = lines.map((l) => joinTokens(l, "sael")).join("\n");
      lastPlain = lastSael;
    } else {
      const lines = saelToPT(st.text);
      srcL.hidden = empty;
      srcL.innerHTML = empty ? "" : renderLayersS2PT(lines);
      dstL.innerHTML = "";
      out.hidden = false;
      out.innerHTML = empty ? '<p class="tr-empty">A tradução em português aparece aqui.</p>' : renderPTOut(lines);
      lastSael = st.text.trim();
      lastPlain = lines.map((l) => joinTokens(l, "pt")).join("\n");
    }
  }

  function applyDir() {
    const pt2s = st.dir === "pt2s";
    $("#tr-src-lang").textContent = pt2s ? "Português" : "Saelthyr";
    $("#tr-dst-lang").textContent = pt2s ? "Saelthyr" : "Português";
    $("#tr-input").placeholder = pt2s ? "Escreva em português… ex.: eu não sei" : "Escreva em Saelthyr… ex.: zer kel-vaelth";
    $("#tr-page-src").classList.toggle("is-sael", !pt2s);
    $("#tr-page-dst").classList.toggle("is-sael", pt2s);
    $("#tr-copy-cruor").hidden = false;
    $("#tr-copy-text").textContent = pt2s ? "Copiar texto" : "Copiar português";
    document.querySelectorAll("[data-register]").forEach((b) => b.classList.toggle("active", b.dataset.register === st.register));
    $(".tr-register").style.visibility = pt2s ? "visible" : "hidden";
    renderChips();
    update();
  }

  function renderChips() {
    const wrap = $("#tr-chips"); if (!wrap) return;
    const fr = SAELTHYR.entries.filter((e) => e.category === "frases" && e.saelthyr.length < 60).slice(0, 14);
    wrap.innerHTML = fr.map((e, i) => `<button type="button" class="chip tr-chip" data-i="${i}">${esc(st.dir === "pt2s" ? e.pt : e.saelthyr)}</button>`).join("");
    wrap._list = fr;
  }

  function copy(text, btn) {
    // Same as the ritual copy button: show "Copiado" on the click.
    // clipboard.writeText can stay pending and used to leave the label stuck.
    const lab = btn.textContent === "Copiado" ? (btn.dataset.lab || "Copiar") : btn.textContent;
    btn.dataset.lab = lab;
    btn.textContent = "Copiado";
    clearTimeout(btn._copied);
    btn._copied = setTimeout(() => { btn.textContent = lab; }, 1300);
    const fb = () => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove();
    };
    fb();
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(() => {});
  }

  /* popover com a entrada */
  let popFor = null;
  function showPop(el) {
    const pop = $("#tr-pop"); if (!pop) return;
    const e = el.dataset.e !== "" && el.dataset.e != null ? ENTRY_REG[+el.dataset.e] : null;
    const word = el.dataset.word || "";
    const unknown = el.classList.contains("tr-unknown");
    pop.innerHTML = unknown
      ? `<div class="tr-pop-head">${esc(word)}</div><div class="tr-pop-pt">não está no léxico — ficou em português</div><button type="button" class="tr-mini" data-dict="${esc(word)}">Procurar no Dicionário</button>`
      : e ? `<div class="tr-pop-head">${esc(e.saelthyr)}</div><div class="cruor tr-pop-cruor">${esc(A.toCruor(e.saelthyr))}</div><div class="tr-pop-pt">${esc(e.pt)}</div>${e.notes ? `<div class="tr-pop-note">${esc(e.notes)}</div>` : ""}<button type="button" class="tr-mini" data-dict="${esc(e.saelthyr)}">Abrir no Dicionário</button>`
      : `<div class="tr-pop-head">${esc(word)}</div><div class="tr-pop-pt">regra gramatical</div>`;
    pop.hidden = false;
    const r = el.getBoundingClientRect(), pr = $("#panel-tradutor").getBoundingClientRect();
    const left = Math.max(4, Math.min(r.left - pr.left, pr.width - 260));
    pop.style.left = left + "px";
    pop.style.top = (r.bottom - pr.top + 6) + "px";
    popFor = el;
  }
  function hidePop() { const p = $("#tr-pop"); if (p) p.hidden = true; popFor = null; }

  function boot() {
    A = window.SaelthyrApp;
    if (!$("#panel-tradutor") || !A) return;
    buildIndex();
    const inp = $("#tr-input");
    inp.value = st.text || "";
    if (!st.text) inp.value = st.dir === "pt2s" ? "Eu não sei o motivo, mas meu amigo está aqui." : "Zer kel-vaelth.";
    let t = null;
    inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(update, 90); });
    $("#tr-clear").addEventListener("click", () => { inp.value = ""; update(); inp.focus(); });
    $("#tr-swap").addEventListener("click", () => {
      const next = lastPlain;
      st.dir = st.dir === "pt2s" ? "s2pt" : "pt2s";
      inp.value = next;
      const b = $("#tr-swap"); b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin");
      applyDir();
    });
    $("#tr-copy-text").addEventListener("click", (e) => copy(st.dir === "pt2s" ? lastSael : lastPlain, e.currentTarget));
    $("#tr-copy-cruor").addEventListener("click", (e) => copy(A.toCruor(lastSael), e.currentTarget));
    document.querySelectorAll("[data-register]").forEach((b) => b.addEventListener("click", () => { st.register = b.dataset.register; applyDir(); }));
    $("#tr-chips").addEventListener("click", (e) => {
      const c = e.target.closest(".tr-chip"); if (!c) return;
      const en = $("#tr-chips")._list[+c.dataset.i];
      inp.value = st.dir === "pt2s" ? en.pt : en.saelthyr; update();
    });
    const panel = $("#panel-tradutor");
    panel.addEventListener("mouseover", (e) => { const w = e.target.closest(".tr-w, .tr-hover, .tr-unknown"); if (w && w !== popFor) showPop(w); });
    panel.addEventListener("focusin", (e) => { const w = e.target.closest(".tr-w, .tr-hover, .tr-unknown"); if (w) showPop(w); });
    panel.addEventListener("click", (e) => {
      const d = e.target.closest("[data-dict]");
      if (d) { hidePop(); A.openInDictionary(d.dataset.dict.replace(/^kel-/i, "")); return; }
      const w = e.target.closest(".tr-w, .tr-hover, .tr-unknown");
      if (w) { showPop(w); return; }
      if (!e.target.closest("#tr-pop")) hidePop();
    });
    panel.addEventListener("mouseleave", hidePop);
    applyDir();
  }

  // API para testes / outras abas
  window.SaelthyrTranslator = {
    ptToSael: (s, reg) => { if (!PT2S) buildIndex(); return ptToSael(s, reg || "cotidiano").map((l) => joinTokens(l, "sael")).join("\n"); },
    saelToPT: (s) => { if (!PT2S) buildIndex(); return saelToPT(s).map((l) => joinTokens(l, "pt")).join("\n"); },
  };

  if (window.SaelthyrApp) boot(); else document.addEventListener("saelthyr:ready", boot);
})();
