/**
 * @mixmark-io/domino/lib/LinkedList.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:11263-12056 cjs-fingerprint
var Ya = x(function (cd, Pi) {
  var We = ee(),
    Se = (Pi.exports = {
      valid: function (e) {
        return (
          We.assert(e, "list falsy"),
          We.assert(e._previousSibling, "previous falsy"),
          We.assert(e._nextSibling, "next falsy"),
          !0
        );
      },
      insertBefore: function (e, t) {
        We.assert(Se.valid(e) && Se.valid(t));
        var r = e,
          _previousSibling = e._previousSibling,
          s = t,
          _previousSibling_2 = t._previousSibling;
        ((r._previousSibling = _previousSibling_2),
          (_previousSibling._nextSibling = s),
          (_previousSibling_2._nextSibling = r),
          (s._previousSibling = _previousSibling),
          We.assert(Se.valid(e) && Se.valid(t)));
      },
      replace: function (e, t) {
        if ((We.assert(Se.valid(e) && (t === null || Se.valid(t))), t !== null)) Se.insertBefore(t, e);
        (Se.remove(e), We.assert(Se.valid(e) && (t === null || Se.valid(t))));
      },
      remove: function (e) {
        We.assert(Se.valid(e));
        var _previousSibling = e._previousSibling;
        if (_previousSibling === e) return;
        var _nextSibling = e._nextSibling;
        ((_previousSibling._nextSibling = _nextSibling),
          (_nextSibling._previousSibling = _previousSibling),
          (e._previousSibling = e._nextSibling = e),
          We.assert(Se.valid(e)));
      },
    });
});

export { Ya };
