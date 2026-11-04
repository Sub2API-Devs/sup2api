// 旧版对齐命名：把已匹配（或已归属旧版文件）的 316 顶层声明与 2.1.88 源码按归一化 token 序列对齐，
// 为 316 声明里的每个局部绑定（参数、局部变量、嵌套函数名、catch 参数、解构绑定）投票取回旧版名字。
//   node --max-old-space-size=8000 tools/naming/reference-align.mjs [analysis] [out=analysis/names/reference-align.jsonl]
// 输入：analysis/match/decl-map.jsonl（ref 或 refFile）+ local-map.jsonl、analysis/scan/decls.jsonl、analysis/reference/decls.jsonl、
//       analysis/names/reference.jsonl（只用于分歧统计）
// 输出：每行 {file, key:"@<绑定声明标识符偏移>", min, name, source:"reference", confidence, via:"align-param|align-local",
//             kind, ref, votes, n, sim, round, pair?, note?}
//       统计打印到标准输出；设 REF_ALIGN_DEBUG=<目录> 时另写 <目录>/stats.json、全部候选 <目录>/cands.jsonl（含被拒的）、
//       重配记录 <目录>/pairs.jsonl
// 步骤：① 按 316 chunk 解析、作用域分析、生成 token（绑定换成 {key,name,kind} 小记录），记下每个函数的 token 区间；
//       ② 按旧版文件分组，解析一次旧版文件：
//          第一遍：顶层声明 ↔ 顶层声明（ref-align-pair.mjs 选对象）对齐、投票；
//          第二遍：还有绑定没取到名字的函数单元 ↔ 同文件全部函数单元（ref-align-units.mjs）。
// 做法见 docs/process/ref-align.md。
import fs from 'node:fs';
import path from 'node:path';
import { tokensOf } from './lib/ref-align-tokens.mjs';
import { align, similarity, solidity, isL } from './lib/ref-align-diff.mjs';
import { voteRounds, confidence, quality, MIN_Q } from './lib/ref-align-vote.mjs';
import { load316, moduleNames, idTok316For, loadRef, idTokRef, refName } from './lib/ref-align-source.mjs';
import { bag, bagDice, choose, KEEP_SIM, TOP_K } from './lib/ref-align-pair.mjs';
import { unitsOf, ownBindings, candidates, pickUnit } from './lib/ref-align-units.mjs';

const A = process.argv[2] ?? 'analysis';
const outFile = process.argv[3] ?? path.join(A, 'names/reference-align.jsonl');
const debugDir = process.env.REF_ALIGN_DEBUG;
const LIMIT = +(process.env.REF_ALIGN_LIMIT ?? Infinity);
const PASS2 = process.env.REF_ALIGN_PASS2 !== '0';
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

// React Compiler 生成的名字：照旧版取，置信度 ×0.75
const COMPILER_TEMP = /^(t\d+|\$|_c|_temp\d*)$/;
// React Compiler 为避免遮蔽给旧版名字加的 _0/_1 后缀（selected_1、content_0）：去掉（冲突由改名引擎加后缀）
const COMPILER_SUFFIX = /^([A-Za-z$][\w$]{2,})_\d+$/;
const MIN_CONF = 0.5;
// 旧版里 1–2 字符的名字（q、r、p……）只有在 tools/verify/readability.mjs 认为是惯用短名时才取：
// 其余的在度量里仍算压缩名，而且 reference 优先级高于 auto，会盖掉 auto 给的描述性名字
const SHORT_OK = new Set('i j k n m x y z e t v id fn cb ms ts ok db fd io os ui on to op ip lo hi mb kb gb kv'.split(' '));
const FACTOR = { kept: 1, switched: 0.9, 'file-local': 0.9, unit: 0.9 }; // 对齐对象不是 match.mjs 给的时 ×0.9

