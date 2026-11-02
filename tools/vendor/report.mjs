// Turns the unit labels into the vendor deliverables.
//
//   node --max-old-space-size=12000 tools/vendor/report.mjs [analysis]
//
// Inputs:  analysis/vendor/index/{unit-labels.jsonl,orig-decls.jsonl,versions.json}
//          (tools/vendor/match.mjs, scan-original.mjs),
//          analysis/match/decl-map.jsonl (lead's first-party matcher, read only).
// Outputs: analysis/vendor/decl-vendor.jsonl   one row per declaration that is
//            third-party or bundler runtime:
//            {id, file, names, pkg, version, pkgFile, method, score, bytes,
//             parts?: [{u, names, pkg, version, pkgFile, method, score, bytes}]}
//            (`parts` only when the declarators of one statement differ)
//          analysis/vendor/packages.json      package summary + coverage totals
//          analysis/vendor/firstparty-conflicts.jsonl  decl-map rows with a
//            reference file whose declaration is third-party here
//
// Special pkg values:
//   bun-runtime          Bun's bundler helpers (chunk-rshven70.js), version = Bun
//   private-unresolved   CommonJS modules not on npm: @ant/* packages (name in
//                        `privateName` when the code names it), native .node addons
//   unresolved-cjs       CommonJS wrapper (so it came from node_modules) that no
//                        installed package matches
// Pre-bundled npm dist files carry their own bundler runtime; those helpers get
// the package of the surrounding code and method "embedded-runtime".
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl, eachJsonl, jsonlWriter } from './lib/common.mjs';

const [A = 'analysis'] = process.argv.slice(2);
const V = path.join(A, 'vendor');
const IDX = path.join(V, 'index');
const BUN_VERSION = '1.4.4';

const labels = readJsonl(path.join(IDX, 'unit-labels.jsonl'));
const versions = JSON.parse(fs.readFileSync(path.join(IDX, 'versions.json'), 'utf8'));
const decls = new Map();
eachJsonl(path.join(IDX, 'orig-decls.jsonl'), (d) => {
  for (const u of d.units) delete u.deps;
  decls.set(d.id, d);
});
const unitTok = (id) => {
  const [did, u] = id.split('~');
  return decls.get(did).units[+u];
};

// ---------- per-unit attribution ----------
const byChunk = new Map();
for (const r of labels) {
  r.declId = r.id.split('~')[0];
  r.file = r.id.split('#')[0];
  (byChunk.get(r.file) ?? byChunk.set(r.file, []).get(r.file)).push(r);
}
const attr = new Map(); // unit id -> {pkg, version, pkgFile, method, score}
for (const [file, rs] of byChunk) {
  // pass 1: direct labels
  rs.forEach((r) => {
    const l = r.label;
    if (!l) return;
    if (l.kind === 'bun-runtime') attr.set(r.id, { pkg: 'bun-runtime', version: BUN_VERSION, pkgFile: null, method: 'helper:' + (l.role ?? ''), score: 1 });
    else if (l.pkg) attr.set(r.id, { pkg: l.pkg, version: l.version, pkgFile: l.path, method: l.method, score: l.score, versionCandidates: l.versionCandidates });
  });
  // pass 2: embedded bundler runtime of a pre-bundled dist file -> package of
  // the nearest labelled neighbour; the other declarators of the statement
  // that holds those helpers (Object aliases) go with them
  const embeddedDecls = new Set(rs.filter((r) => r.label?.kind === 'embedded-runtime').map((r) => r.declId));
  rs.forEach((r, i) => {
    if (attr.has(r.id) || !(r.label?.kind === 'embedded-runtime' || (embeddedDecls.has(r.declId) && !r.label))) return;
    let near = null;
    for (let d = 1; d < 50 && !near; d++) near = attr.get(rs[i + d]?.id)?.pkg ? attr.get(rs[i + d].id) : attr.get(rs[i - d]?.id)?.pkg ? attr.get(rs[i - d].id) : null;
    attr.set(r.id, { pkg: near?.pkg ?? 'unresolved-cjs', version: near?.version ?? null, pkgFile: '(bundler runtime of a pre-bundled dist file)', method: 'embedded-runtime', score: 1 });
  });
  // pass 3: CommonJS wrappers with no match
  const chains = []; // runs of consecutive unmatched code wrappers
  let cur = [];
  rs.forEach((r) => {
    if (r.wrap !== 'cjs') return;
    if (attr.has(r.id) || r.body === 'json') {
      if (cur.length) chains.push(cur);
      cur = [];
      return;
    }
    if (r.body === 'resource') {
      attr.set(r.id, { pkg: 'bun-resource', version: null, pkgFile: null, method: 'resource-wrapper', score: 1 });
      return;
    }
    if (r.body === 'native') {
      const t = unitTok(r.id).tokens.find((x) => x.startsWith('s:'))?.slice(2);
      attr.set(r.id, { pkg: 'private-unresolved', privateName: 'native addon ' + (t ?? '?'), version: null, pkgFile: t ?? null, method: 'native-addon', score: 1 });
      return;
    }
    cur.push(r);
  });
  if (cur.length) chains.push(cur);
  const cjsRs = rs.filter((r) => r.wrap === 'cjs');
  for (const ch of chains) {
    let priv = null;
    for (const r of ch) for (const t of unitTok(r.id).tokens) if (t.startsWith('s:')) priv ??= t.match(/@ant\/[a-z0-9-]+/)?.[0] ?? null;
    // Anthropic-specific strings without a package name: still a private package
    if (!priv && ch.some((r) => unitTok(r.id).tokens.some((t) => /^s:.*\b(anthropic|claude)/i.test(t)))) priv = '@ant/(unnamed)';
    // a short chain between wrappers of one package: that package, file unknown
    const i0 = cjsRs.indexOf(ch[0]);
    const before = attr.get(cjsRs[i0 - 1]?.id);
    const after = attr.get(cjsRs[i0 + ch.length]?.id);
    if (!priv && before?.pkg && before.pkg === after?.pkg && !/unresolved|private/.test(before.pkg) && ch.length <= 3) {
      for (const r of ch) attr.set(r.id, { pkg: before.pkg, version: before.version, pkgFile: null, method: 'cjs-layout', score: 0 });
      continue;
    }
    for (const r of ch)
      attr.set(r.id, priv ? { pkg: 'private-unresolved', privateName: priv, version: null, pkgFile: null, method: 'cjs-unmatched+string-clue', score: 0 } : { pkg: 'unresolved-cjs', version: null, pkgFile: null, method: 'cjs-unmatched', score: 0, bestCandidate: r.cand ? `${r.cand.pkg}/${r.cand.path} ${r.cand.score}` : undefined });
  }
}

