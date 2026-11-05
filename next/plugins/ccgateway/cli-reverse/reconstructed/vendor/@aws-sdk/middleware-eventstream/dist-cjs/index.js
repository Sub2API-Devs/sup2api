/**
 * @aws-sdk/middleware-eventstream/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/middleware-eventstream@3.936.0
 * pieces: chunk-ayc8mk37.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-ayc8mk37.js:863-1049 esm-fingerprint
function resolveEventStreamConfig(input) {
  let { signer, signer: signer_2 } = input;
  let newInput = Object.assign(input, {
    eventSigner: signer,
    messageSigner: signer_2,
  });
  let eventStreamPayloadHandler = newInput.eventStreamPayloadHandlerProvider(newInput);
  return Object.assign(newInput, {
    eventStreamPayloadHandler,
  });
}
export { resolveEventStreamConfig };
