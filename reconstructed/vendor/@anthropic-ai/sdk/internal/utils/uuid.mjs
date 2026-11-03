/**
 * @anthropic-ai/sdk/internal/utils/uuid.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-hwmsct5x.js:27525-27813 esm-fingerprint
var uuid4 = function () {
  let { crypto: e } = globalThis;
  if (e?.randomUUID) {
    uuid4 = e.randomUUID.bind(e);
    return e.randomUUID();
  }
  let u8 = new Uint8Array(1);
  let randomByte = e ? () => e.getRandomValues(u8)[0] : () => (Math.random() * 255) & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (randomByte() & (15 >> (+c / 4)))).toString(16),
  );
};
export { uuid4 };
