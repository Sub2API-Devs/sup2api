// The units a version's patch depends on, as equiv.cjs seeds: every native
// binding the profile names (natives, coreScope, coreImports, locate) and
// every function the version's anchors edit (patches/<version>.cjs, read by
// AST: edit(<file or core>, '<name>')). Run against the version being left.
//   node seeds.cjs <cli-mods dir> <version> > seeds.json
const fs = require('fs'), path = require('path');
const parser = require('@babel/parser');
const [dir, version] = process.argv.slice(2);
if (!dir || !version) throw Error('Usage: node seeds.cjs cli-mods-dir version');
const profile = JSON.parse(fs.readFileSync(path.join(dir, 'profiles', `linux-x64-${version}.json`), 'utf8'));
const seeds = new Map();
const add = (file, name, why) => { const key = file + ':' + name; if (!seeds.has(key)) seeds.set(key, { file, name, why: [] }); seeds.get(key).why.push(why); };
const split = spec => [spec.slice(0, spec.lastIndexOf(':')), spec.slice(spec.lastIndexOf(':') + 1)];
for (const [group, bindings] of Object.entries(profile.natives)) for (const [logical, spec] of Object.entries(bindings)) {
  const [file, name] = split(spec);
  if (!name.startsWith('ccgateway')) add(file, name, `natives.${group}.${logical}`);
}
for (const [logical, name] of Object.entries(profile.coreScope)) add(profile.core, name, `coreScope.${logical}`);
for (const [logical, spec] of Object.entries(profile.coreImports)) add(...split(spec), `coreImports.${logical}`);
for (const key of ['systemRecord', 'appendJoin']) add(...split(profile.locate[key]), `locate.${key}`);
const anchors = fs.readFileSync(path.join(dir, 'patches', `${version}.cjs`), 'utf8');
(function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'CallExpression' && n.callee?.name === 'edit') {
    const [file, name] = n.arguments;
    const fileName = file?.type === 'StringLiteral' ? file.value : file?.type === 'Identifier' && file.name === 'core' ? profile.core : null;
    if (fileName && name?.type === 'StringLiteral') add(fileName, name.value, 'anchor');
  }
  for (const [k, v] of Object.entries(n)) { if (['loc', 'extra', 'comments'].includes(k)) continue; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v); }
})(parser.parse(anchors, { sourceType: 'script' }));
process.stdout.write(JSON.stringify([...seeds.values()], null, 1) + '\n');
