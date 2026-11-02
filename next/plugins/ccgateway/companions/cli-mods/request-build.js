import { queryModel, renderAttachment, ccgatewayEnvironment, ccgatewayEnvironmentVocabulary, ccgatewayDefaultPrompt, ccgatewayLayerAttachments, ccgatewayLayerVocabulary, ccgatewayMarkTurns, ccgatewayPermissionContext, ccgatewayBuiltInAgents, ccgatewaySystemRecord, ccgatewayCompactionOpenings, cacheDiagnosisBeta,
  billingHeaderPrefix, isBillingHeader, reminderOpen, reminderClose, mainAgentContext, toolPool as nativeToolPool, identityLine, isIdentityLine,
  getRootSession, setEntrypointOnRequests } from './native-build.js';
import { requestTool } from './ccgateway-native-tools.js';
import { prepareBuildInput, wireMessages, wireRecords, fingerprintMessages } from './ccgateway-request-input.js';
import { continueSession, requestThread, promptHash } from './ccgateway-request-session.js';
import { previousSession, spawnContext, requestSessionID } from './ccgateway-request-identity.js';
import { normalizeBetas, setProtocolHeaders } from './ccgateway-request-headers.js';
import { createContentPolicy } from './ccgateway-content-policy.js';
import { validateRequestPolicy, runtimeContext, contentDiagnostic, identityLineFor, injectionChoices } from './ccgateway-request-policy.js';
import { validateBuildParameters, wireToolDefinitions, mergeAdditionalParameters, generationControls, nativeOrder } from './ccgateway-request-parameters.js';
import { toBlocks } from './ccgateway-shared.js';

// The content policy recognizes CC's own wording: the environment renderers'
// vocabulary, the billing header (billingHeaderPrefix) and the reminder tags (reminderOpen, reminderClose), all native.
let contentPolicy, layerVocabulary;
const nativeContentPolicy = () => contentPolicy ??= createContentPolicy({ ...ccgatewayEnvironmentVocabulary(), billingHeader: billingHeaderPrefix, reminder: [reminderOpen, reminderClose] });
const nativeLayers = () => layerVocabulary ??= ccgatewayLayerVocabulary();

const firstPrompt = 'CCGATEWAY_FIRST_PROMPT_7d3c1a';

// The Worker turns the first-party shape conversion on per request
// (features.FirstPartyShapeCapability, WorkerPolicy.first_party_shape):
// engine request_command.go sets this variable for build only.
const firstPartyShapeOn = () => process.env.CCG_FIRST_PARTY_SHAPE === '1';

