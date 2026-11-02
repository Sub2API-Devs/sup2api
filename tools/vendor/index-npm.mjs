// Indexes the reference npm packages installed in vendor-ref/node_modules.
// Nothing in the packages is executed: every JS/JSON file is read as text
// and parsed with Babel.
//
//   node --max-old-space-size=12000 tools/vendor/index-npm.mjs [vendor-ref/node_modules] [analysis/vendor/index]
//
// Also indexes extra package versions unpacked by probe-versions.mjs under
// <node_modules>/.versions/<name@version>/package.
//
// Output (not committed, see .gitignore):
//   npm-files.jsonl  one row per file: {fid, pkg, version, path, bytes, fmt,
//                    tokens[], requires[] (resolved fids or "?spec"),
//                    imports[] (resolved fids), declCount}
//   npm-decls.jsonl  one row per top-level declaration unit (statement, or
//                    declarator of a var/let/const) of every JS file:
//                    {did, fid, idx, u, names, exported,
//                    kind, shape, bytes, tokens[], deps[] (did of other
//                    top-level units / "fid|importedName" it reads)}
//   packages.json    {pkgDir: {name, version, deps[]}}
// fid = "<name>@<version>/<path inside package>", did = fid + "#" + idx[.u].
import fs from 'node:fs';
import path from 'node:path';
import { parseJs, collect, collectJson, declaredNames, shapeOf, isBuiltin, jsonlWriter, rel } from './lib/common.mjs';

