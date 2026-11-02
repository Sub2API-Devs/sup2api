// Attributes 2.1.316 declarations to npm packages, files and versions.
//
//   node --max-old-space-size=12000 tools/vendor/match.mjs [analysis/vendor]
//
// Inputs:  <vendor>/index/{npm-files.jsonl,npm-decls.jsonl,packages.json}
//          (tools/vendor/index-npm.mjs: the installed tree plus every extra
//          version fetched by probe-versions.mjs), <vendor>/index/orig-decls.jsonl
//          (tools/vendor/scan-original.mjs).
// Output:  <vendor>/index/unit-labels.jsonl (one row per unit, consumed by
//          tools/vendor/report.mjs), <vendor>/index/versions.json (version
//          decision per package), <vendor>/index/match-debug.json
//
// Matching is version-agnostic: a "file key" is package name + path inside the
// package; all published versions of that file are variants of the key. A unit
// is scored against a key by its best variant and remembers the set of
// versions whose variant reaches that best score (its version set). IDF
// weights count file keys, so many versions of a file do not dilute a token.
//
// Unit = one declarator of a var/let/const statement, or one other statement.
//   A. CommonJS wrappers (`var X=x((exports,module)=>{...})`, one npm file
//      each): weighted Dice of token sets against CJS/JSON file keys (A1); the
//      require graph: the wrappers a matched wrapper calls, in order, are its
//      require() list, matched inside that list (A2); near-ties and weak
//      candidates go to the package of callers / neighbours (A3, A4).
//   B. Hoisted ESM units: per chunk, Viterbi segmentation of the unit sequence.
//      States are candidate file keys plus "unknown". Emission for key F is the
//      best npm unit N of F: max(-cap, (1+a)*m - a*W - d*(W_N - m) - g)
//      (W: IDF weight of the unit's tokens, m: weight shared with N). Unknown
//      emits 0. Staying in a key is free, moving within the package costs b1,
//      anything else b, a CommonJS wrapper in between forbids staying. Units
//      without tokens inherit their neighbours' key (layout interpolation).
//      A run filter then drops runs that are not convincing (see below), and
//      layout-only units at run edges yield to a first-party match from
//      analysis/match/decl-map.jsonl (score >= fpVeto).
//   C. Versions: per package, the version explaining the largest weight of
//      units is chosen (ties kept as candidates); units no chosen version
//      explains form a second copy when they are substantial (two majors of
//      one package can be bundled side by side), otherwise keep the main one.
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl, eachJsonl, writeJsonl } from './lib/common.mjs';

const [V = 'analysis/vendor'] = process.argv.slice(2);
const IDX = path.join(V, 'index');
const FP = path.join(path.dirname(V), 'match', 'decl-map.jsonl'); // lead's first-party matches, read only
const P = { alpha: 1, delta: 0.35, gamma: 4, cap: 5, beta: 8, beta1: 1.5, diceAccept: 0.45, diceGraph: 0.15, diceContext: 0.2, tie: 0.08, runMinDistinct: 3, runMinGain: 80, exactW: 25, minShared: 20, fpVeto: 0.5, dfMax: 400, dfMaxFile: 3000, secondCopyW: 150, versionTolAbs: 20, versionTolRel: 0.002 };
const t0 = Date.now();
const log = (...a) => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// ---------- token interning ----------
const tokId = new Map();
const intern = (arr) => {
  const out = new Int32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let id = tokId.get(arr[i]);
    if (id === undefined) tokId.set(arr[i], (id = tokId.size));
    out[i] = id;
  }
  out.sort();
  return out;
};
const keyOf = (t) => t.join(',');
const cmpVer = (a, b) => {
  const x = a.split(/[.-]/).map((s) => (/^\d+$/.test(s) ? +s : s)),
    y = b.split(/[.-]/).map((s) => (/^\d+$/.test(s) ? +s : s));
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (x[i] === undefined) return -1;
    if (y[i] === undefined) return 1;
    if (typeof x[i] === 'number' && typeof y[i] === 'number') return x[i] - y[i];
    return String(x[i]) < String(y[i]) ? -1 : 1;
  }
  return 0;
};

