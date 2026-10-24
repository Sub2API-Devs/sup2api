// The client's custom tools as CC tools: build makes one for each, so CC's own
// policy (permissions, deferral, tool search) sees it, while the definition CC
// sends for it stays the client's own (ccgatewayRequestDefinition, request-build
// and the patched FH). The request command never runs a tool; the client does.
const marker = Symbol('ccgateway.request-tool');
const passthrough = { safeParse: data => ({ success: true, data }), parse: data => data };

// requestTool is the CC tool for one client tool ({ name, description,
// inputSchema, isDeferred }).
export function requestTool(spec) {
  return {
    [marker]: true, name: spec.name, plugin: 'ccgateway-request', inputJSONSchema: structuredClone(spec.inputSchema ?? { type: 'object' }), descriptionText: spec.description,
    inputSchema: passthrough, isMcp: false, isDeferred: spec.isDeferred === true,
    description: async () => spec.description, prompt: async () => spec.description,
    userFacingName: () => spec.name,
    isEnabled: () => true, isConcurrencySafe: () => false,
    isReadOnly: () => false, isDestructive: () => false,
    toAutoClassifierInput: () => '',
    validateInput: async () => ({ result: true }),
    checkPermissions: async input => ({ behavior: 'allow', updatedInput: input }),
  };
}

export const isNative = tool => tool?.[marker] === true;
