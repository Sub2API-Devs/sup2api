// Regenerate the static, reviewable assembly-cases.json fixture. This file
// constructs test data only; it imports no production implementation.
const fs = require('node:fs'), path = require('node:path');
const definitions = require('./official-tools-2.1.304.json').tools;
const officialProvenance = require('./official-tools-2.1.304.json');
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
const nativeAuthorized = { metadata: 'CLI regenerates device/session metadata; not request-body passthrough',
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
function reject(id, body, symbols = ['validateBuildContent', 'prepareBuildInput']) {
  add(id, 'INPUT', body, { source_symbols: symbols, contract: { response_status: 400, upstream_requests: 0, content: 'rejected', tools: 'not_sent', parameters: {} } });
}
let body = base(); body.messages[0].content = [{ type: 'text', text: null }]; reject('input.null_text', body);
body = base(); body.tools = [tool()]; body.messages.push(
  { role: 'assistant', content: [{ type: 'tool_use', id: 'x', name: 'lookup', input: { unsafe: 9007199254740992 } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'fixture' }] }); reject('input.unsafe_number', body, ['validateBuildNumbers']);
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
paramsCase('params.metadata_regenerated', { metadata: { user_id: 'client-metadata-must-not-be-provider-identity' } }, {}, { contract: { parameters: { model: 'claude-sonnet-4-6', max_tokens: 128, stream: false }, assertions: ['metadata_regenerated'] } });
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

body = { ...base(), top_p: 0.4, stop_sequences: ['STOP_DIRECT'], metadata: { user_id: 'direct-fixture' }, unknown_direct_field: { retained: true } };
add('send.direct_exact', 'SEND', body, { mode: 'direct', raw_body: JSON.stringify(body, null, 3) + '\n', source_symbols: ['openModelRequest'], contract: { whole_body: 'exact' } });
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
body = base(); body.system[0].text = billing + '\n' + billing;
add('billing_env.billing_duplicate_keep', 'BILL_ENV', body, { policy: { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } }, source_symbols: ['mergeBillingAttribution'] });
body = base(); body.system[0].text = billing;
add('billing_env.billing_mixed_source', 'BILL_ENV', body, { policy: { build_billing_sources: { cc_version: 'client', cc_entrypoint: 'worker' } },
  contract: { content: 'expected_patches', patches: [{ path: ['system', 0, 'text'], value: billing.replace('cc_entrypoint=client-entry', 'cc_entrypoint=sdk-cli') }] }, source_symbols: ['mergeBillingAttribution'] });

for (const value of [0, -1]) {
  body = { ...base(), max_tokens: value };
  reject(`input.max_tokens_${value === 0 ? 'zero' : 'negative'}`, body, ['buildRequest', 'qmn.uXn']);
}
body = { ...base(), stream: 'true' }; reject('input.stream_not_boolean', body);
body = { ...base(), thinking: { type: 'invalid-fixture' } }; reject('input.thinking_invalid_type', body, ['buildRequest']);
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
const official = require('./official-request-2.1.304.json');
for (const mode of ['build', 'direct']) {
  add(`messages.official_304_${mode}`, 'MSG', clone(official), { mode,
    fixture_source: { kind: 'official_fresh_capture', source_cli_sha256: officialProvenance.source_cli_sha256, body_sha256: officialProvenance.body_sha256 },
    contract: { parameters: {}, ...(mode === 'direct' ? { whole_body: 'exact' } : {}) } });
}
for (const item of cases) if (item.fixture_source.kind === 'synthetic' && Array.isArray(item.body.tools) && item.body.tools.some(tool => ['ToolSearch', 'DeferredToolPlaceholder'].includes(tool.name))) {
  item.fixture_source = { kind: 'derived_official_tool_definition', source_cli_sha256: officialProvenance.source_cli_sha256, body_sha256: officialProvenance.body_sha256 };
}
const manifest = { schema_version: 1, suite: 'native-assembly-first-party-2.1.304',
  source_symbol_aliases: { Kvt: 'Adapter import alias bound to native jOt in the pinned 2.1.304 profile' },
  scope: { provider: 'first-party Anthropic Messages', transports: ['request --build', 'request --direct'], excludes: ['Bedrock', 'Vertex', 'interactive agent/tool execution loop'] },
  expected_worker_sha256: '98f2746fed500a3b6fb4a6574431d2ebe74bd1ea8e269f6b07895149eced79db',
  expected_cli_sha256: '138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd', cases };
if (new Set(cases.map(item => item.id)).size !== cases.length) throw Error('duplicate stable case id');
fs.writeFileSync(path.join(__dirname, 'assembly-cases.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, groups: Object.fromEntries([...new Set(cases.map(item => item.group))].map(group => [group, cases.filter(item => item.group === group).length])) }));
