/**
 * @mixmark-io/domino/lib/NodeList.es5.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:23571-23693 cjs-fingerprint
var require_NodeList_es5 = __commonJS(function (cjsExports, cjsModule) {
  function item(i) {
    return this[i] || null;
  }
  function NodeList(a) {
    if (!a) a = [];
    a.item = item;
    return a;
  }
  cjsModule.exports = NodeList;
});
export { require_NodeList_es5 };
