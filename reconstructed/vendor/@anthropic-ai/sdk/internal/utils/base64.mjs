/**
 * @anthropic-ai/sdk/internal/utils/base64.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { pr } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:25846-26197 esm-fingerprint
var du = (e) => {
  if (typeof globalThis.Buffer < "u") {
    let from = globalThis.Buffer.from(e, "base64");
    return new Uint8Array(from.buffer, from.byteOffset, from.byteLength);
  }
  if (typeof atob < "u") {
    let n = atob(e),
      uint8Array = new Uint8Array(n.length);
    for (let s = 0; s < n.length; s++) uint8Array[s] = n.charCodeAt(s);
    return uint8Array;
  }
  throw new pr("Cannot decode base64 string; Expected `Buffer` or `atob` to be defined");
};

export { du };
