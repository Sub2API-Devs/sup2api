import { Kvt, MDe, ccgatewayEnvironment, ccgatewayEnvironmentVocabulary } from './chunk-kasbfbhj.js';
import { oJe } from './chunk-7y2kvacy.js';
import { KF, lKe } from './chunk-jkcb7qdd.js';
import { El } from './chunk-0ycjphb5.js';
import { registerNative, findNative } from './ccgateway-native-tools.js';
import { prepareBuildInput, fingerprintMessages } from './ccgateway-request-input.js';
import { normalizeBetas } from './ccgateway-request-options.js';
import { getRootSession } from './chunk-q61sszgr.js';
import { YEr } from './chunk-6dwnw6av.js';
import { createContentPolicy } from './ccgateway-content-policy.js';
import { validateRequestPolicy, runtimeContext, contentDiagnostic, identityLineFor } from './ccgateway-request-policy.js';
import { validateBuildParameters, wireToolDefinitions, mergeAdditionalParameters } from './ccgateway-request-parameters.js';

// The content policy recognizes CC's own wording: the environment renderers'
// vocabulary, the billing header (oJe) and the reminder tags (KF, lKe), all native.
let contentPolicy;
const nativeContentPolicy = () => contentPolicy ??= createContentPolicy({ ...ccgatewayEnvironmentVocabulary(), billingHeader: oJe, reminder: [KF, lKe] });

