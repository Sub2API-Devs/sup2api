/**
 * jws/lib/verify-stream.js
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

//@ chunk-82d8c88w.js:9091-10995 cjs-fingerprint
var Le = x(function (Or, Pe) {
  var Ee = d().Buffer,
    we = N(),
    sr = j(),
    cr = importMetaRequire("stream"),
    qe = C(),
    lr = importMetaRequire("util"),
    hr = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
  function pr(e) {
    return Object.prototype.toString.call(e) === "[object Object]";
  }
  function vr(e) {
    if (pr(e)) return e;
    try {
      return JSON.parse(e);
    } catch (error) {
      return;
    }
  }
  function Ae(e) {
    var r = e.split(".", 1)[0];
    return vr(Ee.from(r, "base64").toString("binary"));
  }
  function Sr(e) {
    return e.split(".", 2).join(".");
  }
  function _e(e) {
    return e.split(".")[2];
  }
  function yr(e, r) {
    r = r || "utf8";
    var t = e.split(".")[1];
    return Ee.from(t, "base64").toString(r);
  }
  function Te(e) {
    return hr.test(e) && !!Ae(e);
  }
  function Ie(e, r, t) {
    if (!r) {
      var n = Error("Missing algorithm parameter for jws.verify");
      throw ((n.code = "MISSING_ALGORITHM"), n);
    }
    e = qe(e);
    var a = _e(e),
      i = Sr(e),
      u = sr(r);
    return u.verify(i, a, t);
  }
  function xe(e, r) {
    if (((r = r || {}), (e = qe(e)), !Te(e))) return null;
    var t = Ae(e);
    if (!t) return null;
    var n = yr(e);
    if (t.typ === "JWT" || r.json) n = JSON.parse(n, r.encoding);
    return { header: t, payload: n, signature: _e(e) };
  }
  function b(e) {
    e = e || {};
    var secret = e.secret;
    if (
      ((secret = secret == null ? e.publicKey : secret),
      (secret = secret == null ? e.key : secret),
      /^hs/i.test(e.algorithm) === !0 && secret == null)
    )
      throw TypeError("secret must be a string or buffer or a KeyObject");
    var t = new we(secret);
    ((this.readable = !0),
      (this.algorithm = e.algorithm),
      (this.encoding = e.encoding),
      (this.secret = this.publicKey = this.key = t),
      (this.signature = new we(e.signature)),
      this.secret.once(
        "close",
        function () {
          if (!this.signature.writable && this.readable) this.verify();
        }.bind(this),
      ),
      this.signature.once(
        "close",
        function () {
          if (!this.secret.writable && this.readable) this.verify();
        }.bind(this),
      ));
  }
  lr.inherits(b, cr);
  b.prototype.verify = function () {
    try {
      var r = Ie(this.signature.buffer, this.algorithm, this.key.buffer),
        t = xe(this.signature.buffer, this.encoding);
      return (this.emit("done", r, t), this.emit("data", r), this.emit("end"), (this.readable = !1), r);
    } catch (error) {
      ((this.readable = !1), this.emit("error", error), this.emit("close"));
    }
  };
  b.decode = xe;
  b.isValid = Te;
  b.verify = Ie;
  Pe.exports = b;
});

export { Le };
