/**
 * @mixmark-io/domino/lib/Location.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ca } from "./URL.js";
import { Vn } from "./URLUtils.js";

//@ chunk-vwj6ccer.js:234995-235461 cjs-fingerprint
var Cc = x(function (Qd, Ac) {
  var bf = ca(),
    Ef = Vn();
  Ac.exports = ri;
  function ri(e, t) {
    ((this._window = e), (this._href = t));
  }
  ri.prototype = Object.create(Ef.prototype, {
    constructor: { value: ri },
    href: {
      get: function () {
        return this._href;
      },
      set: function (e) {
        this.assign(e);
      },
    },
    assign: {
      value: function (e) {
        var t = new bf(this._href),
          resolved = t.resolve(e);
        this._href = resolved;
      },
    },
    replace: {
      value: function (e) {
        this.assign(e);
      },
    },
    reload: {
      value: function () {
        this.assign(this.href);
      },
    },
    toString: {
      value: function () {
        return this.href;
      },
    },
  });
});

export { Cc };
