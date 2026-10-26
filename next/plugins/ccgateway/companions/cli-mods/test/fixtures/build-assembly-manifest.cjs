// Regenerate the static, reviewable assembly manifest of one Claude Code
// version: CC_VERSION=<version> (default 2.1.304) node fixtures/build-assembly-manifest.cjs
// writes fixtures/assembly-cases-<version>.json. This file constructs test
// data only; it imports no production implementation. Contracts follow the
// current request rules (cli-mods sources, BUILD-REQUEST-COMPONENTS-DESIGN,
// REQUEST-MODES); each rule that changed since the 2026-10-20 manifest names
// its source where it is applied. The manifest carries no artifact SHA: the
// caller pins them at run time (assembly-runtime.cjs).
const fs = require('node:fs'), path = require('node:path');
const { sha, ccVersion, readFixture, fixturePath, normalizeSystem } = require('../replay-helpers.cjs');
const version = ccVersion();
const official = readFixture('official-request', version, 'capture it with test/e2e/capture-official.sh');
const officialSHA = sha(official);
// ToolSearch and DeferredToolPlaceholder are the official client's own
// definitions: the entries of the same fresh capture's tools array
// (official-tools-2.1.304.json holds exactly those two entries of
// official-request-2.1.304.json, body_sha256 = that capture). A version
// without an official-tools file takes them from its official-request
// capture; when the file exists it must agree with the capture.
const toolsFile = fixturePath('official-tools', version);
const officialTools = fs.existsSync(toolsFile) ? JSON.parse(fs.readFileSync(toolsFile, 'utf8')) : null;
const fromCapture = Object.fromEntries(['ToolSearch', 'DeferredToolPlaceholder'].map(name => {
  const found = (official.tools ?? []).filter(tool => tool.name === name);
  if (found.length !== 1) throw Error(`official-request-${version}.json must carry exactly one ${name} tool`);
  return [name, found[0]];
}));
if (officialTools) {
  if (officialTools.body_sha256 !== officialSHA) throw Error(`official-tools-${version}.json is not from official-request-${version}.json`);
  for (const name of Object.keys(fromCapture)) if (JSON.stringify(officialTools.tools[name]) !== JSON.stringify(fromCapture[name]))
    throw Error(`official-tools-${version}.json ${name} differs from the capture`);
}
const definitions = fromCapture;
const officialProvenance = { body_sha256: officialSHA, source_cli_sha256: officialTools?.source_cli_sha256 ?? null,
  tools_source: officialTools ? `fixtures/official-tools-${version}.json` : `fixtures/official-request-${version}.json tools[]` };
const clone = value => structuredClone(value);
const tool = (name = 'lookup', extra = {}) => ({ name, description: 'Assembly fixture tool.', input_schema: { type: 'object', properties: { key: { type: 'string' } } }, ...extra });
const base = () => ({ model: 'claude-sonnet-4-6', max_tokens: 128, stream: false,
  system: [{ type: 'text', text: 'Keep this system exactly.', cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: 'Assembly fixture user.' }] });
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';
const image = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pixel } };
const environment = '# Environment\nYou have been invoked in the following environment: \n - Platform: client-platform\n - OS Version: client-os\n - Shell: client-shell\n';
const reminder = text => '<system-reminder>\n' + text + '</system-reminder>';
const billing = 'x-anthropic-billing-header: cc_version=2.1.302.abc; cc_entrypoint=client-entry; other=keep;';
const cases = [];
// Native rules the closed-world parameter check accepts when the client left
// the control out (replay-helpers nativeDefaultPermitted). metadata is not
// among them any more: the runtime is an API-key account, for which the
// Worker resolves the identity as `client` (engine request_identity.go
// resolveRequestIdentity: "an API-key account keeps the client's value"), and
// the CLI then keeps the client's metadata or sends none (request-identity.js
// applyBuildMetadata; build design §7: "API Key 账号...仍不加"). The CLI's own
// regenerated metadata of the 2026-10-20 runs no longer reaches the wire.
const nativeAuthorized = {
  thinking: 'when absent: native mechanical disabled representation', temperature: 'when absent and accepted: native default',
  output_config: 'when absent: native model effort default' };
