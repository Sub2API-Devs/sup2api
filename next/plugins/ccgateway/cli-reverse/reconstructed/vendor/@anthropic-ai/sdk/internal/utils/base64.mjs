/**
 * @anthropic-ai/sdk/internal/utils/base64.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-vn3g7zt8.js:26217-26568 esm-fingerprint
var fromBuffer = (str) => {
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
export { fromBuffer };
