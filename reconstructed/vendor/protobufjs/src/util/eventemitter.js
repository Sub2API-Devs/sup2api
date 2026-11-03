/**
 * protobufjs/src/util/eventemitter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:7914-8495 cjs-fingerprint
var require_eventemitter = x(function (cjsExports, cjsModule) {
  cjsModule.exports = EventEmitter;
  function EventEmitter() {
    this._listeners = {};
  }
  EventEmitter.prototype.on = function (evt, fn, ctx) {
    (this._listeners[evt] || (this._listeners[evt] = [])).push({
      fn,
      ctx: ctx || this,
    });
    return this;
  };
  EventEmitter.prototype.off = function (evt, fn) {
    if (evt === undefined) this._listeners = {};
    else if (fn === undefined) this._listeners[evt] = [];
    else {
      var listeners = this._listeners[evt];
      for (var i = 0; i < listeners.length;)
        if (listeners[i].fn === fn) listeners.splice(i, 1);
        else ++i;
    }
    return this;
  };
  EventEmitter.prototype.emit = function (evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
      var args = [];
      var i = 1;
      for (; i < arguments.length;) args.push(arguments[i++]);
      for (i = 0; i < listeners.length;) listeners[i].fn.apply(listeners[i++].ctx, args);
    }
    return this;
  };
});
export { require_eventemitter };
