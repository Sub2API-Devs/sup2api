/**
 * protobufjs/src/rpc/service.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { QGe } from "../util/minimal.js";

//@ chunk-798ashq9.js:39586-40656 cjs-fingerprint
var jr = x(function (Nc, Kr) {
  Kr.exports = bt;
  var ne = QGe();
  (bt.prototype = Object.create(ne.EventEmitter.prototype)).constructor = bt;
  function bt(l, u, f) {
    if (typeof l !== "function") throw TypeError("rpcImpl must be a function");
    (ne.EventEmitter.call(this),
      (this.rpcImpl = l),
      (this.requestDelimited = Boolean(u)),
      (this.responseDelimited = Boolean(f)));
  }
  bt.prototype.rpcCall = function l(u, f, d, i, o) {
    if (!i) throw TypeError("request must be specified");
    var e = this;
    if (!o) return ne.asPromise(l, e, u, f, d, i);
    if (!e.rpcImpl) {
      setTimeout(function () {
        o(Error("already ended"));
      }, 0);
      return;
    }
    try {
      return e.rpcImpl(u, f[e.requestDelimited ? "encodeDelimited" : "encode"](i).finish(), function (r, n) {
        if (r) return (e.emit("error", r, u), o(r));
        if (n === null) {
          e.end(!0);
          return;
        }
        if (!(n instanceof d))
          try {
            n = d[e.responseDelimited ? "decodeDelimited" : "decode"](n);
          } catch (error) {
            return (e.emit("error", error, u), o(error));
          }
        return (e.emit("data", n, u), o(null, n));
      });
    } catch (error) {
      (e.emit("error", error, u),
        setTimeout(function () {
          o(error);
        }, 0));
      return;
    }
  };
  bt.prototype.end = function (u) {
    if (this.rpcImpl) {
      if (!u) this.rpcImpl(null, null, null);
      ((this.rpcImpl = null), this.emit("end").off());
    }
    return this;
  };
});

export { jr };
