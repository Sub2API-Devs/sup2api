/**
 * diff/libesm/diff/array.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-9dtasr5y.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Diff } from "../../libcjs/diff/base.js";

//@ chunk-9dtasr5y.js:7298-7387 esm-fingerprint
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
//@ chunk-9dtasr5y.js:7387-7399 esm-layout
var arrayDiff = new ArrayDiff();
//@ chunk-9dtasr5y.js:7399-7440 esm-fingerprint
function diffArrays(oldArr, newArr, options) {
  return arrayDiff.diff(oldArr, newArr, options);
}
export { diffArrays };
