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
  if (text.split(from).length !== 2) throw Error(`Expected unique 2.1.304 anchor: ${from}`);
  return text.replace(from, to);
}
function edit(file, name, transform, method = false) {
  const text = files.get(file), matches = nodes(text, n => method ? n.type === 'ClassMethod' && n.key?.name === name : ['FunctionDeclaration', 'VariableDeclarator'].includes(n.type) && n.id?.name === name);
  if (matches.length !== 1) throw Error(`Expected one ${file}:${name}, found ${matches.length}`);
  const n = matches[0], before = text.slice(n.start, n.end), after = transform(before);
  if (before === after) throw Error(`Unchanged patch ${name}`);
  files.set(file, text.slice(0, n.start) + after + text.slice(n.end)); modified.add(file);
}
const core = 'chunk-rncrmfyt.js', guest = 'chunk-0q47gehe.js', headless = 'chunk-8w3jrzn0.js', terminal = 'chunk-g8r6rccx.js';
edit('cli.js', 'Ve', t => once(t, 'if(n!==void 0){', 'if(e[0]==="--ccgateway-info"){console.log(JSON.stringify({version:"2.1.304",patch:"ccgateway-v12-feature-policy",capabilities:["request_direct","request_build","request_oauth","request_error_stderr","request_raw_http_errors","native_tools","mods_dispatch","request_policy_mode_v1","build_attachment_sources_v2","build_billing_sources_v1","build_content_preservation_v1"]}));return}if(e[0]==="request"){let{loadFastPathPolicy:policy}=await import("./chunk-3nrrbnwj.js");let refusal=await policy(s);if(refusal){let{encodeErrorFrame:errFrame}=await import("./ccgateway-request-error.js");process.stderr.write(errFrame({protocol:"ccgateway.request.error.v1",source:"input",status:403,error:{type:"permission_error",code:"cli_policy_denied",message:"CC policy denied this request"}}));process.exitCode=1;return}let{runRequestCommand:run}=await import("./ccgateway-request-command.js");let{gTe:oauthAuth}=await import("./chunk-4qs43hr1.js");process.exit(await run(e.slice(1),{oauthBeta:oauthAuth.header}))}if(n!==void 0){'));
edit(guest, 'Pb', t => once(t, "name:r.name,description:r.description,inputSchema:", "name:r.name,description:r.description,...r.kind===\"native\"?{kind:\"native\"}:{},inputSchema:"));
edit('cli.js', 'Ve', t => {
  t = once(t, 'patch:"ccgateway-v12-feature-policy"', `patch:"${profile.extension}"`);
  t = once(t, 'process.exit(await run(e.slice(1),{oauthBeta:oauthAuth.header}))',
    'let{rewriteDirectIdentity:ccgRewriteIdentity,applyBuildMetadata:ccgBuildMetadata,directCliPrefix:ccgPrefixBody,applyBuildCliPrefix:ccgPrefixBuild}=await import("./ccgateway-request-identity.js");let{yBe:ccgNativeMetadata}=await import("./chunk-t61vswm2.js");process.exit(await run(e.slice(1),{oauthBeta:oauthAuth.header,identityBody:raw=>ccgRewriteIdentity(raw,ccgNativeMetadata),identityBuild:(b,m)=>ccgBuildMetadata(b,m,ccgNativeMetadata),prefixBody:ccgPrefixBody,prefixBuild:ccgPrefixBuild}))');
  return once(t, '"build_content_preservation_v1"]', '"build_content_preservation_v1","container_resource_reporting_v1","request_identity_v1"]');
});
edit('chunk-dxktn51d.js', 'Yi', t => once(t, 'id:ier()??Ure()', 'id:ccgRequestSessionID()??ier()??Ure()'));
files.set('chunk-dxktn51d.js', 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' + files.get('chunk-dxktn51d.js'));
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
  files.set(file, 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' + files.get(file));
}
edit(core, 'GYr', t => once(t, "async function GYr(e,n){", "async function GYr(e,n){if(e.kind===\"native\"){let binding=Qp(n,\"$.tool.register\"),context=binding.toolContext(new AbortController);return ccgRegister(context.session,n,e)}"));
edit(headless, 'Ua', t => once(once(t, "Qe=[P.toolPermissionContext", "Qe=[ccgRevision(e),P.toolPermissionContext"), "Kt=x4t(Kt,P.toolPermissionContext)", "Kt=ccgMerge(e,x4t(Kt,P.toolPermissionContext))"));
edit(core, 'FH', t => once(t, 'async function FH(e,n){', 'async function FH(e,n){if(ccgIsNative(e)){let description=await e.description();if(!n.withoutToolDescribeHooks)description=(await dsi(e,description,n.deferLoading===true)).description;return {...e.ccgatewayRequestDefinition,...ccgDefinition(e,n),description}}'));
edit(core, 'Ten', t => {
  const a = t.indexOf("case\"tool_use\":{"), b = t.indexOf("case\"text\":", a);
  if (a < 0 || b < 0) throw Error("Missing normalization boundary");
  return t.slice(0, a) + "case\"tool_use\":return{...y,input:typeof y.input===\"string\"?dt(y.input,!1)??{}:y.input};" + t.slice(b);
});
edit(core, 'N_e', () => "function N_e(e,n,{logRepairs:r=!0}={}){return n}");
edit(core, 'mIt', () => "function mIt(e,n,r,s){return n}");
edit('chunk-qygf2xvn.js', 'ton', () => "function ton(o,r,c){return{content:o,batchToolUses:[]}}");
edit('chunk-gzc5bc6y.js', 'addTool', () => "addTool(e,o){this.tools.push({id:e.id,block:e,assistantMessage:o,status:\"queued\",isConcurrencySafe:!1,pendingProgress:[],pendingBridgeEvents:[],results:[]}),this.processQueue()}", true);
// HZ is the local function-hook dispatcher; tiny `(e)=>fn(e)` aliases are
// structurally ambiguous across modules and must not be matched by shape alone.
const dispatchNames = { Xj: 'bz', i5t: 'ePn', Zt: 'en', bY: 'j8', xHe: 'CNr', fkn: 'HNn', t5r: 'rfo', P7t: 'HZ', xe: 'Re', Jce: 'Qme', de: 'ce' };
function rename(text, names) { return text.replace(/[$A-Z_a-z][$\w]*/g, word => Object.hasOwn(names, word) ? names[word] : word); }
edit(core, 'bz', () => rename(fs.readFileSync(path.join(__dirname, "tool-dispatch.inc.js"), "utf8").trim(), dispatchNames));
edit(core, 'qmn', t => {
  // External requests own their wire tools, including declaration order and
  // omitted fields. Native tool discovery still runs for native policy, but
  // its filtered/reordered catalogue is not the external request's payload.
  t = once(t, '...jh.tools!==void 0&&{tools:jh.tools},', '...(J.ccgatewayBuildOnly===true?J.ccgatewayWireTools!==void 0&&{tools:structuredClone(J.ccgatewayWireTools)}:jh.tools!==void 0&&{tools:jh.tools}),');
  // z2 reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
  // an external request after validation. Keep ordinary CLI behavior intact;
  // native parameter derivation below still operates on this fresh object.
  t = once(t, 'Xa=z2(yl);', 'Xa=J.ccgatewayBuildOnly===true?{}:z2(yl);');
  t = once(t, 'let mt=ke(()=>S8n(J.model,{isAgenticQuery:wt})),', 'let mt=J.ccgatewayBuildOnly===true?(J.ccgatewayRequestBetas??[]).map(ccgBeta):ke(()=>S8n(J.model,{isAgenticQuery:wt})),');
  t = once(t, 'system:jh.system,', 'system:J.ccgatewayBuildOnly===true?J.ccgatewaySystemBlocks:jh.system,');
  t = once(t, 'messages:Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,', 'messages:J.ccgatewayBuildOnly===true?structuredClone(J.ccgatewayWireMessages):Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,');
  t = once(t, 'Gf=sb=Xfr(', 'Gf=sb=J.ccgatewayBuildOnly===true?structuredClone(J.ccgatewayWireMessages):Xfr(');
  t = once(t, 'fi={model:J.model,', 'fi={ccgatewayInput:J.ccgatewayBuildOnly===true,model:J.model,');
  t = once(t, 'fingerprint:tF,agentContext:J.agentContext,', 'fingerprint:tF,ccgatewayCaptureBilling:J.ccgatewayBuildOnly===true?J.ccgatewayCaptureBilling:void 0,agentContext:J.agentContext,');
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
// Capture the generated attribution BEFORE system grouping can replace it with
// the client's billing block. The native function retains its opt-out rules.
edit('chunk-t61vswm2.js', 'PAs', t => once(t, 'd=ki([s,n,...e].filter(Boolean));', 'd=ki([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);'));
edit(core, '_oo', t => once(t, 'l1(e)?ule(e):foo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:l1(e)?ule(e):foo()'));
edit(terminal, 'computeToolPool', t => {
  t = once(t, "Z!==null&&ZMt(Z.key,H)", "Z!==null&&Z.ccgRevision===ccgRevision(this.session)&&ZMt(Z.key,H)");
  t = once(t, "$e=x4t(He?He.resolvedTools:_e,h.toolPermissionContext)", "$e=ccgMerge(this.session,x4t(He?He.resolvedTools:_e,h.toolPermissionContext))");
  return once(t, "this.toolPoolCache={key:H,result:At}", "this.toolPoolCache={key:H,result:At,ccgRevision:ccgRevision(this.session)}");
}, true);
const imports = 'import {registerNative as ccgRegister,nativeRevision as ccgRevision,mergeNative as ccgMerge,findNative as ccgFind,isNative as ccgIsNative,nativeDefinition as ccgDefinition,dispatchNative as ccgDispatch} from "./ccgateway-native-tools.js";\n';
for (const file of [core, headless, terminal]) files.set(file, imports + files.get(file));
files.set(core, 'import {ZUo as ccgBeta} from "./chunk-4qs43hr1.js";\n' + files.get(core) + '\n' + fs.readFileSync(path.join(__dirname, 'native-environment-2.1.304.inc.js'), 'utf8'));
for (const file of modified) parser.parse(files.get(file), { sourceType: 'module' });
fs.cpSync(source, output, { recursive: true, errorOnExist: true });
const manifest = { baseline: 'linux-x64-glibc/2.1.304', extension: profile.extension, capabilities: ['request_direct','request_build','request_oauth','request_error_stderr','request_raw_http_errors','native_tools','mods_dispatch','request_policy_mode_v1','build_attachment_sources_v2','build_billing_sources_v1','build_content_preservation_v1','container_resource_reporting_v1','request_identity_v1'], files: {}, supportFiles: {} };
for (const file of modified) {
  fs.writeFileSync(path.join(output, file), files.get(file));
  manifest.files[file] = { before: expected[file], after: digest(files.get(file)) };
}
const importFiles = {'chunk-kasbfbhj.js':'chunk-rncrmfyt.js','chunk-gr4a0fky.js':'chunk-38xgev2z.js','chunk-0ycjphb5.js':'chunk-7p6jp6kj.js','chunk-6dwnw6av.js':'chunk-4qs43hr1.js','chunk-q61sszgr.js':'chunk-72vwyp9d.js'};
for (const input of ['native-tools','model-request','request-command','request-input','request-build','request-parameters','request-output','request-options','request-error','request-policy','content-policy','container-resources','request-identity']) {
  const supportSource = input === 'request-build' ? 'request-build-2.1.304.js' : input+'.js';
  let text = fs.readFileSync(path.join(__dirname, supportSource), 'utf8').replaceAll("'./request-options.js'", "'./ccgateway-request-options.js'");
  if (input === 'request-command' || input === 'request-build') {
    text = rename(text, {eF:'sF',rbe:'_ke',Zre:'mle',El:'Al',YEr:'mBr',Kvt:'jOt',MDe:'aBe'});
    for (const [a,b] of Object.entries(importFiles)) text = text.replaceAll(a,b);
  }
  parser.parse(text,{sourceType:'module'});
  const target='ccgateway-'+input+'.js';fs.writeFileSync(path.join(output,target),text);
  manifest.supportFiles[target]={source:supportSource,sha256:digest(text)};
}
fs.writeFileSync(path.join(output,'ccgateway-patch.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({output,...manifest}));