// resolveAgent (request-agent.js, bound to the Worker context) picks the kind of
// request CC builds from the client's leading billing header and first prompt;
// without it the request is CC's native main thread.
export async function buildRequest(components, headers, signal, resolveAgent) {
  const { applyContentPolicy, mergeBillingAttribution, billingEntrypoint, leadingBilling, setLeadingBillingField } = nativeContentPolicy();
  const { requestPolicy, runtimeContext: suppliedContext, ...external } = components;
  validateBuildParameters(external.parameters);
  const policy = validateRequestPolicy(requestPolicy);
  const context = runtimeContext(suppliedContext);
  const initial = prepareBuildInput(external, MDe, { preserveContent: true });
  // Policy sees the exact resolved carriers, before the native builder computes
  // the fingerprint. It never receives or overlays generation parameters.
  const rawMessages = initial.messages.flatMap(row => {
    if (row.type !== 'attachment') return [structuredClone(row.ccgatewayWireSystem ?? row.ccgatewayWireMessage ?? row.message)];
    const rendered = MDe(row);
    if (!rendered.isKnownType) throw Error('Unknown CC attachment type');
    return rendered.messages.map(item => ({ role: row.renderedRole ?? item.message.role, content: structuredClone(item.message.content) }));
  });
  const transformed = await applyContentPolicy({ system: initial.systemBlocks, messages: rawMessages }, policy, {
    readEnvironment: fields => ccgatewayEnvironment(context, fields),
  }, contentDiagnostic);
  const input = prepareBuildInput({ ...external, systemPrompt: transformed.system, messages: transformed.messages, attachments: [] }, MDe, { preserveContent: true });
  const body = input.request, session = getRootSession();
  const fingerprint = fingerprintMessages(transformed.messages, KF);
  const agent = resolveAgent?.({ billing: leadingBilling(initial.systemBlocks), prompt: fingerprint[0].message.content });
  let nativeBilling;
  const clientBetas = normalizeBetas(new Headers(headers).get('anthropic-beta'), body.betas);
  if (clientBetas.length && !YEr(clientBetas)) throw Error('Experimental betas are disabled by the active CC policy');
  // Resolve typed payloads using CC's own renderer, and preserve the caller's
  // explicit role on the resulting text snapshot. This is not type inference.
  for (const row of input.messages) {
    if (row.type !== 'attachment' || row.rendered !== undefined) continue;
    const rendered = MDe(row);
    if (!rendered.isKnownType) throw new Error(`Unknown CC attachment type: ${row.attachment.type}`);
    if (rendered.messages.length && rendered.messages.every(m => typeof m.message.content === 'string' || m.message.content.every(b => b.type === 'text'))) {
      row.rendered = rendered.messages.map(m => ({ content: m.message.content }));
    }
  }
  const tools = input.customTools.map(tool => {
    registerNative(session, 'ccgateway-request', { name: tool.name, description: tool.description ?? '', inputSchema: tool.input_schema, isDeferred: tool.defer_loading });
    const registered = findNative(session, tool.name);
    registered.ccgatewayRequestDefinition = tool;
    return registered;
  });
  const thinking = body.thinking;
  const thinkingConfig = thinking?.type === 'enabled'
    ? { type: 'enabled', budgetTokens: thinking.budget_tokens, display: thinking.display }
    : thinking?.type === 'adaptive' ? { type: 'enabled', display: thinking.display }
      : { type: 'disabled', mechanical: true };
  const options = {
    model: body.model, querySource: agent?.querySource ?? 'sdk', agentContext: agent?.agentContext ?? El(),
    isNonInteractiveSession: true, withoutToolDescribeHooks: true,
    getToolPermissionContext: async () => ({ mode: 'default', alwaysAllowRules: {}, alwaysDenyRules: {}, alwaysAskRules: {}, additionalWorkingDirectories: new Map() }),
    agents: [], allowedAgentTypes: [], mcpClients: [],
    extraToolSchemas: input.extraToolSchemas, toolChoice: body.tool_choice,
    maxOutputTokensOverride: body.max_tokens, effortValue: body.output_config?.effort,
    temperatureOverride: body.temperature, outputFormat: body.output_config?.format,
    enablePromptCaching: false, skipMessageCacheMarkers: true,
    // Native model rules own generation parameters; never overlay the input
    // body onto their result (in particular thinking and tool_choice).
    ccgatewayBuildOnly: true,
    ccgatewayRequestBetas: clientBetas, ccgatewaySystemBlocks: input.systemBlocks,
    ccgatewayWireMessages: transformed.messages,
    ccgatewayWireTools: wireToolDefinitions(external.tools),
    ccgatewayCaptureBilling: value => { nativeBilling = value; },
    ccgatewayFingerprintMessages: fingerprint,
  };
  let built;
  for await (const event of Kvt({ messages: input.messages, systemPrompt: input.systemPrompt, thinkingConfig, tools, signal, options })) {
    if (signal.aborted) throw signal.reason;
    if (event.type === 'ccgateway_request') { built = event.body; break; }
    if (event.type === 'assistant' && event.isApiErrorMessage) throw new Error(`CC request builder: ${JSON.stringify(event.message?.content)}`);
  }
  if (!built) throw new Error('CC request builder did not produce a request');
  // Preserve only parameters which the native builder does not own. Its
  // normalized model/thinking/tool choice/metadata and output effort/format
  // remain authoritative, including intentional omission of those fields.
  built = mergeAdditionalParameters(built, external.parameters);
  built.system = mergeBillingAttribution(built.system, policy, nativeBilling, contentDiagnostic);
  // The client's header names its prompt; it must match the mapped prompt header.
  if (agent?.billingPromptId) built.system = setLeadingBillingField(built.system, 'cc_prompt_id', agent.billingPromptId);
  // The identity line follows the entrypoint the header now carries.
  const identityLine = identityLineFor(policy, billingEntrypoint(built.system));
  const outgoingHeaders = new Headers(headers);
  const betas = normalizeBetas(clientBetas, built.betas);
  delete built.betas;
  if (betas.length) outgoingHeaders.set('anthropic-beta', betas.join(','));
  else outgoingHeaders.delete('anthropic-beta');
  return { body: { ...built, stream: body.stream === true }, headers: Object.fromEntries(outgoingHeaders), identityLine, agent };
}