// collectBuilt runs CC's request builder (queryModel, patched to yield the request
// instead of sending it) and returns the request body.
async function collectBuilt(input, signal, missing) {
  for await (const event of queryModel(input)) {
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
    return message.role === 'system' ? texts : message.role === 'user' ? texts.filter(text => text.trimStart().startsWith(reminderOpen)) : [];
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
  // Their definitions are rendered as CC renders its own first turn: amid its
  // whole pool and its built-in agents (a definition can depend on the rest:
  // ListAgents and Agent on whether SendMessage is there, Agent on the
  // general-purpose agent and forks, ToolSearch on deferred tools to search),
  // and only the chosen ones, with what CC adds for them (the deferred tool
  // placeholder it pairs with ToolSearch), are taken. Without ToolSearch chosen
  // CC renders without it, so no tool is deferred and each chosen one is sent
  // whole; with it, the tools CC defers (NotebookEdit, WebSearch, ...) are
  // left to ToolSearch as in CC's first turn, and not sent.
  const toolSearch = 'ToolSearch';
  const rendered = names.includes(toolSearch) ? pool : pool.filter(tool => tool.name !== toolSearch);
  const poolNames = new Set(pool.map(tool => tool.name));
  // An identity line in the client's system stays its own line, in front.
  const lines = prompt ? clientSystem.filter(block => isIdentityLine(block.text)) : [];
  const own = prompt ? clientSystem.filter(block => !isIdentityLine(block.text)).map(block => block.text) : [];
  const systemPrompt = prompt ? await ccgatewayDefaultPrompt([...tools, ...clientTools], model, own) : [];
  const probe = prepareBuildInput({ model, messages: [{ role: 'user', content: firstPrompt }] }, renderAttachment, { systemRecord: ccgatewaySystemRecord });
  const attachments = await ccgatewayLayerAttachments(kinds, { model, ...context, records: clientRecords, session });
  const records = [...probe.messages, ...attachments.map(attachment => ({ type: 'attachment', uuid: crypto.randomUUID(), timestamp: new Date().toISOString(), attachment }))];
  const built = await collectBuilt({ messages: records, systemPrompt, thinkingConfig: { type: 'disabled', mechanical: true }, tools: rendered, signal,
    // CC's cache markers on its prompt, as CC decides them; CC's built-in
    // agents, every agent type allowed, as in CC's own session.
    options: { ...options, enablePromptCaching: prompt ? undefined : false, extraToolSchemas: [], toolChoice: undefined, agents: ccgatewayBuiltInAgents(), allowedAgentTypes: undefined,
      ccgatewayNativeProbe: true, ccgatewayCaptureBilling: undefined, ccgatewayCapturePrefix: undefined, recordedCliPrefix: undefined } },
  signal, 'CC request builder did not produce the injected layers');
  // The billing header and the identity line are the other layers' (merged
  // after build), so only the prompt blocks are taken.
  const system = prompt ? (Array.isArray(built.system) ? built.system : []).filter(block => !block.text.startsWith(billingHeaderPrefix) && !isIdentityLine(block.text)) : [];
  const at = built.messages.findIndex(message => toBlocks(message.content).some(block => block.type === 'text' && block.text.includes(firstPrompt)));
  if (at < 0) throw new Error('CC request builder lost the first prompt');
  const blocks = toBlocks(built.messages[at].content), mark = blocks.findIndex(block => block.type === 'text' && block.text.includes(firstPrompt));
  if (blocks[mark].text !== firstPrompt) throw new Error('CC request builder merged an attachment into the prompt');
  return {
    // With the prompt the client's system is in it (its own line in front),
    // as CC's appended prompt when it had any.
    system: prompt ? [...lines, ...system] : undefined, ownLines: lines.length, appended: own.length > 0,
    // The chosen tools CC sent, and what CC added for them (a name outside its
    // pool: the deferred tool placeholder); a client tool of a name stays the
    // client's.
    tools: names.length ? (built.tools ?? []).filter(tool => names.includes(tool.name) || !poolNames.has(tool.name) && !clientToolNames.has(tool.name)) : [],
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
// the turn fields as CC does. The terminal entrypoint is a human typing. It
// returns the last prompt's record, or undefined.
function markPrompt(records, promptId, entrypoint) {
  const last = ccgatewayMarkTurns(records, entrypoint === 'cli');
  if (last && promptId !== undefined) last.promptId = promptId;
  return last;
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

// The client's thinking as CC's thinking configuration (generationControls);
// without one CC knows, CC builds the request without thinking.
const thinkingConfigFor = controls => controls.thinking ?? { type: 'disabled', mechanical: true };

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
  const initial = prepareBuildInput(external, renderAttachment, { preserveContent: true, systemRecord: ccgatewaySystemRecord });
  // The request's entrypoint, the one its header will carry (the client's own
  // or the configured one), is set the way CC sets it for a request
  // (setEntrypointOnRequests): the native header (PAs) and the User-Agent
  // (dN) both read it, so the two agree as they do in Claude Code.
  const entrypoint = billing.requestEntrypoint(initial.systemBlocks, policy);
  setEntrypointOnRequests(entrypoint);
  const content = await convertContent(initial, policy, context);
  const records = wireRecords(content.messages, external.model, ccgatewaySystemRecord), session = getRootSession();
  const fingerprint = fingerprintMessages(content.messages, reminderOpen);
  // The client's own header, wherever it is, makes the request Claude Code's
  // (hasBilling decides the same): its kind and IDs come from that header.
  const clientBilling = billing.requestBilling(initial.systemBlocks);
  // An official client connected through a custom base URL writes its
  // third-party shape; when the Worker says so it goes upstream in the
  // first-party shape (2026-11-03): CC's own header for it, CC's split of
  // its prompt, and what the Worker proved of the conversation (the upstream
  // session, this thread's earlier request, the Agent call that spawned it).
  const thirdParty = firstPartyShapeOn() ? billing.thirdPartyBilling(initial.systemBlocks) : null;
  const shape = thirdParty && { session: requestSessionID(), previous: previousSession(), spawn: spawnContext() };
  const agent = resolveAgent?.({ billing: clientBilling, prompt: fingerprint[0].message.content, ...shape && { shape, compaction: compactionRequest(content.messages) } });
  const prompt = !agent || agent.requestClass === 'main' ? markPrompt(records, agent?.promptId, entrypoint) : undefined;
  // A header this build writes continues the upstream session (the Worker's
  // request-id and turn, request-session.js); so does one it converts. Any
  // other client header is the client's.
  const thread = requestThread(agent);
  const continued = clientBilling === null || thirdParty ? continueSession(records, prompt, { human: entrypoint === 'cli', thread }) : undefined;
  // The converted main thread's prompt ID, once its turn is known.
  if (thirdParty && prompt && agent?.derivePromptId) {
    prompt.promptId = agent.promptId = agent.derivePromptId(prompt.turnPosition?.turnIndex ?? 0, promptHash(prompt.message?.content));
    agent.shapePrompt = true;
  }
  const body = initial.request, clientBetas = normalizeBetas(new Headers(headers).get('anthropic-beta'), body.betas);
  const tools = clientTools(initial.customTools);
  const native = {}, controls = generationControls(external.parameters);
  const options = buildOptions(body, initial, content, { controls, agent, clientBetas, fingerprint, tools: external.tools, captureBilling: value => { native.billing = value; }, capturePrefix: value => { native.prefix = value; } });
  if (thirdParty) {
    const { firstPartySystem } = await import('./first-party-shape.js');
    const system = await firstPartySystem(content.system, { model: body.model, tools, messages: content.messages });
    if (system) options.ccgatewaySystemBlocks = system;
  }
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
  const built = await collectBuilt({ messages: records, systemPrompt: content.system.map(block => block.text), thinkingConfig: thinkingConfigFor(controls), tools, signal, options }, signal, 'CC request builder did not produce a request');
  const conversion = thirdParty && { client: thirdParty, system: content.system, messages: content.messages, previous: shape.previous?.thread === thread ? shape.previous : undefined };
  const { converted, ...finished } = finishBuilt(built, { body, headers, external, controls, policy, nativeBilling: native.billing, agent, clientBilling, clientBetas, layers, identity, conversion });
  return { ...finished, session: sessionReport(continued, conversion ? converted : undefined, agent) };
}

// compactionRequest says whether the last user message is CC's compaction
// prompt: its first text opens with one of the openings CC's compaction
// prompt builder writes (native, ccgatewayCompactionOpenings).
function compactionRequest(messages) {
  const last = messages.findLast(message => message?.role === 'user');
  const first = toBlocks(last?.content ?? [])?.find?.(block => block?.type === 'text' && typeof block.text === 'string');
  return first !== undefined && ccgatewayCompactionOpenings().some(opening => typeof opening === 'string' && opening.length > 0 && first.text.startsWith(opening));
}

// sessionReport is what the Worker keeps of this request once it is answered
// (request-session.js): for a converted request also the prompt ID its header
// used and a subagent's type, which the thread's later requests and the
// subagents it spawns are given. A client header the build could not convert
// stayed the client's: nothing is kept.
function sessionReport(continued, converted, agent) {
  if (!continued || converted === undefined) return continued;
  if (!converted) return undefined;
  return { ...continued, ...agent?.promptId !== undefined && { prompt_id: agent.promptId },
    ...continued.thread !== 'main' && agent?.agentType !== undefined && { agent_type: agent.agentType } };
}

// convertContent applies the content policy to the system and messages as the
// wire carries them, before the native builder computes the fingerprint. It
// never receives or overlays generation parameters.
function convertContent(initial, policy, context) {
  return nativeContentPolicy().applyContentPolicy({ system: initial.systemBlocks, messages: wireMessages(initial.messages, renderAttachment) }, policy, {
    readEnvironment: fields => ccgatewayEnvironment(context, fields),
  }, contentDiagnostic);
}

// buildOptions are CC's query options for the client's request.
function buildOptions(body, initial, content, { controls, agent, clientBetas, fingerprint, tools, captureBilling, capturePrefix }) {
  return {
    model: body.model, querySource: agent?.querySource ?? 'sdk', agentContext: agent?.agentContext ?? mainAgentContext(),
    isNonInteractiveSession: true, withoutToolDescribeHooks: true,
    getToolPermissionContext: async () => ccgatewayPermissionContext(),
    agents: [], allowedAgentTypes: [], mcpClients: [],
    extraToolSchemas: initial.extraToolSchemas, toolChoice: body.tool_choice,
    maxOutputTokensOverride: controls.maxTokens, effortValue: controls.outputConfig?.effort,
    temperatureOverride: controls.temperature, outputFormat: controls.outputConfig?.format,
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
function finishBuilt(native, { body, headers, external, controls, policy, nativeBilling, agent, clientBilling, clientBetas, layers, identity, conversion }) {
  const { mergeBillingAttribution, setLeadingBillingField, completeBillingHeader } = nativeContentPolicy();
  // Preserve only parameters which the native builder does not own. Its
  // normalized model/thinking/tool choice/metadata and output effort/format
  // remain authoritative, including intentional omission of those fields.
  const built = mergeAdditionalParameters(native, external.parameters);
  // A control the builder could not carry goes as the client wrote it.
  for (const [key, value] of Object.entries(controls.raw)) built[key] = structuredClone(value);
  if (layers?.system) limitBreakpoints(built, layers.ownLines);
  // A converted request carries the header CC's builder wrote for it, with
  // the client's own values (content-policy.js completeBillingHeader), and
  // the diagnostics CC writes for its thread. One whose header cannot be
  // completed goes as the client sent it, whole.
  const line = conversion ? completeBillingHeader(nativeBilling, conversion.client, policy) : null;
  if (line !== null) {
    built.system = structuredClone(built.system);
    built.system[0] = { ...built.system[0], text: line };
    // Only where CC's builder writes diagnostics for this model and query
    // (its own value is one it made up from the client's history). CC sends
    // its compaction request as a fork of the main thread, which the builder
    // gives diagnostics whenever it adds the cache diagnosis beta (its own
    // condition, t$); this build is not a fork, so that beta says it.
    const diagnosable = native.diagnostics !== undefined || agent?.requestClass === 'compaction' && normalizeBetas(native.betas).includes(cacheDiagnosisBeta.header);
    const previous = diagnosable ? diagnosticsFor(conversion) : undefined;
    if (previous !== undefined) built.diagnostics = { previous_message_id: previous };
  } else {
    if (conversion) unconverted(built, conversion, agent);
    built.system = mergeBillingAttribution(built.system, policy, nativeBilling, contentDiagnostic);
  }
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
  // Every member CC writes goes where CC writes it (request-parameters.js).
  delete built.stream;
  const sent = nativeOrder(built);
  if ('stream' in body) sent.stream = body.stream;
  return { body: sent, headers: Object.fromEntries(outgoingHeaders), identityLine, agent, clientBetas, addedBetas, converted: line !== null };
}

// diagnosticsFor is a converted request's diagnostics.previous_message_id, as
// Claude Code writes it from its thread's transcript (the last answer's
// message ID, null before the first): null when the request's messages hold
// no answer yet, the remembered answer's ID when the Worker proved that the
// request continues it, and undefined (no diagnostics) when neither is
// certain (a shortened or rewritten history, a fork, a request the Worker did
// not see answered, a thread with another request in flight).
function diagnosticsFor({ messages, previous }) {
  if (!messages.some(message => message?.role === 'assistant')) return null;
  return previous?.message_id;
}

// unconverted undoes what the conversion set before the build for a request
// whose header could not be completed: its system goes as the client sent it,
// and no prompt ID of the conversion's goes out.
function unconverted(built, conversion, agent) {
  built.system = structuredClone(conversion.system);
  if (!agent?.shapePrompt) return;
  agent.promptId = undefined;
  if (agent.agentContext) delete agent.agentContext.parentPromptId;
}
