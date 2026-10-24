import { jOt, aBe, ccgatewayEnvironment, ccgatewayEnvironmentVocabulary, ccgatewayDefaultPrompt, ccgatewayLayerAttachments, ccgatewayLayerVocabulary, ccgatewayMarkTurns, ccgatewayPermissionContext, ccgatewaySystemRecord } from './chunk-rncrmfyt.js';
import { oJe, B1s as isBillingHeader } from './chunk-7y2kvacy.js';
import { KF, lKe } from './chunk-jkcb7qdd.js';
import { Al } from './chunk-7p6jp6kj.js';
import { m4t as nativeToolPool } from './chunk-eanw7pgv.js';
import { n1n as identityLine, t1n as isIdentityLine } from './chunk-t61vswm2.js';
import { requestTool } from './ccgateway-native-tools.js';
import { prepareBuildInput, wireMessages, wireRecords, fingerprintMessages } from './ccgateway-request-input.js';
import { normalizeBetas, setProtocolHeaders } from './ccgateway-request-headers.js';
import { getRootSession, setEntrypointOnRequests } from './chunk-72vwyp9d.js';
import { createContentPolicy } from './ccgateway-content-policy.js';
import { validateRequestPolicy, runtimeContext, contentDiagnostic, identityLineFor, injectionChoices } from './ccgateway-request-policy.js';
import { validateBuildParameters, wireToolDefinitions, mergeAdditionalParameters } from './ccgateway-request-parameters.js';
import { toBlocks } from './ccgateway-shared.js';

// The content policy recognizes CC's own wording: the environment renderers'
// vocabulary, the billing header (oJe) and the reminder tags (KF, lKe), all native.
let contentPolicy, layerVocabulary;
const nativeContentPolicy = () => contentPolicy ??= createContentPolicy({ ...ccgatewayEnvironmentVocabulary(), billingHeader: oJe, reminder: [KF, lKe] });
const nativeLayers = () => layerVocabulary ??= ccgatewayLayerVocabulary();

const firstPrompt = 'CCGATEWAY_FIRST_PROMPT_7d3c1a';

// collectBuilt runs CC's request builder (jOt, patched to yield the request
// instead of sending it) and returns the request body.
async function collectBuilt(input, signal, missing) {
  for await (const event of jOt(input)) {
    if (signal.aborted) throw signal.reason;
    if (event.type === 'ccgateway_request') { if (!event.body) break; return event.body; }
    if (event.type === 'assistant' && event.isApiErrorMessage) throw new Error(`CC request builder: ${JSON.stringify(event.message?.content)}`);
  }
  throw new Error(missing);
}

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
  const probe = prepareBuildInput({ model, messages: [{ role: 'user', content: firstPrompt }] }, aBe, { systemRecord: ccgatewaySystemRecord });
  const attachments = await ccgatewayLayerAttachments(kinds, { model, ...context, records: clientRecords, session });
  const records = [...probe.messages, ...attachments.map(attachment => ({ type: 'attachment', uuid: crypto.randomUUID(), timestamp: new Date().toISOString(), attachment }))];
  const built = await collectBuilt({ messages: records, systemPrompt, thinkingConfig: { type: 'disabled', mechanical: true }, tools, signal,
    // CC's cache markers on its prompt, as CC decides them.
    options: { ...options, enablePromptCaching: prompt ? undefined : false, extraToolSchemas: [], toolChoice: undefined, ccgatewayNativeProbe: true, ccgatewayCaptureBilling: undefined, ccgatewayCapturePrefix: undefined, recordedCliPrefix: undefined } },
  signal, 'CC request builder did not produce the injected layers');
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
    system: prompt ? [...lines, ...system] : undefined, ownLines: lines.length, appended: own.length > 0,
    // Every tool the probe sends is for the chosen ones.
    tools: names.length ? built.tools ?? [] : [],
    betas: built.betas ?? [],
    before: built.messages.slice(0, at), after: built.messages.slice(at + 1),
    prepend: blocks.slice(0, mark), append: blocks.slice(mark + 1),
  };
}

