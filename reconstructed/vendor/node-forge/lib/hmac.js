/**
 * node-forge/lib/hmac.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { bo } from "./md.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:64701-65722 cjs-fingerprint
var iu = x(function (hfe, wT) {
  var ua = Tn();
  bo();
  Zn();
  var h3 = (wT.exports = ua.hmac = ua.hmac || {});
  h3.create = function () {
    var e = null,
      n = null,
      r = null,
      s = null,
      h = {};
    return (
      (h.start = function (y, b) {
        if (y !== null)
          if (typeof y === "string")
            if (((y = y.toLowerCase()), y in ua.md.algorithms)) n = ua.md.algorithms[y].create();
            else throw Error('Unknown hash algorithm "' + y + '"');
          else n = y;
        if (b === null) b = e;
        else {
          if (typeof b === "string") b = ua.util.createBuffer(b);
          else if (ua.util.isArray(b)) {
            var at = b;
            b = ua.util.createBuffer();
            for (var w = 0; w < at.length; ++w) b.putByte(at[w]);
          }
          var R = b.length();
          if (R > n.blockLength) (n.start(), n.update(b.bytes()), (b = n.digest()));
          ((r = ua.util.createBuffer()), (s = ua.util.createBuffer()), (R = b.length()));
          for (var w = 0; w < R; ++w) {
            var at = b.at(w);
            (r.putByte(54 ^ at), s.putByte(92 ^ at));
          }
          if (R < n.blockLength) {
            var at = n.blockLength - R;
            for (var w = 0; w < at; ++w) (r.putByte(54), s.putByte(92));
          }
          ((e = b), (r = r.bytes()), (s = s.bytes()));
        }
        (n.start(), n.update(r));
      }),
      (h.update = function (y) {
        n.update(y);
      }),
      (h.getMac = function () {
        var bytes = n.digest().bytes();
        return (n.start(), n.update(s), n.update(bytes), n.digest());
      }),
      (h.digest = h.getMac),
      h
    );
  };
});

export { iu };
