// Rewrites references to the old version's bundle in hand-written docs to the new version:
// declaration ids (chunk-x.js#min, chunk-x.js#@start), chunk file names (chunk-x.js, chunk-x),
// byte ranges (chunk-x.js:a-b) and bare continuations in backticks (`#min`, meaning the chunk named
// last on the same line), using the unit pairing of tools/versions/carry-names.mjs.
//
//   node tools/versions/carry-doc-refs.mjs --pairs artifacts/versions/carry-316-318-pairs.jsonl \
//     --old-scan artifacts/versions/2.1.316-analysis/scan/decls.jsonl --new-scan analysis/scan/decls.jsonl \
//     --report artifacts/versions/carry-doc-refs-316-318.json [--write] <doc.md>...
//
// Inputs : the pairs file of carry-names.mjs ({old, new, how, status} per unit), both trees'
//          analysis/scan/decls.jsonl, and the docs to rewrite.
// Output : with --write the docs are rewritten in place (without it, a dry run); the report lists
//          every rewrite {doc, line, from, to, how} and every reference left alone, with the reason.
// Rules
//   - declaration id: the unit of its first name (or its statement unit) through the pairing,
//     to the new declaration that declares the paired binding;
//   - chunk file: the new file most of the chunk's paired units went to, when that is at least
//     half of them (otherwise left alone: the chunk was split);
//   - byte range: the declarations overlapping the range, each through the pairing; rewritten
//     when they all land in one new file, to the span of their new declarations.
//   A reference whose old target is not in the old scan (a name that is already new) is not touched.
import fs from 'node:fs';

const args = { files: [] };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--write') args.write = true;
  else if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i];
  else args.files.push(a);
}
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const pairs = new Map(readJsonl(args.pairs).map((p) => [p.old, p.new]));
const oldDecls = readJsonl(args['old-scan']), newDecls = readJsonl(args['new-scan']);
const oldById = new Map(oldDecls.map((d) => [idOf(d), d]));
const oldByFile = new Map();
for (const d of oldDecls) (oldByFile.get(d.file) ?? oldByFile.set(d.file, []).get(d.file)).push(d);
const newByName = new Map(), newByStart = new Map();
for (const d of newDecls) { for (const n of d.names) newByName.set(d.file + ':' + n, d); newByStart.set(d.file + ':#' + d.start, d); }
const newFiles = new Set(newDecls.map((d) => d.file));

function newDeclOf(d) {
  const keys = d.names.length ? d.names.map((n) => d.file + ':' + n) : [d.file + ':#' + d.start];
  for (const k of keys) {
    const nk = pairs.get(k);
    if (!nk) continue;
    const nd = nk.includes(':#') ? newByStart.get(nk) : newByName.get(nk);
    if (nd) return nd;
  }
  return null;
}
// chunk -> its home in the new tree
const homeCache = new Map();
function homeOf(file) {
  if (homeCache.has(file)) return homeCache.get(file);
  const count = new Map();
  let total = 0;
  for (const d of oldByFile.get(file) ?? []) { const nd = newDeclOf(d); if (nd) { count.set(nd.file, (count.get(nd.file) ?? 0) + 1); total++; } }
  const best = [...count].sort((a, b) => b[1] - a[1])[0];
  const r = best && best[1] * 2 >= total ? best[0] : null;
  homeCache.set(file, r);
  return r;
}

const report = { rewrites: [], left: [] };
// a full reference, or a bare continuation "#name" / "#@start" meaning "in the chunk named last on this line"
const OLD_FILE = /(?<![\w./-])(?:((?:chunk-[a-z0-9]{8}|cli)(?:\.js)?)(#@?[\w$]+|:\d+-\d+)?|(?<=`)(#@?[\w$]+)(?=`))(?![\w-])/g;
for (const doc of args.files) {
  const lines = fs.readFileSync(doc, 'utf8').split('\n');
  let changed = 0;
  lines.forEach((line, li) => {
    let lastOld = null, lastNew = null; // chunk of the previous full reference on this line (old / rewritten)
    lines[li] = line.replace(OLD_FILE, (whole, f0, tail0, bare) => {
      let f = f0, tail = tail0;
      if (bare) {
        if (!lastOld) return whole;
        f = lastOld; tail = bare;
      }
      const hasExt = f.endsWith('.js');
      const file = hasExt ? f : f + '.js';
      if (f === 'cli' && !tail) return whole; // the word "cli"
      if (!oldByFile.has(file)) return whole; // not an old chunk
      const at = { doc, line: li + 1, from: whole };
      const keep = (why) => { report.left.push({ ...at, why }); return whole; };
      const done = (to, how) => { report.rewrites.push({ ...at, to, how }); changed++; return to; };
      if (tail?.startsWith('#')) {
        const d = oldById.get(file + tail);
        if (!d) return keep('no such old declaration');
        const nd = newDeclOf(d);
        if (!bare) { lastOld = f.endsWith('.js') ? f : f + '.js'; lastNew = nd?.file ?? null; }
        if (!nd) return keep('declaration not paired');
        if (bare) {
          // the continuation stays short when the new declaration is in the same new chunk
          const short = '#' + idOf(nd).split('#')[1];
          return nd.file === lastNew ? done(short, 'continuation') : done(idOf(nd), 'continuation-full');
        }
        return done(idOf(nd), 'declaration');
      }
      if (bare) return whole;
      if (tail?.startsWith(':')) {
        const [a, b] = tail.slice(1).split('-').map(Number);
        const over = (oldByFile.get(file) ?? []).filter((d) => d.start < b && d.end > a);
        const nds = over.map(newDeclOf);
        if (!over.length || nds.some((x) => !x)) return keep('range not fully paired');
        const nf = new Set(nds.map((x) => x.file));
        if (nf.size !== 1) return keep('range split over files');
        const s = Math.min(...nds.map((x) => x.start)), e = Math.max(...nds.map((x) => x.end));
        return done(`${[...nf][0]}:${s}-${e}`, 'range');
      }
      if (newFiles.has(file) && f === 'cli.js') return whole;
      const h = homeOf(file);
      lastOld = file; lastNew = h;
      if (!h) return keep('chunk split');
      return done(hasExt ? h : h.replace(/\.js$/, ''), 'chunk');
    });
  });
  if (args.write && changed) fs.writeFileSync(doc, lines.join('\n'));
}
const by = (xs, k) => xs.reduce((m, x) => ((m[x[k]] = (m[x[k]] ?? 0) + 1), m), {});
fs.writeFileSync(args.report, JSON.stringify({ written: !!args.write, rewrites: by(report.rewrites, 'how'), left: by(report.left, 'why'), detail: report }, null, 1) + '\n');
console.log(JSON.stringify({ written: !!args.write, rewrites: by(report.rewrites, 'how'), left: by(report.left, 'why') }));
