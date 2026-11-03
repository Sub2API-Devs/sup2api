/**
 * @anthropic-ai/sdk/internal/utils/uuid.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-hwmsct5x.js:27525-27813 esm-fingerprint
var Ko = function () {
  let { crypto: e } = globalThis;
  if (e?.randomUUID) return ((Ko = e.randomUUID.bind(e)), e.randomUUID());
  let uint8Array = new Uint8Array(1),
    r = e ? () => e.getRandomValues(uint8Array)[0] : () => (Math.random() * 255) & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (s) =>
    (+s ^ (r() & (15 >> (+s / 4)))).toString(16),
  );
};

export { Ko };
