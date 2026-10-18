// CCGateway extension: these tools are implemented by tool.call mod handlers.
// This registry deliberately does not inherit native tool execution or policy.
const sessions = new Map();
const marker = Symbol('ccgateway.mod-tool');
const passthrough = { safeParse: data => ({ success: true, data }), parse: data => data };

export function registerNative(session, plugin, spec) {
  let state = sessions.get(session);
  if (!state) sessions.set(session, state = { tools: new Map(), revision: 0, merged: new WeakMap() });
  const schema = structuredClone(spec.inputSchema ?? { type: 'object' });
  const unimplemented = () => { throw new Error(`No tool.call mod handler answered ${spec.name}`); };
  const tool = {
    [marker]: true, name: spec.name, plugin, inputJSONSchema: schema, descriptionText: spec.description,
    inputSchema: passthrough, isMcp: false, isDeferred: spec.isDeferred === true,
    description: async () => spec.description, prompt: async () => spec.description,
    userFacingName: () => spec.name,
    isEnabled: () => true, isConcurrencySafe: () => false,
    isReadOnly: () => false, isDestructive: () => false,
    toAutoClassifierInput: () => '',
    call: unimplemented, create: () => ({ call: unimplemented }),
    validateInput: async () => ({ result: true }),
    checkPermissions: async input => ({ behavior: 'allow', updatedInput: input }),
    mapToolResultToToolResultBlock: (result, id) => ({ type: 'tool_result', tool_use_id: id, content: resultText(result) }),
    renderToolUseMessage: () => null, renderToolResultMessage: () => null,
    renderToolUseRejectedMessage: () => null, renderToolUseErrorMessage: () => null,
    renderToolUseProgressMessage: () => null,
  };
  state.tools.set(spec.name, tool);
  state.revision++;
  state.merged = new WeakMap();
  return { tool: spec.name };
}

export const nativeRevision = session => sessions.get(session)?.revision ?? 0;
export const findNative = (session, name) => sessions.get(session)?.tools.get(name);
export const isNative = tool => tool?.[marker] === true;
export function mergeNative(session, tools) {
  const state = sessions.get(session);
  if (!state?.tools.size) return tools;
  let merged = state.merged.get(tools);
  if (!merged) {
    merged = [...tools.filter(tool => !state.tools.has(tool.name)), ...state.tools.values()];
    state.merged.set(tools, merged);
  }
  return merged;
}

export function nativeDefinition(tool, options) {
  return {
    name: tool.name, description: tool.descriptionText,
    input_schema: tool.inputJSONSchema,
    ...(options.deferLoading ? { defer_loading: true } : {}),
    ...(options.cacheControl ? { cache_control: options.cacheControl } : {}),
  };
}

export function resultText(result) {
  return typeof result === 'string' ? result : JSON.stringify(result ?? null);
}

// Keep the official flattened tool.call event contract. No original tool
// normalization, schema parsing or built-in permission checks run here.
// Configured hook lifecycle is supplied by the CLI adapter, independently.
export async function dispatchNative(tool, toolUse, context, dispatch) {
  const before = await context.before?.(toolUse.input) ?? {};
  if (before.deny !== undefined) return { type: 'tool_result', tool_use_id: toolUse.id, content: resultText(before.deny), is_error: true };
  const input = before.input ?? toolUse.input;
  const event = { ...input, tool: tool.name, tool_use_id: toolUse.id };
  let response;
  try {
    response = await dispatch(event, {
      name: 'core', isCore: true, budgetMs: 0,
      run: async () => { throw new Error(`No tool.call mod handler answered ${tool.name}`); },
    });
  } catch (error) {
    await context.failed?.(input, String(error instanceof Error ? error.message : error));
    throw error;
  }
  if (response.deny !== undefined) await context.failed?.(input, resultText(response.deny));
  else if (context.after) response = { ...response, result: await context.after(input, response.result) };
  return {
    type: 'tool_result', tool_use_id: toolUse.id,
    content: resultText(response.deny === undefined ? response.result : response.deny),
    ...(response.deny === undefined ? {} : { is_error: true }),
  };
}
