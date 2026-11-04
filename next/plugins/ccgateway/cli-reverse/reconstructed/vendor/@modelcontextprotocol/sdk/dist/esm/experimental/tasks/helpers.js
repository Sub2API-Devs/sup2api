/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-zykv69v4.js:28190-28439 esm-fingerprint
function assertToolsCallTaskCapability(requests, method, entityName) {
  if (!requests) throw Error(`${entityName} does not support task creation (required for ${method})`);
  switch (method) {
    case "tools/call":
      if (!requests.tools?.call)
        throw Error(`${entityName} does not support task creation for tools/call (required for ${method})`);
      break;
    default:
      break;
  }
}
//@ chunk-zykv69v4.js:28439-28875 esm-fingerprint
function assertClientRequestTaskCapability(requests, method, entityName) {
  if (!requests) throw Error(`${entityName} does not support task creation (required for ${method})`);
  switch (method) {
    case "sampling/createMessage":
      if (!requests.sampling?.createMessage)
        throw Error(
          `${entityName} does not support task creation for sampling/createMessage (required for ${method})`,
        );
      break;
    case "elicitation/create":
      if (!requests.elicitation?.create)
        throw Error(
          `${entityName} does not support task creation for elicitation/create (required for ${method})`,
        );
      break;
    default:
      break;
  }
}
export { assertClientRequestTaskCapability, assertToolsCallTaskCapability };
