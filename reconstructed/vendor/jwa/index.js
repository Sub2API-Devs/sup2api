/**
 * jwa/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jwa@2.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { d } from "../safe-buffer/index.js";
import { Nns } from "../ecdsa-sig-formatter/src/ecdsa-sig-formatter.js";
import { ie } from "../buffer-equal-constant-time/index.js";

//@ chunk-82d8c88w.js:4461-7580 cjs-fingerprint
var j = x(function (Pr, pe) {
  var g = d().Buffer,
    c = importMetaRequire("crypto"),
    fe = Nns(),
    ae = importMetaRequire("util"),
    We = `"%s" is not a valid algorithm.
  Supported algorithms are:
  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".`,
    E = "secret must be a string or buffer",
    m = "key must be a string or a buffer",
    Ze = "key must be a string, a buffer or an object",
    J = typeof c.createPublicKey === "function";
  if (J) ((m += " or a KeyObject"), (E += "or a KeyObject"));
  function oe(e) {
    if (g.isBuffer(e)) return;
    if (typeof e === "string") return;
    if (!J) throw h(m);
    if (typeof e !== "object") throw h(m);
    if (typeof e.type !== "string") throw h(m);
    if (typeof e.asymmetricKeyType !== "string") throw h(m);
    if (typeof e.export !== "function") throw h(m);
  }
  function ue(e) {
    if (g.isBuffer(e)) return;
    if (typeof e === "string") return;
    if (typeof e === "object") return;
    throw h(Ze);
  }
  function $e(e) {
    if (g.isBuffer(e)) return;
    if (typeof e === "string") return e;
    if (!J) throw h(E);
    if (typeof e !== "object") throw h(E);
    if (e.type !== "secret") throw h(E);
    if (typeof e.export !== "function") throw h(E);
  }
  function M(e) {
    return e.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function se(e) {
    e = e.toString();
    var r = 4 - (e.length % 4);
    if (r !== 4) for (var t = 0; t < r; ++t) e += "=";
    return e.replace(/\-/g, "+").replace(/_/g, "/");
  }
  function h(e) {
    var r = [].slice.call(arguments, 1),
      t = ae.format.bind(ae, e).apply(null, r);
    return TypeError(t);
  }
  function Qe(e) {
    return g.isBuffer(e) || typeof e === "string";
  }
  function q(e) {
    if (!Qe(e)) e = JSON.stringify(e);
    return e;
  }
  function ce(e) {
    return function (t, n) {
      ($e(n), (t = q(t)));
      var hmac = c.createHmac("sha" + e, n),
        i = (hmac.update(t), hmac.digest("base64"));
      return M(i);
    };
  }
  var G,
    Xe =
      "timingSafeEqual" in c
        ? function (r, t) {
            if (r.byteLength !== t.byteLength) return !1;
            return c.timingSafeEqual(r, t);
          }
        : function (r, t) {
            if (!G) G = ie();
            return G(r, t);
          };
  function Ye(e) {
    return function (t, n, a) {
      var i = ce(e)(t, a);
      return Xe(g.from(n), g.from(i));
    };
  }
  function le(e) {
    return function (t, n) {
      (ue(n), (t = q(t)));
      var sign = c.createSign("RSA-SHA" + e),
        i = (sign.update(t), sign.sign(n, "base64"));
      return M(i);
    };
  }
  function he(e) {
    return function (t, n, a) {
      (oe(a), (t = q(t)), (n = se(n)));
      var verify = c.createVerify("RSA-SHA" + e);
      return (verify.update(t), verify.verify(a, n, "base64"));
    };
  }
  function ze(e) {
    return function (t, n) {
      (ue(n), (t = q(t)));
      var sign = c.createSign("RSA-SHA" + e),
        i =
          (sign.update(t),
          sign.sign(
            {
              key: n,
              padding: c.constants.RSA_PKCS1_PSS_PADDING,
              saltLength: c.constants.RSA_PSS_SALTLEN_DIGEST,
            },
            "base64",
          ));
      return M(i);
    };
  }
  function ke(e) {
    return function (t, n, a) {
      (oe(a), (t = q(t)), (n = se(n)));
      var verify = c.createVerify("RSA-SHA" + e);
      return (
        verify.update(t),
        verify.verify(
          {
            key: a,
            padding: c.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: c.constants.RSA_PSS_SALTLEN_DIGEST,
          },
          n,
          "base64",
        )
      );
    };
  }
  function er(e) {
    var r = le(e);
    return function () {
      var n = r.apply(null, arguments);
      return ((n = fe.derToJose(n, "ES" + e)), n);
    };
  }
  function rr(e) {
    var r = he(e);
    return function (n, a, i) {
      a = fe.joseToDer(a, "ES" + e).toString("base64");
      var u = r(n, a, i);
      return u;
    };
  }
  function tr() {
    return function () {
      return "";
    };
  }
  function nr() {
    return function (r, t) {
      return t === "";
    };
  }
  pe.exports = function (r) {
    var t = { hs: ce, rs: le, ps: ze, es: er, none: tr },
      n = { hs: Ye, rs: he, ps: ke, es: rr, none: nr },
      match = r.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/);
    if (!match) throw h(We, r);
    var lower = (match[1] || match[3]).toLowerCase(),
      u = match[2];
    return { sign: t[lower](u), verify: n[lower](u) };
  };
});

export { j };
