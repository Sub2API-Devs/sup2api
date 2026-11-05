/**
 * yallist/iterator.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: yallist@4.0.0
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:11195-11334 cjs-fingerprint
var require_iterator = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = function (Yallist) {
    Yallist.prototype[Symbol.iterator] = function* () {
      for (let walker = this.head; walker; walker = walker.next) yield walker.value;
    };
  };
});
export { require_iterator };