const [root = 'vendor-ref/node_modules', out = 'analysis/vendor/index'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const ROOT = path.resolve(root);

// ---------- discover packages and files ----------
const SKIP_DIR = /^(test|tests|__tests__|__mocks__|spec|specs|example|examples|benchmark|benchmarks|bench|coverage|\.bin|\.github|fixtures)$/i;
const pkgs = new Map(); // abs dir -> {name, version, json}
const files = []; // {abs, pkgDir}
function readPkg(dir) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return j;
  } catch {
    return null;
  }
}
function scanDir(dir, pkgDir) {
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') {
        scanNodeModules(abs);
        continue;
      }
      if (SKIP_DIR.test(e.name)) continue;
      scanDir(abs, pkgDir);
    } else if (/\.(js|mjs|cjs)$/.test(e.name) && !/\.d\.[mc]?ts$/.test(e.name)) files.push({ abs, pkgDir });
    else if (e.name.endsWith('.json') && e.name !== 'package-lock.json' && e.name !== 'tsconfig.json') files.push({ abs, pkgDir, json: true });
  }
}
function scanNodeModules(nm) {
  for (const e of fs.readdirSync(nm, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    if (e.name.startsWith('@')) {
      for (const s of fs.readdirSync(path.join(nm, e.name), { withFileTypes: true })) if (s.isDirectory()) addPkg(path.join(nm, e.name, s.name));
    } else addPkg(path.join(nm, e.name));
  }
}
function addPkg(dir) {
  const j = readPkg(dir);
  if (!j?.name) return;
  pkgs.set(dir, { name: j.name, version: j.version ?? '0.0.0', json: j });
  scanDir(dir, dir);
}
scanNodeModules(ROOT);
// extra versions fetched by tools/vendor/probe-versions.mjs: .versions/<name@ver>/package
const seenNV = new Set([...pkgs.values()].map((p) => p.name + '@' + p.version));
const VERS = path.join(ROOT, '.versions');
if (fs.existsSync(VERS))
  for (const d of fs.readdirSync(VERS)) {
    const dir = path.join(VERS, d, 'package');
    const j = readPkg(dir);
    if (!j?.name || seenNV.has(j.name + '@' + j.version)) continue;
    seenNV.add(j.name + '@' + j.version);
    addPkg(dir);
  }
console.error(`packages ${pkgs.size}, files ${files.length}`);

const fidOf = (abs, pkgDir) => {
  const p = pkgs.get(pkgDir);
  return `${p.name}@${p.version}/${rel(path.relative(pkgDir, abs))}`;
};
const fileSet = new Set(files.map((f) => f.abs));

// ---------- tiny resolver (node semantics, enough for dist trees) ----------
function tryFile(p) {
  for (const c of [p, p + '.js', p + '.cjs', p + '.mjs', p + '.json', path.join(p, 'index.js'), path.join(p, 'index.cjs'), path.join(p, 'index.mjs'), path.join(p, 'index.json')]) {
    if (fileSet.has(c)) return c;
  }
  // directory with its own package.json main
  const j = readPkg(p);
  if (j?.main) return tryFile(path.join(p, j.main));
  return null;
}
function pickExport(entry, conds) {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) {
    for (const e of entry) {
      const r = pickExport(e, conds);
      if (r) return r;
    }
    return null;
  }
  if (entry && typeof entry === 'object') {
    for (const [k, v] of Object.entries(entry)) if (conds.includes(k)) {
      const r = pickExport(v, conds);
      if (r) return r;
    }
  }
  return null;
}
function findPkgDir(fromDir, name) {
  let d = fromDir;
  for (;;) {
    const c = path.join(d, 'node_modules', name);
    if (pkgs.has(c)) return c;
    const up = path.dirname(d);
    if (up === d || !up.startsWith(path.dirname(ROOT))) return null;
    d = up;
  }
}
function resolveSpec(spec, fromAbs, kind) {
  if (isBuiltin(spec)) return null;
  const conds = kind === 'import' ? ['bun', 'node', 'import', 'module', 'default'] : ['bun', 'node', 'require', 'default'];
  if (spec.startsWith('.') || spec.startsWith('/')) return tryFile(path.resolve(path.dirname(fromAbs), spec));
  const m = spec.match(/^((?:@[^/]+\/)?[^/]+)(\/.*)?$/);
  if (!m) return null;
  const dir = findPkgDir(path.dirname(fromAbs), m[1]);
  if (!dir) return null;
  const j = pkgs.get(dir).json;
  const sub = m[2] ? '.' + m[2] : '.';
  if (j.exports) {
    let ex = j.exports;
    if (typeof ex === 'string' || Array.isArray(ex) || !Object.keys(ex).some((k) => k.startsWith('.'))) ex = { '.': ex };
    let target = ex[sub];
    if (!target) {
      for (const [k, v] of Object.entries(ex)) {
        if (k.includes('*')) {
          const [a, b] = k.split('*');
          if (sub.startsWith(a) && sub.endsWith(b)) {
            const star = sub.slice(a.length, sub.length - b.length);
            const t = pickExport(v, conds);
            if (t) return tryFile(path.join(dir, t.replace('*', star)));
          }
        }
      }
    }
    const t = target && pickExport(target, conds);
    if (t) return tryFile(path.join(dir, t));
  }
  if (sub !== '.') return tryFile(path.join(dir, sub));
  const main = (kind === 'import' && typeof j.module === 'string' && j.module) || j.main || 'index.js';
  return tryFile(path.join(dir, main));
}

