// Lists every binding that still carries a minified-looking name after naming,
// each with the reason it was left (goal: "剩余压缩名逐条列出原因").
//   node --max-old-space-size=8000 tools/verify/leftover.mjs [readability=analysis/readability]
// Reads <readability>/todo.jsonl (tools/verify/readability.mjs) and writes
//   <readability>/leftover.jsonl  {file, key, min, final, path, scope, refs, reason, note}
//   <readability>/leftover.md     counts by tree × reason, then the full list
// Reasons, checked in this order:
//   frozen     the module has a direct eval; every binding in it is frozen by the
//              renamer (tools/rename), so no name can be applied
//   dead       never read: zero references, or listed by a naming member as a dead
//              slot / unread parameter (docs/process/naming-*.md tables)
//   authored   the module is not minified (bundled skill scripts …): the short name is the author's own
//   bundler    Bun's own module wrapper / runtime helper parameters (runtime/)
//   unnamed    none of the above: a naming gap
import fs from 'node:fs';
import path from 'node:path';
import { bindingsOf } from '../rename/lib/rename.mjs';

const DIR = process.argv[2] ?? 'analysis/readability';
const todo = fs.readFileSync(path.join(DIR, 'todo.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// dead slots recorded by naming members: table rows "| chunk-x.js | `@123` | … | reason |"
// or "`chunk-x.js@123`（`r`）：reason"
const listed = new Map();
for (const f of fs.readdirSync('docs/process').filter((f) => /^naming-.*\.md$/.test(f))) {
  for (const line of fs.readFileSync(path.join('docs/process', f), 'utf8').split('\n')) {
    let m = line.match(/^\|\s*(chunk-[\w]+\.m?js)\s*\|\s*`(@\d+)`\s*\|(.*)\|\s*([^|]+?)\s*\|\s*$/);
    if (m) { listed.set(m[1] + m[2], `${m[4]}（${f}）`); continue; }
    m = line.match(/`(chunk-[\w]+\.m?js)(@\d+)`[^：:]*[：:]\s*(.+)$/);
    if (m && /从未|从不|死|恒为|空函数|只有 `return/.test(m[3])) listed.set(m[1] + m[2], `${m[3].slice(0, 80)}（${f}）`);
  }
}

const frozenCache = new Map();
const frozenOf = (file) => {
  if (!frozenCache.has(file)) {
    const bs = bindingsOf(file, fs.readFileSync(path.join('original', file), 'utf8'));
    const own = bs.filter((x) => x.kind !== 'import');
    const minified = own.filter((x) => x.name.length <= 3).length > own.length * 0.6;
    frozenCache.set(file, { minified, frozen: new Map(bs.map((x) => [x.key, x.frozen])) });
  }
  return frozenCache.get(file);
};

const out = [];
for (const t of todo) {
  const info = frozenOf(t.file);
  const frozen = info.frozen.get(t.key);
  let reason, note = '';
  if (frozen) { reason = 'frozen'; note = frozen; }
  else if (listed.has(t.file + t.key)) { reason = 'dead'; note = listed.get(t.file + t.key); }
  else if (t.refs === 0) { reason = 'dead'; note = 'no references'; }
  else if (!info.minified && t.final === t.min) { reason = 'authored'; note = "module is not minified: the author's own short name"; }
  else if (t.path.startsWith('runtime/')) { reason = 'bundler'; note = 'Bun module wrapper / runtime helper'; }
  else reason = 'unnamed';
  out.push({ file: t.file, key: t.key, min: t.min, final: t.final, path: t.path, scope: t.scope, refs: t.refs, reason, note });
}
fs.writeFileSync(path.join(DIR, 'leftover.jsonl'), out.map((x) => JSON.stringify(x)).join('\n') + (out.length ? '\n' : ''));

const counts = {};
for (const x of out) {
  const tree = x.path.split('/')[0];
  counts[tree] ??= {};
  counts[tree][x.reason] = (counts[tree][x.reason] ?? 0) + 1;
}
const md = ['# 剩余压缩名清单', '', '由 `tools/verify/leftover.mjs` 生成（输入 `todo.jsonl`，来自 `tools/verify/readability.mjs`）。', '',
  '| 树 | 原因 | 个数 |', '|---|---|---|',
  ...Object.entries(counts).flatMap(([tree, c]) => Object.entries(c).map(([r, n]) => `| ${tree} | ${r} | ${n} |`)), '',
  '原因：`frozen` 所在 chunk 有直接 eval，改名器冻结整个 chunk；`dead` 从不被读取（0 引用或成员核实的死槽位）；`authored` 模块本身没有压缩（随包脚本等），短名是作者原名；`bundler` Bun 打包器自己的包装参数；`unnamed` 命名缺口。', '',
  '| 文件 | 绑定 | 压缩名 | 范围 | 引用 | 原因 | 说明 |', '|---|---|---|---|---|---|---|',
  ...out.map((x) => `| ${x.path} | \`${x.file}${x.key}\` | \`${x.min}\` | ${x.scope} | ${x.refs} | ${x.reason} | ${x.note.replace(/\|/g, '/')} |`)];
fs.writeFileSync(path.join(DIR, 'leftover.md'), md.join('\n') + '\n');
console.log(JSON.stringify(counts));
