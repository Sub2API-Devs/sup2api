/**
 * protobufjs/src/util/eventemitter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:7914-8495 cjs-fingerprint
var ar = x(function (pc, cr) {
  cr.exports = Nt;
  function Nt() {
    this._listeners = {};
  }
  Nt.prototype.on = function (u, f, d) {
    return ((this._listeners[u] || (this._listeners[u] = [])).push({ fn: f, ctx: d || this }), this);
  };
  Nt.prototype.off = function (u, f) {
    if (u === void 0) this._listeners = {};
    else if (f === void 0) this._listeners[u] = [];
    else {
      var d = this._listeners[u];
      for (var i = 0; i < d.length;)
        if (d[i].fn === f) d.splice(i, 1);
        else ++i;
    }
    return this;
  };
  Nt.prototype.emit = function (u) {
    var f = this._listeners[u];
    if (f) {
      var d = [],
        i = 1;
      for (; i < arguments.length;) d.push(arguments[i++]);
      for (i = 0; i < f.length;) f[i].fn.apply(f[i++].ctx, d);
    }
    return this;
  };
});

export { ar };
