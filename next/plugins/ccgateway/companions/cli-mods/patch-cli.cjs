// Patches a recovered Claude Code source tree into the CCGateway CLI.
//
//   node patch-cli.cjs restored-source new-output-directory
//
// Only an audited, hash-bound version is accepted: the restored tree's version
// names its profile (profiles/linux-x64-<version>.json: module hashes, the
// native bindings the support modules and the environment code use, and where
// the AST lookups find the request builder, the system record factory, the
// append join and the beta Messages endpoint) and its anchors
// (patches/<version>.cjs: the edits inside native functions). Everything else
// here is the same for every version: the support modules import native
// bindings by their logical names from the generated native modules, and the
// environment code (native-environment.inc.js) names core bindings as
// native_<name>, renamed here from the profile.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const parser = (process.env.CCG_BABEL_PACKAGE ? createRequire(path.resolve(process.env.CCG_BABEL_PACKAGE)) : require)('@babel/parser');
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw Error('Usage: node patch-cli.cjs restored-source new-output-directory');
const source = path.resolve(sourceArg), output = path.resolve(outputArg);
if (source === output || output.startsWith(source + path.sep) || fs.existsSync(output)) throw Error('Output must be a new separate directory');
const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw Error('Unreadable Claude Code baseline version');
const profileFile = path.join(__dirname, 'profiles', `linux-x64-${version}.json`), anchorFile = path.join(__dirname, 'patches', `${version}.cjs`);
if (!fs.existsSync(profileFile) || !fs.existsSync(anchorFile)) throw Error(`Unsupported Claude Code baseline: ${version}`);
const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8')), expected = profile.modules;
if (profile.version !== version) throw Error(`Profile ${profileFile} is not ${version}`);
// The patched CLI is compiled by the Bun the official ELF embeds (its TLS
// stack is what upstream sees): the restored tree records that version
// (tools/upgrade/restore-bun.cjs) and the profile's bunVersion must be it.
// build.sh and package-release.cjs check the compiler against the same value.
const reconstruction = JSON.parse(fs.readFileSync(path.join(source, 'reconstruction.json'), 'utf8'));
if (reconstruction.binarySha256 !== profile.binarySHA256) throw Error(`The restored tree is not the official ELF ${profile.binarySHA256}`);
if (!reconstruction.bunVersion) throw Error('The restored tree records no embedded Bun version: restore it again with tools/upgrade/restore-bun.cjs');
if (profile.bunVersion !== reconstruction.bunVersion) throw Error(`Profile bunVersion ${profile.bunVersion} is not the Bun ${reconstruction.bunVersion} the official ${version} ELF embeds: set bunVersion to ${reconstruction.bunVersion} and compile with oven/bun:${reconstruction.bunVersion}`);
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const files = new Map();
for (const [file, sha] of Object.entries(expected)) {
  const text = fs.readFileSync(path.join(source, file), 'utf8');
  if (digest(text) !== sha) throw Error(`Unsupported or modified baseline: ${file}`);
  files.set(file, text);
}
const baseline = new Map(files);
const modified = new Set();
const core = profile.core;
if (!expected[core]) throw Error('The profile core module is not hash-bound');