function add(id, group, body, extra = {}) {
  const contract = { response_status: 200, upstream_requests: 1, content: 'preserve', tools: 'exact',
    parameters: { model: body.model, max_tokens: body.max_tokens, stream: body.stream }, native_authorized: clone(nativeAuthorized),
    ...(extra.contract ?? {}) };
  const item = { id, group, mode: 'build', source_symbols: ['prepareBuildInput', 'buildRequest', 'Kvt'], body,
    fixture_source: { kind: 'synthetic' },
    ...extra, contract };
  cases.push(item); return item;
}
function reject(id, body, symbols = ['validateBuildContent', 'prepareBuildInput'], extra = {}) {
  add(id, 'INPUT', body, { source_symbols: symbols, ...extra, contract: { response_status: 400, upstream_requests: 0, content: 'rejected', tools: 'not_sent', parameters: {} } });
}
let body = base(); body.messages[0].content = [{ type: 'text', text: null }]; reject('input.null_text', body);
// Numbers are the client's as written since CLI v29 (2026-10-25): build no
// longer refuses an integer beyond 2^53 and sends its original text
// (engine request_components.go validateBuildContent; REQUEST-MODES §1.1).
body = base(); body.tools = [tool()]; body.messages.push(
  { role: 'assistant', content: [{ type: 'tool_use', id: 'x', name: 'lookup', input: { unsafe: 9007199254740992 } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'fixture' }] });
add('messages.unsafe_number_as_written', 'MSG', body, { source_symbols: ['validateBuildContent', 'prepareBuildInput'],
  contract: { raw_texts: ['"unsafe":9007199254740992'] } });
body = base(); body.messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: 'missing', name: 'lookup', input: {} }] }); reject('input.missing_tool_result', body);
body = base(); body.runtimeContext = { workingDirectory: '/untrusted' }; reject('input.reserved_envelope', body, ['validateBuildContent']);
body = base(); body.messages[0].role = 'developer'; reject('input.invalid_role', body);

body = base(); delete body.system; add('system.absent', 'SYS', body);
body = base(); body.system = 'String system\nwith whitespace  '; add('system.string', 'SYS', body);
body = base(); body.system = []; add('system.empty_array', 'SYS', body);
body = base(); body.system.push({ type: 'text', text: 'Second cached block.', cache_control: { type: 'ephemeral', ttl: '5m' } }); add('system.cached_blocks', 'SYS', body);

body = base(); body.messages.push({ role: 'assistant', content: 'Assistant text.' }, { role: 'user', content: 'Next turn.' }); add('messages.role_history', 'MSG', body);
body = base(); body.messages[0].content = [{ type: 'text', text: ' \n', cache_control: { type: 'ephemeral' } }, { type: 'text', text: '' }, { type: 'text', text: 'Keep' }]; add('messages.whitespace_blocks', 'MSG', body);
body = base(); body.messages[0].content = [{ type: 'text', text: 'Image/document input' }, clone(image), { type: 'document', source: { type: 'text', media_type: 'text/plain', data: 'Opaque document bytes.' }, title: 'fixture', citations: { enabled: true } }]; add('messages.media_document', 'MSG', body);
const paired = () => { const value = base(); value.tools = [tool()]; value.messages = [
  { role: 'user', content: 'Call lookup.' },
  { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'lookup', input: { key: 'x' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: [{ type: 'text', text: 'error', cache_control: { type: 'ephemeral' } }, clone(image)] }] },
]; return value; };
add('messages.error_tool_result_media', 'MSG', paired());
body = paired(); body.messages.splice(2, 0, { role: 'system', content: [{ type: 'text', text: 'Mid-turn system.' }], clear_at: 'next_user_message', output_config: { effort: 'low' } });
add('messages.system_lifecycle_between_tool_pair', 'MSG', body, { source_symbols: ['systemRecord', 'prepareBuildInput', 'Kvt', 'ccgatewayWireMessages'] });
body = base(); body.messages = [{ role: 'user', content: 'Previous prompt' }, { role: 'assistant', content: [
  { type: 'thinking', thinking: 'Opaque retained thought.', signature: 'opaque-test-signature' }, { type: 'redacted_thinking', data: 'opaque-test-data' }, { type: 'text', text: 'previous answer' },
] }, { role: 'user', content: 'Continue.' }]; add('messages.opaque_thinking', 'MSG', body);

