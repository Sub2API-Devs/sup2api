// Static consistency check of the reading tree (reconstructed/).
//   node tools/verify/readable-check.mjs [reconstructed] [--report analysis/verify/readable-check.json]
// For every .js file:
//   parse     the file parses as an ES module (Babel, no error recovery)
//   dupes     no top-level binding is declared twice (merged pieces of several chunks)
//   imports   every relative import resolves to a file, and every imported name is
//             exported by it
//   free      identifiers that resolve to no binding and are not known globals
//             (a symptom of a declaration that was not emitted or an import that is missing)
// The reading tree is for reading, not running; these checks make sure a reader
// (or an AI following imports) never hits a dangling reference.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default ?? _traverse;
const argv = process.argv.slice(2);
const ROOT = argv.find((a) => !a.startsWith('--')) ?? 'reconstructed';
const REPORT = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : 'analysis/verify/readable-check.json';
const GLOBALS = new Set(Object.getOwnPropertyNames(globalThis).concat(['require', 'module', 'exports', '__dirname', '__filename', 'Bun', 'process', 'Buffer', 'global', 'window', 'document', 'navigator', 'self', 'arguments', 'undefined', 'globalThis', 'HTMLElement', 'Element', 'Node', 'location', 'Deno', 'XMLHttpRequest', 'ActiveXObject', 'importScripts', 'WorkerGlobalScope', 'define', 'chrome', 'localStorage', 'sessionStorage', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'Image', 'CSS', 'NodeFilter', 'DOMParser', 'XMLSerializer', 'Bun', '__webpack_require__', 'Intl']));

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    // assets/ holds resources copied byte-for-byte (incl. three minified BOM scripts)
    if (e.isDirectory()) { if (!(d === ROOT && e.name === 'assets')) walk(p); }
    else if (/\.[cm]?js$/.test(e.name)) files.push(p);
  }
})(ROOT);

// completeness: every top-level declaration of original/ appears exactly once,
// recognised by its provenance marker `//@ <module>:<start>-<end>`
const coverage = { expected: 0, found: 0, duplicated: 0, missing: [] };
if (fs.existsSync('analysis/scan/decls.jsonl') && ROOT !== 'original') {
  const want = new Map();
  for (const l of fs.readFileSync('analysis/scan/decls.jsonl', 'utf8').split('\n')) {
    if (!l) continue;
    const d = JSON.parse(l);
    want.set(`${d.file}:${d.start}-${d.end}`, 0);
  }
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\/\/@ (\S+?:\d+-\d+) /gm)) if (want.has(m[1])) want.set(m[1], want.get(m[1]) + 1);
  coverage.expected = want.size;
  for (const [k, n] of want) { if (n >= 1) coverage.found++; if (n > 1) coverage.duplicated++; if (!n && coverage.missing.length < 20) coverage.missing.push(k); }
}

const exportsOf = new Map();
const parsed = new Map();
const res = { files: files.length, parseErrors: [], dupes: [], missingFiles: [], missingNames: [], free: new Map() };
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  try {
    const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'importAttributes'], errorRecovery: false });
    parsed.set(f, ast);
    const ex = new Set();
    for (const n of ast.program.body) {
      if (n.type === 'ExportNamedDeclaration') {
        for (const s of n.specifiers) ex.add(s.exported.name ?? s.exported.value);
        const d = n.declaration;
        if (d?.id) ex.add(d.id.name);
        if (d?.declarations) for (const x of d.declarations) if (x.id.type === 'Identifier') ex.add(x.id.name);
      } else if (n.type === 'ExportDefaultDeclaration') ex.add('default');
      else if (n.type === 'ExportAllDeclaration') ex.add('*');
    }
    exportsOf.set(path.resolve(f), ex);
  } catch (e) {
    const m = /has already been declared/.test(e.message);
    (m ? res.dupes : res.parseErrors).push({ file: rel(f), error: e.message.slice(0, 160) });
  }
}
for (const [f, ast] of parsed) {
  for (const n of ast.program.body) {
    if (n.type !== 'ImportDeclaration' || !n.source.value.startsWith('.')) continue;
    if (n.attributes?.length) continue; // resources
    const target = path.resolve(path.dirname(f), n.source.value);
    const ex = exportsOf.get(target);
    if (!ex) {
      if (!fs.existsSync(target)) res.missingFiles.push({ file: rel(f), spec: n.source.value });
      continue;
    }
    if (ex.has('*')) continue;
    for (const s of n.specifiers) {
      const name = s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : null;
      if (name && !ex.has(name)) res.missingNames.push({ file: rel(f), spec: n.source.value, name });
    }
  }
  try {
    traverse(ast, {
      Program(p) {
        for (const [name, refs] of Object.entries(p.scope.globals ?? {})) {
          if (GLOBALS.has(name)) continue;
          const a = res.free.get(name) ?? [];
          if (a.length < 5) a.push(rel(f));
          res.free.set(name, a);
        }
      },
    });
  } catch {}
}
function rel(f) { return path.relative(ROOT, f).split(path.sep).join('/'); }
const out = {
  files: res.files,
  declarations: coverage,
  parseErrors: res.parseErrors.length,
  duplicateDeclarations: res.dupes.length,
  missingImportFiles: res.missingFiles.length,
  missingImportNames: res.missingNames.length,
  freeIdentifiers: res.free.size,
  samples: { parseErrors: res.parseErrors.slice(0, 20), dupes: res.dupes.slice(0, 20), missingFiles: res.missingFiles.slice(0, 20), missingNames: res.missingNames.slice(0, 20), free: [...res.free].slice(0, 40) },
};
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ files: out.files, declarations: { expected: coverage.expected, found: coverage.found, duplicated: coverage.duplicated }, parseErrors: out.parseErrors, duplicateDeclarations: out.duplicateDeclarations, missingImportFiles: out.missingImportFiles, missingImportNames: out.missingImportNames, freeIdentifiers: out.freeIdentifiers }));
