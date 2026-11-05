/**
 * ms/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ms@2.1.3
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-ww9agm6g.js:27156-28648 cjs-fingerprint
var require_ms = __commonJS(function (cjsExports, cjsModule) {
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  cjsModule.exports = function (val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) return parse(val);
    else if (type === "number" && isFinite(val)) return options.long ? fmtLong(val) : fmtShort(val);
    throw Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) return;
    var match =
      /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str,
      );
    if (!match) return;
    var n_2 = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n_2 * y;
      case "weeks":
      case "week":
      case "w":
        return n_2 * w;
      case "days":
      case "day":
      case "d":
        return n_2 * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n_2 * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n_2 * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n_2 * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n_2;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) return Math.round(ms / d) + "d";
    if (msAbs >= h) return Math.round(ms / h) + "h";
    if (msAbs >= m) return Math.round(ms / m) + "m";
    if (msAbs >= s) return Math.round(ms / s) + "s";
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) return plural(ms, msAbs, d, "day");
    if (msAbs >= h) return plural(ms, msAbs, h, "hour");
    if (msAbs >= m) return plural(ms, msAbs, m, "minute");
    if (msAbs >= s) return plural(ms, msAbs, s, "second");
    return ms + " ms";
  }
  function plural(ms, msAbs, n_2, name) {
    var isPlural = msAbs >= n_2 * 1.5;
    return Math.round(ms / n_2) + " " + name + (isPlural ? "s" : "");
  }
});
export { require_ms };
