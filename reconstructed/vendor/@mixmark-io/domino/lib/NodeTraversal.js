/**
 * @mixmark-io/domino/lib/NodeTraversal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:67604-68270 cjs-fingerprint
var On = x(function (kd, r0) {
  var Dd = (r0.exports = {
    nextSkippingChildren: ux,
    nextAncestorSibling: In,
    next: lx,
    previous: xx,
    deepLastChild: t0,
  });
  function ux(e, t) {
    if (e === t) return null;
    if (e.nextSibling !== null) return e.nextSibling;
    return In(e, t);
  }
  function In(e, t) {
    for (e = e.parentNode; e !== null; e = e.parentNode) {
      if (e === t) return null;
      if (e.nextSibling !== null) return e.nextSibling;
    }
    return null;
  }
  function lx(e, t) {
    var firstChild = e.firstChild;
    if (firstChild !== null) return firstChild;
    if (e === t) return null;
    if (((firstChild = e.nextSibling), firstChild !== null)) return firstChild;
    return In(e, t);
  }
  function t0(e) {
    while (e.lastChild) e = e.lastChild;
    return e;
  }
  function xx(e, t) {
    var previousSibling = e.previousSibling;
    if (previousSibling !== null) return t0(previousSibling);
    if (((previousSibling = e.parentNode), previousSibling === t)) return null;
    return previousSibling;
  }
});

export { On };
