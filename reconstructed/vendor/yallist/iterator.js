/**
 * yallist/iterator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: yallist@4.0.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:10826-10965 cjs-fingerprint
var BO = x(function (zve, FO) {
  FO.exports = function (e) {
    e.prototype[Symbol.iterator] = function* () {
      for (let head = this.head; head; head = head.next) yield head.value;
    };
  };
});

export { BO };
