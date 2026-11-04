/**
 * @aws-sdk/middleware-eventstream/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-eventstream@3.936.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-3cddmtk7.js:863-1049 esm-fingerprint
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
