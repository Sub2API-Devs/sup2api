// Validate references in docs/{ARCHITECTURE,CHANGES-SINCE-2.1.88,INDEX}.md against the reading tree.
// usage: node validate.mjs <repoRoot> <doc.md>...   (APPEND=1 rewrites the "校验结果" section of each doc)
// Checks every `code span` (and paths / "path · name" pairs inside ``` fences):
//   path         -> exists on disk (repo-relative, else relative to reconstructed/src/, .ts/.tsx -> .js); globs expanded
//   decl id      -> present in reconstructed/symbols.jsonl (full id, or #tail)
//   path · name  -> name is a symbol of that file (symbols.jsonl) or occurs in that file's text
//   identifier   -> a symbol name in symbols.jsonl, or occurs in reconstructed/ code
//   literal      -> occurs in reconstructed/ code (whitespace-insensitive), or in analysis/ / original/reconstruction.json
// Tokens not found in 316 are re-checked in the 2.1.88 source (references/claude-code-analysis/src); a hit there
// counts as "旧版（2.1.88）存在" — expected for removed features. Placeholders (<…>, xxx, NNN, …) are skipped.
import fs from 'node:fs';
import path from 'node:path';

const R = process.argv[2];
const docs = process.argv.slice(3);
const rd = (p) => fs.readFileSync(path.join(R, p), 'utf8');
const S = rd('reconstructed/symbols.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const names = new Set(S.map((s) => s.name));
const ids = new Set(S.map((s) => s.id));
const idTails = new Set(S.map((s) => '#' + s.id.split('#')[1]));
const byFile = new Map();
for (const s of S) (byFile.get(s.file) ?? byFile.set(s.file, new Set()).get(s.file)).add(s.name);
function walk(d, out, re) {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out, re);
    else if (re.test(e.name)) out.push(p);
  }
  return out;
}
const fileText = new Map();
const parts = [];
for (const sub of ['src', 'vendor', 'runtime']) {
  for (const f of walk(path.join(R, 'reconstructed', sub), [], /\.(js|mjs|cjs)$/)) {
    const t = fs.readFileSync(f, 'utf8');
    fileText.set(path.relative(path.join(R, 'reconstructed'), f).replace(/\\/g, '/'), t);
    parts.push(t);
  }
}
const corpus = parts.join('\n');
const corpusNW = corpus.replace(/\s+/g, '');
const extra = ['analysis/segments/summary.json', 'analysis/vendor/packages.json', 'original/reconstruction.json']
  .filter((p) => fs.existsSync(path.join(R, p))).map(rd).join('\n');
const refParts = walk(path.join(R, 'references/claude-code-analysis/src'), [], /\.(ts|tsx|js)$/).map((f) => fs.readFileSync(f, 'utf8'));
const refCorpus = refParts.join('\n');
const refRoot = 'references/claude-code-analysis/src/';