// Upstream takes at most four cache breakpoints. CC's own markers on the
// injected prompt give way first, the dynamic block's before the static one.
// The prompt is the system's blocks from `at` on (after the client's own
// identity lines), so a client block keeps its marker whatever its text.
const maxBreakpoints = 4;
function limitBreakpoints(body, at) {
  const marked = block => block !== null && typeof block === 'object' && block.cache_control !== undefined;
  const count = [...body.system ?? [], ...body.tools ?? [], ...(body.messages ?? []).flatMap(message => Array.isArray(message.content) ? message.content : [])].filter(marked).length;
  for (let i = body.system.length - 1, excess = count - maxBreakpoints; i >= at && excess > 0; i--) {
    if (marked(body.system[i])) { delete body.system[i].cache_control; excess--; }
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

// The client's custom tools as CC tools, for CC's own policy; the wire keeps
// the client's definitions (ccgatewayRequestDefinition).
const clientTools = customTools => customTools.map(tool => ({
  ...requestTool({ name: tool.name, description: tool.description ?? '', inputSchema: tool.input_schema, isDeferred: tool.defer_loading }),
  ccgatewayRequestDefinition: tool,
}));

// The client's thinking as CC's thinking configuration, which CC's model rules
// turn back into the request's.
const thinkingConfigFor = thinking => thinking?.type === 'enabled'
  ? { type: 'enabled', budgetTokens: thinking.budget_tokens, display: thinking.display }
  : thinking?.type === 'adaptive' ? { type: 'enabled', display: thinking.display }
    : { type: 'disabled', mechanical: true };

// identityLineInputs are the selector's own inputs for the contract's line
// names (request-policy.js identityLineChoices): n1n renders the text, so no
// wording lives here.
const identityLineInputs = {
  official_cli: { isNonInteractive: false, hasAppendSystemPrompt: false },
  official_cli_sdk: { isNonInteractive: true, hasAppendSystemPrompt: true },
  agent_sdk: { isNonInteractive: true, hasAppendSystemPrompt: false },
};
function identityLineText(name) {
  const inputs = identityLineInputs[name];
  if (!inputs) throw new Error(`Unknown Claude Code identity line: ${name}`);
  return identityLine(inputs);
}

// identityRequest is the line the request gets once build has filled its
// header (request-policy.js identityLineFor) and the value the builder records
// for it (recordedCliPrefix): null leaves the system without a line, which is
// what an API-key build, a request that is Claude Code's own (it carries a
// billing header), and a system that already carries one of CC's lines get.
// Otherwise the builder records the chosen line's text, and CC's own attribution
// assembly (PAs) puts it after the header, before the prompt; the patched body
// captures it there.
function identityRequest(policy, entrypoint, { clientBilling, appended, system, apiKey }) {
  const chosen = identityLineFor(policy, entrypoint, { appended });
  const own = clientBilling !== null;
  const line = own ? 'none' : chosen.line;
  const carried = (Array.isArray(system) ? system : []).some(block => block?.type === 'text' && isIdentityLine(block.text));
  return {
    entrypoint: chosen.entrypoint, line, fallback: chosen.fallback, lineEnabled: !apiKey,
    recorded: apiKey || own || carried ? null : identityLineText(line),
  };
}

// applyIdentityLine puts the line where PAs did: after the billing header when
// one opens the system, else first. rendered is the text CC's own selector
// produced (captured from PAs), or null when the builder recorded none. A
// client's own line is never replaced or duplicated, and a request that is
// Claude Code's own keeps its system as it is; when no header could be filled
// in front of such a system, the entrypoint's own line opens it (upstream
// takes a header or a line first, 2026-10-21).
function applyIdentityLine(built, identity, rendered) {
  if (!identity.lineEnabled) return built;
  const blocks = Array.isArray(built.system) ? built.system : toBlocks(built.system);
  if (!Array.isArray(blocks)) return built;
  const first = blocks[0], text = first?.type === 'text' ? first.text : undefined;
  if (text !== undefined && isBillingHeader(first)) {
    if (blocks.some(block => block?.type === 'text' && isIdentityLine(block.text))) return built;
    if (identity.line === 'none' || rendered === null) return built;
    if (!isIdentityLine(rendered)) throw new Error('Missing native Claude Code system line');
    built.system = [blocks[0], { type: 'text', text: rendered }, ...blocks.slice(1)];
    return built;
  }
  if (text !== undefined && isIdentityLine(text)) return built;
  const line = identity.line === 'none' ? identityLineText(identity.fallback) : rendered ?? identityLineText(identity.line);
  if (!isIdentityLine(line)) throw new Error('Missing native Claude Code system line');
  built.system = [{ type: 'text', text: line }, ...blocks];
  return built;
}

// buildRequest has CC build the request from the components. resolveAgent
// (request-agent.js, bound to the Worker context) picks the kind of request CC
// builds from the client's leading billing header and first prompt; without
// it the request is CC's native main thread. apiKey says whether build adds
// Claude Code's identity line (OAuth only, 2026-10-21).
export async function buildRequest(components, headers, signal, resolveAgent, { apiKey = false } = {}) {
  const billing = nativeContentPolicy();
  const { requestPolicy, runtimeContext: suppliedContext, ...external } = components;
  validateBuildParameters(external.parameters);
  const policy = validateRequestPolicy(requestPolicy);
  const context = runtimeContext(suppliedContext);
  const initial = prepareBuildInput(external, aBe, { preserveContent: true, systemRecord: ccgatewaySystemRecord });
  // The request's entrypoint, the one its header will carry (the client's own
  // or the configured one), is set the way CC sets it for a request
  // (setEntrypointOnRequests): the native header (PAs) and the User-Agent
  // (dN) both read it, so the two agree as they do in Claude Code.
  const entrypoint = billing.requestEntrypoint(initial.systemBlocks, policy);
  setEntrypointOnRequests(entrypoint);
  const content = await convertContent(initial, policy, context);
  const records = wireRecords(content.messages, external.model, ccgatewaySystemRecord), session = getRootSession();
  const fingerprint = fingerprintMessages(content.messages, KF);
  // The client's own header, wherever it is, makes the request Claude Code's
  // (hasBilling decides the same): its kind and IDs come from that header.
  const clientBilling = billing.requestBilling(initial.systemBlocks);
  const agent = resolveAgent?.({ billing: clientBilling, prompt: fingerprint[0].message.content });
  if (!agent || agent.requestClass === 'main') markPrompt(records, agent?.promptId, entrypoint);
  const body = initial.request, clientBetas = normalizeBetas(new Headers(headers).get('anthropic-beta'), body.betas);
  const tools = clientTools(initial.customTools);
  const native = {};
  const options = buildOptions(body, initial, content, { agent, clientBetas, fingerprint, tools: external.tools, captureBilling: value => { native.billing = value; }, capturePrefix: value => { native.prefix = value; } });
  // A request with a billing header is Claude Code's own and only has its
  // fields and attachments converted; one without gets the chosen layers.
  const layers = billing.hasBilling(initial.systemBlocks) ? null
    : await injectLayers(policy.build_injection, { model: body.model, context, clientSystem: content.system, clientTools: tools,
      clientToolNames: new Set((external.tools ?? []).map(tool => tool?.name)), messages: content.messages, clientRecords: records, session, options, signal });
  if (layers) applyLayers(options, layers, content.messages);
  // The line the builder records (n1n through recordedCliPrefix) and the
  // patched body puts in front of the prompt, as PAs does.
  const identity = identityRequest(policy, entrypoint, { clientBilling, appended: layers?.appended === true, system: content.system, apiKey });
  options.recordedCliPrefix = identity.recorded;
  const built = await collectBuilt({ messages: records, systemPrompt: content.system.map(block => block.text), thinkingConfig: thinkingConfigFor(body.thinking), tools, signal, options }, signal, 'CC request builder did not produce a request');
  return finishBuilt(built, { body, headers, external, policy, nativeBilling: native.billing, agent, clientBilling, clientBetas, layers, identity });
}

// convertContent applies the content policy to the system and messages as the
// wire carries them, before the native builder computes the fingerprint. It
// never receives or overlays generation parameters.
function convertContent(initial, policy, context) {
  return nativeContentPolicy().applyContentPolicy({ system: initial.systemBlocks, messages: wireMessages(initial.messages, aBe) }, policy, {
    readEnvironment: fields => ccgatewayEnvironment(context, fields),
  }, contentDiagnostic);
}

// buildOptions are CC's query options for the client's request.
function buildOptions(body, initial, content, { agent, clientBetas, fingerprint, tools, captureBilling, capturePrefix }) {
  return {
    model: body.model, querySource: agent?.querySource ?? 'sdk', agentContext: agent?.agentContext ?? Al(),
    isNonInteractiveSession: true, withoutToolDescribeHooks: true,
    getToolPermissionContext: async () => ccgatewayPermissionContext(),
    agents: [], allowedAgentTypes: [], mcpClients: [],
    extraToolSchemas: initial.extraToolSchemas, toolChoice: body.tool_choice,
    maxOutputTokensOverride: body.max_tokens, effortValue: body.output_config?.effort,
    temperatureOverride: body.temperature, outputFormat: body.output_config?.format,
    enablePromptCaching: false, skipMessageCacheMarkers: true,
    // Native model rules own generation parameters; never overlay the input
    // body onto their result (in particular thinking and tool_choice).
    ccgatewayBuildOnly: true,
    ccgatewayRequestBetas: clientBetas, ccgatewaySystemBlocks: structuredClone(content.system),
    ccgatewayWireMessages: content.messages,
    ccgatewayWireTools: wireToolDefinitions(tools),
    ccgatewayCaptureBilling: captureBilling,
    ccgatewayCapturePrefix: prefix => { capturePrefix(prefix); },
    ccgatewayFingerprintMessages: fingerprint,
  };
}

// applyLayers puts the injected layers into the request CC builds.
function applyLayers(options, layers, messages) {
  if (layers.system) options.ccgatewaySystemBlocks = layers.system;
  options.ccgatewayWireMessages = placeLayers(messages, layers);
  if (layers.tools.length) options.ccgatewayWireTools = [...layers.tools, ...options.ccgatewayWireTools ?? []];
}

// finishBuilt completes CC's request: the parameters CC does not own, the
// cache breakpoint limit, the billing header, the identity line, the betas and
// stream.
function finishBuilt(native, { body, headers, external, policy, nativeBilling, agent, clientBilling, clientBetas, layers, identity }) {
  const { mergeBillingAttribution, setLeadingBillingField } = nativeContentPolicy();
  // Preserve only parameters which the native builder does not own. Its
  // normalized model/thinking/tool choice/metadata and output effort/format
  // remain authoritative, including intentional omission of those fields.
  const built = mergeAdditionalParameters(native, external.parameters);
  if (layers?.system) limitBreakpoints(built, layers.ownLines);
  built.system = mergeBillingAttribution(built.system, policy, nativeBilling, contentDiagnostic);
  // The client's header names its prompt; it must match the mapped prompt header.
  if (agent?.billingPromptId) built.system = setLeadingBillingField(built.system, 'cc_prompt_id', agent.billingPromptId);
  // The line the native selector chose and PAs put after the header; without a
  // header in front, the entrypoint's own line opens the request (upstream
  // takes a header or a line first, 2026-10-21).
  applyIdentityLine(built, identity, native.prefix === undefined ? identity.recorded : native.prefix);
  const identityLine = { entrypoint: identity.entrypoint, line: identity.line, fallback: identity.fallback };
  // The beta list the request ends up with: the client's own, then what this
  // build adds (the native builder's, the injected layers'). The request
  // command places the added ones once (request-betas.js) and writes them.
  const addedBetas = normalizeBetas(built.betas, layers?.betas).filter(beta => !clientBetas.includes(beta));
  const outgoingHeaders = setProtocolHeaders(new Headers(headers), normalizeBetas(clientBetas, addedBetas));
  delete built.betas;
  // The native body has no stream; the client's goes last, where Claude Code
  // sends it, and a client that sent none gets none (absent means false).
  delete built.stream;
  if ('stream' in body) built.stream = body.stream;
  return { body: built, headers: Object.fromEntries(outgoingHeaders), identityLine, agent, clientBetas, addedBetas };
}
