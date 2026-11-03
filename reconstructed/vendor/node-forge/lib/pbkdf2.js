/**
 * node-forge/lib/pbkdf2.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { iu } from "./hmac.js";
import { bo } from "./md.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:79887-81621 cjs-fingerprint
var Xh = x(function (bfe, OT) {
  var Ws = Tn();
  iu();
  bo();
  Zn();
  var A3 = (Ws.pkcs5 = Ws.pkcs5 || {}),
    da;
  if (Ws.util.isNodejs && !Ws.options.usePureJavaScript) da = importMetaRequire("crypto");
  OT.exports =
    Ws.pbkdf2 =
    A3.pbkdf2 =
      function (e, n, r, s, h, y) {
        if (typeof h === "function") ((y = h), (h = null));
        if (
          Ws.util.isNodejs &&
          !Ws.options.usePureJavaScript &&
          da.pbkdf2 &&
          (h === null || typeof h !== "object") &&
          (da.pbkdf2Sync.length > 4 || !h || h === "sha1")
        ) {
          if (typeof h !== "string") h = "sha1";
          if (((e = Buffer.from(e, "binary")), (n = Buffer.from(n, "binary")), !y)) {
            if (da.pbkdf2Sync.length === 4) return da.pbkdf2Sync(e, n, r, s).toString("binary");
            return da.pbkdf2Sync(e, n, r, s, h).toString("binary");
          }
          if (da.pbkdf2Sync.length === 4)
            return da.pbkdf2(e, n, r, s, function (ae, Se) {
              if (ae) return y(ae);
              y(null, Se.toString("binary"));
            });
          return da.pbkdf2(e, n, r, s, h, function (ae, Se) {
            if (ae) return y(ae);
            y(null, Se.toString("binary"));
          });
        }
        if (typeof h > "u" || h === null) h = "sha1";
        if (typeof h === "string") {
          if (!(h in Ws.md.algorithms)) throw Error("Unknown hash algorithm: " + h);
          h = Ws.md[h].create();
        }
        var digestLength = h.digestLength;
        if (s > 4294967295 * digestLength) {
          var S = Error("Derived key is too long.");
          if (y) return y(S);
          throw S;
        }
        var ceil = Math.ceil(s / digestLength),
          R = s - (ceil - 1) * digestLength,
          create = Ws.hmac.create();
        create.start(h, e);
        var O = "",
          L,
          V,
          K;
        if (!y) {
          for (var q = 1; q <= ceil; ++q) {
            (create.start(null, null),
              create.update(n),
              create.update(Ws.util.int32ToBytes(q)),
              (L = K = create.digest().getBytes()));
            for (var Z = 2; Z <= r; ++Z)
              (create.start(null, null),
                create.update(K),
                (V = create.digest().getBytes()),
                (L = Ws.util.xorBytes(L, V, digestLength)),
                (K = V));
            O += q < ceil ? L : L.substr(0, R);
          }
          return O;
        }
        var q = 1,
          Z;
        function J() {
          if (q > ceil) return y(null, O);
          (create.start(null, null),
            create.update(n),
            create.update(Ws.util.int32ToBytes(q)),
            (L = K = create.digest().getBytes()),
            (Z = 2),
            ie());
        }
        function ie() {
          if (Z <= r)
            return (
              create.start(null, null),
              create.update(K),
              (V = create.digest().getBytes()),
              (L = Ws.util.xorBytes(L, V, digestLength)),
              (K = V),
              ++Z,
              Ws.util.setImmediate(ie)
            );
          ((O += q < ceil ? L : L.substr(0, R)), ++q, J());
        }
        J();
      };
});

export { Xh };
