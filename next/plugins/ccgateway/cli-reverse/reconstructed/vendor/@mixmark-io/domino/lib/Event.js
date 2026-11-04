/**
 * @mixmark-io/domino/lib/Event.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:226-1261 cjs-fingerprint
var require_Event = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = EventClass;
  EventClass.CAPTURING_PHASE = 1;
  EventClass.AT_TARGET = 2;
  EventClass.BUBBLING_PHASE = 3;
  function EventClass(type, dictionary) {
    this.type = "";
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = EventClass.AT_TARGET;
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
  EventClass.prototype = Object.create(Object.prototype, {
    constructor: {
      value: EventClass,
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