// ---------- declarations ----------
const out = jsonlWriter(path.join(V, 'decl-vendor.jsonl'));
const declRows = new Map();
const byDecl = new Map();
for (const r of labels) (byDecl.get(r.declId) ?? byDecl.set(r.declId, []).get(r.declId)).push(r);
for (const [declId, rs] of byDecl) {
  const parts = rs.map((r) => ({ u: +r.id.split('~')[1], names: r.names, bytes: r.bytes, ...(attr.get(r.id) ?? { pkg: null }) }));
  const hit = parts.filter((p) => p.pkg);
  if (!hit.length) continue;
  const d = decls.get(declId);
  // the statement's attribution = the attribution covering most bytes
  const w = new Map();
  for (const p of hit) {
    const k = `${p.pkg}|${p.pkgFile}`;
    w.set(k, (w.get(k) ?? 0) + p.bytes);
  }
  const mainKey = [...w].sort((a, b) => b[1] - a[1])[0][0];
  const main = hit.find((p) => `${p.pkg}|${p.pkgFile}` === mainKey);
  const uniform = parts.every((p) => `${p.pkg}|${p.pkgFile}` === mainKey);
  const row = { id: declId, file: d.file, names: d.names, pkg: main.pkg, version: main.version ?? null, pkgFile: main.pkgFile, method: main.method, score: main.score, bytes: d.bytes };
  if (main.privateName) row.privateName = main.privateName;
  if (main.versionCandidates) row.versionCandidates = main.versionCandidates;
  if (!uniform) row.parts = parts.map(({ u, names, bytes, pkg, version, pkgFile, method, score }) => ({ u, names, bytes, pkg, version: version ?? null, pkgFile: pkgFile ?? null, method: method ?? null, score: score ?? null }));
  out.write(row);
  declRows.set(declId, row);
}
const nRows = out.close();

