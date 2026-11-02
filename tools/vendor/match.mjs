// Attributes 2.1.316 declarations to npm packages/files.
//
//   node --max-old-space-size=12000 tools/vendor/match.mjs [analysis/vendor]
//
// Inputs:  <vendor>/index/{npm-files.jsonl,npm-decls.jsonl,orig-decls.jsonl}
//          (tools/vendor/index-npm.mjs, tools/vendor/scan-original.mjs) and
//          vendor-ref/package.json (pinned versions break ties).
// Output:  <vendor>/index/unit-labels.jsonl (one row per unit; consumed by
//          tools/vendor/report.mjs), <vendor>/index/match-debug.json
//
// Unit = one declarator of a var/let/const statement, or one other statement.
// Each unit gets a label (an npm file group, "bun-runtime", or nothing):
//   A. CommonJS wrappers (`var X=x((exports,module)=>{...})`, one npm file
//      each): weighted Dice of the token sets against every CJS/JSON npm file
//      (A1). Then the require graph (A2): the wrappers a matched wrapper calls,
//      in order, are its require() list, so they are matched inside that list.
//      Near-ties are broken by the package of callers and neighbours (A3);
//      weak candidates are accepted when that context agrees (A4).
//   B. Hoisted ESM units: per chunk, a Viterbi segmentation of the unit
//      sequence. States are candidate ESM npm files plus "unknown". The
//      emission for file F is the best npm unit N of F:
//        max(-cap, (1+a)*m - a*W - d*(W_N - m) - g)
//      (W: IDF weight of the unit's tokens, m: weight shared with N, W_N: N's
//      weight), so tokens the npm unit does not have count against it and a
//      unit whose tokens are merely scattered over a big file scores low.
//      Unknown emits 0. Staying in a file is free, moving to another file of
//      the same package costs b1, anything else b. Units without tokens
//      inherit their neighbours' file (layout interpolation).
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl, writeJsonl } from './lib/common.mjs';

const [V = 'analysis/vendor'] = process.argv.slice(2);
const IDX = path.join(V, 'index');
const P = { alpha: 1, delta: 0.35, gamma: 4, cap: 5, beta: 8, beta1: 1.5, diceAccept: 0.45, diceGraph: 0.15, tie: 0.08, diceContext: 0.2, runMinDistinct: 3, runMinGain: 80, exactW: 25 };
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

// ---------- npm files and groups ----------
const files = readJsonl(path.join(IDX, 'npm-files.jsonl'));
log('npm files', files.length);
const pinned = JSON.parse(fs.readFileSync('vendor-ref/package.json', 'utf8')).dependencies;
for (const f of files) {
  f.t = intern(f.tokens);
  delete f.tokens;
}
// identical token sets (the same file in several installed copies) form one
// group; the representative is the pinned version / top-level copy.
const groupOf = new Map();
const groups = [];
files.forEach((f, i) => {
  if (!f.t.length) return;
  const key = f.fmt + '|' + f.t.join(',');
  let g = groupOf.get(key);
  if (g === undefined) {
    g = groups.length;
    groupOf.set(key, g);
    groups.push({ g, fmt: f.fmt, t: f.t, members: [] });
  }
  groups[g].members.push(i);
  f.g = g;
});
const prefRank = (f) => (pinned[f.pkg] && pinned[f.pkg] !== '*' && pinned[f.pkg] !== f.version ? 100 : 0) + f.path.length / 1000;
for (const g of groups) {
  g.members.sort((a, b) => prefRank(files[a]) - prefRank(files[b]));
  g.rep = g.members[0];
  g.pkg = files[g.rep].pkg;
}
log('groups', groups.length);
const NG = groups.length;
let df = new Int32Array(tokId.size * 2 + 1000);
for (const g of groups) for (const t of g.t) df[t]++;
const IDFMAX = Math.log(NG * 2);
const idf = (t) => (t < df.length && df[t] > 0 ? Math.log(NG / df[t]) : IDFMAX);
for (const g of groups) {
  let w = 0;
  for (const t of g.t) w += idf(t);
  g.w = w;
}
const DFMAX = 400;
const invG = new Map();
for (const g of groups) for (const t of g.t) if (df[t] <= DFMAX) (invG.get(t) ?? invG.set(t, []).get(t)).push(g.g);

