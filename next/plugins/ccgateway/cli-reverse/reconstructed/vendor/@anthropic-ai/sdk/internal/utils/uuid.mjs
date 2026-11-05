/**
 * @anthropic-ai/sdk/internal/utils/uuid.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-vn3g7zt8.js:27896-28184 esm-fingerprint
var uuid4 = function () {
  let { crypto: cryptoModule } = globalThis;
  if (cryptoModule?.randomUUID) {
    uuid4 = cryptoModule.randomUUID.bind(cryptoModule);
    return cryptoModule.randomUUID();
  }
  let u8 = new Uint8Array(1);
  let randomByte = cryptoModule
    ? () => cryptoModule.getRandomValues(u8)[0]
    : () => (Math.random() * 255) & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (randomByte() & (15 >> (+c / 4)))).toString(16),
  );
};
export { uuid4 };