// ---------- npm side: file keys and variants ----------
const fkeys = []; // {fk, pkg, path, fmt, variants:[{t, w, versions:Set, fid}], union:Set}
const fkIndex = new Map();
const fidToFk = new Map(); // fid -> fk index
const fidRequires = new Map(); // fid -> requires[]
eachJsonl(path.join(IDX, 'npm-files.jsonl'), (f) => {
  if (!f.tokens.length) return;
  const fk = f.pkg + '|' + f.path;
  let k = fkIndex.get(fk);
  if (k === undefined) {
    k = fkeys.length;
    fkIndex.set(fk, k);
    fkeys.push({ k, fk, pkg: f.pkg, path: f.path, fmt: f.fmt, variants: [], byKey: new Map() });
  }
  const F = fkeys[k];
  const t = intern(f.tokens);
  const key = keyOf(t);
  let v = F.byKey.get(key);
  if (!v) F.byKey.set(key, (v = { t, versions: new Set(), fid: f.fid }));
  if (!F.variants.includes(v)) F.variants.push(v);
  v.versions.add(f.version);
  fidToFk.set(f.fid, k);
  fidRequires.set(f.fid, f.requires);
});
for (const F of fkeys) delete F.byKey;
log('file keys', fkeys.length, 'variants', fkeys.reduce((a, F) => a + F.variants.length, 0));
const NF = fkeys.length;
let df = new Int32Array(tokId.size * 2 + 1024);
for (const F of fkeys) {
  const u = new Set();
  for (const v of F.variants) for (const t of v.t) u.add(t);
  for (const t of u) df[t]++;
  F.union = u;
}
const IDFMAX = Math.log(NF * 2);
const idf = (t) => (t < df.length && df[t] > 0 ? Math.log(NF / df[t]) : IDFMAX);
const weight = (t) => {
  let w = 0;
  for (const x of t) w += idf(x);
  return w;
};
for (const F of fkeys) for (const v of F.variants) v.w = weight(v.t);
const invF = new Map();
for (const F of fkeys) for (const t of F.union) if (df[t] <= P.dfMaxFile) (invF.get(t) ?? invF.set(t, []).get(t)).push(F.k);
for (const F of fkeys) delete F.union;

