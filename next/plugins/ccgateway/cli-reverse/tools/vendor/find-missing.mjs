// Debug: unknown (neither vendor nor first-party matched) stretches that do
// not look like Claude Code's own code. Prints the longest stretches with
// sample strings, to find packages that are not installed yet.
//   node --max-old-space-size=12000 tools/vendor/find-missing.mjs [minBytes=3000] [limit=80]
import fs from 'node:fs';
const [minBytes = 3000, limit = 80] = process.argv.slice(2).map(Number);
const lines = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const fp = new Set();
for (const d of lines('analysis/match/decl-map.jsonl')) if (d.refFile) fp.add(d.id);
const labels = new Map(lines('analysis/vendor/index/unit-labels.jsonl').map((r) => [r.id, r]));
const FIRST = /tengu_|claude|anthropic|CLAUDE_|Claude Code|\bMCP\b|subagent|\.claude/i;
const stretches = [];
let cur = null;
for (const d of lines('analysis/vendor/index/orig-decls.jsonl')) {
  for (const u of d.units) {
    const id = d.id + '~' + u.u;
    const known = labels.get(id)?.label || fp.has(d.id);
    const strs = u.tokens.filter((t) => t.startsWith('s:')).map((t) => t.slice(2));
    const first = strs.some((s) => FIRST.test(s));
    if (known || first || (cur && cur.file !== d.file)) {
      if (cur && cur.bytes >= minBytes) stretches.push(cur);
      cur = null;
      if (known || first) continue;
    }
    cur ??= { file: d.file, from: d.id, bytes: 0, n: 0, strs: new Set() };
    cur.bytes += u.bytes;
    cur.n++;
    for (const s of strs) if (s.length > 8 && cur.strs.size < 400) cur.strs.add(s);
  }
}
if (cur && cur.bytes >= minBytes) stretches.push(cur);
stretches.sort((a, b) => b.bytes - a.bytes);
console.log('stretches', stretches.length, 'bytes', stretches.reduce((a, s) => a + s.bytes, 0));
for (const s of stretches.slice(0, limit)) console.log(String(s.bytes).padStart(8), String(s.n).padStart(5), s.from.padEnd(30), [...s.strs].sort((a, b) => b.length - a.length).slice(0, 5).map((x) => x.slice(0, 60)).join(' | '));
