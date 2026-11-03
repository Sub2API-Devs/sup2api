/**
 * @aws-sdk/middleware-eventstream/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-eventstream@3.936.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-3cddmtk7.js:863-1049 esm-fingerprint
function ae(e) {
  let { signer: signer, signer: signer_2 } = e,
    merged = Object.assign(e, { eventSigner: signer, messageSigner: signer_2 }),
    eventStreamPayloadHandlerProvider = merged.eventStreamPayloadHandlerProvider(merged);
  return Object.assign(merged, { eventStreamPayloadHandler: eventStreamPayloadHandlerProvider });
}

export { ae };
