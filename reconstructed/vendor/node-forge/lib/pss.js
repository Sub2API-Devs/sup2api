/**
 * node-forge/lib/pss.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Ci } from "./random.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:158690-160833 cjs-fingerprint
var sm = x(function (Dfe, xA) {
  var cc = Tn();
  Ci();
  Zn();
  var PG = (xA.exports = cc.pss = cc.pss || {});
  PG.create = function (e) {
    if (arguments.length === 3) e = { md: arguments[0], mgf: arguments[1], saltLength: arguments[2] };
    var md = e.md,
      mgf = e.mgf,
      digestLength = md.digestLength,
      h = e.salt || null;
    if (typeof h === "string") h = cc.util.createBuffer(h);
    var y;
    if ("saltLength" in e) y = e.saltLength;
    else if (h !== null) y = h.length();
    else throw Error("Salt length not specified or specific salt not given.");
    if (h !== null && h.length() !== y) throw Error("Given salt length does not match length of given salt.");
    var b = e.prng || cc.random,
      S = {};
    return (
      (S.encode = function (w, R) {
        var D,
          O = R - 1,
          ceil = Math.ceil(O / 8),
          bytes = w.digest().getBytes();
        if (ceil < digestLength + y + 2) throw Error("Message is too long to encrypt.");
        var K;
        if (h === null) K = b.getBytesSync(y);
        else K = h.bytes();
        var q = new cc.util.ByteBuffer();
        (q.fillWithByte(0, 8), q.putBytes(bytes), q.putBytes(K), md.start(), md.update(q.getBytes()));
        var bytes_2 = md.digest().getBytes(),
          J = new cc.util.ByteBuffer();
        (J.fillWithByte(0, ceil - y - digestLength - 2), J.putByte(1), J.putBytes(K));
        var bytes_3 = J.getBytes(),
          ae = ceil - digestLength - 1,
          generate = mgf.generate(bytes_2, ae),
          ue = "";
        for (D = 0; D < ae; D++) ue += String.fromCharCode(bytes_3.charCodeAt(D) ^ generate.charCodeAt(D));
        var me = (65280 >> (8 * ceil - O)) & 255;
        return (
          (ue = String.fromCharCode(ue.charCodeAt(0) & ~me) + ue.substr(1)),
          ue + bytes_2 + String.fromCharCode(188)
        );
      }),
      (S.verify = function (w, R, D) {
        var O,
          L = D - 1,
          ceil = Math.ceil(L / 8);
        if (((R = R.substr(-ceil)), ceil < digestLength + y + 2))
          throw Error("Inconsistent parameters to PSS signature verification.");
        if (R.charCodeAt(ceil - 1) !== 188) throw Error("Encoded message does not end in 0xBC.");
        var K = ceil - digestLength - 1,
          substr = R.substr(0, K),
          substr_2 = R.substr(K, digestLength),
          J = (65280 >> (8 * ceil - L)) & 255;
        if ((substr.charCodeAt(0) & J) !== 0) throw Error("Bits beyond keysize not zero as expected.");
        var generate = mgf.generate(substr_2, K),
          ae = "";
        for (O = 0; O < K; O++) ae += String.fromCharCode(substr.charCodeAt(O) ^ generate.charCodeAt(O));
        ae = String.fromCharCode(ae.charCodeAt(0) & ~J) + ae.substr(1);
        var Se = ceil - digestLength - y - 2;
        for (O = 0; O < Se; O++)
          if (ae.charCodeAt(O) !== 0) throw Error("Leftmost octets not zero as expected");
        if (ae.charCodeAt(Se) !== 1) throw Error("Inconsistent PSS signature, 0x01 marker not found");
        var substr_3 = ae.substr(-y),
          me = new cc.util.ByteBuffer();
        (me.fillWithByte(0, 8), me.putBytes(w), me.putBytes(substr_3), md.start(), md.update(me.getBytes()));
        var bytes = md.digest().getBytes();
        return substr_2 === bytes;
      }),
      S
    );
  };
});

export { sm };
