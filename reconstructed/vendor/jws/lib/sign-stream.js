/**
 * jws/lib/sign-stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { d } from "../../safe-buffer/index.js";
import { N } from "./data-stream.js";
import { j } from "../../jwa/index.js";
import { C } from "./tostring.js";

//@ chunk-82d8c88w.js:7773-9091 cjs-fingerprint
var be = x(function (Rr, ge) {
  var ar = d().Buffer,
    Se = N(),
    fr = j(),
    or = importMetaRequire("stream"),
    ye = C(),
    F = importMetaRequire("util");
  function de(e, r) {
    return ar.from(e, r).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function ur(e, r, t) {
    t = t || "utf8";
    var n = de(ye(e), "binary"),
      a = de(ye(r), t);
    return F.format("%s.%s", n, a);
  }
  function me(e) {
    var { header: header, payload: payload } = e,
      n = e.secret || e.privateKey,
      encoding = e.encoding,
      i = fr(header.alg),
      u = ur(header, payload, encoding),
      sign = i.sign(u, n);
    return F.format("%s.%s", u, sign);
  }
  function R(e) {
    var secret = e.secret;
    if (
      ((secret = secret == null ? e.privateKey : secret),
      (secret = secret == null ? e.key : secret),
      /^hs/i.test(e.header.alg) === !0 && secret == null)
    )
      throw TypeError("secret must be a string or buffer or a KeyObject");
    var t = new Se(secret);
    ((this.readable = !0),
      (this.header = e.header),
      (this.encoding = e.encoding),
      (this.secret = this.privateKey = this.key = t),
      (this.payload = new Se(e.payload)),
      this.secret.once(
        "close",
        function () {
          if (!this.payload.writable && this.readable) this.sign();
        }.bind(this),
      ),
      this.payload.once(
        "close",
        function () {
          if (!this.secret.writable && this.readable) this.sign();
        }.bind(this),
      ));
  }
  F.inherits(R, or);
  R.prototype.sign = function () {
    try {
      var r = me({
        header: this.header,
        payload: this.payload.buffer,
        secret: this.secret.buffer,
        encoding: this.encoding,
      });
      return (this.emit("done", r), this.emit("data", r), this.emit("end"), (this.readable = !1), r);
    } catch (error) {
      ((this.readable = !1), this.emit("error", error), this.emit("close"));
    }
  };
  R.sign = me;
  ge.exports = R;
});

export { be };