// ---------- scan ----------
const fileOut = jsonlWriter(path.join(out, 'npm-files.jsonl'));
const declOut = jsonlWriter(path.join(out, 'npm-decls.jsonl'));
const fileRows = { push: (r) => fileOut.write(r) };
const declRows = { push: (r) => declOut.write(r) };
let parseFail = 0;
let n = 0;
for (const f of files) {
  if (++n % 2000 === 0) console.error(`${n}/${files.length}`);
  const fid = fidOf(f.abs, f.pkgDir);
  const p = pkgs.get(f.pkgDir);
  const relPath = rel(path.relative(f.pkgDir, f.abs));
  let src;
  try {
    src = fs.readFileSync(f.abs, 'utf8');
  } catch {
    continue;
  }
  const base = { fid, pkg: p.name, version: p.version, path: relPath, bytes: src.length };
  if (f.json) {
    if (src.length > 3_000_000) continue;
    try {
      const v = JSON.parse(src);
      fileRows.push({ ...base, fmt: 'json', tokens: [...collectJson(v)], requires: [], imports: [] });
    } catch {}
    continue;
  }
  if (src.length > 12_000_000) continue;
  const ast = parseJs(src);
  if (!ast) {
    parseFail++;
    fileRows.push({ ...base, fmt: 'unparsed', tokens: [], requires: [], imports: [] });
    continue;
  }
  const body = ast.program.body;
  const isEsm = body.some((s) => /^(Import|Export)/.test(s.type));
  const all = collect(ast.program);
  const requires = all.requires
    .filter((s) => !isBuiltin(s))
    .map((s) => {
      const r = resolveSpec(s, f.abs, 'require');
      return r ? fidOf(r, pkgOfAbs(r)) : '?' + s;
    });
  const imports = [];
  const importLocal = new Map(); // local -> resolved fid|imported
  for (const s of body) {
    if (s.type === 'ImportDeclaration' || ((s.type === 'ExportNamedDeclaration' || s.type === 'ExportAllDeclaration') && s.source)) {
      const spec = s.source.value;
      if (isBuiltin(spec)) continue;
      const r = resolveSpec(spec, f.abs, 'import');
      const target = r ? fidOf(r, pkgOfAbs(r)) : '?' + spec;
      imports.push(target);
      if (s.type === 'ImportDeclaration') for (const sp of s.specifiers) importLocal.set(sp.local.name, target + '|' + (sp.type === 'ImportSpecifier' ? (sp.imported.name ?? sp.imported.value) : sp.type === 'ImportDefaultSpecifier' ? 'default' : '*'));
    }
  }
  const row = { ...base, fmt: isEsm ? 'esm' : 'cjs', tokens: [...all.tokens], requires, imports: [...new Set(imports)] };
  // Top-level units for every JS file: ESM files are hoisted by Bun, and so
  // are CommonJS files that Bun converts to ESM (react, scheduler, ...).
  {
    const decls = [];
    body.forEach((node, idx) => {
      if (node.type === 'ImportDeclaration') return;
      if ((node.type === 'ExportNamedDeclaration' && !node.declaration) || node.type === 'ExportAllDeclaration') return;
      const target = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
      if (!target || target.type === 'EmptyStatement') return;
      if (target.type === 'ExpressionStatement' && target.expression.type === 'StringLiteral') return; // directive
      // one unit per declarator, as on the 2.1.316 side
      const parts = target.type === 'VariableDeclaration' ? target.declarations : [target];
      parts.forEach((pt, u) => {
        const c = collect(pt);
        const names = target.type === 'VariableDeclaration' ? declaredNames({ type: 'VariableDeclaration', declarations: [pt] }) : declaredNames(target);
        const shape = target.type === 'VariableDeclaration' ? shapeOf({ type: 'VariableDeclaration', declarations: [pt] }) : shapeOf(target);
        decls.push({ did: fid + '#' + idx + (parts.length > 1 ? '.' + u : ''), fid, idx, u, names, kind: target.type === 'VariableDeclaration' ? target.kind : target.type, shape, bytes: pt.end - pt.start, tokens: [...c.tokens], refSet: c.refs, exported: node.type.startsWith('Export') ? names.slice() : [] });
      });
    });
    for (const node of body) if (node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source) for (const sp of node.specifiers) {
      const d = decls.find((x) => x.names.includes(sp.local.name));
      if (d) d.exported.push(sp.exported.name ?? sp.exported.value);
    }
    const top = new Map();
    for (const d of decls) for (const nm of d.names) top.set(nm, d.did);
    for (const d of decls) {
      const own = new Set(d.names);
      const deps = [];
      for (const r of d.refSet) {
        if (own.has(r)) continue;
        if (top.has(r)) deps.push(top.get(r));
        else if (importLocal.has(r)) deps.push(importLocal.get(r));
      }
      delete d.refSet;
      d.deps = deps;
      declRows.push(d);
    }
    row.declCount = decls.length;
  }
  fileRows.push(row);
}
function pkgOfAbs(abs) {
  let d = path.dirname(abs);
  for (;;) {
    if (pkgs.has(d)) return d;
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const nFiles = fileOut.close();
const nDecls = declOut.close();
const pk = {};
for (const [dir, p] of pkgs) pk[rel(path.relative(ROOT, dir))] = { name: p.name, version: p.version, deps: Object.keys({ ...p.json.dependencies, ...p.json.optionalDependencies, ...p.json.peerDependencies }) };
fs.writeFileSync(path.join(out, 'packages.json'), JSON.stringify(pk, null, 1));
console.log(JSON.stringify({ packages: pkgs.size, files: nFiles, decls: nDecls, parseFail }));
