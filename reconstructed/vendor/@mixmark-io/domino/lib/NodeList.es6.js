/**
 * @mixmark-io/domino/lib/NodeList.es6.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:23412-23571 cjs-fingerprint
var require_NodeList_es6 = x(function (cjsExports, cjsModule) {
  cjsModule.exports = class extends Array {
    constructor(a) {
      super((a && a.length) || 0);
      if (a) for (var idx in a) this[idx] = a[idx];
    }
    item(i) {
      return this[i] || null;
    }
  };
});
export { require_NodeList_es6 };
