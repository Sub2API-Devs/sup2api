/**
 * @mixmark-io/domino/lib/NonDocumentTypeChildNode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";

//@ chunk-vwj6ccer.js:44212-44606 cjs-fingerprint
var mn = x(function (Ed, As) {
  var Ss = xe(),
    Gl = {
      nextElementSibling: {
        get: function () {
          if (this.parentNode) {
            for (
              var nextSibling = this.nextSibling;
              nextSibling !== null;
              nextSibling = nextSibling.nextSibling
            )
              if (nextSibling.nodeType === Ss.ELEMENT_NODE) return nextSibling;
          }
          return null;
        },
      },
      previousElementSibling: {
        get: function () {
          if (this.parentNode) {
            for (
              var previousSibling = this.previousSibling;
              previousSibling !== null;
              previousSibling = previousSibling.previousSibling
            )
              if (previousSibling.nodeType === Ss.ELEMENT_NODE) return previousSibling;
          }
          return null;
        },
      },
    };
  As.exports = Gl;
});

export { mn };
