// Only the independently recovered Linux x64/glibc 2.1.302 baseline is accepted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const parser = (process.env.CCG_BABEL_PACKAGE ? createRequire(path.resolve(process.env.CCG_BABEL_PACKAGE)) : require)('@babel/parser');
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw Error('Usage: node patch-cli-2.1.302.cjs restored-source new-output-directory');
const source = path.resolve(sourceArg), output = path.resolve(outputArg);
if (source === output || output.startsWith(source + path.sep) || fs.existsSync(output)) throw Error('Output must be a new separate directory');
const expected = require('./profiles/linux-x64-2.1.302.json').modules;
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const files = new Map();
for (const [file, sha] of Object.entries(expected)) {
  const text = fs.readFileSync(path.join(source, file), 'utf8');
  if (digest(text) !== sha) throw Error(`Unsupported or modified baseline: ${file}`);
  files.set(file, text);
}
const modified = new Set();
function nodes(text, predicate) {
  const found = [];
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (predicate(n)) found.push(n);
    for (const [k, v] of Object.entries(n)) {
      if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(k)) continue;
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  }
  walk(parser.parse(text, { sourceType: 'module' })); return found;
}
function once(text, from, to) {
  if (text.split(from).length !== 2) throw Error(`Expected unique 2.1.302 anchor: ${from}`);
  return text.replace(from, to);
}
function edit(file, name, transform, method = false) {
  const text = files.get(file), matches = nodes(text, n => method ? n.type === 'ClassMethod' && n.key?.name === name : ['FunctionDeclaration', 'VariableDeclarator'].includes(n.type) && n.id?.name === name);
  if (matches.length !== 1) throw Error(`Expected one ${file}:${name}, found ${matches.length}`);
  const n = matches[0], before = text.slice(n.start, n.end), after = transform(before);
  if (before === after) throw Error(`Unchanged patch ${name}`);
  files.set(file, text.slice(0, n.start) + after + text.slice(n.end)); modified.add(file);
}
const core = 'chunk-8242685m.js', guest = 'chunk-ctwws12s.js', headless = 'chunk-sdr1wqge.js', terminal = 'chunk-2rs9vjmc.js';
edit('cli.js', 'Ge', t => once(t, 'if(n!==void 0){', 'if(e[0]==="--ccgateway-info"){console.log(JSON.stringify({version:"2.1.302",patch:"ccgateway-v10-raw-http-errors",capabilities:["request_direct","request_build","request_oauth","request_error_stderr","request_raw_http_errors","native_tools","mods_dispatch"]}));return}if(e[0]==="request"){let{loadFastPathPolicy:policy}=await import("./chunk-7p9rzbaa.js");let refusal=await policy(s);if(refusal){let{encodeErrorFrame:errFrame}=await import("./ccgateway-request-error.js");process.stderr.write(errFrame({protocol:"ccgateway.request.error.v1",source:"input",status:403,error:{type:"permission_error",code:"cli_policy_denied",message:"CC policy denied this request"}}));process.exitCode=1;return}let{runRequestCommand:run}=await import("./ccgateway-request-command.js");let{Ake:oauthAuth}=await import("./chunk-yn324528.js");process.exit(await run(e.slice(1),{oauthBeta:oauthAuth.header}))}if(n!==void 0){'));
edit(guest, 'bE', t => once(t, 'name:o.name,description:o.description,inputSchema:', 'name:o.name,description:o.description,...o.kind==="native"?{kind:"native"}:{},inputSchema:'));
edit(core, 'hRr', t => once(t, 'async function hRr(e,n){', 'async function hRr(e,n){if(e.kind==="native"){let binding=qp(n,"$.tool.register"),context=binding.toolContext(new AbortController);return ccgRegister(context.session,n,e)}'));
edit(headless, 'ka', t => once(once(t, 'Fe=[P.toolPermissionContext', 'Fe=[ccgRevision(e),P.toolPermissionContext'), '$t=eKt($t,P.toolPermissionContext)', '$t=ccgMerge(e,eKt($t,P.toolPermissionContext))'));
edit(core, 'U$', t => once(t, 'async function U$(e,n){', 'async function U$(e,n){if(ccgIsNative(e)){let description=await e.description();if(!n.withoutToolDescribeHooks)description=(await IQs(e,description,n.deferLoading===true)).description;return {...e.ccgatewayRequestDefinition,...ccgDefinition(e,n),description}}'));
edit(core, 'KQt', t => {
  const a = t.indexOf('case"tool_use":{'), b = t.indexOf('case"text":', a);
  if (a < 0 || b < 0) throw Error('Missing normalization boundary');
  return t.slice(0, a) + 'case"tool_use":return{...y,input:typeof y.input==="string"?pt(y.input,!1)??{}:y.input};' + t.slice(b);
});
edit(core, 'Khe', () => 'function Khe(e,n,{logRepairs:r=!0}={}){return n}');
edit(core, 'mxt', () => 'function mxt(e,n,r,s){return n}');
edit('chunk-82nm2axm.js', 'QZt', () => 'function QZt(o,r,c){return{content:o,batchToolUses:[]}}');
edit('chunk-9c5hpqbb.js', 'addTool', () => 'addTool(e,o){this.tools.push({id:e.id,block:e,assistantMessage:o,status:"queued",isConcurrencySafe:!1,pendingProgress:[],pendingBridgeEvents:[],results:[]}),this.processQueue()}', true);
const dispatchNames = { Xj: 'jz', i5t: 'Acn', Zt: 'en', bY: 'j7', xHe: 'aur', fkn: 'gDn', t5r: 'Fao', P7t: 'vhn', xe: 'Ce', Jce: 'ime' };
function rename(text, names) { return text.replace(/[$A-Z_a-z][$\w]*/g, word => Object.hasOwn(names, word) ? names[word] : word); }
edit(core, 'jz', () => rename(fs.readFileSync(path.join(__dirname, 'tool-dispatch.inc.js'), 'utf8').trim(), dispatchNames));
edit(core, 'xRn', t => {
  t = once(t, 'let ft=ke(()=>FYn(Q.model,{isAgenticQuery:Et})),', 'let ft=Q.ccgatewayBuildOnly===true?(Q.ccgatewayRequestBetas??[]).map(ccgBeta):ke(()=>FYn(Q.model,{isAgenticQuery:Et})),');
  t = once(t, 'system:Rf.system,', 'system:Q.ccgatewayBuildOnly===true&&Q.ccgatewaySystemBlocks!==void 0?Q.ccgatewaySystemBlocks:Rf.system,');
  t = once(t, 'fl={model:Q.model,', 'fl={ccgatewayInput:Q.ccgatewayBuildOnly===true,model:Q.model,');
  t = once(t, 'Na=xz(rl);', 'Na=Q.ccgatewayBuildOnly===true?{...xz(rl),...Q.ccgatewayExtraBody}:xz(rl);');
  return once(t, 'let Zn=qCe(()=>GU({maxRetries:0,', 'if(Q.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:dIe({model:Q.model,fastMode:false})};return}let Zn=qCe(()=>GU({maxRetries:0,');
});
edit(core, 'gRn', t => once(t, 'withoutAttachmentHooks:n.withoutAttachmentHooks,', 'ccgatewayInput:n.ccgatewayInput===true,withoutAttachmentHooks:n.withoutAttachmentHooks,'));
edit(core, '_A', t => once(t, 'case"progress":continue;case"system":', 'case"progress":continue;case"api_system":{if(!s?.ccgatewayInput)continue;tr();Fr();dn.push(To);continue}case"system":'));
edit(core, 'TYr', t => once(t, 'if(gt.type==="api_system"){', 'if(gt.type==="api_system"){if(gt.ccgatewayWireSystem!==void 0)return structuredClone(gt.ccgatewayWireSystem);'));
edit('chunk-pmgddf3s.js', 'GU', t => {
  t = once(t, 'async function GU({apiKey:e,', 'async function GU({ccgatewayAPIKeyOnly=false,apiKey:e,');
  t = once(t, '}){let Y=process.env.CLAUDE_CODE_CONTAINER_ID,', '}){if(ccgatewayAPIKeyOnly&&(!e||wd(n)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let Y=process.env.CLAUDE_CODE_CONTAINER_ID,');
  t = once(t, 'ee=hNt(),', 'ee=ccgatewayAPIKeyOnly?{}:hNt(),');
  t = once(t, 'let ze=await mle({credentials:O,storageV5:A}),Ze=Nn(),rr=hqn({anthropicAuthEnabled:Sl(),oauthScopes:Ze?.scopes}),', 'let ze=ccgatewayAPIKeyOnly?void 0:await mle({credentials:O,storageV5:A}),Ze=ccgatewayAPIKeyOnly?null:Nn(),rr=ccgatewayAPIKeyOnly?false:hqn({anthropicAuthEnabled:Sl(),oauthScopes:Ze?.scopes}),');
  return once(t, 'if(!rr&&!Br())Bt=await $w(be,we());await Vze();', 'if(!ccgatewayAPIKeyOnly&&!rr&&!Br())Bt=await $w(be,we());if(!ccgatewayAPIKeyOnly)await Vze();else for(let name of Object.keys(be))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete be[name];');
});
edit(terminal, 'computeToolPool', t => {
  t = once(t, 'ee!==null&&vxt(ee.key,H)', 'ee!==null&&ee.ccgRevision===ccgRevision(this.session)&&vxt(ee.key,H)');
  t = once(t, 'Ue=eKt(Oe?Oe.resolvedTools:_e,h.toolPermissionContext)', 'Ue=ccgMerge(this.session,eKt(Oe?Oe.resolvedTools:_e,h.toolPermissionContext))');
  return once(t, 'this.toolPoolCache={key:H,result:Pt}', 'this.toolPoolCache={key:H,result:Pt,ccgRevision:ccgRevision(this.session)}');
}, true);
const imports = 'import {registerNative as ccgRegister,nativeRevision as ccgRevision,mergeNative as ccgMerge,findNative as ccgFind,isNative as ccgIsNative,nativeDefinition as ccgDefinition,dispatchNative as ccgDispatch} from "./ccgateway-native-tools.js";\n';
for (const file of [core, headless, terminal]) files.set(file, imports + files.get(file));
files.set(core, 'import {uLo as ccgBeta} from "./chunk-yn324528.js";\n' + files.get(core));
for (const file of modified) parser.parse(files.get(file), { sourceType: 'module' });
fs.cpSync(source, output, { recursive: true, errorOnExist: true });
const manifest = { baseline: 'linux-x64-glibc/2.1.302', extension: 'ccgateway-v10-raw-http-errors', capabilities: ['request_direct','request_build','request_oauth','request_error_stderr','request_raw_http_errors','native_tools','mods_dispatch'], files: {}, supportFiles: {} };
for (const file of modified) {
  fs.writeFileSync(path.join(output, file), files.get(file));
  manifest.files[file] = { before: expected[file], after: digest(files.get(file)) };
}
const importFiles = {'chunk-kasbfbhj.js':'chunk-8242685m.js','chunk-gr4a0fky.js':'chunk-pmgddf3s.js','chunk-0ycjphb5.js':'chunk-mam1wjsh.js','chunk-6dwnw6av.js':'chunk-yn324528.js','chunk-q61sszgr.js':'chunk-9pbqjfax.js'};
for (const input of ['native-tools','model-request','request-command','request-input','request-build','request-output','request-options','request-error']) {
  let text = fs.readFileSync(path.join(__dirname, input+'.js'), 'utf8').replaceAll("'./request-options.js'", "'./ccgateway-request-options.js'");
  if (input === 'request-command' || input === 'request-build') {
    text = rename(text, {eF:'GU',rbe:'CEe',Zre:'Tae',El:'kl',YEr:'Y0r',Kvt:'XPt',MDe:'$Fe'});
    for (const [a,b] of Object.entries(importFiles)) text = text.replaceAll(a,b);
  }
  parser.parse(text,{sourceType:'module'});
  const target='ccgateway-'+input+'.js';fs.writeFileSync(path.join(output,target),text);
  manifest.supportFiles[target]={source:input+'.js',sha256:digest(text)};
}
fs.writeFileSync(path.join(output,'ccgateway-patch.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({output,...manifest}));
