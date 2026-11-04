/**
 * @mixmark-io/domino/lib/NonDocumentTypeChildNode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";

//@ chunk-vwj6ccer.js:44212-44606 cjs-fingerprint
var require_NonDocumentTypeChildNode = __commonJS(function (cjsExports, cjsModule) {
  var Node = require_Node();
  var NonDocumentTypeChildNode = {
    nextElementSibling: {
      get: function () {
        if (this.parentNode) {
          for (var kid = this.nextSibling; kid !== null; kid = kid.nextSibling)
            if (kid.nodeType === Node.ELEMENT_NODE) return kid;
        }
        return null;
      },
    },
    previousElementSibling: {
      get: function () {
        if (this.parentNode) {
          for (var kid = this.previousSibling; kid !== null; kid = kid.previousSibling)
            if (kid.nodeType === Node.ELEMENT_NODE) return kid;
        }
        return null;
      },
    },
  };
  cjsModule.exports = NonDocumentTypeChildNode;
});
export { require_NonDocumentTypeChildNode };
