/**
 * @mixmark-io/domino/lib/LinkedList.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-vwj6ccer.js:11263-12056 cjs-fingerprint
var require_LinkedList = x(function (cjsExports, cjsModule) {
  var utils = require_utils();
  var LinkedList = (cjsModule.exports = {
    valid: function (a) {
      utils.assert(a, "list falsy");
      utils.assert(a._previousSibling, "previous falsy");
      utils.assert(a._nextSibling, "next falsy");
      return true;
    },
    insertBefore: function (a_2, b) {
      utils.assert(LinkedList.valid(a_2) && LinkedList.valid(b));
      var a_first = a_2;
      var a_last = a_2._previousSibling;
      var b_first = b;
      var b_last = b._previousSibling;
      a_first._previousSibling = b_last;
      a_last._nextSibling = b_first;
      b_last._nextSibling = a_first;
      b_first._previousSibling = a_last;
      utils.assert(LinkedList.valid(a_2) && LinkedList.valid(b));
    },
    replace: function (a, b) {
      utils.assert(LinkedList.valid(a) && (b === null || LinkedList.valid(b)));
      if (b !== null) LinkedList.insertBefore(b, a);
      LinkedList.remove(a);
      utils.assert(LinkedList.valid(a) && (b === null || LinkedList.valid(b)));
    },
    remove: function (a) {
      utils.assert(LinkedList.valid(a));
      var prev = a._previousSibling;
      if (prev === a) return;
      var next = a._nextSibling;
      prev._nextSibling = next;
      next._previousSibling = prev;
      a._previousSibling = a._nextSibling = a;
      utils.assert(LinkedList.valid(a));
    },
  });
});
export { require_LinkedList };
