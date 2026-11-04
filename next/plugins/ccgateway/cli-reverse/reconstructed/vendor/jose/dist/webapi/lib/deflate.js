/**
 * jose/dist/webapi/lib/deflate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (3)
 * attribution: esm-fingerprint 3
 */
import { JOSENotSupported_2, JWEInvalid_2 } from "../../node/esm/util/errors.js";
import { concat } from "./buffer_utils.js";

//@ chunk-5h78gfwc.js:30709-30841 esm-fingerprint
function assertGlobal(name) {
  if (typeof globalThis[name] === "undefined")
    throw new JOSENotSupported_2(
      `JWE "zip" (Compression Algorithm) Header Parameter requires the ${name} API.`,
    );
}
//@ chunk-5h78gfwc.js:30841-31116 esm-fingerprint
async function deflate(input) {
  assertGlobal("CompressionStream");
  let cs = new CompressionStream("deflate-raw");
  let writer = cs.writable.getWriter();
  writer.write(input).catch(() => {});
  writer.close().catch(() => {});
  let chunks = [];
  let reader = cs.readable.getReader();
  for (;;) {
    let { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return concat(...chunks);
}
//@ chunk-5h78gfwc.js:31116-31501 esm-fingerprint
async function decompress(input, maxLength) {
  assertGlobal("DecompressionStream");
  let ds = new DecompressionStream("deflate-raw");
  let writer = ds.writable.getWriter();
  writer.write(input).catch(() => {});
  writer.close().catch(() => {});
  let chunks = [];
  let length = 0;
  let reader = ds.readable.getReader();
  for (;;) {
    let { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
    if (maxLength !== 1 / 0 && length > maxLength)
      throw new JWEInvalid_2("Decompressed plaintext exceeded the configured limit");
  }
  return concat(...chunks);
}
export { decompress, deflate };