// A module is parsed once per text: an edit replaces the text, and the next
// lookup parses the new one.
const parsed = new Map();
const parse = text => parser.parse(text, { sourceType: 'module' });
function tree(file) {
  const text = files.get(file), hit = parsed.get(file);
  if (hit?.text !== text) parsed.set(file, { text, ast: parse(text) });
  return parsed.get(file).ast;
}
function nodes(ast, predicate) {
  const found = [];
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (predicate(n)) found.push(n);
    for (const [k, v] of Object.entries(n)) {
      if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(k)) continue;
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  }
  walk(ast); return found;
}
// moduleBindings is a module's own scope: the local names its imports declare
// and the names its top-level declarations bind. A name read inside a function
// is only a native constant if it is one of these.
function moduleBindings(ast) {
  const names = new Set(), pattern = node => {
    if (node?.type === 'Identifier') names.add(node.name);
    else if (node?.type === 'ObjectPattern') node.properties.forEach(property => pattern(property.value ?? property.argument));
    else if (node?.type === 'ArrayPattern') node.elements.forEach(pattern);
    else if (node?.type === 'RestElement') pattern(node.argument);
    else if (node?.type === 'AssignmentPattern') pattern(node.left);
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') node.specifiers.forEach(specifier => names.add(specifier.local.name));
    const declaration = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
    if (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') { if (declaration.id) names.add(declaration.id.name); }
    else if (declaration?.type === 'VariableDeclaration') declaration.declarations.forEach(item => pattern(item.id));
  }
  return names;
}
function once(text, from, to) {
  if (text.split(from).length !== 2) throw Error(`Expected unique ${version} anchor: ${from}`);
  // A replacement is inserted as written: replace() would read `$`` and the
  // like in it as patterns, and minified names hold `$` (2.1.310's m$).
  return text.replace(from, typeof to === 'function' ? to : () => to);
}
function edit(file, name, transform, method = false) {
  if (!expected[file]) throw Error(`${file} is not hash-bound by the profile`);
  const text = files.get(file), matches = nodes(tree(file), n => method ? n.type === 'ClassMethod' && n.key?.name === name : ['FunctionDeclaration', 'VariableDeclarator'].includes(n.type) && n.id?.name === name);
  if (matches.length !== 1) throw Error(`Expected one ${file}:${name}, found ${matches.length}`);
  const n = matches[0], before = text.slice(n.start, n.end), after = transform(before);
  if (before === after) throw Error(`Unchanged patch ${name}`);
  files.set(file, text.slice(0, n.start) + after + text.slice(n.end)); modified.add(file);
}
// Imports go in front of a module and code after it, once each, after its
// edits (surround); a module given only an import is still a patched module.
const surroundings = new Map();
function surround(file, { imports = '', code = '' }) {
  const { head, tail } = surroundings.get(file) ?? { head: '', tail: '' };
  surroundings.set(file, { head: head + imports, tail: tail + code });
}
// binding is file:name, a module-scope binding of a hash-bound module.
function binding(spec) {
  const at = spec.lastIndexOf(':'), file = spec.slice(0, at), name = spec.slice(at + 1);
  if (at < 1 || !expected[file]) throw Error(`${spec} is not in a hash-bound module`);
  return { file, name };
}
// coreBindings is how each name the core module uses is bound: its imports
// (with the module and exported name they come from) and its own top-level
// declarations (`local`).
function coreBindings() {
  const bindings = new Map(), declared = moduleBindings(tree(core));
  for (const node of tree(core).program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    for (const specifier of node.specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue;
      bindings.set(specifier.local.name, { from: node.source.value, imported: specifier.imported.name ?? specifier.imported.value });
    }
  }
  for (const name of declared) if (!bindings.has(name)) bindings.set(name, { local: true });
  return bindings;
}
// requestBuilderBetas is the list of betas the hash-bound request builder
// pushes onto its beta list, in its own order, by AST (the profile names the
// builder, a function inside the core's query, and its list). A push of
// anything but an identifier is not a beta constant of this module (the plugin
// build's per-request beta) and is skipped; every identifier taken must be a
// binding of the core module's scope.
function requestBuilderBetas() {
  const { requestBuilder, builderBetaList } = profile.locate;
  const builders = nodes(tree(core), n => n.type === 'VariableDeclarator' && n.id?.name === requestBuilder);
  if (builders.length !== 1) throw Error(`Expected the native request builder ${requestBuilder}`);
  const builder = builders[0].init;
  if (nodes(builder, n => n.type === 'VariableDeclarator' && n.id?.name === builderBetaList).length !== 1) throw Error(`Expected the request builder beta list ${builderBetaList}`);
  const pushes = nodes(builder, n => n.type === 'CallExpression' && n.callee?.type === 'MemberExpression'
    && n.callee.object?.type === 'Identifier' && n.callee.object.name === builderBetaList && n.callee.computed === false && n.callee.property?.name === 'push');
  const bindings = coreBindings(), betas = new Map();
  for (const push of pushes) for (const argument of push.arguments) {
    if (argument?.type !== 'Identifier') continue;
    const bound = bindings.get(argument.name);
    if (!bound) throw Error(`The request builder pushes ${argument.name}, which is not a binding of ${core}'s module scope`);
    if (!betas.has(argument.name)) betas.set(argument.name, bound);
  }
  if (!betas.size) throw Error('Expected the native request builder to add betas');
  return [...betas].map(([name, bound]) => ({ name, ...bound }));
}
// fillBetaModule writes the builder's betas into request-betas.js: the imports
// they come from (the modules that export them; checkImports verifies each
// name) and the list the order is built from.
function fillBetaModule(text, betas) {
  const bySource = new Map(), names = [];
  for (const beta of betas) {
    if (beta.local) throw Error(`The request builder beta ${beta.name} is declared in ${core} and cannot be imported beside it`);
    const specifier = beta.imported === beta.name ? beta.name : `${beta.imported} as ${beta.name}`;
    bySource.set(beta.from, [...(bySource.get(beta.from) ?? []), specifier]);
    names.push(beta.name);
  }
  const imports = [...bySource].map(([from, list]) => `import { ${list.join(',')} } from "${from}";`).join('\n');
  return once(once(text, '//CCGATEWAY_BETA_IMPORTS', imports), '/*CCGATEWAY_BETA_LIST*/', () => names.join(','));
}
// betaMessagesPath is the endpoint the native SDK's beta Messages create posts.
// It is located by its own path (the only POST to the beta Messages endpoint;
// batches and count_tokens are other paths), and the value model-request.js
// gets is this native literal, never a copy written here. Build goes through
// the native create; direct sends raw bytes through client.post, so it needs
// the endpoint.
function betaMessagesPath() {
  const file = profile.locate.betaMessagesModule;
  if (!expected[file]) throw Error(`${file} is not hash-bound by the profile`);
  const posts = nodes(tree(file), n => n.type === 'CallExpression' && n.callee?.type === 'MemberExpression'
    && n.callee.object?.type === 'MemberExpression' && n.callee.object.property?.name === '_client'
    && n.callee.property?.name === 'post' && n.arguments?.[0]?.type === 'StringLiteral'
    && /^\/v1\/messages\?beta=true$/.test(n.arguments[0].value));
  if (posts.length !== 1) throw Error(`Expected one POST to the beta Messages endpoint in ${file}`);
  const literal = posts[0].arguments[0];
  return files.get(file).slice(literal.start, literal.end);
}
// fillMessagesPath writes that endpoint into model-request.js (the marker there
// is never a path of ours).
function fillMessagesPath(text, literal) {
  return once(text, "/*CCGATEWAY_MESSAGES_PATH*/ ''", '/*CCGATEWAY_MESSAGES_PATH*/ ' + literal);
}
// appendJoin is the function the CLI joins two appended system prompts with
// (--append-system-prompt-file with --append-system-prompt), taken from its
// hash-bound module by AST and renamed; that module is read, never changed.
function appendJoin() {
  const { file, name } = binding(profile.locate.appendJoin);
  const text = files.get(file);
  const found = nodes(tree(file), n => n.type === 'FunctionDeclaration' && n.id?.name === name && text.slice(n.start, n.end).includes('\n\n'));
  if (found.length !== 1) throw Error('Expected the native append prompt join');
  return text.slice(found[0].start, found[0].end).replace(new RegExp(`^function ${name.replace(/\$/g, '\\$')}\\(`), 'function ccgatewayJoinAppend(');
}
// environmentCode is native-environment.inc.js for this version: every
// native_<name> it reads becomes the core binding the profile names
// (coreScope, a binding of the core's own scope) or an import the patch adds
// to the core (coreImports, as ccgateway_native_<name>). A name the profile
// does not map, or a mapped name the core does not bind, fails the patch.
function environmentCode() {
  const text = fs.readFileSync(path.join(__dirname, 'native-environment.inc.js'), 'utf8');
  const scope = moduleBindings(tree(core)), edits = [], seen = new Set();
  for (const id of nodes(parse(text), n => n.type === 'Identifier' && n.name.startsWith('native_'))) {
    const name = id.name.slice('native_'.length);
    let target;
    if (Object.hasOwn(profile.coreScope, name)) {
      target = profile.coreScope[name];
      if (!scope.has(target)) throw Error(`native_${name}: ${target} is not a binding of ${core}'s module scope`);
    } else if (Object.hasOwn(profile.coreImports, name)) target = 'ccgateway_native_' + name;
    else throw Error(`native_${name} is not mapped by the ${version} profile`);
    seen.add(name);
    edits.push([id.start, id.end, target]);
  }
  for (const name of [...Object.keys(profile.coreScope), ...Object.keys(profile.coreImports)]) if (!seen.has(name) && !profile.patchOnly?.includes(name)) throw Error(`The ${version} profile maps native_${name}, which the environment code does not use`);
  let out = text;
  for (const [start, end, target] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, start) + target + out.slice(end);
  const imports = Object.entries(profile.coreImports).map(([name, spec]) => {
    const { file, name: exported } = binding(spec);
    return `import {${exported} as ccgateway_native_${name}} from "./${file}";\n`;
  }).join('');
  return { imports, code: out };
}
// nativeModules are the support modules' native bindings, one generated module
// per group (profile.natives): `entry` is what the request entry needs before
// CC's fast-path policy has decided, `request` the rest, so a refused request
// loads nothing more than before. Each export is a native binding by its
// logical name; checkImports verifies every one.
function nativeModules() {
  const out = new Map();
  for (const [group, names] of Object.entries(profile.natives)) {
    const bySource = new Map();
    for (const [logical, spec] of Object.entries(names)) {
      const { file, name } = binding(spec);
      bySource.set(file, [...(bySource.get(file) ?? []), name === logical ? name : `${name} as ${logical}`]);
    }
    const text = '// Generated by patch-cli.cjs from the ' + version + ' profile: native bindings by logical name.\n'
      + [...bySource].map(([file, list]) => `export { ${list.join(', ')} } from './${file}';`).join('\n') + '\n';
    out.set(`ccgateway-native-${group}.js`, { source: `profiles/linux-x64-${version}.json natives.${group}`, text });
  }
  return out;
}

// What this patch adds is the profile's list: --ccgateway-info and the release
// manifest report it, and the Worker checks it.
const capabilities = profile.capabilities;
if (!Array.isArray(capabilities) || !capabilities.length || !capabilities.every(name => typeof name === 'string' && /^[a-z][a-z0-9_]*$/.test(name)) || new Set(capabilities).size !== capabilities.length) throw Error('Invalid profile capabilities');
// The patch tag is checked by the Worker and the controller with this same
// pattern (no dots: a version goes in as 2-1-310); a tag they would refuse
// must not reach a release.
if (!/^ccgateway-[a-z0-9-]+$/.test(profile.extension ?? '')) throw Error(`Invalid profile extension ${profile.extension}: the Worker and controller accept ^ccgateway-[a-z0-9-]+$`);
// The request command's entry (request-entry.inc.js) is a stub ahead of the CLI
// entry's own handling: the info line, and the command loaded from its support
// module (request-entry.js), so the patched entry carries no request wiring and
// an ordinary CLI start never loads it. The anchors place it and name the
// entry's argument list and settings source.
const entryTemplate = fs.readFileSync(path.join(__dirname, 'request-entry.inc.js'), 'utf8').trim();
if (entryTemplate.split('CCGATEWAY_INFO').length !== 2) throw Error('Expected one CCGATEWAY_INFO in the request entry');
const info = `{version:${JSON.stringify(profile.version)},patch:${JSON.stringify(profile.extension)},capabilities:${JSON.stringify(capabilities)}}`;
const entryStub = (args, settings) => entryTemplate.replace('CCGATEWAY_INFO', () => info)
  .replace(/\bCCGATEWAY_ARGS\b/g, () => args).replace(/\bCCGATEWAY_SETTINGS\b/g, () => settings);

const environment = environmentCode();
const anchors = require(anchorFile);
anchors({ files, edit, once, surround, nodes, tree, core, profile, entryStub });
// The order CC writes betas in is its model list (which puts the login's beta
// in its own place) then the ones its request builder adds for a request, in
// the builder's order; both are native lists, and the request command's beta
// module (request-betas.js) holds the order so nothing of it stays in core.
const builderBetas = requestBuilderBetas();
const { file: recordFile, name: recordName } = binding(profile.locate.systemRecord);
if (recordFile !== core || !moduleBindings(tree(core)).has(recordName)) throw Error(`Expected the native system record factory ${recordName} in ${core}`);
surround(core, { imports: environment.imports + 'import {isNative as ccgIsNative} from "./ccgateway-native-tools.js";\n',
  code: '\n' + environment.code + '\n' + appendJoin() + `\nexport {${recordName} as ccgatewaySystemRecord};\n` });
for (const [file, { head, tail }] of surroundings) { files.set(file, head + files.get(file) + tail); modified.add(file); }
for (const file of modified) tree(file);
// Support modules import each other by source name; installed, they carry the
// ccgateway- prefix. The list is the profile's (test/support.mjs reads it too),
// and the native modules are generated: native-<group>.js.
const supportInputs = profile.supportModules;
const support = new Map(), generated = nativeModules();
const installedName = name => `'./ccgateway-${name}.js'`;
for (const input of supportInputs) {
  let text = fs.readFileSync(path.join(__dirname, input + '.js'), 'utf8');
  for (const name of supportInputs) text = text.replaceAll(`'./${name}.js'`, installedName(name));
  for (const group of Object.keys(profile.natives)) text = text.replaceAll(`'./native-${group}.js'`, installedName('native-' + group));
  if (/from '\.\/chunk-|import\('\.\/chunk-/.test(text)) throw Error(`${input}.js imports a native module directly; use a native group`);
  support.set('ccgateway-' + input + '.js', { source: input + '.js', text });
}
for (const [name, entry] of generated) support.set(name, entry);
// request-betas.js is filled from the hash-bound builder before the imports it
// gains are checked like every other support module's (fillBetaModule).
const betaEntry = support.get('ccgateway-request-betas.js');
if (!betaEntry) throw Error('Expected the request beta support module');
betaEntry.text = fillBetaModule(betaEntry.text, builderBetas);
// model-request.js's direct endpoint is the native beta Messages post's own.
const modelEntry = support.get('ccgateway-model-request.js');
if (!modelEntry) throw Error('Expected the request transport support module');
modelEntry.text = fillMessagesPath(modelEntry.text, betaMessagesPath());
checkImports();
fs.cpSync(source, output, { recursive: true, errorOnExist: true });
const manifest = { baseline: 'linux-x64-glibc/' + version, extension: profile.extension, bunVersion: profile.bunVersion, capabilities, files: {}, supportFiles: {} };
for (const file of modified) {
  fs.writeFileSync(path.join(output, file), files.get(file));
  manifest.files[file] = { before: expected[file], after: digest(files.get(file)) };
}
for (const [target, { source: supportSource, text }] of support) {
  fs.writeFileSync(path.join(output, target), text);
  manifest.supportFiles[target] = { source: supportSource, sha256: digest(text) };
}
fs.writeFileSync(path.join(output, 'ccgateway-patch.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ output, ...manifest }));

// Every name the patch imports from a sibling module, statically or with
// `let {name: local} = await import(...)`, must be exported by that module as
// it is installed, and a CLI module must be one the profile hash-binds: a
// symbol is only as pinned as the module that defines it. Imports the native
// modules already had are theirs; only the ones the patch adds are checked.
// Re-exports (`export {a as b} from`) count as imports of the module they read.
function checkImports() {
  const installed = name => support.get(name)?.text ?? (Object.hasOwn(expected, name) ? files.get(name) : undefined);
  const added = [...[...modified].map(file => [file, importRecords(files.get(file)), importRecords(baseline.get(file))]),
    ...[...support].map(([file, { text }]) => [file, importRecords(text), new Map()])];
  for (const [file, after, before] of added) for (const [key, count] of after) {
    const [specifier, name] = key.split('|');
    if (count <= (before.get(key) ?? 0) || !specifier.startsWith('./')) continue;
    const target = specifier.slice(2), text = installed(target);
    if (text === undefined) throw Error(`${file} imports ${target}, which the profile does not hash-bind`);
    if (name === '*') throw Error(`${file} imports ${target} in a form whose names cannot be checked`);
    const { names, star } = exportNames(text, target);
    if (!names.has(name)) throw Error(`${file} imports ${name} from ${target}, which ${star ? 'is not provably exported by' : 'does not export it'}`);
  }
}

// exportNames is what a module exports by name, and whether it re-exports
// another module whole (star), whose names this check cannot read.
function exportNames(text, name) {
  const names = new Set();
  let star = false;
  for (const node of parse(text).program.body) {
    if (node.type === 'ExportAllDeclaration') star = true;
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type !== 'ExportNamedDeclaration') continue;
    for (const specifier of node.specifiers) names.add(specifier.exported.name ?? specifier.exported.value);
    if (node.declaration?.id) names.add(node.declaration.id.name);
    for (const declarator of node.declaration?.declarations ?? []) {
      if (declarator.id.type !== 'Identifier') throw Error(`${name}: unsupported export pattern`);
      names.add(declarator.id.name);
    }
  }
  return { names, star };
}

// importRecords counts a module's imports as `target|name`; `target|*` is a
// dynamic import whose names this check cannot read.
function importRecords(text) {
  const isImport = n => n?.type === 'ImportExpression' || n?.type === 'CallExpression' && n.callee?.type === 'Import';
  const destructured = n => n.type === 'VariableDeclarator' && n.init?.type === 'AwaitExpression' && isImport(n.init.argument);
  const sourceOf = call => call.source ?? call.arguments?.[0];
  const counts = new Map(), add = key => counts.set(key, (counts.get(key) ?? 0) + 1), named = new Set();
  const found = nodes(parse(text), n => n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration' && n.source || destructured(n) || isImport(n));
  for (const n of found.filter(n => n.type === 'ImportDeclaration')) {
    for (const s of n.specifiers) add(n.source.value + '|' + (s.type === 'ImportSpecifier' ? s.imported.name ?? s.imported.value : s.type === 'ImportDefaultSpecifier' ? 'default' : '*'));
  }
  for (const n of found.filter(n => n.type === 'ExportNamedDeclaration')) {
    for (const s of n.specifiers) add(n.source.value + '|' + (s.local.name ?? s.local.value));
  }
  for (const n of found.filter(destructured)) {
    const target = sourceOf(n.init.argument);
    if (target?.type !== 'StringLiteral' || n.id.type !== 'ObjectPattern' || n.id.properties.some(p => p.type !== 'ObjectProperty' || p.computed)) continue;
    named.add(n.init.argument);
    for (const property of n.id.properties) add(target.value + '|' + (property.key.name ?? property.key.value));
  }
  for (const call of found) if (isImport(call) && !named.has(call)) add((sourceOf(call)?.value ?? '?') + '|*');
  return counts;
}
