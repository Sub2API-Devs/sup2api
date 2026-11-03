/**
 * diff/libesm/diff/array.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { L } from "../../libcjs/diff/base.js";

//@ chunk-7vb8p3zb.js:7298-7387 esm-fingerprint
class ArrayDiff extends L {
  tokenize(n) {
    return n.slice();
  }
  join(n) {
    return n;
  }
  removeEmpty(n) {
    return n;
  }
}
//@ chunk-7vb8p3zb.js:7387-7399 esm-layout
var arrayDiff = new ArrayDiff();
//@ chunk-7vb8p3zb.js:7399-7440 esm-fingerprint
function diffArrays(n, e, t) {
  return arrayDiff.diff(n, e, t);
}

export { diffArrays };
