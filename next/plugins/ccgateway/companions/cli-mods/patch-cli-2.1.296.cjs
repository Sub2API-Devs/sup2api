const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const parser = (process.env.CCG_BABEL_PACKAGE ? createRequire(path.resolve(process.env.CCG_BABEL_PACKAGE)) : require)('@babel/parser');
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw Error('Usage: node patch-cli.cjs restored-source new-output-directory');
const source = path.resolve(sourceArg), output = path.resolve(outputArg);
if (source === output || output.startsWith(source + path.sep)) throw Error('Output must be separate from the baseline');
if (fs.existsSync(output)) throw Error('Output already exists; use a new directory');
const expected = {
  'chunk-kasbfbhj.js': '4db1e890fb4b277063ca17984811e7cf08b8bf1d2bb45c0da9c22a5e39b3deca',
  'chunk-30jbnw20.js': '5d498fe6b9e227c6aa6b09ac7438e1adf36a9739fbce96f2177251b022b91b9e',
  'chunk-gtj0ecsn.js': '4533db8fb0e2ca0da3a2491c56695c4349370bebaaebd9ad8887634207212c88',
  'chunk-tmrtnnjz.js': '3680248156229ce33e4a1e0a39c89b742b750b1c66287613fe9d338c47d14cf1',
  'chunk-716kq0mx.js': '1c4bf55e63548242b60fd677cb145de11efab375c2110607f8edace5c09f66fd',
  'chunk-daj64yn4.js': 'a8496d811e81e9994d92cdbf82c5015a21f028df27af4c52ff9f1ddd7b1a7b88',
  'chunk-gr4a0fky.js': '66db8903c65959791498721c3aef533aff465c5a1a74cd7ea581ea199d21ffdb',
  'cli.js': '3b2811253260369e6e046d6d100443c11252b69e821ebe3f6b6c8714455a4e0b',
};
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const files = new Map();
for (const [file, sha] of Object.entries(expected)) {
  const text = fs.readFileSync(path.join(source, file), 'utf8');
  if (digest(text) !== sha) throw Error(`Unsupported or modified baseline: ${file}`);
  files.set(file, text);
}
function nodes(text, predicate) {
  const found = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) found.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc') continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  walk(parser.parse(text, { sourceType: 'module' }));
  return found;
}
function editBinding(file, name, transform) {
  const text = files.get(file);
  const found = nodes(text, n => ['FunctionDeclaration', 'VariableDeclarator'].includes(n.type) && n.id?.name === name);
  if (found.length !== 1) throw Error(`Expected one binding ${file}:${name}, found ${found.length}`);
  const n = found[0], before = text.slice(n.start, n.end), after = transform(before);
  if (after === before) throw Error(`Patch did not change ${name}`);
  files.set(file, text.slice(0, n.start) + after + text.slice(n.end));
}
function once(text, from, to) {
  if (text.split(from).length !== 2) throw Error(`Expected unique anchor: ${from}`);
  return text.replace(from, to);
}
const core = 'chunk-kasbfbhj.js', guest = 'chunk-30jbnw20.js', headless = 'chunk-gtj0ecsn.js';
editBinding('cli.js', 'Bt', text => once(text, 'if(s!==void 0){', 'if(t[0]==="request"){let{loadFastPathPolicy:policy}=await import("./chunk-gzp7b95n.js");let refusal=await policy(r);if(refusal){console.error(refusal);process.exitCode=1;return}let{runRequestCommand:run}=await import("./ccgateway-request-command.js");process.exit(await run(t.slice(1)))}if(s!==void 0){'));
editBinding(guest, 'CT', text => once(text, 'name:o.name,description:o.description,inputSchema:', 'name:o.name,description:o.description,...o.kind===\"native\"?{kind:\"native\"}:{},inputSchema:'));
editBinding(core, 'BWo', text => once(text, 'async function BWo(e,n){', 'async function BWo(e,n){if(e.kind===\"native\"){let binding=ip(n,\"$.tool.register\"),context=binding.toolContext(new AbortController);return ccgRegister(context.session,n,e)}'));
editBinding(headless, 'ta', text => {
  text = once(text, 'Me=[P.toolPermissionContext', 'Me=[ccgRevision(e),P.toolPermissionContext');
  return once(text, 'Ct=IUt(Ct,P.toolPermissionContext)', 'Ct=ccgMerge(e,IUt(Ct,P.toolPermissionContext))');
});
// Use a dedicated serializer: old Bash-specific transforms, cached records and
// the original Zod parser must not overwrite the mod's definition.
editBinding(core, 'sN', text => once(text, 'async function sN(e,n){', 'async function sN(e,n){if(ccgIsNative(e)){let description=await e.description();if(!n.withoutToolDescribeHooks)description=(await m$s(e,description,n.deferLoading===true)).description;return {...e.ccgatewayRequestDefinition,...ccgDefinition(e,n),description}}'));
// Response normalization happens even earlier than runToolUse. In particular,
// vwt uses the original Bash parser by name, not the supplied tool's parser.
editBinding(core, 'eYt', text => {
  const start = text.indexOf('case"tool_use":{'), end = text.indexOf('case"text":', start);
  if (start < 0 || end < 0) throw Error('Missing tool_use normalization boundary');
  return text.slice(0, start) + 'case"tool_use":return{...y,input:typeof y.input==="string"?mt(y.input,!1)??{}:y.input};' + text.slice(end);
});
editBinding(core, 'Gle', () => 'function Gle(e,n,{logRepairs:r=!0}={}){return n}');
editBinding(core, 'vwt', () => 'function vwt(e,n,r,s){return n}');
// Batch/tool-wrapper decomposition is also before dispatch; mods receive the
// original wrapper call instead of CLI-synthesized child calls.
editBinding('chunk-716kq0mx.js', 'n5t', () => 'function n5t(o,r,a){return{content:o,batchToolUses:[]}}');
{
  const file = 'chunk-daj64yn4.js', text = files.get(file);
  const found = nodes(text, n => n.type === 'ClassMethod' && n.key?.name === 'addTool');
  if (found.length !== 1) throw Error('Expected one streaming tool queue addTool');
  const n = found[0];
  // Serial scheduling avoids calling original isConcurrencySafe/schema methods.
  const body = 'addTool(e,o){this.tools.push({id:e.id,block:e,assistantMessage:o,status:"queued",isConcurrencySafe:!1,pendingProgress:[],pendingBridgeEvents:[],results:[]}),this.processQueue()}';
  files.set(file, text.slice(0, n.start) + body + text.slice(n.end));
}
// Every tool_use goes to mods, including built-ins, MCP and unknown names.
// There is no fallback to the original tool executor when next() reaches core.
editBinding(core, 'Xj', () => fs.readFileSync(path.join(__dirname, 'tool-dispatch.inc.js'), 'utf8').trim());
// request --build uses the native builder, but exits before its network/retry
// loop. The CLI command sends the returned body once through the shared transport.
editBinding(core, 'uln', text => {
  text = once(text, 'let ut=_e(()=>hBn(Y.model,{isAgenticQuery:dt})),', 'let ut=Y.ccgatewayBuildOnly===true?(Y.ccgatewayRequestBetas??[]).map(ccgBeta):_e(()=>hBn(Y.model,{isAgenticQuery:dt})),');
  text = once(text, 'system:Dc.system,', 'system:Y.ccgatewayBuildOnly===true&&Y.ccgatewaySystemBlocks!==void 0?Y.ccgatewaySystemBlocks:Dc.system,');
  text = once(text, 'Mi={model:Y.model,', 'Mi={ccgatewayInput:Y.ccgatewayBuildOnly===true,model:Y.model,');
  return once(text, 'let Jn=ybe(()=>eF({maxRetries:0,', 'if(Y.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:PCe({model:Y.model,fastMode:false})};return}let Jn=ybe(()=>eF({maxRetries:0,');
});
editBinding(core, 'Jan', text => once(text, 'withoutAttachmentHooks:n.withoutAttachmentHooks,', 'ccgatewayInput:n.ccgatewayInput===true,withoutAttachmentHooks:n.withoutAttachmentHooks,'));
editBinding(core, 'hT', text => once(text, 'case"progress":continue;case"system":', 'case"progress":continue;case"api_system":{if(!s?.ccgatewayInput)continue;Ir();Vo();Sn.push(Er);continue}case"system":'));
// Explicit API system messages are already rendered components. Native hT/Jan
// still place and normalize records; retain block/lifecycle fields at Xyr's
// wire serializer instead of flattening them into an irreversible string.
editBinding(core, 'Xyr', text => once(text, 'if(vt.type==="api_system"){', 'if(vt.type==="api_system"){if(vt.ccgatewayWireSystem!==void 0)return structuredClone(vt.ccgatewayWireSystem);'));
// API-key-only is opt-in on the request entry. Do not refresh or select a
// subscription account, and do not change ordinary Claude sessions.
editBinding('chunk-gr4a0fky.js', 'eF', text => {
  text = once(text, 'async function eF({apiKey:e,', 'async function eF({ccgatewayAPIKeyOnly=false,apiKey:e,');
  text = once(text, '}){let D=process.env.CLAUDE_CODE_CONTAINER_ID,', '}){if(ccgatewayAPIKeyOnly&&(!e||vc(n)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let D=process.env.CLAUDE_CODE_CONTAINER_ID,');
  text = once(text, 'Q=Bxt(),', 'Q=ccgatewayAPIKeyOnly?{}:Bxt(),');
  text = once(text, 'let ae=await joe({credentials:I,storageV5:P}),be=bn(),Be=B$n({anthropicAuthEnabled:ol(),oauthScopes:be?.scopes}),', 'let ae=ccgatewayAPIKeyOnly?void 0:await joe({credentials:I,storageV5:P}),be=ccgatewayAPIKeyOnly?null:bn(),Be=ccgatewayAPIKeyOnly?false:B$n({anthropicAuthEnabled:ol(),oauthScopes:be?.scopes}),');
  text = once(text, 'if(!Be&&!eo())we=await sw(re,Ee());await OUe();', 'if(!ccgatewayAPIKeyOnly&&!Be&&!eo())we=await sw(re,Ee());if(!ccgatewayAPIKeyOnly)await OUe();else for(let name of Object.keys(re))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete re[name];');
  return text;
});
const imports = 'import {registerNative as ccgRegister,nativeRevision as ccgRevision,mergeNative as ccgMerge,findNative as ccgFind,isNative as ccgIsNative,nativeDefinition as ccgDefinition,dispatchNative as ccgDispatch} from "./ccgateway-native-tools.js";\n';
const terminal = 'chunk-tmrtnnjz.js';
{
  const text = files.get(terminal);
  const found = nodes(text, n => n.type === 'ClassMethod' && n.key?.name === 'computeToolPool');
  if (found.length !== 1) throw Error('Expected one terminal computeToolPool');
  const n = found[0];
  let body = text.slice(n.start, n.end);
  body = once(body, 'ee!==null&&Evt(ee.key,H)', 'ee!==null&&ee.ccgRevision===ccgRevision(this.session)&&Evt(ee.key,H)');
  body = once(body, 'Le=IUt(Me?Me.resolvedTools:Se,h.toolPermissionContext)', 'Le=ccgMerge(this.session,IUt(Me?Me.resolvedTools:Se,h.toolPermissionContext))');
  body = once(body, 'this.toolPoolCache={key:H,result:_t}', 'this.toolPoolCache={key:H,result:_t,ccgRevision:ccgRevision(this.session)}');
  files.set(terminal, text.slice(0, n.start) + body + text.slice(n.end));
}
for (const file of [core, headless, terminal]) files.set(file, imports + files.get(file));
files.set(core, 'import {Y_o as ccgBeta} from "./chunk-6dwnw6av.js";\n' + files.get(core));
// Validate every modified module before creating the output tree.
for (const [file, text] of files) parser.parse(text, { sourceType: 'module' });
fs.cpSync(source, output, { recursive: true, errorOnExist: true });
const manifest = { baseline: 'linux-x64-glibc/2.1.296', extension: 'ccgateway-v6-components-betas', files: {}, supportFiles: {} };
for (const [file, text] of files) {
  fs.writeFileSync(path.join(output, file), text);
  manifest.files[file] = { before: expected[file], after: digest(text) };
}
for (const [input, target] of [['native-tools.js', 'ccgateway-native-tools.js'], ['model-request.js', 'ccgateway-model-request.js'], ['request-command.js', 'ccgateway-request-command.js'], ['request-input.js', 'ccgateway-request-input.js'], ['request-build.js', 'ccgateway-request-build.js'], ['request-output.js', 'ccgateway-request-output.js'], ['request-options.js', 'ccgateway-request-options.js'], ['request-error.js', 'ccgateway-request-error.js']]) {
  const bytes = Buffer.from(fs.readFileSync(path.join(__dirname, input), 'utf8').replaceAll("'./request-options.js'", "'./ccgateway-request-options.js'"));
  fs.writeFileSync(path.join(output, target), bytes);
  manifest.supportFiles[target] = { source: input, sha256: digest(bytes) };
}
fs.writeFileSync(path.join(output, 'ccgateway-patch.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ output, ...manifest }, null, 2));
