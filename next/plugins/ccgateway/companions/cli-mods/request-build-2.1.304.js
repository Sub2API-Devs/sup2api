import { Kvt, MDe, ccgatewayEnvironment, ccgatewayEnvironmentVocabulary, ccgatewayDefaultPrompt, ccgatewayLayerAttachments, ccgatewayLayerVocabulary, ccgatewayMarkTurns, ccgatewayPermissionContext } from './chunk-kasbfbhj.js';
import { oJe } from './chunk-7y2kvacy.js';
import { KF, lKe } from './chunk-jkcb7qdd.js';
import { El } from './chunk-0ycjphb5.js';
import { m4t as nativeToolPool } from './chunk-eanw7pgv.js';
import { t1n as isIdentityLine } from './chunk-t61vswm2.js';
import { registerNative, findNative } from './ccgateway-native-tools.js';
import { prepareBuildInput, fingerprintMessages } from './ccgateway-request-input.js';
import { normalizeBetas } from './ccgateway-request-options.js';
import { getRootSession } from './chunk-q61sszgr.js';
import { YEr } from './chunk-6dwnw6av.js';
import { createContentPolicy } from './ccgateway-content-policy.js';
import { validateRequestPolicy, runtimeContext, contentDiagnostic, identityLineFor, injectionChoices, defaultEntrypoint } from './ccgateway-request-policy.js';
import { validateBuildParameters, wireToolDefinitions, mergeAdditionalParameters } from './ccgateway-request-parameters.js';

// The content policy recognizes CC's own wording: the environment renderers'
// vocabulary, the billing header (oJe) and the reminder tags (KF, lKe), all native.
let contentPolicy, layerVocabulary;
const nativeContentPolicy = () => contentPolicy ??= createContentPolicy({ ...ccgatewayEnvironmentVocabulary(), billingHeader: oJe, reminder: [KF, lKe] });
const nativeLayers = () => layerVocabulary ??= ccgatewayLayerVocabulary();

const firstPrompt = 'CCGATEWAY_FIRST_PROMPT_7d3c1a';
const toBlocks = content => typeof content === 'string' ? [{ type: 'text', text: content }] : content;

// The texts a request carries CC's attachments in: system turns, and user
// blocks that are reminders (CC's own carriers; a prompt is never read).
function attachmentCarriers(messages) {
  return messages.flatMap(message => {
    const texts = toBlocks(message.content ?? []).filter(block => block?.type === 'text' && typeof block.text === 'string').map(block => block.text);
    return message.role === 'system' ? texts : message.role === 'user' ? texts.filter(text => text.trimStart().startsWith(KF)) : [];
  });
}
const opensWith = (texts, openings) => texts.some(text => openings.some(opening => text.startsWith(opening) || text.includes('\n' + opening)));

