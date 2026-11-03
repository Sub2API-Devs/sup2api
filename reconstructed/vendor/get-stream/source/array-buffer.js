/**
 * get-stream/source/array-buffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { D } from "./contents.js";
import { ue, ce, Fe } from "./utils.js";

//@ chunk-m4p5zn6n.js:22966-23006 esm-layout
async function Ge(e, n) {
  return D(e, fo, n);
}
//@ chunk-m4p5zn6n.js:23006-23880 esm-fingerprint
var ro = () => ({ contents: new ArrayBuffer(0) }),
  oo = (e) => textEncoder.encode(e),
  textEncoder = new TextEncoder(),
  dn = (e) => new Uint8Array(e),
  ln = (e) => new Uint8Array(e.buffer, e.byteOffset, e.byteLength),
  so = (e, n) => e.slice(0, n),
  ao = (e, { contents: contents, length: r }, o) => {
    let s = mn() ? co(contents, o) : uo(contents, o);
    return (new Uint8Array(s).set(e, r), s);
  },
  uo = (e, n) => {
    if (n <= e.byteLength) return e;
    let arrayBuffer = new ArrayBuffer(pn(n));
    return (new Uint8Array(arrayBuffer).set(new Uint8Array(e), 0), arrayBuffer);
  },
  co = (e, n) => {
    if (n <= e.maxByteLength) return (e.resize(n), e);
    let arrayBuffer = new ArrayBuffer(n, { maxByteLength: pn(n) });
    return (new Uint8Array(arrayBuffer).set(new Uint8Array(e), 0), arrayBuffer);
  },
  pn = (e) => fn ** Math.ceil(Math.log(e) / Math.log(fn)),
  fn = 2,
  lo = ({ contents: contents, length: n }) => (mn() ? contents : contents.slice(0, n)),
  mn = () => "resize" in ArrayBuffer.prototype,
  fo = {
    init: ro,
    convertChunk: { string: oo, buffer: dn, arrayBuffer: dn, dataView: ln, typedArray: ln, others: ue },
    getSize: ce,
    truncateChunk: so,
    addChunk: ao,
    getFinalChunk: Fe,
    finalize: lo,
  };

export { Ge };
