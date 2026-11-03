/**
 * @mixmark-io/domino/lib/NodeList.es6.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:23412-23571 cjs-fingerprint
var rs = x(function (ld, ts) {
  ts.exports = class extends Array {
    constructor(t) {
      super((t && t.length) || 0);
      if (t) for (var key in t) this[key] = t[key];
    }
    item(t) {
      return this[t] || null;
    }
  };
});

export { rs };