// Tool catalogs go out as the client's own definitions (patched FH returns
// the client definition, ccgatewayWireTools; v26): ToolSearch stays, a missing
// description stays missing (request-build.js clientTools,
// request-parameters.js wireToolDefinitions; CLI-TEST-PLAN §9).
const toolSymbols = ['prepareBuildInput', 'buildRequest', 'B1e', 'T', 'FH'];
function toolsCase(id, tools, extra = {}) { const value = base(); value.tools = tools; return add(id, 'TOOLS', value, { source_symbols: toolSymbols, ...extra }); }
toolsCase('tools.custom_description', [tool()]);
toolsCase('tools.explicit_empty_array', []);
body = base(); body.tools = null; reject('input.tools_null', body, ['messagesBuildComponentsPolicy', 'prepareBuildInput']);
body = base(); body.tools = 'invalid'; reject('input.tools_not_array', body, ['messagesBuildComponentsPolicy', 'prepareBuildInput']);
body = base(); const noDescription = tool(); delete noDescription.description; body.tools = [noDescription]; add('tools.custom_missing_description', 'TOOLS', body, { source_symbols: toolSymbols });
toolsCase('tools.search_with_deferred_custom', [clone(definitions.ToolSearch), tool('lookup', { defer_loading: true })]);
toolsCase('tools.search_with_deferred_placeholder', [clone(definitions.ToolSearch), clone(definitions.DeferredToolPlaceholder)]);
toolsCase('tools.search_without_deferred', [clone(definitions.ToolSearch), tool()]);
toolsCase('tools.deferred_flag_preservation', [tool('deferred', { defer_loading: true }), tool('eager', { defer_loading: false })]);
toolsCase('tools.custom_unknown_attributes', [tool('lookup', { strict: true, input_examples: [{ key: 'a' }], x_fixture_opaque: { retain: 7 } })]);
toolsCase('tools.order_and_cache_control', [tool('zeta', { cache_control: { type: 'ephemeral' } }), tool('alpha')]);
toolsCase('tools.server_tools_append_order', [tool('before'), { type: 'web_search_20250305', name: 'web_search', max_uses: 1 }, tool('after')]);
body = base(); body.tools = [clone(definitions.ToolSearch), tool('lookup', { defer_loading: true })]; body.tool_choice = { type: 'tool', name: 'ToolSearch' };
add('tools.tool_choice_for_search', 'TOOLS', body, { source_symbols: toolSymbols, contract: { parameters: { model: body.model, max_tokens: 128, stream: false, tool_choice: body.tool_choice } } });
body = base(); body.tools = [clone(definitions.ToolSearch), tool('lookup', { defer_loading: true })];
body.messages = [{ role: 'user', content: 'Find lookup.' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'search1', name: 'ToolSearch', input: { query: 'select:lookup', max_results: 1 } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'search1', content: [{ type: 'tool_reference', tool_name: 'lookup' }] }] }];
add('tools.history_tool_reference', 'TOOLS', body, { source_symbols: toolSymbols });

