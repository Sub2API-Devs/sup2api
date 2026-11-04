/**
 * diff/libesm/diff/array.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { Diff } from "../../libcjs/diff/base.js";

//@ chunk-7vb8p3zb.js:7298-7387 esm-fingerprint
class ArrayDiff extends Diff {
  tokenize(value) {
    return value.slice();
  }
  join(value) {
    return value;
  }
  removeEmpty(value) {
    return value;
  }
}
//@ chunk-7vb8p3zb.js:7387-7399 esm-layout
var arrayDiff = new ArrayDiff();
//@ chunk-7vb8p3zb.js:7399-7440 esm-fingerprint
function diffArrays(oldArr, newArr, options) {
  return arrayDiff.diff(oldArr, newArr, options);
}
export { diffArrays };
