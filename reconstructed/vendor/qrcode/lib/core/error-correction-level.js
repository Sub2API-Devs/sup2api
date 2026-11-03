/**
 * qrcode/lib/core/error-correction-level.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:1074-1578 cjs-fingerprint
var be = x(function (fi) {
  fi.L = { bit: 1 };
  fi.M = { bit: 0 };
  fi.Q = { bit: 3 };
  fi.H = { bit: 2 };
  function ui(t) {
    if (typeof t !== "string") throw Error("Param is not a string");
    switch (t.toLowerCase()) {
      case "l":
      case "low":
        return fi.L;
      case "m":
      case "medium":
        return fi.M;
      case "q":
      case "quartile":
        return fi.Q;
      case "h":
      case "high":
        return fi.H;
      default:
        throw Error("Unknown EC Level: " + t);
    }
  }
  fi.isValid = function (e) {
    return e && typeof e.bit < "u" && e.bit >= 0 && e.bit < 4;
  };
  fi.from = function (e, r) {
    if (fi.isValid(e)) return e;
    try {
      return ui(e);
    } catch (error) {
      return r;
    }
  };
});

export { be };
