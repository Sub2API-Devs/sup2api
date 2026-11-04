/**
 * @mixmark-io/domino/lib/NodeTraversal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:67604-68270 cjs-fingerprint
var require_NodeTraversal = __commonJS(function (cjsExports, cjsModule) {
  var NodeTraversal = (cjsModule.exports = {
    nextSkippingChildren,
    nextAncestorSibling,
    next,
    previous,
    deepLastChild,
  });
  function nextSkippingChildren(node, stayWithin) {
    if (node === stayWithin) return null;
    if (node.nextSibling !== null) return node.nextSibling;
    return nextAncestorSibling(node, stayWithin);
  }
  function nextAncestorSibling(node, stayWithin) {
    for (node = node.parentNode; node !== null; node = node.parentNode) {
      if (node === stayWithin) return null;
      if (node.nextSibling !== null) return node.nextSibling;
    }
    return null;
  }
  function next(node, stayWithin) {
    var n = node.firstChild;
    if (n !== null) return n;
    if (node === stayWithin) return null;
    n = node.nextSibling;
    if (n !== null) return n;
    return nextAncestorSibling(node, stayWithin);
  }
  function deepLastChild(node) {
    while (node.lastChild) node = node.lastChild;
    return node;
  }
  function previous(node, stayWithin) {
    var p = node.previousSibling;
    if (p !== null) return deepLastChild(p);
    p = node.parentNode;
    if (p === stayWithin) return null;
    return p;
  }
});
export { require_NodeTraversal };
