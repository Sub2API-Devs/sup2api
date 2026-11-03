/**
 * get-stream/source/string.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { D } from "./contents.js";
import { ke, ue, ce, Ne } from "./utils.js";

//@ chunk-m4p5zn6n.js:24141-24181 esm-layout
async function Le(e, n) {
  return D(e, yo, n);
}
//@ chunk-m4p5zn6n.js:24181-24564 esm-fingerprint
var po = () => ({ contents: "", textDecoder: new TextDecoder() }),
  le = (e, { textDecoder: textDecoder }) => textDecoder.decode(e, { stream: !0 }),
  mo = (e, { contents: contents }) => contents + e,
  go = (e, n) => e.slice(0, n),
  ho = ({ textDecoder: textDecoder }) => {
    let decode = textDecoder.decode();
    return decode === "" ? void 0 : decode;
  },
  yo = {
    init: po,
    convertChunk: { string: ke, buffer: le, arrayBuffer: le, dataView: le, typedArray: le, others: ue },
    getSize: ce,
    truncateChunk: go,
    addChunk: mo,
    getFinalChunk: ho,
    finalize: Ne,
  };

export { Le };
