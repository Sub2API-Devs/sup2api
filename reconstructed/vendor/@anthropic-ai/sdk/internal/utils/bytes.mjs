/**
 * @anthropic-ai/sdk/internal/utils/bytes.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-layout 3, esm-fingerprint 2
 */

//@ chunk-hwmsct5x.js:25531-25656 esm-layout
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
//@ chunk-hwmsct5x.js:25656-25663 esm-layout
var encodeUTF8_;
//@ chunk-hwmsct5x.js:25663-25751 esm-fingerprint
function encodeUTF8(str) {
  let encoder;
  return (
    encodeUTF8_ ?? ((encoder = new globalThis.TextEncoder()), (encodeUTF8_ = encoder.encode.bind(encoder)))
  )(str);
}
//@ chunk-hwmsct5x.js:25751-25758 esm-layout
var decodeUTF8_;
//@ chunk-hwmsct5x.js:25758-25846 esm-fingerprint
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
