/**
 * @anthropic-ai/sdk/internal/utils/bytes.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-layout 3, esm-fingerprint 2
 */

//@ chunk-hwmsct5x.js:25531-25656 esm-layout
function uu(e) {
  let n = 0;
  for (let h of e) n += h.length;
  let uint8Array = new Uint8Array(n),
    s = 0;
  for (let h of e) (uint8Array.set(h, s), (s += h.length));
  return uint8Array;
}
//@ chunk-hwmsct5x.js:25656-25663 esm-layout
var au;
//@ chunk-hwmsct5x.js:25663-25751 esm-fingerprint
function h4t(e) {
  let n;
  return (au ?? ((n = new globalThis.TextEncoder()), (au = n.encode.bind(n))))(e);
}
//@ chunk-hwmsct5x.js:25751-25758 esm-layout
var lu;
/**
 * 用 TextDecoder 把 MCPB manifest 字节解码为文本（旧版名不准确：只做解码，校验在 ...FromText）。
 */
//@ chunk-hwmsct5x.js:25758-25846 esm-fingerprint
function decodeUtf8(e) {
  let n;
  return (lu ?? ((n = new globalThis.TextDecoder()), (lu = n.decode.bind(n))))(e);
}

export { h4t, decodeUtf8, uu };