// injectLayers gives a request that is not Claude Code's (no billing header)
// what its level adds of CC's own and the request does not already carry
// (2026-10-23): CC's tools by name (a client tool of that name stays the
// client's), its main-thread system prompt (unless the system already has
// CC's) and its first-turn attachments (unless one already opens a carrier).
// CC's own builder makes all of it in a probe run: a one-prompt session with
// the chosen tools, prompt and attachments, so the tool definitions, the
// prompt blocks with their cache markers, the betas those need and where the
// attachments go (a system turn or reminders, per model) are what CC sends.
// With the prompt, the client's own system is CC's appended prompt
// (--append-system-prompt), in CC's dynamic block; otherwise the client's
// system stays as it was. CC's tools go in front of the client's, and the
// attachments around its first prompt.
async function injectLayers(injection, { model, context, clientSystem, clientTools, clientToolNames, messages, clientRecords, session, options, signal }) {
  const chosen = injectionChoices(injection), vocabulary = nativeLayers();
  const names = chosen.tools.filter(name => !clientToolNames.has(name));
  const carriers = attachmentCarriers(messages);
  const kinds = chosen.attachments.filter(kind => !opensWith(carriers, vocabulary.attachments[kind]));
  const prompt = chosen.systemPrompt && !clientSystem.some(block => block.text.includes(vocabulary.systemPrompt));
  if (!names.length && !kinds.length && !prompt) return null;
  // The tools go in CC's own order (assembleToolPool sorts them by name).
  const pool = names.length ? nativeToolPool(ccgatewayPermissionContext(), [], {}) : [];
  const missing = names.filter(name => !pool.some(tool => tool.name === name));
  if (missing.length) throw Error(`Claude Code tool ${missing.join(', ')} is not available; this CLI has ${pool.map(tool => tool.name).join(', ')}`);
  const tools = pool.filter(tool => names.includes(tool.name));
  // An identity line in the client's system stays its own line, in front.
  const lines = prompt ? clientSystem.filter(block => isIdentityLine(block.text)) : [];
  const own = prompt ? clientSystem.filter(block => !isIdentityLine(block.text)).map(block => block.text) : [];
  const systemPrompt = prompt ? await ccgatewayDefaultPrompt([...tools, ...clientTools], model, own) : [];
  const probe = prepareBuildInput({ model, messages: [{ role: 'user', content: firstPrompt }] }, MDe);
  const attachments = await ccgatewayLayerAttachments(kinds, { model, ...context, records: clientRecords, session });
  const records = [...probe.messages, ...attachments.map(attachment => ({ type: 'attachment', uuid: crypto.randomUUID(), timestamp: new Date().toISOString(), attachment }))];
  let built;
  for await (const event of Kvt({ messages: records, systemPrompt, thinkingConfig: { type: 'disabled', mechanical: true }, tools, signal,
    // CC's cache markers on its prompt, as CC decides them.
    options: { ...options, enablePromptCaching: prompt ? undefined : false, extraToolSchemas: [], toolChoice: undefined, ccgatewayNativeProbe: true, ccgatewayCaptureBilling: undefined } })) {
    if (signal.aborted) throw signal.reason;
    if (event.type === 'ccgateway_request') { built = event.body; break; }
    if (event.type === 'assistant' && event.isApiErrorMessage) throw new Error(`CC request builder: ${JSON.stringify(event.message?.content)}`);
  }
  if (!built) throw new Error('CC request builder did not produce the injected layers');
  // The billing header and the identity line are the other layers' (merged
  // after build), so only the prompt blocks are taken.
  const system = prompt ? (Array.isArray(built.system) ? built.system : []).filter(block => !block.text.startsWith(oJe) && !isIdentityLine(block.text)) : [];
  const at = built.messages.findIndex(message => toBlocks(message.content).some(block => block.type === 'text' && block.text.includes(firstPrompt)));
  if (at < 0) throw new Error('CC request builder lost the first prompt');
  const blocks = toBlocks(built.messages[at].content), mark = blocks.findIndex(block => block.type === 'text' && block.text.includes(firstPrompt));
  if (blocks[mark].text !== firstPrompt) throw new Error('CC request builder merged an attachment into the prompt');
  return {
    // With the prompt the client's system is in it (its own line in front),
    // as CC's appended prompt when it had any.
    system: prompt ? [...lines, ...system] : undefined, appended: own.length > 0,
    // Every tool the probe sends is for the chosen ones.
    tools: names.length ? built.tools ?? [] : [],
    betas: built.betas ?? [],
    before: built.messages.slice(0, at), after: built.messages.slice(at + 1),
    prepend: blocks.slice(0, mark), append: blocks.slice(mark + 1),
  };
}

// Upstream takes at most four cache breakpoints. CC's own markers on the
// injected prompt give way first, the dynamic block's before the static one.
const maxBreakpoints = 4;
function limitBreakpoints(body, injected) {
  const marked = block => block !== null && typeof block === 'object' && block.cache_control !== undefined;
  const count = [...body.system ?? [], ...body.tools ?? [], ...(body.messages ?? []).flatMap(message => Array.isArray(message.content) ? message.content : [])].filter(marked).length;
  let excess = count - maxBreakpoints;
  for (const text of injected.filter(marked).map(block => block.text).reverse()) {
    if (excess <= 0) break;
    const block = body.system.find(item => item.text === text && marked(item));
    if (block) { delete block.cache_control; excess--; }
  }
  return body;
}

