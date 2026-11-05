/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/helpers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-efaj9q04.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-efaj9q04.js:28193-28442 esm-fingerprint
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
//@ chunk-efaj9q04.js:28442-28878 esm-fingerprint
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
