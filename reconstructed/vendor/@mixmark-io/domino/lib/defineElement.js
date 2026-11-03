/**
 * @mixmark-io/domino/lib/defineElement.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { un } from "./attributes.js";
import { Xr } from "./config.js";

//@ chunk-vwj6ccer.js:83403-84376 cjs-fingerprint
var jn = x(function (Bd, R0) {
  var L0 = un(),
    isApiWritable = Xr().isApiWritable;
  R0.exports = function (e, t, r, a) {
    var ctor = e.ctor;
    if (ctor) {
      var c = e.props || {};
      if (e.attributes)
        for (var key in e.attributes) {
          var g = e.attributes[key];
          if (typeof g !== "object" || Array.isArray(g)) g = { type: g };
          if (!g.name) g.name = key.toLowerCase();
          c[key] = L0.property(g);
        }
      if (
        ((c.constructor = { value: ctor, writable: isApiWritable }),
        (ctor.prototype = Object.create((e.superclass || t).prototype, c)),
        e.events)
      )
        Ex(ctor, e.events);
      r[e.name] = ctor;
    } else ctor = t;
    return (
      (e.tags || (e.tag && [e.tag]) || []).forEach(function (m) {
        a[m] = ctor;
      }),
      ctor
    );
  };
  function M0(e, t, r, a) {
    ((this.body = e), (this.document = t), (this.form = r), (this.element = a));
  }
  M0.prototype.build = function () {
    return () => {};
  };
  function bx(e, t, r, a) {
    var s = e.ownerDocument || Object.create(null),
      c = e.form || Object.create(null);
    e[t] = new M0(a, s, c, e).build();
  }
  function Ex(e, t) {
    var r = e.prototype;
    t.forEach(function (a) {
      (Object.defineProperty(r, "on" + a, {
        get: function () {
          return this._getEventHandler(a);
        },
        set: function (s) {
          this._setEventHandler(a, s);
        },
      }),
        L0.registerChangeHandler(e, "on" + a, bx));
    });
  }
});

export { jn };