// ---------- npm units (ESM top-level declarations), group representatives only ----------
const repFid = new Map(groups.map((g) => [files[g.rep].fid, g.g]));
const nunits = [];
for (const d of readJsonl(path.join(IDX, 'npm-decls.jsonl'))) {
  const g = repFid.get(d.fid);
  if (g === undefined) continue;
  const t = intern(d.tokens);
  let w = 0;
  for (const x of t) w += idf(x);
  nunits.push({ did: d.did, g, names: d.names, exported: d.exported, shape: d.shape, t, w });
}
const nunitById = new Map(nunits.map((n) => [n.did, n]));
// package relation graph (dependencies, optional, peer), by package name
const depsOf = new Map();
for (const p of Object.values(JSON.parse(fs.readFileSync(path.join(IDX, 'packages.json'), 'utf8')))) {
  const s = depsOf.get(p.name) ?? depsOf.set(p.name, new Set()).get(p.name);
  for (const d of p.deps ?? []) s.add(d);
}
const related = (a, b) => a === b || depsOf.get(a)?.has(b) || depsOf.get(b)?.has(a);
const invN = new Map();
nunits.forEach((n, i) => {
  for (const t of n.t) if (df[t] <= DFMAX) (invN.get(t) ?? invN.set(t, []).get(t)).push(i);
});
const nunitsOfGroup = new Map();
nunits.forEach((n, i) => (nunitsOfGroup.get(n.g) ?? nunitsOfGroup.set(n.g, []).get(n.g)).push(i));
log('npm units', nunits.length);

// ---------- 316 units ----------
const decls = readJsonl(path.join(IDX, 'orig-decls.jsonl'));
const units = [];
const unitById = new Map();
for (const d of decls) {
  d.units.forEach((u, k) => {
    u.id = d.id + '~' + u.u;
    u.decl = d;
    u.file = d.file;
    u.t = intern(u.tokens);
    delete u.tokens;
    let w = 0;
    for (const t of u.t) w += idf(t);
    u.w = w;
    u.label = null;
    units.push(u);
    unitById.set(u.id, u);
  });
}
if (tokId.size > df.length) {
  const nd = new Int32Array(tokId.size + 1000);
  nd.set(df);
  df = nd;
}
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
const rareTokens = (u, k = 24) => [...u.t].filter((t) => df[t] > 0 && df[t] <= DFMAX).sort((a, b) => df[a] - df[b]).slice(0, k);

// ---------- helpers ----------
for (const u of units) if (u.helper) u.label = { kind: u.helper.startsWith('bun-runtime') ? 'bun-runtime' : 'embedded-runtime', method: 'helper', score: 1, role: u.helper };

// ---------- A. CommonJS wrappers ----------
const isCjsGroup = (g) => g.fmt === 'cjs' || g.fmt === 'json';
const dice = (u, g) => (u.w + g.w ? (2 * overlap(u.t, g.t)) / (u.w + g.w) : 0);
const cjsUnits = units.filter((u) => u.wrap === 'cjs' && !u.label);
for (const u of cjsUnits) {
  const acc = new Map();
  for (const t of rareTokens(u)) for (const g of invG.get(t) ?? []) if (isCjsGroup(groups[g])) acc.set(g, (acc.get(g) ?? 0) + idf(t));
  const cands = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([g]) => ({ g, score: dice(u, groups[g]) }));
  cands.sort((a, b) => b.score - a.score);
  u.cands = cands.slice(0, 6);
  const best = cands[0];
  if (best && best.score >= P.diceAccept) u.label = { g: best.g, method: 'cjs-fingerprint', score: +best.score.toFixed(3), margin: +(best.score - (cands[1]?.score ?? 0)).toFixed(3) };
}
log('A1 cjs fingerprint', cjsUnits.filter((u) => u.label).length, '/', cjsUnits.length);