function paramsCase(id, values, expected = values, extra = {}) {
  const value = { ...base(), ...values };
  return add(id, 'PARAM', value, { source_symbols: ['buildRequest', 'Kvt'], ...extra,
    contract: { parameters: { model: value.model, max_tokens: value.max_tokens, stream: value.stream, ...expected }, ...(extra.contract ?? {}) } });
}
paramsCase('params.model_concrete', { model: 'claude-sonnet-4-6' });
paramsCase('params.max_tokens_small', { max_tokens: 32 });
paramsCase('params.temperature_disabled', { temperature: 0.2, thinking: { type: 'disabled' } });
paramsCase('params.effort_and_format', { output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } } } });
paramsCase('params.thinking_disabled', { thinking: { type: 'disabled' } });
paramsCase('params.thinking_adaptive', { thinking: { type: 'adaptive' } }, { thinking: { type: 'adaptive', display: 'updates' } }, {
  contract: { parameters: { model: 'claude-sonnet-4-6', max_tokens: 128, stream: false, thinking: { type: 'adaptive', display: 'updates' } },
    native_display_evidence: 'Pinned fixture gates: Hun(undefined,Ptt()) -> udr default true -> connector_text -> active thinking and Y7e(model) -> RA adds display updates' } });
paramsCase('params.thinking_enabled_budget', { max_tokens: 2048, thinking: { type: 'enabled', budget_tokens: 1024 } }, { thinking: { type: 'adaptive', display: 'updates' } }, {
  source_symbols: ['buildRequest', 'qmn.uXn', 'AQe', 'z$o', 'eK', 'Hun', 'Y7e'],
  contract: { parameters: { model: 'claude-sonnet-4-6', max_tokens: 2048, stream: false, thinking: { type: 'adaptive', display: 'updates' } },
    native_model_evidence: 'Pinned 304 firstParty + claude-sonnet-4-6: supported kqs; z$o/eK select adaptive; AQe has no runtime override or disable flag; Hun default connector_text and Y7e enable display updates. Adaptive intentionally omits budget.',
    oracle_assumptions: ['fresh CLI per request', 'firstParty provider', 'no model capability or thinking override environment', 'adaptive/thinking/experimental betas enabled', 'default showThinkingSummaries and display'] } });
body = { ...base(), tools: [tool()], thinking: { type: 'adaptive' }, tool_choice: { type: 'tool', name: 'lookup' } };
add('params.forced_tool_with_adaptive', 'PARAM', body, { contract: { parameters: { model: body.model, max_tokens: 128, stream: false, tool_choice: { type: 'auto' }, thinking: { type: 'adaptive', display: 'updates' } },
  native_authorized: { ...clone(nativeAuthorized), tool_choice: 'native extended-thinking branch demotes forced tool to auto' } } });
// The client's metadata goes out as sent on an API-key account (see
// nativeAuthorized above); the 2026-10-20 contract expected the CLI's own.
paramsCase('params.metadata_client_value_kept', { metadata: { user_id: 'client-metadata-must-not-be-provider-identity' } }, { metadata: { user_id: 'client-metadata-must-not-be-provider-identity' } }, {
  source_symbols: ['applyBuildMetadata', 'resolveRequestIdentity', 'mapRequestIdentity'] });
paramsCase('params.top_p_preservation', { top_p: 0.7 });
paramsCase('params.stop_sequences_preservation', { stop_sequences: ['STOP_ASSEMBLY'] });
paramsCase('params.context_management_preservation', { context_management: { edits: [{ type: 'clear_tool_uses_20250919', trigger: { type: 'input_tokens', value: 10000 }, keep: { type: 'tool_uses', value: 2 } }] } });
paramsCase('params.tool_choice_none', { tools: [tool()], tool_choice: { type: 'none' } }, { tool_choice: { type: 'none' } });
paramsCase('params.thinking_enabled_adaptive_disabled', { max_tokens: 2048, thinking: { type: 'enabled', budget_tokens: 1024 } }, { thinking: { type: 'enabled', budget_tokens: 1024, display: 'updates' } }, {
  runtime_environment: { CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: '1' },
  source_symbols: ['AQe', 'z$o', 'qmn.uXn'],
});
paramsCase('params.extra_body_cannot_override_preserved_input', {}, {}, {
  runtime_environment: { CLAUDE_CODE_EXTRA_BODY: JSON.stringify({ system: [{ type: 'text', text: 'EXTRA_BODY_SYSTEM_OVERRIDE' }], messages: [{ role: 'user', content: 'EXTRA_BODY_MESSAGE_OVERRIDE' }], max_tokens: 777 }) },
  source_symbols: ['z2', 'qmn.uXn', 'buildRequest'],
});

