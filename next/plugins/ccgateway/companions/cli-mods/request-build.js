import { Kvt, MDe } from './chunk-kasbfbhj.js';
import { El } from './chunk-0ycjphb5.js';
import { registerNative, findNative } from './ccgateway-native-tools.js';
import { prepareBuildInput } from './ccgateway-request-input.js';
import { normalizeBetas } from './ccgateway-request-options.js';
import { getRootSession } from './chunk-q61sszgr.js';
import { YEr } from './chunk-6dwnw6av.js';

export async function buildRequest(components, headers, signal) {
  const input = prepareBuildInput(components, MDe), body = input.request, session = getRootSession();
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
    model: body.model, querySource: 'sdk', agentContext: El(),
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
  };
  let built;
  for await (const event of Kvt({ messages: input.messages, systemPrompt: input.systemPrompt, thinkingConfig, tools, signal, options })) {
    if (signal.aborted) throw signal.reason;
    if (event.type === 'ccgateway_request') { built = event.body; break; }
    if (event.type === 'assistant' && event.isApiErrorMessage) throw new Error(`CC request builder: ${JSON.stringify(event.message?.content)}`);
  }
  if (!built) throw new Error('CC request builder did not produce a request');
  const outgoingHeaders = new Headers(headers);
  const betas = normalizeBetas(clientBetas, built.betas);
  delete built.betas;
  if (betas.length) outgoingHeaders.set('anthropic-beta', betas.join(','));
  else outgoingHeaders.delete('anthropic-beta');
  return { body: { ...built, stream: body.stream === true }, headers: Object.fromEntries(outgoingHeaders) };
}
