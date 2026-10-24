// Only the independently recovered Linux x64/glibc 2.1.304 baseline is accepted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const parser = (process.env.CCG_BABEL_PACKAGE ? createRequire(path.resolve(process.env.CCG_BABEL_PACKAGE)) : require)('@babel/parser');
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw Error('Usage: node patch-cli-2.1.304.cjs restored-source new-output-directory');
const source = path.resolve(sourceArg), output = path.resolve(outputArg);
if (source === output || output.startsWith(source + path.sep) || fs.existsSync(output)) throw Error('Output must be a new separate directory');
const profile = require('./profiles/linux-x64-2.1.304.json'), expected = profile.modules;
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const files = new Map();
for (const [file, sha] of Object.entries(expected)) {
  const text = fs.readFileSync(path.join(source, file), 'utf8');
  if (digest(text) !== sha) throw Error(`Unsupported or modified baseline: ${file}`);
  files.set(file, text);
}
const baseline = new Map(files);
const modified = new Set();

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
  if (text.split(from).length !== 2) throw Error(`Expected unique 2.1.304 anchor: ${from}`);
  return text.replace(from, to);
}
function edit(file, name, transform, method = false) {
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
const core = 'chunk-rncrmfyt.js';
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
// (uXn) pushes onto its beta list, in its own order, by AST. A push of
// anything but an identifier is not a beta constant of this module (the plugin
// build's eS.beta is a per-request value) and is skipped; every identifier
// taken must be a binding of the core module's scope.
function requestBuilderBetas() {
  const builders = nodes(tree(core), n => n.type === 'VariableDeclarator' && n.id?.name === 'uXn');
  if (builders.length !== 1) throw Error('Expected the native request builder uXn');
  const builder = builders[0].init;
  if (nodes(builder, n => n.type === 'VariableDeclarator' && n.id?.name === 'zr').length !== 1) throw Error('Expected the request builder beta list zr');
  const pushes = nodes(builder, n => n.type === 'CallExpression' && n.callee?.type === 'MemberExpression'
    && n.callee.object?.type === 'Identifier' && n.callee.object.name === 'zr' && n.callee.computed === false && n.callee.property?.name === 'push');
  const bindings = coreBindings(), betas = new Map();
  for (const push of pushes) for (const argument of push.arguments) {
    if (argument?.type !== 'Identifier') continue;
    const binding = bindings.get(argument.name);
    if (!binding) throw Error(`The request builder pushes ${argument.name}, which is not a binding of ${core}'s module scope`);
    if (!betas.has(argument.name)) betas.set(argument.name, binding);
  }
  if (!betas.size) throw Error('Expected the native request builder to add betas');
  return [...betas].map(([name, binding]) => ({ name, ...binding }));
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
  const file = 'chunk-38xgev2z.js';
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
// nativeSystemRecordExport makes the native api_system record factory (ile)
// available to request-input.js, which reuses it instead of copying the record
// shape.
function nativeSystemRecordExport() {
  if (!moduleBindings(tree(core)).has('ile')) throw Error(`Expected the native system record factory ile in ${core}`);
  return '\nexport {ile as ccgatewaySystemRecord};\n';
}
// What this patch adds is the profile's list: --ccgateway-info and the release
// manifest report it, and the Worker checks it.
const capabilities = profile.capabilities;
if (!Array.isArray(capabilities) || !capabilities.length || !capabilities.every(name => typeof name === 'string' && /^[a-z][a-z0-9_]*$/.test(name)) || new Set(capabilities).size !== capabilities.length) throw Error('Invalid profile capabilities');
// The request command's entry (request-entry.inc.js) is a stub ahead of Ve's
// own handling: the info line, and the command loaded from its support module
// (request-entry.js), so the patched entry carries no request wiring and an
// ordinary CLI start never loads it.
const entry = fs.readFileSync(path.join(__dirname, 'request-entry.inc.js'), 'utf8').trim();
if (entry.split('CCGATEWAY_INFO').length !== 2) throw Error('Expected one CCGATEWAY_INFO in the request entry');
const info = `{version:${JSON.stringify(profile.version)},patch:${JSON.stringify(profile.extension)},capabilities:${JSON.stringify(capabilities)}}`;
edit('cli.js', 'Ve', t => once(t, 'if(n!==void 0){', entry.replace('CCGATEWAY_INFO', () => info) + 'if(n!==void 0){'));
edit('chunk-dxktn51d.js', 'Yi', t => once(t, 'id:ier()??Ure()', 'id:ccgRequestSessionID()??ier()??Ure()'));
surround('chunk-dxktn51d.js', { imports: 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' });
// Only reporting readers change. Resource admission, Git concurrency, process
// memory accounting, identity and node:os itself keep their native behavior.
edit('chunk-yqea5hk4.js', 'Ali', t => {
  t = once(t, 'if(!qir())return;let[e,r]=', 'if(!qir())return;let ccgResources=ccgContainerResources();let[e,r]=');
  t = once(t, 'Ne(u(t,{bigint:!0}),s).catch(()=>{return})',
    'ccgResources?Promise.resolve(void 0):Ne(u(t,{bigint:!0}),s).catch(()=>{return})');
  t = once(t, 'let n=r===void 0?-1n:r.bavail*r.bsize;',
    'let n=ccgResources?(ccgResources.disk_free_gb===void 0?-1n:BigInt(ccgResources.disk_free_gb)*a):r===void 0?-1n:r.bavail*r.bsize;');
  t = once(t, 'else if(n<0n)', 'else if(n<0n&&!ccgResources)');
  return once(t, 'cpus:d(),memory_gb:Math.round(p()/Number(a))',
    'cpus:ccgResources?ccgResources.cpus:d(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(p()/Number(a))');
});
edit('chunk-sx3g9k86.js', 'V', t => {
  t = once(t, 'if(p.length===0)return null;', 'if(p.length===0)return null;let ccgResources=ccgContainerResources();');
  return once(t,
    'n.free_mem_mb=Math.round(F.freemem()/1048576),n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100,n.checkpoint_count=p.length;',
    'if(ccgResources){if(ccgResources.free_mem_mb!==void 0)n.free_mem_mb=ccgResources.free_mem_mb}else{n.free_mem_mb=Math.round(F.freemem()/1048576);n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100}n.checkpoint_count=p.length;');
});
for (const file of ['chunk-yqea5hk4.js', 'chunk-sx3g9k86.js']) {
  surround(file, { imports: 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' });
}
// The client's custom tools are registered as CC tools (native-tools.js), so
// CC's own policy sees them; their definitions stay the client's, verbatim: a
// tool definition is the client's data, and CC's own assembly (strict/eager
// fields, description hooks, provider stripping) applies only to CC's tools,
// which never enter this branch.
edit(core, 'FH', t => once(t, 'async function FH(e,n){', 'async function FH(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
edit(core, 'qmn', t => {
  // A probe run (request-build injectLayers) is CC's native request for the
  // layers given to a request that is not CC's: it keeps the native system,
  // tools and message pipeline, with the client's betas, and is never sent.
  const wire = '(J.ccgatewayBuildOnly===true&&J.ccgatewayNativeProbe!==true)';
  // External requests own their wire tools, including declaration order and
  // omitted fields. Native tool discovery still runs for native policy, but
  // its filtered/reordered catalogue is not the external request's payload.
  t = once(t, '...jh.tools!==void 0&&{tools:jh.tools},', '...('+wire+'?J.ccgatewayWireTools!==void 0&&{tools:structuredClone(J.ccgatewayWireTools)}:jh.tools!==void 0&&{tools:jh.tools}),');
  // z2 reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
  // an external request after validation. Keep ordinary CLI behavior intact;
  // native parameter derivation below still operates on this fresh object.
  t = once(t, 'Xa=z2(yl);', 'Xa=J.ccgatewayBuildOnly===true?{}:z2(yl);');
  t = once(t, 'let mt=ke(()=>S8n(J.model,{isAgenticQuery:wt})),', 'let mt=J.ccgatewayBuildOnly===true?(J.ccgatewayRequestBetas??[]).map(ccgBeta):ke(()=>S8n(J.model,{isAgenticQuery:wt})),');
  t = once(t, 'system:jh.system,', 'system:'+wire+'?J.ccgatewaySystemBlocks:jh.system,');
  t = once(t, 'messages:Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,', 'messages:'+wire+'?structuredClone(J.ccgatewayWireMessages):Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,');
  t = once(t, 'Gf=sb=Xfr(', 'Gf=sb='+wire+'?structuredClone(J.ccgatewayWireMessages):Xfr(');
  t = once(t, 'fi={model:J.model,', 'fi={ccgatewayInput:'+wire+',model:J.model,');
  // RIs hashes the first user prompt; external wire messages carry native
  // attachments as reminder blocks, which request-build skips (fingerprintMessages).
  t = once(t, 'let tF=RIs(Aa),', 'let tF=RIs(J.ccgatewayBuildOnly===true?J.ccgatewayFingerprintMessages:Aa),');
  t = once(t, 'fingerprint:tF,agentContext:J.agentContext,', 'fingerprint:tF,ccgatewayCaptureBilling:J.ccgatewayBuildOnly===true?J.ccgatewayCaptureBilling:void 0,ccgatewayCapturePrefix:J.ccgatewayBuildOnly===true?J.ccgatewayCapturePrefix:void 0,agentContext:J.agentContext,');
  return once(t, 'let eo=HTe(()=>sF({maxRetries:0,', 'if(J.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:uXn({model:J.model,fastMode:false})};return}let eo=HTe(()=>sF({maxRetries:0,');
});
// External wire history has already been validated. Native repair, reminder
// folding and media pruning are for CLI-owned records, not external messages.
edit(core, 'Gmn', t => once(t, 'function Gmn(e,n){', 'function Gmn(e,n){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,messagesForAPI:e,accountMemoryEpoch:0,midConvFallback:null,toolChangeFallback:null,inlineToolsFallback:null,keptForeignSignatures:true,blocksEligible:true};'));
edit(core, 'jA', t => once(t, "case\"progress\":continue;case\"system\":", "case\"progress\":continue;case\"api_system\":{if(!s?.ccgatewayInput)continue;or();Br();po.push(Lo);continue}case\"system\":"));
edit(core, 'Xfr', t => once(t, "if(ft.type===\"api_system\"){", "if(ft.type===\"api_system\"){if(ft.ccgatewayWireSystem!==void 0)return structuredClone(ft.ccgatewayWireSystem);"));
edit('chunk-38xgev2z.js', 'sF', t => {
  t = once(t, 'async function sF({apiKey:e,', 'async function sF({ccgatewayAPIKeyOnly=false,apiKey:e,');
  t = once(t, '}){let J=process.env.CLAUDE_CODE_CONTAINER_ID,', '}){if(ccgatewayAPIKeyOnly&&(!e||Sd(n)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let J=process.env.CLAUDE_CODE_CONTAINER_ID,');
  t = once(t, 'te=xFt(),', 'te=ccgatewayAPIKeyOnly?{}:xFt(),');
  t = once(t, 'let $e=await Zle({credentials:C,storageV5:O}),Xe=Mn(),Kt=q6n({anthropicAuthEnabled:ll(),oauthScopes:Xe?.scopes}),', 'let $e=ccgatewayAPIKeyOnly?void 0:await Zle({credentials:C,storageV5:O}),Xe=ccgatewayAPIKeyOnly?null:Mn(),Kt=ccgatewayAPIKeyOnly?false:q6n({anthropicAuthEnabled:ll(),oauthScopes:Xe?.scopes}),');
  return once(t, 'if(!Kt&&!Gr())Pt=await ty(me,Se());await T2e();', 'if(!ccgatewayAPIKeyOnly&&!Kt&&!Gr())Pt=await ty(me,Se());if(!ccgatewayAPIKeyOnly)await T2e();else for(let name of Object.keys(me))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete me[name];');
});
// The default headers' User-Agent is the client's own when the request keeps
// the client's billing header (request-agent.js setClientUserAgent); any
// other request gets CC's (dN), for the entrypoint set on the request.
edit('chunk-38xgev2z.js', 'nl', t => once(t, '"User-Agent":dN()', '"User-Agent":ccgatewayClientUserAgent()??dN()'));
surround('chunk-38xgev2z.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
// Capture the generated attribution and the identity line BEFORE system
// grouping can replace them with the client's blocks. The native function
// retains its opt-out rules, and the line is the one n1n selected for
// recordedCliPrefix (null when the request carries none).
edit('chunk-t61vswm2.js', 'PAs', t => once(t, 'd=ki([s,n,...e].filter(Boolean));', 'd=ki([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);r.ccgatewayCapturePrefix?.(n);'));
// The environment snapshot renders the proxy note the request asked for, and
// none when it did not (ccgatewayEnvironment's ccgatewayProxyText): the note
// is otherwise the process's own and would reach the content policy unasked.
edit(core, '_oo', t => once(t, 'l1(e)?ule(e):foo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:l1(e)?ule(e):foo()'));
const nativeTools = 'import {isNative as ccgIsNative} from "./ccgateway-native-tools.js";\n';
// The client's system blocks are joined the way the CLI joins two appended
// prompts (pr in the main module, for --append-system-prompt-file with
// --append-system-prompt): the function itself, taken from the hash-bound
// module by AST and renamed; that module is read, never changed.
const mainModule = files.get('chunk-wt08cjq1.js');
const appendJoin = nodes(tree('chunk-wt08cjq1.js'), n => n.type === 'FunctionDeclaration' && n.id?.name === 'pr' && mainModule.slice(n.start, n.end).includes('\n\n'));
if (appendJoin.length !== 1) throw Error('Expected the native append prompt join');
const appendJoinText = mainModule.slice(appendJoin[0].start, appendJoin[0].end).replace(/^function pr\(/, 'function ccgatewayJoinAppend(');
// The order CC writes betas in is its model list (S8n, which puts the login's
// beta in its own place) then the ones its request builder adds for a request,
// in the builder's order; both are native lists, and the request command's beta
// module (request-betas.js) holds the order so nothing of it stays in core.
const builderBetas = requestBuilderBetas();
surround(core, { imports: 'import {ZUo as ccgBeta} from "./chunk-4qs43hr1.js";\nimport {POo as ccgDate} from "./chunk-t2p0d04m.js";\n' + nativeTools,
  code: '\n' + fs.readFileSync(path.join(__dirname, 'native-environment-2.1.304.inc.js'), 'utf8') + '\n' + appendJoinText + nativeSystemRecordExport() });
for (const [file, { head, tail }] of surroundings) { files.set(file, head + files.get(file) + tail); modified.add(file); }
for (const file of modified) tree(file);
// Support modules import each other by source name; installed, they carry the
// ccgateway- prefix. The list is the profile's (test/support.mjs reads it too).
const supportInputs = profile.supportModules;
const support = new Map();
for (const input of supportInputs) {
  let text = fs.readFileSync(path.join(__dirname, input + '.js'), 'utf8');
  for (const name of supportInputs) text = text.replaceAll(`'./${name}.js'`, `'./ccgateway-${name}.js'`);
  support.set('ccgateway-' + input + '.js', { source: input + '.js', text });
}
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
const manifest = { baseline: 'linux-x64-glibc/2.1.304', extension: profile.extension, capabilities, files: {}, supportFiles: {} };
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
  const found = nodes(parse(text), n => n.type === 'ImportDeclaration' || destructured(n) || isImport(n));
  for (const n of found.filter(n => n.type === 'ImportDeclaration')) {
    for (const s of n.specifiers) add(n.source.value + '|' + (s.type === 'ImportSpecifier' ? s.imported.name ?? s.imported.value : s.type === 'ImportDefaultSpecifier' ? 'default' : '*'));
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
