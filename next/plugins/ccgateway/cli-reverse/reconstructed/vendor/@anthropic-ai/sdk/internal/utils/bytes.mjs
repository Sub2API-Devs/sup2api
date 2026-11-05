/**
 * @anthropic-ai/sdk/internal/utils/bytes.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (5)
 * attribution: esm-layout 3, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-vn3g7zt8.js:25902-26027 esm-layout
function concatBytes(buffers) {
  let length = 0;
  for (let buffer of buffers) length += buffer.length;
  let output = new Uint8Array(length);
  let index = 0;
  for (let buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
//@ chunk-vn3g7zt8.js:26027-26034 esm-layout
var encodeUTF8_;
//@ chunk-vn3g7zt8.js:26034-26122 esm-fingerprint
function encodeUTF8(str) {
  let encoder;
  return (
    encodeUTF8_ ?? ((encoder = new globalThis.TextEncoder()), (encodeUTF8_ = encoder.encode.bind(encoder)))
  )(str);
}
//@ chunk-vn3g7zt8.js:26122-26129 esm-layout
var decodeUTF8_;
//@ chunk-vn3g7zt8.js:26129-26217 esm-fingerprint
/**
 * 用 TextDecoder 把 MCPB manifest 字节解码为文本（旧版名不准确：只做解码，校验在 ...FromText）。
 */
function decodeUtf8(bytes) {
  let decoder;
  return (
    decodeUTF8_ ?? ((decoder = new globalThis.TextDecoder()), (decodeUTF8_ = decoder.decode.bind(decoder)))
  )(bytes);
}
export { encodeUTF8, decodeUtf8, concatBytes };
