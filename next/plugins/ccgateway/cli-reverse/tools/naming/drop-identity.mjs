// Removes naming entries that only restate a minified name: a 1–3 character
// name equal to the binding's current (minified) name, in a minified module, or
// that name with an engine-style `_2` suffix (`E_2` for `E`). Such entries were
// written by naming members as placeholders; they carry no information and, at
// equal priority, can shadow a real name from another table.
//   node --max-old-space-size=8000 tools/naming/drop-identity.mjs naming/semantic-*.jsonl
// Rewrites each given file in place (via a temp file) and prints what it dropped.
import fs from 'node:fs';
import path from 'node:path';
import { bindingsOf } from '../rename/lib/rename.mjs';

const files = process.argv.slice(2);
const cache = new Map();
const infoOf = (file) => {
  let v = cache.get(file);
  if (v) return v;
  const p = path.join('original', file);
  if (!fs.existsSync(p)) return null;
  const bs = bindingsOf(file, fs.readFileSync(p, 'utf8'));
  const own = bs.filter((b) => b.kind !== 'import');
  v = { byKey: new Map(bs.map((b) => [b.key, b])), minified: own.filter((b) => b.name.length <= 3).length > own.length * 0.6 };
  if (cache.size > 40) cache.clear();
  cache.set(file, v);
  return v;
};
let total = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  const keep = [];
  let dropped = 0;
  for (const l of lines) {
    const x = JSON.parse(l);
    if (x.key && x.name) {
      const info = infoOf(x.file);
      const b = info?.byKey.get(x.key);
      if (b && info.minified && b.name.length <= 3 && (x.name === b.name || new RegExp(`^${b.name.replace(/\$/g, '\\$')}_\\d+$`).test(x.name))) { dropped++; continue; }
    }
    keep.push(l);
  }
  if (dropped) {
    fs.writeFileSync(f + '.tmp', keep.join('\n') + '\n');
    fs.renameSync(f + '.tmp', f);
  }
  total += dropped;
  console.log(`${f}: ${dropped} dropped, ${keep.length} kept`);
}
console.log({ total });