// ---------- packages ----------
const totalBytes = labels.reduce((a, r) => a + r.bytes, 0);
const pk = {};
const semverIn = new Map(); // pkg -> Set of semver strings in its units
for (const r of labels) {
  const a = attr.get(r.id);
  if (!a) continue;
  const name = a.pkg === 'private-unresolved' ? a.privateName ?? 'private-unresolved' : a.pkg;
  const P = (pk[name] ??= { kind: a.pkg === 'bun-runtime' ? 'runtime' : a.pkg === 'private-unresolved' ? 'private' : a.pkg === 'unresolved-cjs' ? 'unresolved' : a.pkg === 'bun-resource' ? 'resource' : 'npm', bytes: 0, units: 0, decls: new Set(), chunks: {}, files: {}, methods: {} });
  P.bytes += r.bytes;
  P.units++;
  P.decls.add(r.declId);
  P.chunks[r.file] = (P.chunks[r.file] ?? 0) + r.bytes;
  if (a.pkgFile) P.files[a.pkgFile] = (P.files[a.pkgFile] ?? 0) + r.bytes;
  P.methods[a.method] = (P.methods[a.method] ?? 0) + 1;
  for (const t of unitTok(r.id).tokens) if (/^s:v?\d+\.\d+\.\d+(-[\w.]+)?$/.test(t)) (semverIn.get(name) ?? semverIn.set(name, new Set()).get(name)).add(t.slice(2).replace(/^v/, ''));
}
const packages = {};
for (const [name, P] of Object.entries(pk).sort((a, b) => b[1].bytes - a[1].bytes)) {
  const vInfo = versions[name];
  const copies = vInfo?.chosen.map((c) => ({ versions: c.versions, units: c.units, weight: c.weight, informativeWeight: c.informativeW })) ?? [];
  const main = copies[0]?.versions ?? [];
  const strings = [...(semverIn.get(name) ?? [])];
  const confirmed = strings.filter((s) => main.includes(s));
  let version = name === 'bun-runtime' ? BUN_VERSION : main.length === 1 ? main[0] : main.length ? `${main[0]}..${main.at(-1)}` : null;
  let versionBasis = name === 'bun-runtime' ? 'ELF header' : !main.length ? 'none' : confirmed.length ? 'string+fingerprint' : main.length === 1 ? 'fingerprint' : 'fingerprint-range';
  if (confirmed.length === 1 && main.length > 1) {
    version = confirmed[0];
    versionBasis = 'string';
  }
  packages[name] = {
    kind: P.kind,
    version,
    versionBasis,
    versionCandidates: main.length > 1 ? main : undefined,
    otherCopies: copies.length > 1 ? copies.slice(1) : undefined,
    versionStringsInCode: strings.length ? strings : undefined,
    versionRanking: vInfo?.ranking,
    bytes: P.bytes,
    units: P.units,
    decls: P.decls.size,
    chunks: Object.entries(P.chunks).sort((a, b) => b[1] - a[1]).map(([file, bytes]) => ({ file, bytes })),
    files: Object.entries(P.files).sort((a, b) => b[1] - a[1]).map(([file, bytes]) => ({ file, bytes })),
    methods: P.methods,
  };
}
const sum = (kind) => Object.values(packages).filter((p) => p.kind === kind).reduce((a, p) => a + p.bytes, 0);
const totals = {
  bytesAllDecls: totalBytes,
  npm: sum('npm'),
  runtime: sum('runtime'),
  private: sum('private'),
  unresolvedCjs: sum('unresolved'),
  resource: sum('resource'),
  declRows: nRows,
  npmPackages: Object.values(packages).filter((p) => p.kind === 'npm').length,
};
totals.thirdPartyShare = +((totals.npm + totals.private + totals.unresolvedCjs) / totalBytes).toFixed(4);
const externals = {
  ws: 'kept as an import: Bun ships ws natively',
  undici: 'kept as import.meta.require("undici"): Bun built-in',
  'node-fetch': 'dynamic import() left external',
};
fs.writeFileSync(path.join(V, 'packages.json'), JSON.stringify({ generatedBy: 'tools/vendor/report.mjs', bun: BUN_VERSION, totals, externals, packages }, null, 1));

// ---------- conflicts with the first-party matcher ----------
const conf = jsonlWriter(path.join(V, 'firstparty-conflicts.jsonl'));
eachJsonl(path.join(A, 'match/decl-map.jsonl'), (m) => {
  if (!m.refFile) return;
  const v = declRows.get(m.id);
  if (!v) return;
  const vBytes = v.parts ? v.parts.filter((p) => p.pkg).reduce((a, p) => a + p.bytes, 0) : v.bytes;
  conf.write({ id: m.id, file: m.file, names: m.names, bytes: m.bytes, refFile: m.refFile, ref: m.ref, fpMethod: m.method, fpScore: m.score, fileMethod: m.fileMethod, vendorPkg: v.pkg, vendorVersion: v.version, vendorFile: v.pkgFile, vendorMethod: v.method, vendorScore: v.score, vendorShare: +(vBytes / v.bytes).toFixed(3) });
});
const nConf = conf.close();
console.log(JSON.stringify({ ...totals, conflicts: nConf }, null, 1));