const fileIndexByFid = new Map(files.map((f, i) => [f.fid, i]));
function requireGroups(g) {
  const out = [];
  const seen = new Set();
  for (const m of groups[g].members.slice(0, 1)) {
    for (const r of files[m].requires) {
      if (r.startsWith('?')) continue;
      const i = fileIndexByFid.get(r);
      if (i === undefined || files[i].g === undefined) continue;
      const gg = files[i].g;
      if (!seen.has(gg) && isCjsGroup(groups[gg])) {
        seen.add(gg);
        out.push(gg);
      }
    }
  }
  return out;
}
const callers = new Map(); // unit id -> [caller units]
for (const u of cjsUnits) for (const c of u.calls) (callers.get(c) ?? callers.set(c, []).get(c)).push(u);
for (let round = 0; round < 10; round++) {
  let changed = 0;
  for (const u of cjsUnits) {
    if (!u.label || u.label.g === undefined) continue;
    const callees = u.calls.map((id) => unitById.get(id)).filter((c) => c && c.wrap === 'cjs');
    if (!callees.length) continue;
    const req = requireGroups(u.label.g);
    if (!req.length) continue;
    // positional pairing is trusted only when the lists have equal length and
    // the callees that already have a label agree with their position
    let agree = 0,
      disagree = 0;
    if (callees.length === req.length)
      callees.forEach((c, i) => {
        if (c.label?.g !== undefined) c.label.g === req[i] ? agree++ : disagree++;
      });
    const positional = callees.length === req.length && disagree === 0 && (agree > 0 || callees.length <= 2);
    const reqSet = new Set(req);
    callees.forEach((c, i) => {
      if (c.label) return;
      let best = null;
      for (const g of req) {
        const s = c.w ? dice(c, groups[g]) : 0;
        if (!best || s > best.score) best = { g, score: s };
      }
      if (positional) {
        const s = c.w ? dice(c, groups[req[i]]) : 0;
        if (!best || s >= best.score - 0.05) best = { g: req[i], score: s };
      }
      if (best && reqSet.has(best.g) && (best.score >= P.diceGraph || positional)) {
        c.label = { g: best.g, method: 'cjs-require-graph', score: +best.score.toFixed(3), via: u.id };
        changed++;
      }
    });
  }
  log('A2 round', round, 'new', changed);
  if (!changed) break;
}
// A3: near-ties go to the candidate whose package matches the callers' or
// the neighbouring wrappers' package.
const byChunk = new Map();
for (const u of units) (byChunk.get(u.file) ?? byChunk.set(u.file, []).get(u.file)).push(u);
let a3 = 0;
for (const us of byChunk.values()) {
  const cj = us.filter((u) => u.wrap === 'cjs');
  cj.forEach((u, i) => {
    if (u.label?.method !== 'cjs-fingerprint' || u.label.margin >= P.tie) return;
    const ctx = new Map();
    const add = (x, w) => x?.label?.g !== undefined && ctx.set(groups[x.label.g].pkg, (ctx.get(groups[x.label.g].pkg) ?? 0) + w);
    for (const c of callers.get(u.id) ?? []) add(c, 2);
    add(cj[i - 1], 1);
    add(cj[i + 1], 1);
    const best = u.label.score;
    const alt = u.cands.filter((c) => c.score >= best - P.tie).sort((a, b) => (ctx.get(groups[b.g].pkg) ?? 0) - (ctx.get(groups[a.g].pkg) ?? 0) || b.score - a.score)[0];
    if (alt && alt.g !== u.label.g && (ctx.get(groups[alt.g].pkg) ?? 0) > (ctx.get(groups[u.label.g].pkg) ?? 0)) {
      u.label = { g: alt.g, method: 'cjs-fingerprint+context', score: +alt.score.toFixed(3), margin: 0 };
      a3++;
    }
  });
}
log('A3 context re-labels', a3);
// A4: wrappers still unlabelled take their best candidate when it is weak but
// belongs to the package of their neighbours / callers (same package, other
// version: highlight.js languages, @smithy internals, ...).
let a4 = 0;
for (let round = 0; round < 3; round++)
  for (const us of byChunk.values()) {
    const cj = us.filter((u) => u.wrap === "cjs");
    cj.forEach((u, i) => {
      if (u.label || !u.cands?.length || u.body) return;
      const ctx = new Set();
      for (const c of callers.get(u.id) ?? []) if (c.label?.g !== undefined) ctx.add(groups[c.label.g].pkg);
      for (const x of [cj[i - 1], cj[i + 1]]) if (x?.label?.g !== undefined) ctx.add(groups[x.label.g].pkg);
      const alt = u.cands.find((c) => c.score >= P.diceContext && ctx.has(groups[c.g].pkg));
      if (alt) {
        u.label = { g: alt.g, method: "cjs-fingerprint+context", score: +alt.score.toFixed(3), margin: 0 };
        a4++;
      }
    });
  }
