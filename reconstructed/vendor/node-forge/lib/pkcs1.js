/**
 * node-forge/lib/pkcs1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";
import { Ci } from "./random.js";
import { cu } from "./sha1.js";

//@ chunk-fq0cr76a.js:115528-117883 cjs-fingerprint
var SS = x(function (Tfe, nA) {
  var Ao = Tn();
  Zn();
  Ci();
  cu();
  var tA = (nA.exports = Ao.pkcs1 = Ao.pkcs1 || {});
  tA.encode_rsa_oaep = function (e, n, r) {
    var s, h, y, b;
    if (typeof r === "string") ((s = r), (h = arguments[3] || void 0), (y = arguments[4] || void 0));
    else if (r) {
      if (((s = r.label || void 0), (h = r.seed || void 0), (y = r.md || void 0), r.mgf1 && r.mgf1.md))
        b = r.mgf1.md;
    }
    if (!y) y = Ao.md.sha1.create();
    else y.start();
    if (!b) b = y;
    var ceil = Math.ceil(e.n.bitLength() / 8),
      w = ceil - 2 * y.digestLength - 2;
    if (n.length > w) {
      var R = Error("RSAES-OAEP input message length is too long.");
      throw ((R.length = n.length), (R.maxLength = w), R);
    }
    if (!s) s = "";
    y.update(s, "raw");
    var digest = y.digest(),
      O = "",
      L = w - n.length;
    for (var V = 0; V < L; V++) O += "\x00";
    var K = digest.getBytes() + O + "\x01" + n;
    if (!h) h = Ao.random.getBytes(y.digestLength);
    else if (h.length !== y.digestLength) {
      var R = Error("Invalid RSAES-OAEP seed. The seed length must match the digest length.");
      throw ((R.seedLength = h.length), (R.digestLength = y.digestLength), R);
    }
    var q = tm(h, ceil - y.digestLength - 1, b),
      xorBytes = Ao.util.xorBytes(K, q, K.length),
      J = tm(xorBytes, y.digestLength, b),
      xorBytes_2 = Ao.util.xorBytes(h, J, h.length);
    return "\x00" + xorBytes_2 + xorBytes;
  };
  tA.decode_rsa_oaep = function (e, n, r) {
    var s, h, y;
    if (typeof r === "string") ((s = r), (h = arguments[3] || void 0));
    else if (r) {
      if (((s = r.label || void 0), (h = r.md || void 0), r.mgf1 && r.mgf1.md)) y = r.mgf1.md;
    }
    var ceil = Math.ceil(e.n.bitLength() / 8);
    if (n.length !== ceil) {
      var Z = Error("RSAES-OAEP encoded message length is invalid.");
      throw ((Z.length = n.length), (Z.expectedLength = ceil), Z);
    }
    if (h === void 0) h = Ao.md.sha1.create();
    else h.start();
    if (!y) y = h;
    if (ceil < 2 * h.digestLength + 2) throw Error("RSAES-OAEP key is too short for the hash function.");
    if (!s) s = "";
    h.update(s, "raw");
    var bytes = h.digest().getBytes(),
      charAt = n.charAt(0),
      substring = n.substring(1, h.digestLength + 1),
      substring_2 = n.substring(1 + h.digestLength),
      O = tm(substring_2, h.digestLength, y),
      xorBytes = Ao.util.xorBytes(substring, O, substring.length),
      V = tm(xorBytes, ceil - h.digestLength - 1, y),
      xorBytes_2 = Ao.util.xorBytes(substring_2, V, substring_2.length),
      substring_3 = xorBytes_2.substring(0, h.digestLength),
      Z = charAt !== "\x00";
    for (var J = 0; J < h.digestLength; ++J) Z |= bytes.charAt(J) !== substring_3.charAt(J);
    var ie = 1,
      digestLength = h.digestLength;
    for (var digestLength_2 = h.digestLength; digestLength_2 < xorBytes_2.length; digestLength_2++) {
      var code = xorBytes_2.charCodeAt(digestLength_2),
        me = (code & 1) ^ 1,
        Ne = ie ? 65534 : 0;
      ((Z |= code & Ne), (ie = ie & me), (digestLength += ie));
    }
    if (Z || xorBytes_2.charCodeAt(digestLength) !== 1) throw Error("Invalid RSAES-OAEP padding.");
    return xorBytes_2.substring(digestLength + 1);
  };
  function tm(e, n, r) {
    if (!r) r = Ao.md.sha1.create();
    var s = "",
      ceil = Math.ceil(n / r.digestLength);
    for (var y = 0; y < ceil; ++y) {
      var fromCharCode = String.fromCharCode((y >> 24) & 255, (y >> 16) & 255, (y >> 8) & 255, y & 255);
      (r.start(), r.update(e + fromCharCode), (s += r.digest().getBytes()));
    }
    return s.substring(0, n);
  }
});

export { SS };
