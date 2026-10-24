#!/usr/bin/env node
// PRE-FIX static assembly audit. Its classifications intentionally describe the
// original adapter. Do not overwrite the historical report after implementation
// repairs. A changed adapter requires a separately reviewed analysis.
// Uses Babel AST ranges; no CLI execution, network or production edits.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../../../..');
const parser = createRequire(path.join(root, 'next/web/package.json'))('@babel/parser');
const mods = path.join(root, 'next/plugins/ccgateway/companions/cli-mods');
const args = process.argv.slice(2);
function arg(name, fallback) { const i = args.indexOf(name); return i < 0 ? fallback : path.resolve(args[i + 1]); }
const restored = arg('--restored', path.join(root, 'artifacts/claude-2.1.304/linux-restored'));
const patched = arg('--patched', path.join(root, 'artifacts/claude-2.1.304/linux-patched-v12-config-audit'));
const output = arg('--output', path.join(root, 'artifacts/claude-2.1.304/assembly-audit/parameters.json'));
const profile = JSON.parse(fs.readFileSync(path.join(mods, 'profiles/linux-x64-2.1.304.json'), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const documents = new Map();
const childNodes = node => Object.entries(node).filter(([key]) => !['loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens'].includes(key)).flatMap(([, value]) => Array.isArray(value) ? value.filter(v => v && typeof v.type === 'string') : value && typeof value.type === 'string' ? [value] : []);
function walk(node, visit, ancestors = []) { if (!node) return; visit(node, ancestors); for (const child of childNodes(node)) walk(child, visit, [...ancestors, node]); }
function load(file) {
  file = path.resolve(file); if (documents.has(file)) return documents.get(file);
  const text = fs.readFileSync(file, 'utf8'), hash = sha(text), ast = parser.parse(text, { sourceType: 'module', allowReturnOutsideFunction: true });
  if (file === path.join(mods, 'request-build-2.1.304.js') && hash !== 'b1b69fad94d71e937a576541aec528189805311a01ddcbf0402040738befd769') throw Error('This pre-fix audit is pinned to the original adapter. Preserve historical parameters.json and create a new reviewed repair analysis.');
  if (path.dirname(file) === restored && profile.modules[path.basename(file)] && profile.modules[path.basename(file)] !== hash) throw Error('Unverified baseline: ' + file);
  const doc = { file, text, hash, ast }; documents.set(file, doc); return doc;
}
function evidence(doc, node, includeSource = true) {
  return { file: path.relative(root, doc.file).split(path.sep).join('/'), source_sha256: doc.hash, node_type: node.type,
    range: { char_start: node.start, char_end: node.end, utf8_start: Buffer.byteLength(doc.text.slice(0, node.start)), utf8_end: Buffer.byteLength(doc.text.slice(0, node.end)), line_start: node.loc.start.line, column_start: node.loc.start.column, line_end: node.loc.end.line, column_end: node.loc.end.column },
    node_sha256: sha(doc.text.slice(node.start, node.end)), ...(includeSource ? { source: doc.text.slice(node.start, node.end) } : {}) };
}
function source(doc, node) { return node ? doc.text.slice(node.start, node.end) : null; }
function find(doc, predicate, scope = doc.ast) { const found = []; walk(scope, (node, parents) => { if (predicate(node)) found.push({ node, parents }); }); return found; }
function binding(doc, name, scope = doc.ast) {
  const matches = find(doc, n => (n.type === 'FunctionDeclaration' || n.type === 'VariableDeclarator') && n.id?.name === name, scope);
  if (matches.length !== 1) throw Error(`Expected unique AST binding ${path.basename(doc.file)}:${name}, got ${matches.length}`);
  return matches[0].node;
}
function key(node) { return node?.type === 'Identifier' ? node.name : node?.type === 'StringLiteral' ? node.value : null; }
function member(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'MemberExpression' || node?.type === 'OptionalMemberExpression') {
    const base = member(node.object), leaf = (!node.computed || node.property.type === 'StringLiteral') ? key(node.property) : null;
    return base && leaf ? base + '.' + leaf : null;
  }
  return null;
}
function memberReads(doc, scope, prefix) {
  return find(doc, n => ['MemberExpression', 'OptionalMemberExpression'].includes(n.type) && member(n)?.startsWith(prefix + '.'), scope)
    .filter(({ node, parents }) => !parents.some(p => ['MemberExpression', 'OptionalMemberExpression'].includes(p.type) && p.object === node))
    .map(({ node, parents }) => ({ path: member(node), ...evidence(doc, node), conditions: guards(doc, node, parents) }));
}
function guards(doc, node, parents) {
  const result = []; let child = node;
  for (let i = parents.length - 1; i >= 0; i--) {
    const parent = parents[i];
    if (parent.type === 'IfStatement') result.push({ kind: 'if', branch: child === parent.consequent ? 'then' : child === parent.alternate ? 'else' : 'test', test: source(doc, parent.test), range: evidence(doc, parent.test, false).range });
    if (parent.type === 'ConditionalExpression') result.push({ kind: 'conditional', branch: child === parent.consequent ? 'then' : child === parent.alternate ? 'else' : 'test', test: source(doc, parent.test), range: evidence(doc, parent.test, false).range });
    if (parent.type === 'LogicalExpression' && child === parent.right) result.push({ kind: parent.operator, test: source(doc, parent.left), range: evidence(doc, parent.left, false).range });
    child = parent;
  }
  return result.reverse();
}
function properties(doc, object, conditions = [], prefix = '') {
  const result = [];
  for (const prop of object.properties) {
    if (prop.type === 'ObjectProperty' || prop.type === 'ObjectMethod') {
      const name = key(prop.key); result.push({ path: prefix + (name ?? '[computed]'), kind: 'property', value: source(doc, prop.value), conditions, evidence: evidence(doc, prop) });
      if (prop.value?.type === 'ObjectExpression') result.push(...properties(doc, prop.value, conditions, prefix + name + '.'));
    } else if (prop.type === 'SpreadElement') {
      result.push({ path: prefix + '*', kind: 'spread', value: source(doc, prop.argument), conditions, evidence: evidence(doc, prop) });
      function unwrap(node, gates) {
        if (node.type === 'ObjectExpression') result.push(...properties(doc, node, gates, prefix));
        else if (node.type === 'LogicalExpression') unwrap(node.right, [...gates, { kind: node.operator, test: source(doc, node.left) }]);
        else if (node.type === 'ConditionalExpression') { unwrap(node.consequent, [...gates, { kind: 'if', test: source(doc, node.test) }]); unwrap(node.alternate, [...gates, { kind: 'else', test: source(doc, node.test) }]); }
      }
      unwrap(prop.argument, conditions);
    }
  }
  return result;
}
const native = load(path.join(restored, 'chunk-rncrmfyt.js'));
const nativeTargets = ['qmn', 'uXn', 'Gmn', 'jA', 'Xfr', 'jOt'].map(name => ({ name, node: binding(native, name) }));
const qmn = nativeTargets[0].node, uXn = nativeTargets[1].node;
const finalBody = binding(native, '$c', uXn);
if (finalBody.init.type !== 'ObjectExpression') throw Error('Native body shape changed');
const adapter = load(path.join(mods, 'request-build-2.1.304.js')), adapterFunction = binding(adapter, 'buildRequest');
const options = binding(adapter, 'options', adapterFunction);
const input = load(path.join(mods, 'request-input.js')), prepare = binding(input, 'prepareBuildInput');
const command = load(path.join(mods, 'request-command.js')), commandFunction = binding(command, 'runRequestCommand');
const transport = load(path.join(mods, 'model-request.js')), transportFunction = binding(transport, 'openModelRequest');
const requestOptions = load(path.join(mods, 'request-options.js'));
const supportedInputs = memberReads(adapter, adapterFunction, 'body');
const adapterOptions = properties(adapter, options.init);
const coreProperties = properties(native, finalBody.init);
const symbols = ['db', 'ft', 'nn', 'zy', 'zw', 'dc', 'kf', 'CT', 'EF', 'ub', 'hse', 'Il', 'us', 'st', 'vt', 'Qs', 'OF', 'oF', 'MA', 'VO', 'Xa', 'iy', 'J', 'wg', 'Sf', 'oT', 'Si', 'Gf', 'KR', 'tF'];
const nativeBindings = symbols.map(name => ({ name, definitions: find(native, n => n.type === 'VariableDeclarator' && n.id?.name === name || n.type === 'AssignmentExpression' && n.left?.type === 'Identifier' && n.left.name === name, qmn)
  .map(({ node, parents }) => ({ ...evidence(native, node), conditions: guards(native, node, parents) })) }));
const helpers = [ ['chunk-rncrmfyt.js', 'BJe'], ['chunk-rncrmfyt.js', 'yfr'], ['chunk-rncrmfyt.js', 'gfr'], ['chunk-rncrmfyt.js', 'z2'], ['chunk-rncrmfyt.js', 'TVe'], ['chunk-rncrmfyt.js', '_fr'], ['chunk-rncrmfyt.js', 'kfr'], ['chunk-rncrmfyt.js', 'Hun'], ['chunk-rncrmfyt.js', 'udr'], ['chunk-rncrmfyt.js', 'Y7e'], ['chunk-7p6jp6kj.js', 'Run'], ['chunk-dxktn51d.js', 'Ptt'], ['chunk-cd1a8ced.js', 'En'], ['chunk-pbkqy204.js', 'H'], ['chunk-pbkqy204.js', 's'], ['chunk-8nra9hkj.js', 'Rs'], ['chunk-7p6jp6kj.js', 'Tqs'], ['chunk-7p6jp6kj.js', 'AQe'], ['chunk-7p6jp6kj.js', 'z$o'], ['chunk-dxktn51d.js', 'IKe'], ['chunk-4qs43hr1.js', 'CHe'], ['chunk-38xgev2z.js', 'tzs'], ['chunk-t61vswm2.js', 'yBe'], ['chunk-t61vswm2.js', 'PAs'], ['chunk-6qx5mjec.js', 'kLo'], ['chunk-2gh4h0fv.js', 'RIs'], ['chunk-2gh4h0fv.js', 'aW'], ['chunk-2gh4h0fv.js', 'Eg'], ['chunk-2gh4h0fv.js', 'iW'] ].map(([file, name]) => { const doc = load(path.join(restored, file)); return { name, ...evidence(doc, binding(doc, name)) }; });
let patchedEvidence = null;
if (fs.existsSync(path.join(patched, 'chunk-rncrmfyt.js'))) {
  const doc = load(path.join(patched, 'chunk-rncrmfyt.js')), fn = binding(doc, 'qmn'), builder = binding(doc, 'uXn', fn), body = binding(doc, '$c', builder);
  patchedEvidence = { directory: path.relative(root, patched), native_final_body: properties(doc, body.init), bypasses: ['Gmn', 'jA', 'Xfr'].map(name => ({ name, ...evidence(doc, binding(doc, name), false), customGuards: find(doc, n => n.type === 'IfStatement' && find(doc, p => ['MemberExpression', 'OptionalMemberExpression'].includes(p.type) && key(p.property)?.startsWith('ccgateway'), n.test).length > 0, binding(doc, name)).map(({ node }) => evidence(doc, node)) })), buildOnlyBranches: find(doc, n => n.type === 'IfStatement' && memberReads(doc, n.test, 'J').some(r => r.path === 'J.ccgatewayBuildOnly'), fn).map(({ node }) => evidence(doc, node)), requestBodyAssignments: find(doc, n => n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.left.name === 'Gf', builder).map(({ node }) => evidence(doc, node)), finalMutations: find(doc, n => n.type === 'AssignmentExpression' && (n.left.name === '$c' || member(n.left)?.startsWith('$c.')), builder).map(({node,parents})=>({...evidence(doc,node),conditions:guards(doc,node,parents)})) };
}
function flow(id, incoming, adapterOption, outgoing, classification, gates, expected, cases) {
  const paths = Array.isArray(incoming) ? incoming : [incoming];
  return { id, input_fields: paths, adapter_options: adapterOption, final_fields: outgoing, classification, gates, expected,
    adapter_evidence: supportedInputs.filter(read => paths.some(p => read.path === 'body.' + p || read.path.startsWith('body.' + p + '.'))),
    option_evidence: adapterOptions.filter(item => adapterOption.includes(item.path)),
    native_evidence: coreProperties.filter(item => outgoing.some(p => item.path === p || item.path.startsWith(p + '.'))),
    cases: cases.map(([suffix, title, input, assertion]) => ({ case_id: id + '-' + suffix, title, input, assertion, status: 'proposed_not_executed_by_this_static_audit' })) };
}
const flows = [
  flow('PA-MODEL', 'model', ['model'], ['model'], 'native_normalized', ['native fC(J.model)', 'qmn resolves model facts via Jd(st) unless caller supplies matching facts'], 'Wire model is native-resolved; do not assume equality for aliases.', [['ALIAS','model alias',{model:'sonnet'},'assert resolved model and matching model facts'],['PINNED','dated explicit model',{model:'claude-haiku-4-5-20251001'},'record outgoing model without substituting the test oracle']]),
  flow('PA-MAXTOKENS', 'max_tokens', ['maxOutputTokensOverride'], ['max_tokens'], 'native_normalized', ['Math.min(eo?.maxTokensOverride || J.maxOutputTokensOverride || ft.maxOutputTokens, ft.maxOutputTokens)'], 'Within native maximum is passed; above maximum clamps; zero selects fallback because || is used.', [['SMALL','small positive max_tokens',{max_tokens:32},'output32 unless model-native rule refuses'],['CLAMP','above model maximum',{max_tokens:999999},'output equals discovered model limit'],['ZERO','zero sentinel',{max_tokens:0},'output native default (or upstream validator rejects before adapter)'],['NEGATIVE','negative boundary',{max_tokens:-1},'assert explicit rejection vs outgoing negative; do not count as normalized-safe without evidence']]),
  flow('PA-THINKING', 'thinking', [], ['thinking'], 'native_normalized', ['adapter maps adaptive input to {type:enabled}', 'enabled budget_tokens -> budgetTokens', 'Tqs honors mechanical disabled', 'CLAUDE_CODE_DISABLE_THINKING', 'ft.thinking.supported/alwaysOn/rejectsDisabled', 'AQe(...) adaptive gate', 'budget=Math.max(1024,Math.min(db-1,budget))', 'gfr strips extra disabled keys'], 'Input thinking is translated then rebuilt; extra client keys are not forwarded.', [['ENABLED','enabled budget',{thinking:{type:'enabled',budget_tokens:2048},max_tokens:4096},'expected enabled/adaptive by model family'],['LOW-BUDGET','below minimum',{thinking:{type:'enabled',budget_tokens:1},max_tokens:4096},'native minimum1024'],['SMALL-MAX','max below minimum budget',{thinking:{type:'enabled',budget_tokens:1},max_tokens:32},'detect budget>=max boundary; do not silently label API-valid'],['ADAPTIVE','adaptive input',{thinking:{type:'adaptive'}},'capture model-dependent final type'],['DISABLED','mechanical disabled',{thinking:{type:'disabled',display:'summarized'}},'rejected-disabled model omits otherwise type disabled only'],['UNSUPPORTED','thinking unsupported model',{thinking:{type:'enabled',budget_tokens:2048}},'final thinking omitted']]),
  flow('PA-TEMPERATURE', 'temperature', ['temperatureOverride'], ['temperature'], 'conditionally_normalized_or_omitted', ['!zy && ft.acceptsTemperature', 'value J.temperatureOverride ?? 1'], 'Thinking-enabled requests omit temperature; no-thinking supported models default to1.', [['ON','thinking active',{temperature:0.25,thinking:{type:'enabled',budget_tokens:2048}},'no temperature when zy true'],['OFF','thinking disabled',{temperature:0.25,thinking:{type:'disabled'}},'0.25 only if model acceptsTemperature'],['DEFAULT','temperature absent',{thinking:{type:'disabled'}},'native default1 only for accepting model']]),
  flow('PA-TOOLCHOICE', 'tool_choice', ['toolChoice'], ['tool_choice'], 'conditionally_normalized', ['CT.type===tool && EF -> {type:auto}', 'EF enabled/adaptive or omitted thinking with rejectsDisabled'], 'Forced named tool can be demoted; other shapes are not explicitly transformed by this adapter.', [['FORCED','forced tool with thinking',{tool_choice:{type:'tool',name:'lookup'},thinking:{type:'enabled',budget_tokens:2048}},'auto when EF'],['AUTO','automatic tool',{tool_choice:{type:'auto'}},'auto'],['ANY','any tool',{tool_choice:{type:'any'}},'record unchanged or model rejection'],['NONE','tool disabled',{tool_choice:{type:'none'}},'record unchanged or model rejection']]),
  flow('PA-EFFORT', 'output_config.effort', ['effortValue'], ['output_config'], 'native_normalized', ['us=ek(st,J.effortValue,...)', 'BJe drops effort if !KS(model)', 'disabled mechanical/capsEffortWhenDisabled and WDr(effort) -> Fgt'], 'Output effort depends on model and effective thinking; native output must win.', [['SUPPORTED','effort supported',{output_config:{effort:'high'}},'record output+beta for supported model'],['DISABLED-CLAMP','disabled effort clamp',{thinking:{type:'disabled'},output_config:{effort:'max'}},'native Fgt if WDr'],['UNSUPPORTED','unsupported effort model',{output_config:{effort:'high'}},'effort removed or upstream rejection']]),
  flow('PA-FORMAT', 'output_config.format', ['outputFormat'], ['output_config'], 'conditionally_normalized_or_omitted', ['yfr returns false if !format || existing Il.format || !y8n(model) || hTe(model)', 'format adds native cde beta'], 'Only format property is read; arbitrary other output_config fields are not copied.', [['SCHEMA','structured output format',{output_config:{format:{type:'json_schema',schema:{type:'object',properties:{}}}}},'format present only on supported model+required beta'],['EXTRA','extra output_config fields',{output_config:{foo:'sentinel',timing:{now:'sentinel'}}},'these incoming extra fields not forwarded by adapter']]),
  flow('PA-METADATA', 'metadata', [], ['metadata'], 'client_dropped_native_regenerated', ['yBe native agentContext', 'CLAUDE_CODE_EXTRA_METADATA native env; device/account/session fields override conflicts'], 'No adapter read of body.metadata; final user_id generated by CLI.', [['CLIENT','client user_id sentinel',{metadata:{user_id:'CLIENT_SENTINEL',custom:'sentinel'}},'client sentinel absent; native user_id present'],['ENV','trusted metadata env',{'env.CLAUDE_CODE_EXTRA_METADATA':'{"custom":"runtime"}'},'native allowed env fields present without replacing native identity']]),
  flow('PA-BETAS', 'betas', ['ccgatewayRequestBetas'], ['betas'], 'normalized_then_moved_to_header', ['normalizeBetas(header anthropic-beta, body.betas)', 'native feature gate YEr / mBr', 'patched mt uses mapped client betas', 'native may add capability betas', 'delete built.betas before transport'], 'Deduplicated tokens end in HTTP header; no duplicate body betas. OAuth adds native oauth beta.', [['MERGE','header+body+native merge',{betas:['client-a','client-a'],'header.anthropic-beta':'client-b'},'single header each token'],['DISABLED','experimental policy disabled',{betas:['client-a']},'reject before outbound'],['BADTOKEN','invalid beta token',{betas:['bad\nheader']},'reject']]),
  flow('PA-SYSTEM', 'systemPrompt', ['ccgatewaySystemBlocks'], ['system'], 'explicit_preservation_except_selected_content_policy', ['preserveContent string -> one text block', 'absent -> []', 'patched qmn uses J.ccgatewaySystemBlocks', 'mergeBillingAttribution only selected targets'], 'Never let native default system replace explicit caller blocks.', [['STRING','string system',{systemPrompt:'custom'},'one same-text block'],['ARRAY','array+cache',{systemPrompt:[{type:'text',text:'custom',cache_control:{type:'ephemeral'}}]},'same blocks/cache/order'],['ABSENT','no client system',{},'[] unless selected billing insertion'],['INVALID','invalid system block',{systemPrompt:[{type:'text',text:null}]},'reject']]),
  flow('PA-MESSAGES', 'messages', ['ccgatewayWireMessages'], ['messages'], 'raw_preserved_after_policy_and_structural_validation', ['prepareBuildInput captures ccgatewayWireMessage/System', 'patched Gmn ccgatewayInput bypass', 'patched qmn Gf/body use structuredClone wire messages', 'tool pairing validates across role system'], 'Messages are preserved at final serialization except selected content spans and controlled empty removals; native generation parameters remain native.', [['SYSTEM-LIFECYCLE','intermediate system lifecycle',{messages:'assistant tool_use -> system clear_at/output_config -> user tool_result'},'same fields/order; no native repair deletion'],['MEDIA','error tool_result media',{messages:'is_error:true text+image+document'},'no Uks-style pruning'],['WHITESPACE','original whitespace/adjacent user',{messages:'two user messages with whitespace block'},'not merged/deleted'],['PAIR-BAD','missing duplicate/mismatched tools',{messages:'assistant tool_use without result'},'reject before CLI request'],['OPAQUE','unknown message/block fields',{messages:'unknown block fields, signatures'},'preserve or explicit initial validation; no hidden normalization']]),
  flow('PA-TOOLS', 'tools', ['extraToolSchemas'], ['tools'], 'custom_schema_normalized_plus_native_provider_gates', ['custom inputSchema -> input_schema', 'typed tools to extraToolSchemas', 'patched FH keeps ccgatewayRequestDefinition then native description', 'tzs foundry may strip strict/defer_loading by model config', 'YYt native rejected-tools filter'], 'Custom descriptors are retained through native registration; provider-specific stripping is separate from client field preservation.', [['CUSTOM','custom strict/deferred tool',{tools:[{name:'lookup',inputSchema:{type:'object'},strict:true,defer_loading:true}]},'input_schema/strict/defer mapping and native definition'],['TYPED','typed server tool',{tools:[{type:'web_search_20250305',name:'web_search'}]},'extra schema placement'],['FOUNDRY','foundry model gates',{provider:'foundry'},'transport currently excludes provider; classify unreachable, not passing']]),
  flow('PA-STREAM', 'stream', [], ['stream'], 'adapter_boolean_preserved', ['prepareBuildInput requires boolean', 'final body {...built, stream:body.stream===true}'], 'True and false preserved independently of builder stream mode.', [['TRUE','streaming',{stream:true},'SSE forwarded as chunks'],['FALSE','nonstream',{stream:false},'JSON response preserved'],['INVALID','nonboolean stream',{stream:'true'},'reject']]),
];
const droppedCandidates = ['stop_sequences','top_p','top_k','service_tier','speed','cache_control','context_management','safeguards','thread','diagnostics','container','mcp_servers','output_format'];
for (const field of droppedCandidates) {
  if (supportedInputs.some(read => read.path === 'body.' + field || read.path.startsWith('body.' + field + '.'))) throw Error('Adapter now reads formerly unconsumed field; update audit classification: ' + field);
  flows.push(flow('PA-DROP-' + field.toUpperCase(), field, [], [field], 'client_parameter_unread_by_adapter', ['prepareBuildInput spreads parameters but build adapter has no body.' + field + ' read', 'native may independently synthesize a same-named field from state/env/provider; not client preservation'], 'In standalone CLI build, client sentinel is not propagated through declared adapter options. Worker admission may reject it first; must test both entry points.', [['SENTINEL','standalone + Worker sentinel',{[field]:'CLIENT_SENTINEL'},'record rejected vs dropped; never mark raw-preserved merely because native emits same field']]));
}
flows.push(flow('PA-NATIVE-EXTRABODY', 'env.CLAUDE_CODE_EXTRA_BODY', [], ['system','messages','metadata','max_tokens','thinking','temperature','output_config'], 'native_only_late_override', ['z2 parses trusted process.env.CLAUDE_CODE_EXTRA_BODY unless qB() disables experimental betas', 'uXn spreads Xa after native body fields and before final output_config', 'TVe is a no-op in this baseline', 'gfr later strips extra keys from disabled thinking'], 'Late native environment fields can override wire messages/system and native defaults. Capture/clear this variable in preservation tests; distinguish process configuration from client parameters.', [['CONFLICT','late env conflicts with explicit wire',{'env.CLAUDE_CODE_EXTRA_BODY':'{"system":"ENV_SENTINEL","messages":[],"max_tokens":19}'},'assert observed final precedence; do not claim raw preservation when trusted environment overrides it'],['POLICY-OFF','org policy disables extra body',{'env.CLAUDE_CODE_EXTRA_BODY':'{"metadata":{"user_id":"ENV_SENTINEL"}}',experimentalBetas:'disabled'},'extra body ignored by qB gate'],['INVALID','malformed environment JSON',{'env.CLAUDE_CODE_EXTRA_BODY':'not json'},'native logs invalid env and uses base body']]));
const boundaryCases = [
  {case_id:'PA-BOUNDARY-RESERVED', input:'parameters contains model/system/messages/tools/stream', classification:'rejected', assertion:'cannot overwrite explicit build components'},
  {case_id:'PA-BOUNDARY-UNKNOWN-COMPONENT', input:'unknown top-level component', classification:'rejected', assertion:'explicit allowlist fails'},
  {case_id:'PA-BOUNDARY-UNKNOWN-PARAM', input:'parameters.unknown_parameter sentinel', classification:'accepted_then_unread', assertion:'standalone build drops; Worker unknown_field policy may reject before CLI'},
  {case_id:'PA-BOUNDARY-INTERNAL', input:'parameters.requestPolicy/runtimeContext', classification:'not_read_as_internal_envelope', assertion:'must not override trusted envelope or leak to wire'},
  {case_id:'PA-BOUNDARY-UNSAFE', input:'build JSON number 9007199254740993', classification:'rejected', assertion:'reject before JSON rounding; direct rawBody preserves digits'},
  {case_id:'PA-DIRECT-RAW', input:'direct JSON custom fields/whitespace/unsafe integer', classification:'raw_preserved', assertion:'transport sends options.rawBody rather than parsed body'},
  {case_id:'PA-TRANSPORT-PROVIDER', input:'Bedrock/Vertex/Foundry SDK selection', classification:'currently_rejected_route', assertion:'runRequestCommand requires Anthropic-compatible client instance; native provider branches are not proof of supported external route'},
  {case_id:'PA-TRANSPORT-AUTH', input:'API key vs OAuth, hostile auth/host/cookie headers', classification:'transport_owned', assertion:'forbidden client header rejects; auth profile isolated; maxRetries0'},
  {case_id:'PA-BOUNDARY-THINKING-TYPE', input:'parameters.thinking.type unknown or thinking wrong object shape', classification:'adapter_fallback_pending_contract_test', assertion:'adapter falls through to mechanically disabled unless type enabled/adaptive; verify Worker rejects malformed input rather than counting fallback as feature support'},
  {case_id:'PA-BOUNDARY-GENERATION-TYPES', input:'max_tokens/temperature as string/null/boolean; malformed output_config format', classification:'pending_cross_entry_validation', assertion:'compare Worker admission with standalone native coercion/error; never infer API validity from mathematical normalization'},
  {case_id:'PA-BOUNDARY-OUTPUT-CONFIG', input:'message role system output_config/clear_at versus parameters.output_config', classification:'separate_lifecycle_and_generation_channels', assertion:'message lifecycle remains wire-preserved while top-level effort/format is model-normalized; clear_at outside never/next_user_message is rejected'},
];
const tests = [];
for (const file of ['request-input.test.mjs','request-options.test.mjs','model-request.test.mjs','official-client-replay.cjs','worker-policy-matrix.cjs']) {
  const full = path.join(mods,'test',file); if (!fs.existsSync(full)) continue;
  const doc=load(full); const titles=find(doc,n=>n.type==='CallExpression'&&['test','it'].includes(n.callee?.name)&&n.arguments[0]?.type==='StringLiteral').map(({node})=>({title:node.arguments[0].value,evidence:evidence(doc,node,false)}));
  tests.push({file:path.relative(root,full).split(path.sep).join('/'),source_sha256:doc.hash,titles,execution_status:'not_run_by_this_analysis',note:'Inventory only; cases require executed assertion evidence.'});
}
const result = {
  schema:'ccgateway.assembly-audit.parameters.v1', baseline:{version:'2.1.304',binary_sha256:profile.binarySHA256,profile:path.relative(root,path.join(mods,'profiles/linux-x64-2.1.304.json'))},
  method:{parser:'@babel/parser',parser_version:require(createRequire(path.join(root,'next/web/package.json')).resolve('@babel/parser/package.json')).version,scope:'static AST read-only analysis',regex_used_for_symbol_or_property_discovery:false,coverage_claim:'No dynamic behavior is counted as tested by this report.',resolution_limit:'Identifier definitions include source ranges and enclosing gates; repeated names are retained, not falsely collapsed into a single lexical binding. Semantic classifications are reviewer annotations grounded in these nodes.'},
  sources:[], native_targets:nativeTargets.map(({name,node})=>({name,...evidence(native,node,false)})),
  adapter_input_reads:supportedInputs, adapter_options:adapterOptions, adapter_thinking:evidence(adapter,binding(adapter,'thinkingConfig',adapterFunction)),
  native_final_body:{symbol:'qmn.uXn.$c',evidence:evidence(native,finalBody,false),properties:coreProperties},native_bindings:nativeBindings,native_helpers:helpers,patched_evidence:patchedEvidence,
  boundaries:{prepare:evidence(input,prepare,false),validation_failures:find(input,n=>n.type==='CallExpression'&&n.callee?.name==='fail',prepare).map(({node,parents})=>({...evidence(input,node),conditions:guards(input,node,parents)})),raw_transport_reads:memberReads(transport,transportFunction,'options'),command_mode_branches:find(command,n=>n.type==='IfStatement'&&memberReads(command,n.test,'options').some(r=>r.path==='options.mode'),commandFunction).map(({node})=>evidence(command,node)),number_parser:evidence(requestOptions,binding(requestOptions,'parseRequestJSON'))},
  field_flows:flows,boundary_cases:boundaryCases,test_inventory:tests,
  billing_fingerprint: {
    dataflow:'patched Gmn(e,fi).messagesPreNormalize -> Aa -> RIs(Aa) -> tF -> PAs(...,{fingerprint:tF}) -> kLo -> cc_version',
    text_selection:'first native record with type=user and !isMeta; message.content string, else first content block with type=text; no text => empty string',
    algorithm:'SHA256("59cf53e54c78" + [4,7,20].map(i=>text[i]||"0").join("") + "2.1.304").hex.slice(0,3)',
    indexing:'JavaScript UTF-16 code-unit indexing, not Unicode code points or UTF-8 byte indexes',
    output:'2.1.304.<three lowercase hex digits>',
    crucial_limit:'This is not a hash of the entire request. Changes outside the three selected characters do not necessarily change the fingerprint.',
    independent_oracle:'next/plugins/ccgateway/companions/cli-mods/test/analysis/billing-fingerprint-oracle.cjs',
    oracle_input:'Expected transformed fixture messages, not actual outbound messages or the outbound billing string.',
    case_suggestions:['first user string','first user first text after image','first user no text','native isMeta skip','short text missing selected positions','UTF-16 surrogate pair positions','two fixtures changing one selected position'],
    evidence:helpers.filter(h=>['PAs','kLo','RIs','aW','Eg','iW'].includes(h.name)),
  },
  thinking_display: {
    dataflow:'nn.display -> Jk; later Hun(display, displayExplicit ?? Ptt()) -> RA connector_text -> kf.display=updates',
    exact_late_guard:'(kf.type===adaptive || kf.type===enabled) && Y7e(st) && !(thinking in Xa) && !Rm(lt,yne) && IR===idle && !CLAUDE_CODE_SIMULATE_PROXY_USAGE',
    defaults:'Run() reads showThinkingSummaries default false; udr() reads parsed CLAUDE_CODE_THINKING_DISPLAY_UPDATES with default true.',
    deterministic_disable:'CLAUDE_CODE_THINKING_DISPLAY_UPDATES=0 (also false/no/off) parses as false via H.triBool/Rs, preventing the connector_text updates rewrite; other explicitly requested display/native gates remain independent.',
    test_rule:'Do not delete display from compared objects. Pin model/environment or explicitly assert the observed native-authorized updates field for that fixture.',
    evidence:helpers.filter(h=>['Hun','udr','Y7e','Run','Ptt','En','H','s','Rs'].includes(h.name)),
  },
  gate_matrix: {
    model: { evidence_symbols:['ft','st','vt','AQe','z$o','BJe','yfr'], dimensions:['maxOutputTokens','thinking.supported','thinking.alwaysOn','thinking.rejectsDisabled','thinking.capsEffortWhenDisabled','acceptsTemperature','adaptive_thinking runtime/model config','effort KS','format y8n/hTe'], required_case_context:['exact requested/resolved/canonical model','effective model facts','thinkingTypeOverrides','CLAUDE_CODE_DISABLE_THINKING','CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING'] },
    provider: { evidence_symbols:['Qs','tzs','z2','CHe'], dimensions:['firstParty disabled-thinking representation','bedrock anthropic_beta and capability injection','foundry tool strict/defer stripping'], external_route:'runRequestCommand rejects createClient results not instanceof native Anthropic-compatible SDK; provider branches may be statically present but unreachable through this external request command.' },
    runtime: { evidence_symbols:['z2','yBe','IKe'], dimensions:['CLAUDE_CODE_EXTRA_BODY','CLAUDE_CODE_EXTRA_METADATA','native thinking overrides','organization beta policy','session/account metadata','feature latches/cache/thread/context/safeguards'] },
    patch: { dimensions:['ccgatewayBuildOnly final override','ccgatewayInput Gmn bypass','uXn called with model and fastMode:false but no Er argument','Er-gated lone-surrogate sanitation differs from ordinary native builder'], evidence:patchedEvidence?.buildOnlyBranches ?? [] },
  },
  gaps:['No actual model/provider family gate matrix executed here.','Model facts and env feature switches must be captured with each runtime case.','Generic request-build fixture tests cannot prove qmn.uXn real304 behavior.','Provider-native branches exist but external transport rejects non-Anthropic-compatible clients.','Input fields accepted by parameters but unread by adapter require explicit drop/reject contract tests.','Final unchanged wire messages do not imply intermediate fingerprint/native state is untouched; verify billing fingerprint and lifecycle together.'],
};
result.sources=[...documents.values()].map(doc=>({file:path.relative(root,doc.file).split(path.sep).join('/'),sha256:doc.hash,bytes:Buffer.byteLength(doc.text)}));
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,source_files:result.sources.length,native_symbols:result.native_targets.length,field_flows:flows.length,proposed_cases:flows.reduce((n,f)=>n+f.cases.length,0)+boundaryCases.length,bytes:fs.statSync(output).size}));