log("A4 weak + context", a4);

// ---------- B. hoisted ESM units: Viterbi per chunk ----------
// hoisted code comes from ESM files and from CommonJS files Bun converted
const isEsmGroup = (g) => g.fmt === 'esm' || g.fmt === 'cjs';
const { alpha, delta, gamma, cap, beta, beta1 } = P;
let vitUnits = 0;
const dropped = [];
for (const [file, us] of byChunk) {
  const seq = us.filter((u) => !u.label && u.wrap !== 'cjs');
  if (!seq.length) continue;
  // candidate states: groups of npm units sharing rare tokens
  const stateSet = new Map();
  const states = [];
  for (const u of seq) {
    if (!u.w) continue;
    const acc = new Map();
    for (const t of rareTokens(u, 16)) for (const ni of invN.get(t) ?? []) acc.set(ni, (acc.get(ni) ?? 0) + idf(t));
    const gs = new Map();
    for (const [ni, s] of acc) {
      const g = nunits[ni].g;
      if (isEsmGroup(groups[g]) && s > (gs.get(g) ?? 0)) gs.set(g, s);
    }
    for (const [g] of [...gs].sort((a, b) => b[1] - a[1]).slice(0, 8)) if (!stateSet.has(g)) {
      stateSet.set(g, states.length);
      states.push(g);
    }
  }
  const S = states.length + 1;
  const U = S - 1;
  const pkgIdx = new Map();
  const statePkg = new Int32Array(S);
  states.forEach((g, s) => {
    const p = groups[g].pkg;
    if (!pkgIdx.has(p)) pkgIdx.set(p, pkgIdx.size);
    statePkg[s] = pkgIdx.get(p);
  });
  statePkg[U] = -1;
  const NP = pkgIdx.size;
  // token -> npm units (of state groups) containing it, chunk tokens only
  const chunkTok = new Set();
  for (const u of seq) for (const t of u.t) chunkTok.add(t);
  const tokN = new Map();
  states.forEach((g) => {
    for (const ni of nunitsOfGroup.get(g) ?? []) for (const t of nunits[ni].t) if (chunkTok.has(t)) (tokN.get(t) ?? tokN.set(t, []).get(t)).push(ni);
  });
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
    // evidence against a file is capped: a unit changed between versions
    // inside a run must not break the run, while a run boundary still falls
    // where the units stop fitting
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
    const local = new Map(); // state -> {e, ni, m}
    for (const [ni, m] of acc) {
      const nu = nunits[ni];
      const e = Math.max(-cap, (1 + alpha) * m - alpha * u.w - gamma - delta * Math.max(0, nu.w - m));
      const s = stateSet.get(nu.g);
      const cur = local.get(s);
      if (!cur || e > cur.e) local.set(s, { e, ni, m });
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
    // a CommonJS wrapper between two hoisted units means a module boundary
    const brk = u.decl.idx !== seq[i - 1].decl.idx && us.some((x) => x.wrap === 'cjs' && x.decl.idx > seq[i - 1].decl.idx && x.decl.idx < u.decl.idx);
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
      const nu = x && nunits[x.ni];
      const strong = u.w && x && x.e > 0;
      u.label = { g: states[s], method: strong ? 'esm-fingerprint' : 'esm-layout', score: x ? +((2 * x.m) / (u.w + nu.w)).toFixed(3) : 0, npmUnit: strong ? nu.did : undefined, npmNames: strong ? nu.names : undefined, gain: strong ? x.e : 0 };
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
  const pk = (u) => (u?.label ? groups[u.label.g].pkg : null);
  for (let i = 1; i <= n; i++) {
    if (i < n && pk(seq[i]) === pk(seq[r0])) continue;
    const run = seq.slice(r0, i);
    r0 = i;
    if (!run[0].label) {
      runs.push({ units: run, pkg: null });
      continue;
    }
    const strong = run.filter((u) => u.label.method === "esm-fingerprint");
    const matched = new Set(strong.filter((u) => u.label.score >= 0.6).map((u) => u.label.npmUnit));
    const gain = strong.reduce((a, u) => a + u.label.gain, 0);
    const exact = strong.some((u) => u.label.score >= 0.95 && u.w >= P.exactW);
    // coverage of the npm files the run claims
    const gs = new Set(run.map((u) => u.label.g));
    let fileW = 0, hitW = 0;
    for (const g of gs) for (const ni of nunitsOfGroup.get(g) ?? []) fileW += nunits[ni].w;
    for (const did of matched) hitW += nunitById.get(did)?.w ?? 0;
    const cover = fileW ? hitW / fileW : 0;
    const sure = matched.size >= P.runMinDistinct || exact || gain >= P.runMinGain || (cover >= 0.5 && gain >= 10);
    runs.push({ units: run, pkg: pk(run[0]), sure, weak: gain > 0, stat: { distinct: matched.size, gain: +gain.toFixed(1), cover: +cover.toFixed(2) } });
  }
  // weak runs survive when a neighbouring sure run (across unlabelled gaps of
  // at most 3 units) is a related package; iterate so chains are followed
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
        dropped.push({ id: u.id, pkg: r.pkg, score: u.label.score, runLen: r.units.length, ...r.stat });
        u.label = null;
      }
    }
  }
}
log('B viterbi labelled', vitUnits, 'dropped by run filter', dropped.length);

