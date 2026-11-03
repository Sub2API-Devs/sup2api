/**
 * @anthropic-ai/sdk/internal/utils/base64.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:25846-26197 esm-fingerprint
var du = (str) => {
  if (typeof globalThis.Buffer !== "undefined") {
    let buf = globalThis.Buffer.from(str, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  if (typeof atob !== "undefined") {
    let bstr = atob(str);
    let buf = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) buf[i] = bstr.charCodeAt(i);
    return buf;
  }
  throw new AnthropicError("Cannot decode base64 string; Expected `Buffer` or `atob` to be defined");
};
export { du };