// Direct keeps the client's bytes except the billing header (CLI v17,
// direct-billing.js): this body has no header, so the native line is put in
// front of its system and nothing else changes (whole body and every byte
// outside system, assembly-replay.cjs). Pretty-printed raw input proves the
// splice keeps the client's formatting.
body = { ...base(), top_p: 0.4, stop_sequences: ['STOP_DIRECT'], metadata: { user_id: 'direct-fixture' }, unknown_direct_field: { retained: true } };
add('send.direct_byte_preserving', 'SEND', body, { mode: 'direct', raw_body: JSON.stringify(body, null, 3) + '\n', source_symbols: ['openModelRequest', 'applyDirectBilling'], contract: { whole_body: 'exact' } });
for (const mode of ['direct', 'build']) {
  add(`send.${mode}_beta`, 'SEND', base(), { mode, headers: { 'anthropic-beta': 'context-management-2025-06-27' },
    source_symbols: ['normalizeBetas', 'openModelRequest'], contract: { assertions: ['beta_forwarded', 'worker_auth_only'] } });
  add(`send.${mode}_http_error`, 'SEND', base(), { mode, response_fixture: { status: 429, raw: '{ "type":"error", "error":{"type":"rate_limit_error","message":"local fixture"} }\n' },
    source_symbols: ['openModelRequest', 'requestErrorReader'], contract: { response_status: 429, assertions: ['raw_response_exact', 'retry_after'] } });
  add(`send.${mode}_sse`, 'SEND', { ...base(), stream: true }, { mode, source_symbols: ['readModelResponse', 'requestCommandOutput'], contract: { assertions: ['raw_response_exact', 'sse_complete'] } });
}

body = base(); add('billing_env.environment_no_match', 'BILL_ENV', body, { policy: { build_attachment_sources: { platform_name: 'worker', os_version: 'worker' } }, source_symbols: ['applyContentPolicy', 'ccgatewayEnvironment'] });
body = base(); body.messages[0].content = reminder(environment + ' - Platform: duplicate\n');
add('billing_env.environment_duplicate_field', 'BILL_ENV', body, { policy: { build_attachment_sources: { platform_name: 'worker' } }, source_symbols: ['applyContentPolicy'] });
body = base(); body.messages[0].content = reminder(environment);
add('billing_env.environment_platform_worker', 'BILL_ENV', body, { policy: { build_attachment_sources: { platform_name: 'worker' } }, contract: { content: 'expected_patches', patches: [{ path: ['messages', 0, 'content'], value: reminder(environment.replace('client-platform', 'linux')) }] }, source_symbols: ['applyContentPolicy', 'ccgatewayEnvironment'] });
body = base(); body.messages[0].content = reminder(environment);
add('billing_env.environment_shell_erase', 'BILL_ENV', body, { policy: { build_attachment_sources: { shell: 'erase' } }, contract: { content: 'expected_patches', patches: [{ path: ['messages', 0, 'content'], value: reminder(environment.replace(' - Shell: client-shell\n', '')) }] }, source_symbols: ['applyContentPolicy'] });
body = base(); add('billing_env.billing_missing_native_fill', 'BILL_ENV', body, { policy: { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } }, contract: { content: 'billing_insert' }, source_symbols: ['mergeBillingAttribution', 'ccgatewayCaptureBilling'] });
body = base(); body.messages[0].content = '0123456789abcdefghijklmnopqrstuv';
add('billing_env.billing_different_fingerprint', 'BILL_ENV', body, { policy: { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } }, contract: { content: 'billing_insert' }, source_symbols: ['aW', 'Eg', 'mergeBillingAttribution', 'ccgatewayCaptureBilling'] });
// Two header lines cannot be edited safely: with a Worker-sourced field the
// request is refused with 400, with client sources only it goes unchanged
// (content-policy.js mergeBillingAttribution conflict; build design §5.5
// table, §8). The 2026-10-20 contract kept it in both cases.
body = base(); body.system[0].text = billing + '\n' + billing;
reject('billing_env.billing_duplicate_worker_refused', body, ['mergeBillingAttribution'],
  { group: 'BILL_ENV', policy: { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } } });
