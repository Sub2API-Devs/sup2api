/**
 * qrcode/lib/core/version.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { N } from "./utils.js";
import { Ye } from "./error-correction-code.js";
import { be } from "./error-correction-level.js";
import { q } from "./mode.js";
import { ze } from "./version-check.js";

//@ chunk-spjgqa4y.js:9968-11234 cjs-fingerprint
var ir = x(function (je) {
  var U = N(),
    tr = Ye(),
    Re = be(),
    B = q(),
    j = ze(),
    bCHDigit = U.getBCHDigit(7973);
  function Xi(t, e, r) {
    for (let n = 1; n <= 40; n++) if (e <= je.getCapacity(n, r, t)) return n;
    return;
  }
  function rr(t, e) {
    return B.getCharCountIndicator(t, e) + 4;
  }
  function eo(t, e) {
    let r = 0;
    return (
      t.forEach(function (n) {
        let i = rr(n.mode, e);
        r += i + n.getBitsLength();
      }),
      r
    );
  }
  function to(t, e) {
    for (let r = 1; r <= 40; r++) if (eo(t, r) <= je.getCapacity(r, e, B.MIXED)) return r;
    return;
  }
  je.from = function (e, r) {
    if (j.isValid(e)) return parseInt(e, 10);
    return r;
  };
  je.getCapacity = function (e, r, n) {
    if (!j.isValid(e)) throw Error("Invalid QR Code version");
    if (typeof n > "u") n = B.BYTE;
    let symbolTotalCodewords = U.getSymbolTotalCodewords(e),
      totalCodewordsCount = tr.getTotalCodewordsCount(e, r),
      s = (symbolTotalCodewords - totalCodewordsCount) * 8;
    if (n === B.MIXED) return s;
    let l = s - rr(n, e);
    switch (n) {
      case B.NUMERIC:
        return Math.floor((l / 10) * 3);
      case B.ALPHANUMERIC:
        return Math.floor((l / 11) * 2);
      case B.KANJI:
        return Math.floor(l / 13);
      case B.BYTE:
      default:
        return Math.floor(l / 8);
    }
  };
  je.getBestVersionForData = function (e, r) {
    let n,
      from = Re.from(r, Re.M);
    if (Array.isArray(e)) {
      if (e.length > 1) return to(e, from);
      if (e.length === 0) return 1;
      n = e[0];
    } else n = e;
    return Xi(n.mode, n.getLength(), from);
  };
  je.getEncodedBits = function (e) {
    if (!j.isValid(e) || e < 7) throw Error("Invalid QR Code version");
    let r = e << 12;
    while (U.getBCHDigit(r) - bCHDigit >= 0) r ^= 7973 << (U.getBCHDigit(r) - bCHDigit);
    return (e << 12) | r;
  };
});

export { ir };
