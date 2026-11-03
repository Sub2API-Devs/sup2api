/**
 * node-forge/lib/kem.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";
import { Ci } from "./random.js";
import { Ef } from "./jsbn.js";

//@ chunk-fq0cr76a.js:274277-275290 cjs-fingerprint
var lC = x(function (Vfe, aC) {
  var bi = Tn();
  Zn();
  Ci();
  Ef();
  aC.exports = bi.kem = bi.kem || {};
  var BigInteger = bi.jsbn.BigInteger;
  bi.kem.rsa = {};
  bi.kem.rsa.create = function (e, n) {
    n = n || {};
    var r = n.prng || bi.random,
      s = {};
    return (
      (s.encrypt = function (h, y) {
        var ceil = Math.ceil(h.n.bitLength() / 8),
          S;
        do S = new BigInteger(bi.util.bytesToHex(r.getBytesSync(ceil)), 16).mod(h.n);
        while (S.compareTo(BigInteger.ONE) <= 0);
        S = bi.util.hexToBytes(S.toString(16));
        var w = ceil - S.length;
        if (w > 0) S = bi.util.fillString(String.fromCharCode(0), w) + S;
        var encrypt = h.encrypt(S, "NONE"),
          generate = e.generate(S, y);
        return { encapsulation: encrypt, key: generate };
      }),
      (s.decrypt = function (h, y, b) {
        var decrypt = h.decrypt(y, "NONE");
        return e.generate(decrypt, b);
      }),
      s
    );
  };
  bi.kem.kdf1 = function (e, n) {
    oC(this, e, 0, n || e.digestLength);
  };
  bi.kem.kdf2 = function (e, n) {
    oC(this, e, 1, n || e.digestLength);
  };
  function oC(e, n, r, s) {
    e.generate = function (h, y) {
      var b = new bi.util.ByteBuffer(),
        S = Math.ceil(y / s) + r,
        w = new bi.util.ByteBuffer();
      for (var R = r; R < S; ++R) {
        (w.putInt32(R), n.start(), n.update(h + w.getBytes()));
        var digest = n.digest();
        b.putBytes(digest.getBytes(s));
      }
      return (b.truncate(b.length() - y), b.getBytes());
    };
  }
});

export { lC };