// ---------- dump ----------
const labelled = units.filter((u) => u.label);
const bytesBy = {};
for (const u of labelled) {
  const k = u.label.g !== undefined ? groups[u.label.g].pkg : u.label.kind;
  bytesBy[k] = (bytesBy[k] ?? 0) + u.bytes;
}
const top = Object.entries(bytesBy).sort((a, b) => b[1] - a[1]);
fs.writeFileSync(path.join(IDX, 'match-debug.json'), JSON.stringify({ params: P, top, dropped }, null, 1));
const totalBytes = units.reduce((a, u) => a + u.bytes, 0);
log('labelled bytes', labelled.reduce((a, u) => a + u.bytes, 0), '/', totalBytes);
console.log(top.slice(0, 50).map(([k, v]) => `${k} ${v}`).join('\n'));
const fidOfG = (g) => files[groups[g].rep].fid;
writeJsonl(
  path.join(IDX, 'unit-labels.jsonl'),
  units.map((u) => ({
    id: u.id,
    names: u.names,
    bytes: u.bytes,
    wrap: u.wrap,
    body: u.body,
    w: +u.w.toFixed(1),
    label: u.label ? { ...u.label, g: undefined, fid: u.label.g !== undefined ? fidOfG(u.label.g) : undefined, alts: u.label.g !== undefined ? groups[u.label.g].members.length - 1 : undefined } : null,
    cand: !u.label && u.cands?.[0] ? { fid: fidOfG(u.cands[0].g), score: +u.cands[0].score.toFixed(3) } : undefined,
  })),
);
