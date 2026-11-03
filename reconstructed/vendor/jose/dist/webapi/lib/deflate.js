/**
 * jose/dist/webapi/lib/deflate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (3)
 * attribution: esm-fingerprint 3
 */
import { f_2, c } from "../../node/esm/util/errors.js";
import { E_2 } from "./buffer_utils.js";

//@ chunk-5h78gfwc.js:30709-30841 esm-fingerprint
function Pt(e) {
  if (typeof globalThis[e] > "u")
    throw new f_2(`JWE "zip" (Compression Algorithm) Header Parameter requires the ${e} API.`);
}
//@ chunk-5h78gfwc.js:30841-31116 esm-fingerprint
async function Wt(e) {
  Pt("CompressionStream");
  let compressionStream = new CompressionStream("deflate-raw"),
    writer = compressionStream.writable.getWriter();
  (writer.write(e).catch(() => {}), writer.close().catch(() => {}));
  let n = [],
    reader = compressionStream.readable.getReader();
  for (;;) {
    let { value: o, done: a } = await reader.read();
    if (a) break;
    n.push(o);
  }
  return E_2(...n);
}
//@ chunk-5h78gfwc.js:31116-31501 esm-fingerprint
async function It(e, t) {
  Pt("DecompressionStream");
  let decompressionStream = new DecompressionStream("deflate-raw"),
    writer = decompressionStream.writable.getWriter();
  (writer.write(e).catch(() => {}), writer.close().catch(() => {}));
  let i = [],
    o = 0,
    reader = decompressionStream.readable.getReader();
  for (;;) {
    let { value: s, done: p } = await reader.read();
    if (p) break;
    if ((i.push(s), (o += s.byteLength), t !== 1 / 0 && o > t))
      throw new c("Decompressed plaintext exceeded the configured limit");
  }
  return E_2(...i);
}

export { It, Wt };