// npm units, deduplicated per file key by token set
const nunits = []; // {k, t, w, versions:Set, names}
const nuOfFk = new Map();
{
  const seen = new Map();
  eachJsonl(path.join(IDX, 'npm-decls.jsonl'), (d) => {
    const k = fidToFk.get(d.fid);
    if (k === undefined || !d.tokens.length) return;
    const ver = d.fid.match(/^@?[^@]+@([^/]+)\//)[1];
    const t = intern(d.tokens);
    const key = k + ':' + keyOf(t);
    let n = seen.get(key);
    if (!n) {
      n = { i: nunits.length, k, t, w: 0, versions: new Set(), names: d.names };
      nunits.push(n);
      seen.set(key, n);
      (nuOfFk.get(k) ?? nuOfFk.set(k, []).get(k)).push(n.i);
    }
    n.versions.add(ver);
  });
}
for (const n of nunits) n.w = weight(n.t);
const invN = new Map();
for (const n of nunits) for (const t of n.t) if (df[t] <= P.dfMax) (invN.get(t) ?? invN.set(t, []).get(t)).push(n.i);
// per file key: weight of the units of its newest version (for coverage)
const fkWeight = new Map();
for (const [k, list] of nuOfFk) {
  const byV = new Map();
  for (const i of list) for (const v of nunits[i].versions) byV.set(v, (byV.get(v) ?? 0) + nunits[i].w);
  const newest = [...byV.keys()].sort(cmpVer).at(-1);
  fkWeight.set(k, byV.get(newest) ?? 0);
}
log('npm units', nunits.length);

// package relation graph (dependencies, optional, peer) by package name
const depsOf = new Map();
for (const p of Object.values(JSON.parse(fs.readFileSync(path.join(IDX, 'packages.json'), 'utf8')))) {
  const s = depsOf.get(p.name) ?? depsOf.set(p.name, new Set()).get(p.name);
  for (const d of p.deps ?? []) s.add(d);
}
const related = (a, b) => a === b || depsOf.get(a)?.has(b) || depsOf.get(b)?.has(a);

// ---------- 316 units ----------
const units = [];
const unitById = new Map();
eachJsonl(path.join(IDX, 'orig-decls.jsonl'), (d) => {
  for (const u of d.units) {
    u.id = d.id + '~' + u.u;
    u.declId = d.id;
    u.declIdx = d.idx;
    u.file = d.file;
    u.t = intern(u.tokens);
    delete u.tokens;
    u.label = null;
    units.push(u);
    unitById.set(u.id, u);
  }
});
if (tokId.size > df.length) {
  const nd = new Int32Array(tokId.size + 1024);
  nd.set(df);
  df = nd;
}
for (const u of units) u.w = weight(u.t);
log('units', units.length);

function overlap(a, b) {
  let i = 0,
    j = 0,
    m = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      m += idf(a[i]);
      i++;
      j++;
    } else if (a[i] < b[j]) i++;
    else j++;
  }
  return m;
}
const rareTokens = (u, k = 24) => [...u.t].filter((t) => df[t] > 0 && df[t] <= P.dfMax).sort((a, b) => df[a] - df[b]).slice(0, k);
// best variant of a file key for a unit: {score, versions}
function scoreFk(u, k) {
  let best = -1,
    vs = null;
  for (const v of fkeys[k].variants) {
    const s = u.w + v.w ? (2 * overlap(u.t, v.t)) / (u.w + v.w) : 0;
    if (s > best + 1e-9) {
      best = s;
      vs = new Set(v.versions);
    } else if (Math.abs(s - best) <= 1e-9) for (const x of v.versions) vs.add(x);
  }
  return { k, score: Math.max(best, 0), versions: vs ?? new Set() };
}
const pkgOf = (k) => fkeys[k].pkg;
// Tie-break between files of one package with the same code (minified copy,
// UMD/browser bundle, CJS and ESM builds): Bun resolves the "import"/"node"
// conditions, so prefer unminified Node ESM builds.
const pathBias = (k) => {
  const p = fkeys[k].path;
  let b = 0;
  if (/\.min\.|[./-]umd[./]|\/bundles?\/|\/browser\/|\.browser\.|\/web\//.test(p)) b -= 0.05;
  if (/(^|\/)(esm|es|module|mjs|esnext)(\/|$)|\.mjs$|\.esm\./.test(p)) b += 0.02;
  if (/(^|\/)(cjs|commonjs)(\/|$)|\.cjs$/.test(p)) b -= 0.01;
  return b;
};

// ---------- helpers ----------
for (const u of units) if (u.helper) u.label = { kind: u.helper.startsWith('bun-runtime') ? 'bun-runtime' : 'embedded-runtime', method: 'helper', score: 1, role: u.helper };

// ---------- A. CommonJS wrappers ----------
const isCjsFk = (k) => fkeys[k].fmt === 'cjs' || fkeys[k].fmt === 'json';
const cjsUnits = units.filter((u) => u.wrap === 'cjs' && !u.label && !u.body?.match(/^(native|resource)$/));
for (const u of cjsUnits) {
  const acc = new Map();
  for (const t of [...u.t].filter((t) => df[t] > 0 && df[t] <= P.dfMaxFile).sort((a, b) => df[a] - df[b]).slice(0, 24)) for (const k of invF.get(t) ?? []) if (isCjsFk(k)) acc.set(k, (acc.get(k) ?? 0) + idf(t));
  const cands = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k]) => scoreFk(u, k));
  cands.sort((a, b) => b.score - a.score);
  u.cands = cands.slice(0, 6);
  const best = cands[0];
  if (best && best.score >= P.diceAccept) u.label = { k: best.k, versions: best.versions, method: 'cjs-fingerprint', score: best.score, margin: best.score - (cands[1]?.score ?? 0) };
}
log('A1 cjs fingerprint', cjsUnits.filter((u) => u.label).length, '/', cjsUnits.length);