body = base(); body.system[0].text = billing + '\n' + billing;
add('billing_env.billing_duplicate_client_kept', 'BILL_ENV', body, { policy: { build_billing_sources: { cc_version: 'client', cc_entrypoint: 'client' } }, source_symbols: ['mergeBillingAttribution'] });
body = base(); body.system[0].text = billing;
add('billing_env.billing_mixed_source', 'BILL_ENV', body, { policy: { build_billing_sources: { cc_version: 'client', cc_entrypoint: 'worker' } },
  contract: { content: 'expected_patches', patches: [{ path: ['system', 0, 'text'], value: billing.replace('cc_entrypoint=client-entry', 'cc_entrypoint=sdk-cli') }] }, source_symbols: ['mergeBillingAttribution'] });

// Generation values the builder cannot carry are sent as the client wrote
// them since CLI v29 (2026-10-25): no 400 any more (request-parameters.js
// generationControls raw; engine request_generation_validation_test.go
// clientGeneration; REQUEST-MODES §1.1). The builder then gets the control as
// if absent: thinking is its mechanical disabled one (request-build.js
// thinkingConfigFor), with the native temperature 1 of a disabled thinking.
for (const value of [0, -1]) {
  paramsCase(`params.max_tokens_${value === 0 ? 'zero' : 'negative'}_as_sent`, { max_tokens: value }, {}, { source_symbols: ['generationControls', 'finishBuilt'] });
}
paramsCase('params.stream_string_as_sent', { stream: 'true' }, {}, { source_symbols: ['generationControls', 'finishBuilt'] });
paramsCase('params.thinking_unknown_type_as_sent', { thinking: { type: 'invalid-fixture' } }, { thinking: { type: 'invalid-fixture' }, temperature: 1 }, { source_symbols: ['generationControls', 'thinkingConfigFor', 'finishBuilt'] });
body = { ...base(), betas: [7] }; reject('input.beta_non_string', body, ['normalizeBetas', 'prepareBuildInput']);
body = { ...base(), requestPolicy: { contract_version: 2 } }; reject('input.reserved_request_policy', body);
paramsCase('params.tool_choice_any', { tools: [tool()], tool_choice: { type: 'any' } }, { tool_choice: { type: 'any' } });
paramsCase('params.top_k_preservation', { top_k: 17 });
paramsCase('params.service_tier_preservation', { service_tier: 'standard_only' });
paramsCase('params.output_config_unknown_key', { output_config: { effort: 'low', x_fixture_opaque: { retained: true } } });
paramsCase('params.unknown_field_preservation', { x_fixture_future_parameter: { retained: true } });
const standalone = () => ({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'Standalone reject fixture' }], parameters: { max_tokens: 128 } });
for (const [id, mutate] of [
  ['input.standalone_unknown_component', value => { value.unknownComponent = 'fixture'; }],
  ['input.standalone_reserved_parameter', value => { value.parameters.messages = []; }],
  ['input.standalone_invalid_beta', value => { value.parameters.betas = [7]; }],
]) {
  body = standalone(); mutate(body);
  add(id, 'INPUT', body, { transport: 'standalone-cli', source_symbols: ['prepareBuildInput'],
    contract: { response_status: null, cli_exit_code: 1, upstream_requests: 0, content: 'rejected', tools: 'not_sent', parameters: {} } });
}
// The unmodified official client's own request (fresh HOME, synthetic key,
// loopback mock). It opens with a complete header, so neither mode adds one:
// build keeps every component (and, on this API-key runtime, its metadata),
// direct keeps every byte.
for (const mode of ['build', 'direct']) {
  add(`messages.official_capture_${mode}`, 'MSG', clone(official), { mode,
    fixture_source: { kind: 'official_fresh_capture', fixture: `fixtures/official-request-${version}.json`, ...officialProvenance },
    contract: { parameters: {}, ...(mode === 'direct' ? { whole_body: 'exact' } : {}) } });
}
for (const item of cases) if (item.fixture_source.kind === 'synthetic' && Array.isArray(item.body.tools) && item.body.tools.some(tool => ['ToolSearch', 'DeferredToolPlaceholder'].includes(tool.name))) {
  item.fixture_source = { kind: 'derived_official_tool_definition', ...officialProvenance };
}
// Build always carries Claude Code's header (CLI v16; build design §5.5:
// "没有计费头...在 system 首部插入原生整行") and direct since v17 (§6.3): a
// request whose system does not open with a complete header gets the native
// line in front. Only a header that cannot be edited (two lines) suppresses it.
const leadingComplete = system => {
  const first = normalizeSystem(system)[0];
  if (first?.type !== 'text' || typeof first.text !== 'string' || !first.text.startsWith('x-anthropic-billing-header:')) return false;
  const keys = [...first.text.split('\n')[0].matchAll(/\b(cc_version|cc_entrypoint)=[^;\s]+;/g)].map(match => match[1]);
  return keys.includes('cc_version') && keys.includes('cc_entrypoint');
};
const headerLines = system => normalizeSystem(system).flatMap(block => typeof block?.text === 'string' ? block.text.split('\n') : []).filter(line => line.startsWith('x-anthropic-billing-header:')).length;
for (const item of cases) {
  if (item.contract.content === 'rejected' || item.transport === 'standalone-cli' || item.contract.content === 'billing_insert') continue;
  if (headerLines(item.body.system) > 1 || leadingComplete(item.body.system)) continue;
  item.contract.content = 'billing_insert';
}
const manifest = { schema_version: 2, suite: 'native-assembly-first-party-' + version, cc_version: version,
  source_symbol_aliases: { Kvt: 'Adapter import alias bound to the native request builder (2.1.304 jOt)' },
  source_symbols_version: '2.1.304 (names in the recovered 2.1.304 source; other versions map them through artifacts/claude-<version>/equiv-*.json)',
  scope: { provider: 'first-party Anthropic Messages', runtime_account: 'API key (assembly-runtime.cjs)', transports: ['request --build', 'request --direct'], excludes: ['Bedrock', 'Vertex', 'interactive agent/tool execution loop', 'OAuth identity line and account identity'] },
  artifact_pins: 'Supplied by the caller at run time: PROBE_EXPECT_CLI_SHA, PROBE_EXPECT_WORKER_SHA; unpinned runs report sha_unpinned',
  cases };
if (new Set(cases.map(item => item.id)).size !== cases.length) throw Error('duplicate stable case id');
const output = fixturePath('assembly-cases', version);
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(process.cwd(), output), cases: cases.length,
  billing_insert: cases.filter(item => item.contract.content === 'billing_insert').length,
  groups: Object.fromEntries([...new Set(cases.map(item => item.group))].map(group => [group, cases.filter(item => item.group === group).length])) }));