const ROOTS = ['reconstructed/', 'docs/', 'research/', 'analysis/', 'tools/', 'naming/', 'original/', 'references/', 'artifacts/', 'runnable/', 'build/', 'vendor-ref/'];
const isPlaceholder = (t) => /<[^>]*>|xxx|NNN|…|\.\.\.|压缩名|起-止|^a\.\.b$/.test(t);
function globExists(p) {
  // p is repo-relative with * wildcards in the last segment(s)
  const segs = p.replace(/\/$/, '').split('/');
  let cur = [''];
  for (const seg of segs) {
    const next = [];
    for (const c of cur) {
      if (!seg.includes('*')) { if (fs.existsSync(path.join(R, c, seg))) next.push(path.posix.join(c, seg)); continue; }
      const dir = path.join(R, c);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      const re = new RegExp('^' + seg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      for (const e of fs.readdirSync(dir)) if (re.test(e)) next.push(path.posix.join(c, e));
    }
    cur = next;
    if (!cur.length) return false;
  }
  return cur.length > 0;
}
function resolvePath(tok) {
  let t = tok.replace(/[`'"]/g, '').replace(/[)，。、；:]+$/, '');
  if (!t) return null;
  const src = ['reconstructed/src/' + t, 'reconstructed/src/' + t.replace(/\.tsx?$/, '.js'), 'reconstructed/' + t];
  const cands = ROOTS.some((r) => t.startsWith(r)) || /^(README|AGENTS)\.md$/.test(t) ? [t, ...src] : src;
  for (const c of cands) {
    if (c.includes('*') ? globExists(c) : fs.existsSync(path.join(R, c.replace(/\/$/, '')))) return c;
  }
  return null;
}
function inRef(tok) {
  const t = tok.replace(/^`|`$/g, '');
  if (/\.(tsx?|js)$|\/$/.test(t) && fs.existsSync(path.join(R, refRoot, t.replace(/\/$/, '')))) return true;
  const bare = t.replace(/^--?/, '').replace(/^\//, '').replace(/\*$/, '');
  return bare.length >= 3 && refCorpus.includes(bare);
}
function inCorpus(tok) {
  const nw = tok.replace(/\s+/g, '');
  const bare = nw.replace(/^--?/, '').replace(/^\//, '').replace(/\*$/, '').replace(/\(.*\)$/, '');
  return corpus.includes(tok) || corpusNW.includes(nw) || (bare.length >= 3 && (corpusNW.includes(bare) || names.has(bare))) || extra.includes(tok);
}
function nameIn(name, key) {
  if (byFile.get(key)?.has(name)) return true;
  const t = fileText.get(key);
  return t ? new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(t) : false;
}
const report = {};
for (const doc of docs) {
  const lines = rd(doc).split('\n');
  const r = { checked: 0, ok: 0, old: [], fails: [], skipped: 0, byKind: {} };
  const tally = (kind, ok, tok, ln, oldOk = false) => {
    const k = (r.byKind[kind] ??= [0, 0, 0]);
    k[0]++; r.checked++;
    if (ok) { k[1]++; r.ok++; } else if (oldOk) { k[2]++; r.old.push(`${tok}`); } else r.fails.push(`${kind}\t${tok}\t(第 ${ln} 行)`);
  };
  const vIdx = lines.findIndex((l) => /^## .*校验结果/.test(l));
  let fence = false;
  lines.forEach((line, i) => {
    if (vIdx >= 0 && i > vIdx) return;
    if (/^```/.test(line)) { fence = !fence; return; }
    const ln = i + 1;
    const pairRe = fence ? /([\w@][\w@./-]*\.js)\s*·\s*([A-Za-z_$][\w$]*)/g : /`([^`\s]+\.(?:js|ts|tsx))`\s*·\s*`([A-Za-z_$][\w$]*)`/g;
    for (const m of line.matchAll(pairRe)) {
      const p = resolvePath(m[1]);
      tally('路径·函数', !!p && p.startsWith('reconstructed/') && nameIn(m[2], p.slice(14)), `${m[1]} · ${m[2]}`, ln);
    }
    if (fence) {
      for (const m of line.matchAll(/(?<![\w./#@-])([a-zA-Z][\w-]*\/[\w./*-]*[\w/*])(?![\w#])/g)) {
        const tok = m[1];
        if (/^(chunk-|claude\.ai|api\/|v1\/|anthropic-ai\/)/.test(tok) || isPlaceholder(tok)) { r.skipped++; continue; }
        tally('路径', !!resolvePath(tok), tok, ln, inRef(tok));
      }
      return;
    }
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const tok = m[1].trim();
      if (isPlaceholder(tok) || /^https?:/.test(tok) || tok.length < 3) { r.skipped++; continue; }
      if (/^(chunk-[a-z0-9]+\.js|cli\.js|[\w-]+\.mjs)#\S+$/.test(tok)) { tally('声明id', ids.has(tok), tok, ln); continue; }
      if (/^#[\w$@]+$/.test(tok)) { tally('声明id', idTails.has(tok), tok, ln); continue; }
      if (/\s/.test(tok)) { r.skipped++; continue; }
      const looksPath = /^[\w@.][\w@./*-]*\/[\w@./*-]*$/.test(tok) || /\.(js|mjs|md|json|jsonl|ts|tsx|sh)$/.test(tok);
      if (looksPath && !tok.startsWith('/') && !tok.startsWith('~')) {
        if (resolvePath(tok)) { tally('路径', true, tok, ln); continue; }
        // a/b/c alternatives (e.g. tengu_x_success/error, --a/--b) or path-like literal in code
        const alts = tok.split('/').filter(Boolean);
        const altOk = alts.length > 1 && alts.every((a) => inCorpus(a) || inCorpus(alts[0].replace(/[^_]*$/, '') + a));
        tally(altOk ? '字面量' : '路径', altOk || inCorpus(tok), tok, ln, inRef(tok) || (alts.length > 1 && alts.every(inRef)));
        continue;
      }
      if (/^[A-Za-z_$][\w$]*$/.test(tok)) { tally('名字', names.has(tok) || inCorpus(tok) || extra.includes(tok), tok, ln, inRef(tok)); continue; }
      { const alts = tok.split('/').filter(Boolean); const altOk = alts.length > 1 && alts.every((x) => inCorpus(x));
        tally('字面量', inCorpus(tok) || altOk, tok, ln, inRef(tok) || (alts.length > 1 && alts.every(inRef))); }
    }
  });
  report[doc] = r;
}
const out = [];
for (const [doc, r] of Object.entries(report)) {
  const kinds = Object.entries(r.byKind).map(([k, [n, ok, old]]) => `${k} ${ok}/${n}${old ? `（另 ${old} 个只在 2.1.88 中存在）` : ''}`).join('，');
  out.push({ doc, text: `共检查 ${r.checked} 处引用：${kinds}；占位符与含空格的说明性文字 ${r.skipped} 处未检查。` , r });
}
for (const o of out) {
  console.log(`== ${o.doc}\n  ${o.text}`);
  if (o.r.old.length) console.log('  OLD ' + o.r.old.join(' | '));
  for (const f of o.r.fails) console.log('  FAIL ' + f);
}
if (process.env.APPEND) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  for (const o of out) {
    const p = path.join(R, o.doc);
    const t = fs.readFileSync(p, 'utf8');
    const m = t.match(/\n## [0-9.]* ?引用校验结果\n/);
    if (!m) continue;
    const head = t.slice(0, m.index + m[0].length);
    const body = [
      '',
      `校验时间 ${stamp}（UTC），对象为当时的 \`reconstructed/\`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 \`reconstructed/src/\`，\`.ts/.tsx\` 对应 \`.js\`）；声明 id 是否在 \`reconstructed/symbols.jsonl\`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 \`reconstructed/symbols.jsonl\` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（\`references/claude-code-analysis/src\`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。`,
      '',
      `- ${o.text}`,
      o.r.old.length ? `- 只在 2.1.88 中存在（删除项或旧名，预期如此）：${[...new Set(o.r.old)].map((x) => '`' + x + '`').join('、')}` : '',
      o.r.fails.length ? `- 未通过 ${o.r.fails.length} 处：${o.r.fails.map((f) => f.split('\t')[1]).join('；')}` : '- 未通过：0 处。',
      '',
    ].join('\n');
    fs.writeFileSync(p, head + body);
  }
}
