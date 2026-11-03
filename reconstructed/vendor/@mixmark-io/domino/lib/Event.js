/**
 * @mixmark-io/domino/lib/Event.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:226-1261 cjs-fingerprint
var Lt = x(function (ed, Li) {
  Li.exports = _t;
  _t.CAPTURING_PHASE = 1;
  _t.AT_TARGET = 2;
  _t.BUBBLING_PHASE = 3;
  function _t(e, t) {
    if (
      ((this.type = ""),
      (this.target = null),
      (this.currentTarget = null),
      (this.eventPhase = _t.AT_TARGET),
      (this.bubbles = !1),
      (this.cancelable = !1),
      (this.isTrusted = !1),
      (this.defaultPrevented = !1),
      (this.timeStamp = Date.now()),
      (this._propagationStopped = !1),
      (this._immediatePropagationStopped = !1),
      (this._initialized = !0),
      (this._dispatching = !1),
      e)
    )
      this.type = e;
    if (t) for (var key in t) this[key] = t[key];
  }
  _t.prototype = Object.create(Object.prototype, {
    constructor: { value: _t },
    stopPropagation: {
      value: function () {
        this._propagationStopped = !0;
      },
    },
    stopImmediatePropagation: {
      value: function () {
        ((this._propagationStopped = !0), (this._immediatePropagationStopped = !0));
      },
    },
    preventDefault: {
      value: function () {
        if (this.cancelable) this.defaultPrevented = !0;
      },
    },
    initEvent: {
      value: function (t, r, a) {
        if (((this._initialized = !0), this._dispatching)) return;
        ((this._propagationStopped = !1),
          (this._immediatePropagationStopped = !1),
          (this.defaultPrevented = !1),
          (this.isTrusted = !1),
          (this.target = null),
          (this.type = t),
          (this.bubbles = r),
          (this.cancelable = a));
      },
    },
  });
});

export { Lt };
