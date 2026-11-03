/**
 * ms/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ms@2.1.3
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:27156-28648 cjs-fingerprint
var ihs = x(function (Od, Us) {
  var ze = 1000,
    $e = ze * 60,
    Ve = $e * 60,
    Se = Ve * 24,
    Uc = Se * 7,
    qc = Se * 365.25;
  Us.exports = function (e, t) {
    t = t || {};
    var r = typeof e;
    if (r === "string" && e.length > 0) return Ic(e);
    else if (r === "number" && isFinite(e)) return t.long ? jc(e) : kc(e);
    throw Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e));
  };
  function Ic(e) {
    if (((e = String(e)), e.length > 100)) return;
    var match =
      /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        e,
      );
    if (!match) return;
    var r = parseFloat(match[1]),
      lower = (match[2] || "ms").toLowerCase();
    switch (lower) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return r * qc;
      case "weeks":
      case "week":
      case "w":
        return r * Uc;
      case "days":
      case "day":
      case "d":
        return r * Se;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return r * Ve;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return r * $e;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return r * ze;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return r;
      default:
        return;
    }
  }
  function kc(e) {
    var abs = Math.abs(e);
    if (abs >= Se) return Math.round(e / Se) + "d";
    if (abs >= Ve) return Math.round(e / Ve) + "h";
    if (abs >= $e) return Math.round(e / $e) + "m";
    if (abs >= ze) return Math.round(e / ze) + "s";
    return e + "ms";
  }
  function jc(e) {
    var abs = Math.abs(e);
    if (abs >= Se) return Bt(e, abs, Se, "day");
    if (abs >= Ve) return Bt(e, abs, Ve, "hour");
    if (abs >= $e) return Bt(e, abs, $e, "minute");
    if (abs >= ze) return Bt(e, abs, ze, "second");
    return e + " ms";
  }
  function Bt(e, t, r, n) {
    var o = t >= r * 1.5;
    return Math.round(e / r) + " " + n + (o ? "s" : "");
  }
});

export { ihs };
