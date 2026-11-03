/**
 * @mixmark-io/domino/lib/Event.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:226-1261 cjs-fingerprint
var require_Event = x(function (cjsExports, cjsModule) {
  cjsModule.exports = _t;
  _t.CAPTURING_PHASE = 1;
  _t.AT_TARGET = 2;
  _t.BUBBLING_PHASE = 3;
  function _t(type, dictionary) {
    this.type = "";
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = _t.AT_TARGET;
    this.bubbles = false;
    this.cancelable = false;
    this.isTrusted = false;
    this.defaultPrevented = false;
    this.timeStamp = Date.now();
    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
    this._initialized = true;
    this._dispatching = false;
    if (type) this.type = type;
    if (dictionary) for (var p in dictionary) this[p] = dictionary[p];
  }
  _t.prototype = Object.create(Object.prototype, {
    constructor: {
      value: _t,
    },
    stopPropagation: {
      value: function () {
        this._propagationStopped = true;
      },
    },
    stopImmediatePropagation: {
      value: function () {
        this._propagationStopped = true;
        this._immediatePropagationStopped = true;
      },
    },
    preventDefault: {
      value: function () {
        if (this.cancelable) this.defaultPrevented = true;
      },
    },
    initEvent: {
      value: function (type, bubbles, cancelable) {
        this._initialized = true;
        if (this._dispatching) return;
        this._propagationStopped = false;
        this._immediatePropagationStopped = false;
        this.defaultPrevented = false;
        this.isTrusted = false;
        this.target = null;
        this.type = type;
        this.bubbles = bubbles;
        this.cancelable = cancelable;
      },
    },
  });
});
export { require_Event };
