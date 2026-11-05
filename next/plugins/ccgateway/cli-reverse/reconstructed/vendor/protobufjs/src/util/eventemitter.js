/**
 * protobufjs/src/util/eventemitter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:7914-8495 cjs-fingerprint
var require_eventemitter = __commonJS(function (cjsExports, cjsModule) {
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
      for (var idx = 0; idx < listeners.length;)
        if (listeners[idx].fn === fn) listeners.splice(idx, 1);
        else ++idx;
    }
    return this;
  };
  EventEmitter.prototype.emit = function (evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
      var args = [];
      var argIdx = 1;
      for (; argIdx < arguments.length;) args.push(arguments[argIdx++]);
      for (argIdx = 0; argIdx < listeners.length;) listeners[argIdx].fn.apply(listeners[argIdx++].ctx, args);
    }
    return this;
  };
});
export { require_eventemitter };