// ---- 输入 ----
const declMap = readJsonl(path.join(A, 'match/decl-map.jsonl'));
const localMap = new Map(readJsonl(path.join(A, 'match/local-map.jsonl')).map((m) => [m.id, m]));
const matched = [...declMap.filter((m) => m.ref), ...localMap.values()];
const decls = new Map(readJsonl(path.join(A, 'scan/decls.jsonl')).map((d) => [`${d.file}#${d.names[0] ?? '@' + d.start}`, d]));
const refDecls = new Map(readJsonl(path.join(A, 'reference/decls.jsonl')).map((r) => [`${r.file}#${r.names[0] ?? '@' + r.line}`, r]));
const refByFile = new Map();
for (const [id, r] of refDecls) {
  let l = refByFile.get(r.file);
  if (!l) refByFile.set(r.file, (l = []));
  l.push(id);
}
const MN = moduleNames(matched, decls);

// 工作项：每个 316 声明一个，{id, d, cur(ref id|null), refFile, method}
const work = new Map();
for (const m of declMap) {
  const lm = localMap.get(m.id);
  const ref = m.ref ?? lm?.ref ?? null;
  const refFile = ref ? refDecls.get(ref)?.file : m.refFile;
  if (!refFile || !refByFile.has(refFile)) continue;
  const d = decls.get(m.id);
  if (!d) continue;
  work.set(m.id, { id: m.id, d, cur: ref && refDecls.has(ref) ? ref : null, refFile, method: m.ref ? m.method : lm ? lm.method : 'layout' });
}

const oldRef = new Map();
for (const x of readJsonl(path.join(A, 'names/reference.jsonl'))) if (x.via !== 'top') oldRef.set(x.file + x.key, x);

