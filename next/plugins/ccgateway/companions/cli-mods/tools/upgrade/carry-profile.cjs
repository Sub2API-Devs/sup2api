// Carries a profile's native names to the next version through the pairing
// (equiv.json): natives (file:name of an exported binding), coreScope (names
// in the core module's own scope, declared or imported) and coreImports.
// For a core-scope name, the new core's local name bound to the paired unit is
// looked up among its declarations and imports; a unit the new core does not
// bind is reported (the patch would need an import).
//   node carry-profile.cjs <equiv.json> <old-index.json> <new-index.json> <old-profile.json> <new-core-file>
const fs = require('fs'), path = require('path');
const [EQ, OI, NI, PROFILE, NEWCORE] = process.argv.slice(2);
const eq = JSON.parse(fs.readFileSync(EQ, 'utf8'));
const load = f => { const c = JSON.parse(fs.readFileSync(f, 'utf8')); return { units: new Map(c.units), modules: new Map(c.modules.map(([f, m]) => [f, { imports: new Map(m.imports), exports: new Map(m.exports), stars: m.stars }])) }; };
const O = load(OI), N = load(NI);
function resolver(tree) {
  const exported = (file, name, seen = new Set()) => {
    const key = file + '|' + name; if (seen.has(key)) return null; seen.add(key);
    const m = tree.modules.get(file); if (!m) return 'ext:' + file + ':' + name;
    const e = m.exports.get(name);
    if (e?.local) return local(file, e.local, seen);
    if (e?.from) return exported(e.from, e.imported, seen);
    for (const s of m.stars) { const r = exported(s, name, seen); if (r) return r; }
    return null;
  };
  const local = (file, name, seen = new Set()) => {
    const im = tree.modules.get(file)?.imports.get(name);
    return im ? exported(im.from, im.imported, seen) : file + ':' + name;
  };
  return { local, exported };
}
const ro = resolver(O), rn = resolver(N);
const profile = JSON.parse(fs.readFileSync(PROFILE, 'utf8'));
const oldCore = profile.core;
// exportOf finds an export of the new tree resolving to a unit (file:exported).
const exportIndex = new Map();
for (const [file, m] of N.modules) for (const [name] of m.exports) { const r = rn.exported(file, name); if (r && !exportIndex.has(r)) exportIndex.set(r, []); if (r) exportIndex.get(r).push(file + ':' + name); }
const status = new Map();
for (const s of eq.report) { status.set(s.resolved, s.status); for (const c of s.closure.changed) status.set(c.key, 'changed'); }
const carry = oldKey => { const n = eq.map[oldKey]; return { old: oldKey, new: n ?? null, status: n ? (status.get(oldKey) ?? 'paired') : 'UNPAIRED' }; };
const out = { natives: {}, coreScope: {}, coreImports: {}, locate: {}, problems: [] };
// natives: old file:name is an export; carry its unit and pick an export of
// the new unit (prefer the same exported name, then the defining module).
for (const [group, bindings] of Object.entries(profile.natives)) {
  out.natives[group] = {};
  for (const [logical, spec] of Object.entries(bindings)) {
    const [file, name] = [spec.slice(0, spec.lastIndexOf(':')), spec.slice(spec.lastIndexOf(':') + 1)];
    if (file === oldCore && name.startsWith('ccgateway')) { out.natives[group][logical] = NEWCORE + ':' + name; continue; }
    const unit = ro.exported(file, name), c = carry(unit);
    const exports = c.new ? exportIndex.get(c.new) ?? [] : [];
    const pick = exports.find(e => e.endsWith(':' + name)) ?? exports.find(e => e.startsWith(c.new.slice(0, c.new.lastIndexOf(':')) + ':')) ?? exports[0] ?? null;
    out.natives[group][logical] = pick;
    if (!pick) out.problems.push({ native: logical, ...c, exports });
    else if (c.status === 'changed' || c.status === 'UNPAIRED') out.problems.push({ native: logical, ...c, pick });
  }
}
// coreScope: an old core local name → its unit → paired unit → the new core's
// local name bound to it.
const newCoreLocals = new Map();
for (const [key] of N.units) if (key.startsWith(NEWCORE + ':')) newCoreLocals.set(key, key.slice(NEWCORE.length + 1));
for (const [local] of N.modules.get(NEWCORE).imports) { const r = rn.local(NEWCORE, local); if (r && !newCoreLocals.has(r)) newCoreLocals.set(r, local); }
for (const [logical, name] of Object.entries(profile.coreScope)) {
  const unit = ro.local(oldCore, name), c = carry(unit);
  const local = c.new ? newCoreLocals.get(c.new) : undefined;
  out.coreScope[logical] = local ?? null;
  if (!local) out.problems.push({ coreScope: logical, oldName: name, ...c, exports: c.new ? exportIndex.get(c.new) : undefined });
  else if (c.status === 'changed') out.problems.push({ coreScope: logical, oldName: name, ...c, local });
}
for (const [logical, spec] of Object.entries(profile.coreImports)) {
  const [file, name] = [spec.slice(0, spec.lastIndexOf(':')), spec.slice(spec.lastIndexOf(':') + 1)];
  const c = carry(ro.exported(file, name)), exports = c.new ? exportIndex.get(c.new) ?? [] : [];
  out.coreImports[logical] = exports.find(e => !e.startsWith(NEWCORE + ':')) ?? exports[0] ?? null;
  out.coreImports[logical + '#local'] = c.new ? newCoreLocals.get(c.new) ?? null : null;
  if (!exports.length) out.problems.push({ coreImport: logical, ...c });
}
for (const key of ['systemRecord', 'appendJoin']) {
  const spec = profile.locate[key], [file, name] = [spec.slice(0, spec.lastIndexOf(':')), spec.slice(spec.lastIndexOf(':') + 1)];
  const c = carry(ro.local(file, name));
  out.locate[key] = c.new; if (c.status !== 'same' && c.status !== 'paired') out.problems.push({ locate: key, ...c });
}
console.log(JSON.stringify(out, null, 1));