// markPrompt gives the client's prompts what CC's query loop gives a main
// thread's (ccgatewayMarkTurns: iws, h0n), and the last one the prompt ID, so
// CC's own header (PAs) writes cc_prompt_id (the prompt ID header's value) and
// the turn fields as CC does. The terminal entrypoint is a human typing.
function markPrompt(records, promptId, entrypoint) {
  const last = ccgatewayMarkTurns(records, entrypoint === 'cli');
  if (last && promptId !== undefined) last.promptId = promptId;
}

// placeLayers puts the probe's additions where CC put them, around the
// client's first prompt.
function placeLayers(messages, layers) {
  const at = messages.findIndex(message => message.role === 'user');
  if (at < 0) return messages;
  const first = structuredClone(messages[at]);
  if (layers.prepend.length || layers.append.length) first.content = [...structuredClone(layers.prepend), ...toBlocks(first.content), ...structuredClone(layers.append)];
  return [...messages.slice(0, at), ...structuredClone(layers.before), first, ...structuredClone(layers.after), ...messages.slice(at + 1)];
}

// resolveAgent (request-agent.js, bound to the Worker context) picks the kind of
// request CC builds from the client's leading billing header and first prompt;
// without it the request is CC's native main thread.
export async function buildRequest(components, headers, signal, resolveAgent) {
  const { applyContentPolicy, mergeBillingAttribution, billingEntrypoint, requestBilling, hasBilling, setLeadingBillingField } = nativeContentPolicy();
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
  // The client's own header, wherever it is, makes the request Claude Code's
  // (hasBilling decides the same): its kind and IDs come from that header.
  const clientBilling = requestBilling(initial.systemBlocks);
  const agent = resolveAgent?.({ billing: clientBilling, prompt: fingerprint[0].message.content });
  if (!agent || agent.requestClass === 'main') markPrompt(input.messages, agent?.promptId, clientBilling?.cc_entrypoint ?? policy.build_billing_entrypoint ?? defaultEntrypoint);
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
    getToolPermissionContext: async () => ccgatewayPermissionContext(),
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
  // A request with a billing header is Claude Code's own and only has its
  // fields and attachments converted; one without gets the chosen layers.
  const layers = hasBilling(initial.systemBlocks) ? null
    : await injectLayers(policy.build_injection, { model: body.model, context, clientSystem: input.systemBlocks, clientTools: tools,
      clientToolNames: new Set((external.tools ?? []).map(tool => tool?.name)), messages: transformed.messages, clientRecords: input.messages, session, options, signal });
  if (layers) {
    if (layers.system) options.ccgatewaySystemBlocks = layers.system;
    options.ccgatewayWireMessages = placeLayers(transformed.messages, layers);
    if (layers.tools.length) options.ccgatewayWireTools = [...layers.tools, ...options.ccgatewayWireTools ?? []];
  }
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
  if (layers?.system) built = limitBreakpoints(built, layers.system);
  built.system = mergeBillingAttribution(built.system, policy, nativeBilling, contentDiagnostic);
  // The client's header names its prompt; it must match the mapped prompt header.
  if (agent?.billingPromptId) built.system = setLeadingBillingField(built.system, 'cc_prompt_id', agent.billingPromptId);
  // A request that is not Claude Code's gets the identity line for the
  // entrypoint its header now carries (with the appended line when build gave
  // it CC's prompt with the client's system appended). Claude Code's own
  // request is left as it is (2026-10-23): its side requests have no line.
  const identityLine = clientBilling !== null ? { line: 'none', fallback: identityLineFor(policy, billingEntrypoint(built.system)).fallback }
    : identityLineFor(policy, billingEntrypoint(built.system), { appended: layers?.appended === true });
  const outgoingHeaders = new Headers(headers);
  const betas = normalizeBetas(clientBetas, built.betas, layers?.betas);
  delete built.betas;
  if (betas.length) outgoingHeaders.set('anthropic-beta', betas.join(','));
  else outgoingHeaders.delete('anthropic-beta');
  return { body: { ...built, stream: body.stream === true }, headers: Object.fromEntries(outgoingHeaders), identityLine, agent };
}