function requireFks(label) {
  // requires of one version of the file (newest in the unit's version set)
  const F = fkeys[label.k];
  const ver = [...label.versions].sort(cmpVer).at(-1);
  const fid = `${F.pkg}@${ver}/${F.path}`;
  const out = [];
  const seen = new Set();
  for (const r of fidRequires.get(fid) ?? []) {
    if (r.startsWith('?')) continue;
    const k = fidToFk.get(r);
    if (k === undefined || seen.has(k) || !isCjsFk(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
const callers = new Map();
for (const u of cjsUnits) for (const c of u.calls) (callers.get(c) ?? callers.set(c, []).get(c)).push(u);
for (let round = 0; round < 10; round++) {
  let changed = 0;
  for (const u of cjsUnits) {
    if (!u.label || u.label.k === undefined) continue;
    const callees = u.calls.map((id) => unitById.get(id)).filter((c) => c && c.wrap === 'cjs' && cjsUnits.includes(c));
    if (!callees.length) continue;
    const req = requireFks(u.label);
    if (!req.length) continue;
    let agree = 0,
      disagree = 0;
    if (callees.length === req.length)
      callees.forEach((c, i) => {
        if (c.label?.k !== undefined) c.label.k === req[i] ? agree++ : disagree++;
      });
    const positional = callees.length === req.length && disagree === 0 && (agree > 0 || callees.length <= 2);
    const reqSet = new Set(req);
    callees.forEach((c, i) => {
      // a fingerprint label outside the caller's require list yields to a
      // require-list file that scores about as well
      if (c.label?.method === 'cjs-fingerprint' && !reqSet.has(c.label.k)) {
        let alt = null;
        for (const k of req) {
          const s = scoreFk(c, k);
          if (!alt || s.score > alt.score) alt = s;
        }
        if (alt && alt.score >= c.label.score - 0.1 && alt.score >= P.diceGraph) {
          c.label = { k: alt.k, versions: alt.versions, method: 'cjs-require-graph', score: alt.score, via: u.id, overrode: true };
          changed++;
        }
        return;
      }
      if (c.label) return;
      let best = null;
      for (const k of req) {
        const s = scoreFk(c, k);
        if (!best || s.score > best.score) best = s;
      }
      if (positional) {
        const s = scoreFk(c, req[i]);
        if (!best || s.score >= best.score - 0.05) best = s;
      }
      if (best && (best.score >= P.diceGraph || positional)) {
        c.label = { k: best.k, versions: best.versions, method: 'cjs-require-graph', score: best.score, via: u.id };
        changed++;
      }
    });
  }
  log('A2 round', round, 'new', changed);
  if (!changed) break;
}
const byChunk = new Map();
for (const u of units) (byChunk.get(u.file) ?? byChunk.set(u.file, []).get(u.file)).push(u);
let a3 = 0,
  a4 = 0;
for (const us of byChunk.values()) {
  const cj = us.filter((u) => u.wrap === 'cjs');
  const ctxOf = (u, i) => {
    const ctx = new Map();
    const add = (x, w) => x?.label?.k !== undefined && ctx.set(pkgOf(x.label.k), (ctx.get(pkgOf(x.label.k)) ?? 0) + w);
    for (const c of callers.get(u.id) ?? []) add(c, 2);
    add(cj[i - 1], 1);
    add(cj[i + 1], 1);
    return ctx;
  };
  cj.forEach((u, i) => {
    if (u.label?.method !== 'cjs-fingerprint' || u.label.margin >= P.tie) return;
    const ctx = ctxOf(u, i);
    const alt = u.cands.filter((c) => c.score >= u.label.score - P.tie).sort((a, b) => (ctx.get(pkgOf(b.k)) ?? 0) - (ctx.get(pkgOf(a.k)) ?? 0) || b.score - a.score)[0];
    if (alt && alt.k !== u.label.k && (ctx.get(pkgOf(alt.k)) ?? 0) > (ctx.get(pkgOf(u.label.k)) ?? 0)) {
      u.label = { k: alt.k, versions: alt.versions, method: 'cjs-fingerprint+context', score: alt.score, margin: 0 };
      a3++;
    }
  });
  for (let round = 0; round < 3; round++)
    cj.forEach((u, i) => {
      if (u.label || !u.cands?.length) return;
      const ctx = ctxOf(u, i);
      const alt = u.cands.find((c) => c.score >= P.diceContext && ctx.has(pkgOf(c.k)));
      if (alt) {
        u.label = { k: alt.k, versions: alt.versions, method: 'cjs-fingerprint+context', score: alt.score, margin: 0 };
        a4++;
      }
    });
}
log('A3 context re-labels', a3, 'A4 weak + context', a4);

// ---------- B. hoisted units: Viterbi per chunk ----------
const { alpha, delta, gamma, cap, beta, beta1 } = P;
let vitUnits = 0;
const dropped = [];
for (const [file, us] of byChunk) {
  const seq = us.filter((u) => !u.label && u.wrap !== 'cjs');
  if (!seq.length) continue;
  const stateOf = new Map();
  const states = [];
  for (const u of seq) {
    if (!u.w) continue;
    const acc = new Map();
    for (const t of rareTokens(u, 16)) for (const ni of invN.get(t) ?? []) acc.set(ni, (acc.get(ni) ?? 0) + idf(t));
    const ks = new Map();
    for (const [ni, s] of acc) {
      const k = nunits[ni].k;
      if (s > (ks.get(k) ?? 0)) ks.set(k, s);
    }
    for (const [k] of [...ks].sort((a, b) => b[1] - a[1]).slice(0, 8)) if (!stateOf.has(k)) {
      stateOf.set(k, states.length);
      states.push(k);
    }
  }
  const S = states.length + 1;
  const U = S - 1;
  const pkgIdx = new Map();
  const statePkg = new Int32Array(S);
  states.forEach((k, s) => {
    const p = pkgOf(k);
    if (!pkgIdx.has(p)) pkgIdx.set(p, pkgIdx.size);
    statePkg[s] = pkgIdx.get(p);
  });
  statePkg[U] = -1;
  const stateBias = states.map(pathBias);
  const NP = pkgIdx.size;
  const chunkTok = new Set();
  for (const u of seq) for (const t of u.t) chunkTok.add(t);
  const tokN = new Map();
  for (const k of states) for (const ni of nuOfFk.get(k) ?? []) for (const t of nunits[ni].t) if (chunkTok.has(t)) (tokN.get(t) ?? tokN.set(t, []).get(t)).push(ni);
  const n = seq.length;
  const back = new Int32Array(n * S);
  let dp = new Float64Array(S);
  let nd = new Float64Array(S);
  const em = new Float64Array(S);
  const bestPkg = new Float64Array(NP);
  const bestPkgArg = new Int32Array(NP);
  const emitCache = [];
  for (let i = 0; i < n; i++) {
    const u = seq[i];
    const base = Math.max(-cap, -alpha * u.w - gamma);
    em.fill(u.w ? base : 0);
    em[U] = 0;
    const acc = new Map();
    for (const t of u.t) {
      const ns = tokN.get(t);
      if (!ns) continue;
      const w = idf(t);
      for (const ni of ns) acc.set(ni, (acc.get(ni) ?? 0) + w);
    }
    const local = new Map(); // state -> {e, m, nw, nis[]}
    for (const [ni, m] of acc) {
      const nu = nunits[ni];
      const s = stateOf.get(nu.k);
      const e = Math.max(-cap, (1 + alpha) * m - alpha * u.w - gamma - delta * Math.max(0, nu.w - m)) + stateBias[s];
      const cur = local.get(s);
      if (!cur || e > cur.e + 1e-9) local.set(s, { e, m, nw: nu.w, nis: [ni] });
      else if (Math.abs(e - cur.e) <= 1e-9) cur.nis.push(ni);
    }
    for (const [s, x] of local) if (x.e > em[s]) em[s] = x.e;
    emitCache.push(local);
    if (i === 0) {
      for (let s = 0; s < S; s++) dp[s] = em[s] - (s === U ? 0 : beta / 2);
      continue;
    }
    let bestAll = -Infinity,
      bestAllArg = U;
    bestPkg.fill(-Infinity);
    for (let s = 0; s < S; s++) {
      if (dp[s] > bestAll) {
        bestAll = dp[s];
        bestAllArg = s;
      }
      const p = statePkg[s];
      if (p >= 0 && dp[s] > bestPkg[p]) {
        bestPkg[p] = dp[s];
        bestPkgArg[p] = s;
      }
    }
    const prev = seq[i - 1];
    const brk = u.declIdx !== prev.declIdx && us.some((x) => x.wrap === 'cjs' && x.declIdx > prev.declIdx && x.declIdx < u.declIdx);
    for (let s = 0; s < S; s++) {
      let v = brk && s !== U ? -Infinity : dp[s],
        arg = s;
      const p = statePkg[s];
      if (p >= 0 && bestPkg[p] - beta1 > v) {
        v = bestPkg[p] - beta1;
        arg = bestPkgArg[p];
      }
      if (bestAll - beta > v) {
        v = bestAll - beta;
        arg = bestAllArg;
      }
      nd[s] = v + em[s];
      back[i * S + s] = arg;
    }
    [dp, nd] = [nd, dp];
  }
  let s = 0;
  for (let k = 1; k < S; k++) if (dp[k] > dp[s]) s = k;
  for (let i = n - 1; i >= 0; i--) {
    const u = seq[i];
    if (s !== U) {
      const x = emitCache[i].get(s);
      const strong = u.w && x && x.e > 0;
      const versions = new Set();
      if (strong) for (const ni of x.nis) for (const v of nunits[ni].versions) versions.add(v);
      u.label = { k: states[s], versions, method: strong ? 'esm-fingerprint' : 'esm-layout', score: x ? (2 * x.m) / (u.w + x.nw) : 0, nu: strong ? x.nis[0] : undefined, gain: strong ? x.e : 0, m: x ? x.m : 0 };
    }
    if (i > 0) s = back[i * S + s];
  }
  // Run filter. A run = maximal stretch of consecutive units labelled with the
  // same package. First-party code that handles the same data (API message
  // shapes, JSON-schema keywords, ...) can look like one or two declarations
  // of an npm file; a real hoisted npm file shows several of its own
  // declarations in a row, one near-identical declaration, most of a small
  // file, or sits next to a package it depends on / that depends on it (Bun
  // emits a dependency tree contiguously).
  const runs = [];
  let r0 = 0;
  const pk = (u) => (u?.label ? pkgOf(u.label.k) : null);
  for (let i = 1; i <= n; i++) {
    if (i < n && pk(seq[i]) === pk(seq[r0])) continue;
    const run = seq.slice(r0, i);
    r0 = i;
    if (!run[0].label) {
      runs.push({ units: run, pkg: null });
      continue;
    }
    const strong = run.filter((u) => u.label.method === 'esm-fingerprint');
    // distinct npm declarations matched with real evidence (shared weight
    // >= minShared: a few common property names such as r/g/b do not count)
    const matched = new Set(strong.filter((u) => u.label.score >= 0.6 && u.label.m >= P.minShared).map((u) => u.label.nu));
    const gain = strong.reduce((a, u) => a + u.label.gain, 0);
    const exact = strong.some((u) => u.label.score >= 0.95 && u.label.m >= P.exactW);
    let fileW = 0,
      hitW = 0;
    for (const k of new Set(run.map((u) => u.label.k))) fileW += fkWeight.get(k) ?? 0;
    for (const ni of matched) hitW += nunits[ni].w;
    const cover = fileW ? hitW / fileW : 0;
    const sure = matched.size >= P.runMinDistinct || exact || gain >= P.runMinGain || (cover >= 0.5 && gain >= 10);
    runs.push({ units: run, pkg: pk(run[0]), sure, weak: gain > 0, stat: { distinct: matched.size, gain: +gain.toFixed(1), cover: +cover.toFixed(2) } });
  }
  for (let it = 0; it < 4; it++) {
    let ch = 0;
    runs.forEach((r, k) => {
      if (!r.pkg || r.sure || !r.weak) return;
      for (const dir of [-1, 1]) {
        let gap = 0;
        for (let j = k + dir; j >= 0 && j < runs.length; j += dir) {
          const q = runs[j];
          if (!q.pkg) {
            gap += q.units.length;
            if (gap > 3) break;
            continue;
          }
          if (q.sure && related(r.pkg, q.pkg)) {
            r.sure = true;
            r.via = q.pkg;
            ch++;
          }
          break;
        }
        if (r.sure) break;
      }
    });
    if (!ch) break;
  }
  for (const r of runs) {
    if (!r.pkg) continue;
    for (const u of r.units) {
      if (r.sure) {
        delete u.label.gain;
        if (r.via) u.label.via = r.via;
        vitUnits++;
      } else {
        dropped.push({ id: u.id, pkg: r.pkg, score: +u.label.score.toFixed(3), runLen: r.units.length, ...r.stat });
        u.label = null;
      }
    }
  }
}
log('B viterbi labelled', vitUnits, 'dropped by run filter', dropped.length);
// Edge trimming: a unit without vendor evidence (esm-layout) at the edge of a
// run is as likely to belong to the neighbouring first-party module; it keeps
// the vendor label only when the lead's first-party matcher has nothing for
// it. Interior layout units stay (an npm file is emitted contiguously).
const fpMatched = new Set();
if (fs.existsSync(FP)) eachJsonl(FP, (m) => m.refFile && m.method && m.score >= P.fpVeto && fpMatched.add(m.id));
let trimmed = 0;
for (const us of byChunk.values()) {
  const seq = us.filter((u) => u.wrap !== 'cjs');
  const pk = (u) => (u?.label?.k !== undefined ? pkgOf(u.label.k) : null);
  const drop = (u) => {
    dropped.push({ id: u.id, pkg: pk(u), reason: 'edge-layout-vs-first-party' });
    u.label = null;
    trimmed++;
  };
  for (let changed = true; changed; ) {
    changed = false;
    seq.forEach((u, i) => {
      if (u.label?.method !== 'esm-layout' || !fpMatched.has(u.declId)) return;
      const p = pk(u);
      if (pk(seq[i - 1]) !== p || pk(seq[i + 1]) !== p) {
        drop(u);
        changed = true;
      }
    });
  }
}
log('B edge trimming dropped', trimmed);

// ---------- C. versions ----------
const byPkg = new Map();
for (const u of units) if (u.label?.k !== undefined) (byPkg.get(pkgOf(u.label.k)) ?? byPkg.set(pkgOf(u.label.k), []).get(pkgOf(u.label.k))).push(u);
const versionsOut = {};
for (const [pkg, us] of byPkg) {
  // evidence = units whose version set is a strict subset of the versions of
  // their file key (others say nothing about the version)
  const allOf = (k) => {
    const s = new Set();
    for (const v of fkeys[k].variants) for (const x of v.versions) s.add(x);
    return s;
  };
  const allCache = new Map();
  const ev = [];
  for (const u of us) {
    if (!u.label.versions?.size) continue;
    const all = allCache.get(u.label.k) ?? allCache.set(u.label.k, allOf(u.label.k)).get(u.label.k);
    ev.push({ u, vs: u.label.versions, informative: u.label.versions.size < all.size, w: Math.max(u.w, 1) * Math.max(u.label.score, 0.05) });
  }
  const chosen = [];
  let remaining = ev;
  let ranking = [];
  for (let copy = 0; copy < 3 && remaining.length; copy++) {
    const score = new Map();
    for (const e of remaining) for (const v of e.vs) score.set(v, (score.get(v) ?? 0) + e.w);
    const top = Math.max(...score.values());
    // candidates: versions within tolerance of the best (small differences
    // come from units whose code changed in a later release only cosmetically)
    const totalW = remaining.reduce((a, e) => a + e.w, 0);
    const tol = Math.min(P.versionTolAbs, P.versionTolRel * totalW);
    const tied = [...score].filter(([, s]) => s >= top - tol - 1e-6).map(([v]) => v).sort(cmpVer);
    if (copy === 0) ranking = [...score].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, s]) => [v, +(s - top).toFixed(1)]);
    const explained = remaining.filter((e) => tied.some((v) => e.vs.has(v)));
    const informativeW = explained.filter((e) => e.informative).reduce((a, e) => a + e.w, 0);
    if (copy > 0 && (top < P.secondCopyW || informativeW < P.secondCopyW / 2)) break;
    chosen.push({ versions: tied, weight: +top.toFixed(1), units: explained.length, informativeW: +informativeW.toFixed(1) });
    remaining = remaining.filter((e) => !tied.some((v) => e.vs.has(v)));
  }
  versionsOut[pkg] = { chosen, ranking, unexplainedUnits: remaining.length, unexplainedW: +remaining.reduce((a, e) => a + e.w, 0).toFixed(1) };
  for (const u of us) {
    const c = chosen.find((c) => c.versions.some((v) => u.label.versions?.has(v)));
    if (c) u.label.version = c.versions.filter((v) => u.label.versions.has(v));
    else if (u.label.versions?.size) {
      // another copy of the package (e.g. lru-cache 6 under openid-client next
      // to lru-cache 11): the unit's own version set
      u.label.version = [...u.label.versions].sort(cmpVer);
      u.label.otherCopy = true;
    } else u.label.version = chosen[0]?.versions ?? []; // layout-only unit: the main copy
  }
}
fs.writeFileSync(path.join(IDX, 'versions.json'), JSON.stringify(versionsOut, null, 1));
log('C versions', Object.keys(versionsOut).length, 'packages,', Object.values(versionsOut).filter((x) => x.chosen.length > 1).length, 'with several copies');

// ---------- dump ----------
const labelled = units.filter((u) => u.label);
const bytesBy = {};
for (const u of labelled) {
  const k = u.label.k !== undefined ? pkgOf(u.label.k) : u.label.kind;
  bytesBy[k] = (bytesBy[k] ?? 0) + u.bytes;
}
const top = Object.entries(bytesBy).sort((a, b) => b[1] - a[1]);
fs.writeFileSync(path.join(IDX, 'match-debug.json'), JSON.stringify({ params: P, top, dropped }, null, 1));
log('labelled bytes', labelled.reduce((a, u) => a + u.bytes, 0), '/', units.reduce((a, u) => a + u.bytes, 0));
console.log(top.slice(0, 40).map(([k, v]) => `${k} ${v}`).join('\n'));
const fkLabel = (k) => ({ pkg: fkeys[k].pkg, path: fkeys[k].path });
writeJsonl(
  path.join(IDX, 'unit-labels.jsonl'),
  units.map((u) => {
    let label = null;
    if (u.label?.k !== undefined) {
      const l = u.label;
      const vs = l.version ?? [];
      label = { ...fkLabel(l.k), version: vs.length === 1 ? vs[0] : vs.length ? `${vs[0]}..${vs.at(-1)}` : null, versionCandidates: vs.length > 1 ? vs : undefined, otherCopy: l.otherCopy || undefined, method: l.method, score: +l.score.toFixed(3), margin: l.margin !== undefined ? +l.margin.toFixed(3) : undefined, via: l.via, npmNames: l.nu !== undefined ? nunits[l.nu].names : undefined };
      label.fid = `${label.pkg}@${vs.at(-1) ?? '?'}/${label.path}`;
    } else if (u.label) label = u.label;
    return { id: u.id, names: u.names, bytes: u.bytes, wrap: u.wrap, body: u.body, w: +u.w.toFixed(1), label, cand: !u.label && u.cands?.[0] ? { ...fkLabel(u.cands[0].k), score: +u.cands[0].score.toFixed(3) } : undefined };
  }),
);