const stats = { work: work.size, files316: 0, refFiles: 0, tokens316: 0, aligned: 0, pairs: { kept: 0, switched: 0, 'file-local': 0, none: 0 }, units: { tried: 0, matched: 0 }, unitVsPass1: {}, bindings316: 0, simHist: {}, why: {}, out: 0, param: 0, local: 0, compilerTemp: 0, suffixStripped: 0, byKind: {}, byPair: {}, confHist: {}, vsReference: { both: 0, agree: 0, disagree: 0 } };
const bump = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const t0 = Date.now();
const log = (s) => console.error(`${s} ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ---- ①：316 侧 token ----
const byFile316 = new Map();
for (const w of work.values()) {
  let l = byFile316.get(w.d.file);
  if (!l) byFile316.set(w.d.file, (l = []));
  l.push(w);
}
for (const file of [...byFile316.keys()].sort().slice(0, LIMIT)) {
  let S;
  try { S = load316(file); } catch { continue; }
  stats.files316++;
  const idTok = idTok316For(S, MN);
  const rec = new Map(); // scope.mjs Binding → 小记录
  const small = (bd) => {
    let r = rec.get(bd);
    if (!r) rec.set(bd, (r = { key: bd.key, name: bd.name, kind: bd.kind }));
    return r;
  };
  for (const w of byFile316.get(file)) {
    const node = S.top.get(w.d.start);
    if (!node) continue;
    const ranges = [];
    const a = tokensOf(node, idTok, (_, f, t) => ranges.push([f, t]));
    if (!a.some((x) => isL(x.t))) continue;
    for (const x of a) if (x.b) x.b = small(x.b);
    w.a = a;
    w.bag = bag(a);
    w.ranges = ranges;
    stats.tokens316 += a.length;
  }
}
log('316 tokens done');

// ---- ②：按旧版文件对齐 ----
const results = new Map(); // file → Map(key → line)
const dbg = debugDir ? (fs.mkdirSync(debugDir, { recursive: true }), fs.createWriteStream(path.join(debugDir, 'cands.jsonl'))) : null;
const dbgPairs = debugDir ? fs.createWriteStream(path.join(debugDir, 'pairs.jsonl')) : null;
const dbgUnits = debugDir ? fs.createWriteStream(path.join(debugDir, 'units.jsonl')) : null;

// 投票并记录结果。a/b 是对齐的两段 token，own 非空时只输出其中的绑定。
function emit(w, a, b, pairs, sim, refId, how, own, fillOnly) {
  const file = w.d.file;
  const { cands, dropped } = voteRounds(a, b, pairs, refName, (c) => confidence(c, sim, a.length) >= MIN_CONF, align, solidity);
  const rec = (c, why, conf) => dbg?.write(JSON.stringify({ file, key: c.b.key, min: c.b.name, name: refName(c.r), kind: c.b.kind, why, conf: conf === undefined ? undefined : +conf.toFixed(3), winner: c.winner?.name, count: c.count, votes: +c.votes.toFixed(2), local: +c.local.toFixed(2), n: c.n, nRef: c.nRef, agreement: +c.agreement.toFixed(2), reverse: +c.reverse.toFixed(2), sim: +sim.toFixed(2), len: a.length, id: w.id, ref: refId, method: w.method, pair: how }) + '\n');
  for (const c of dropped) {
    if (own && !own.has(c.b)) continue;
    bump(stats.why, c.why);
    rec(c, c.why);
  }
  let res = results.get(file);
  if (!res) results.set(file, (res = new Map()));
  for (const c of cands) {
    const bd = c.b;
    if (own && !own.has(bd)) continue;
    let name = refName(c.r);
    let conf = confidence(c, sim, a.length) * FACTOR[how];
    const temp = COMPILER_TEMP.test(name);
    if (temp) conf *= 0.75;
    let stripped = false;
    const sm = COMPILER_SUFFIX.exec(name);
    if (sm && !temp) { name = sm[1]; stripped = true; }
    const why = name === bd.name ? 'same' : name === '_' ? 'underscore' : !temp && name.length <= 2 && !SHORT_OK.has(name) ? 'short' : quality(c, sim, a.length) < MIN_Q ? 'lowsim' : conf < MIN_CONF ? 'lowconf' : 'ok';
    bump(stats.why, why);
    rec(c, why, conf);
    if (why !== 'ok') continue;
    const line = { file, key: bd.key, min: bd.name, name, source: 'reference', confidence: +conf.toFixed(2), via: bd.kind === 'param' ? 'align-param' : 'align-local', kind: bd.kind, ref: refId, votes: c.count, n: c.n, sim: +sim.toFixed(2), round: c.round ?? 0 };
    if (how !== 'kept') line.pair = how;
    if (temp) line.note = 'React Compiler 临时名';
    else if (stripped) line.note = 'React Compiler 后缀已去：' + refName(c.r);
    const old = res.get(line.key);
    if (old && fillOnly) {
      bump(stats.unitVsPass1, old.name === line.name ? 'agree' : 'disagree');
      continue;
    }
    if (!old || old.confidence < line.confidence) res.set(line.key, line);
  }
}

const byRefFile = new Map();
for (const w of work.values()) {
  if (!w.a) continue;
  let l = byRefFile.get(w.refFile);
  if (!l) byRefFile.set(w.refFile, (l = []));
  l.push(w);
}
let rf = 0;
for (const [refFile, ws] of [...byRefFile].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
  rf++;
  let R;
  try { R = loadRef(refFile); } catch { continue; }
  stats.refFiles++;
  const idTok = idTokRef(R);
  const refTok = new Map(); // ref id → {b, bag, ranges} | null
  const tokRef = (id) => {
    if (refTok.has(id)) return refTok.get(id);
    const node = R.byLine.get(refDecls.get(id).line);
    let v = null;
    if (node) {
      const ranges = [];
      const b = tokensOf(node, idTok, (_, f, t) => ranges.push([f, t]));
      if (b.some((y) => isL(y.t))) v = { b, bag: bag(b), ranges };
    }
    refTok.set(id, v);
    return v;
  };
  const alignTo = (w, id) => {
    const t = tokRef(id);
    if (!t) return null;
    stats.aligned++;
    const pairs = align(w.a, t.b);
    return { ref: id, b: t.b, pairs, sim: similarity(w.a, t.b, pairs) };
  };

  // 第一遍：顶层声明
  for (const w of ws) {
    const cur = w.cur ? alignTo(w, w.cur) : null;
    let pick = cur && cur.sim >= KEEP_SIM ? { ...cur, repaired: null } : null;
    if (!pick) {
      const cands = [];
      for (const id of refByFile.get(refFile)) {
        if (id === w.cur) continue;
        const t = tokRef(id);
        if (!t) continue;
        const ratio = t.b.length / w.a.length;
        if (ratio < 0.33 || ratio > 3) continue;
        cands.push({ id, dice: bagDice(w.bag, t.bag) });
      }
      cands.sort((x, y) => y.dice - x.dice);
      const scored = cands.slice(0, TOP_K).filter((c) => c.dice > 0).map((c) => alignTo(w, c.id)).filter(Boolean).sort((x, y) => y.sim - x.sim);
      pick = choose(cur, scored);
      dbgPairs?.write(JSON.stringify({ id: w.id, refFile, method: w.method, cur: cur ? [cur.ref, +cur.sim.toFixed(2)] : null, ncand: cands.length, scored: scored.map((s) => [s.ref, +s.sim.toFixed(2)]), pick: pick ? [pick.ref, pick.repaired] : null, a: w.a.length }) + '\n');
    }
    if (!pick) { stats.pairs.none++; continue; }
    stats.pairs[pick.repaired ?? 'kept']++;
    bump(stats.simHist, (Math.floor(pick.sim * 10) / 10).toFixed(1));
    stats.bindings316 += new Set(w.a.filter((x) => isL(x.t)).map((x) => x.b)).size;
    emit(w, w.a, pick.b, pick.pairs, pick.sim, pick.ref, pick.repaired ?? 'kept', null);
  }

  // 第二遍：函数单元
  if (!PASS2) continue;
  let refUnits = null;
  for (const w of ws) {
    const units = unitsOf(w.a, w.ranges);
    if (!units.length) continue;
    for (const u of units) {
      const res = results.get(w.d.file);
      const own = ownBindings(u.tokens);
      if (res && ![...own].some((bd) => !res.has(bd.key))) continue;
      if (!refUnits) {
        refUnits = [];
        for (const id of refByFile.get(refFile)) {
          const t = tokRef(id);
          if (!t) continue;
          for (const ru of unitsOf(t.b, t.ranges)) refUnits.push({ ...ru, ref: id });
        }
      }
      stats.units.tried++;
      const scored = candidates(u, refUnits).map((r) => {
        stats.aligned++;
        const pairs = align(u.tokens, r.tokens);
        return { r, pairs, sim: similarity(u.tokens, r.tokens, pairs) };
      }).sort((x, y) => y.sim - x.sim);
      const best = pickUnit(scored);
      dbgUnits?.write(JSON.stringify({ id: w.id, from: u.from, len: u.tokens.length, scored: scored.map((x) => [x.r.ref, x.r.from, +x.sim.toFixed(2)]), pick: !!best }) + '\n');
      if (!best) continue;
      stats.units.matched++;
      emit(w, u.tokens, best.r.tokens, best.pairs, best.sim, best.r.ref, 'unit', own, true);
    }
  }
  if (rf % 200 === 0) log(`${rf}/${byRefFile.size} ref files, ${stats.aligned} alignments`);
}
if (dbg) await new Promise((r) => dbg.end(r));
if (dbgPairs) await new Promise((r) => dbgPairs.end(r));
if (dbgUnits) await new Promise((r) => dbgUnits.end(r));

// ---- 输出 ----
const tmp = outFile + '.tmp';
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const out = fs.createWriteStream(tmp);
for (const file of [...results.keys()].sort()) {
  for (const line of [...results.get(file).values()].sort((x, y) => +x.key.slice(1) - +y.key.slice(1))) {
    out.write(JSON.stringify(line) + '\n');
    stats.out++;
    if (line.via === 'align-param') stats.param++;
    else stats.local++;
    bump(stats.byKind, line.kind);
    bump(stats.byPair, line.pair ?? 'kept');
    if (line.note?.startsWith('React Compiler 临时名')) stats.compilerTemp++;
    else if (line.note) stats.suffixStripped++;
    bump(stats.confHist, line.confidence.toFixed(1));
    const o = oldRef.get(file + line.key);
    if (o) {
      stats.vsReference.both++;
      if (o.name === line.name) stats.vsReference.agree++;
      else stats.vsReference.disagree++;
    }
  }
}
await new Promise((r) => out.end(r));
fs.renameSync(tmp, outFile);
stats.seconds = Math.round((Date.now() - t0) / 1000);
if (debugDir) fs.writeFileSync(path.join(debugDir, 'stats.json'), JSON.stringify(stats, null, 1));
console.log(JSON.stringify(stats));
