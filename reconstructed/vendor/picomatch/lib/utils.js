/**
 * picomatch/lib/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { tp } from "./constants.js";

//@ chunk-fq0cr76a.js:298160-299275 cjs-fingerprint
var np = x(function (tq) {
  var {
    REGEX_BACKSLASH: REGEX_BACKSLASH,
    REGEX_REMOVE_BACKSLASH: REGEX_REMOVE_BACKSLASH,
    REGEX_SPECIAL_CHARS: REGEX_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_GLOBAL: REGEX_SPECIAL_CHARS_GLOBAL,
  } = tp();
  tq.isObject = (e) => e !== null && typeof e === "object" && !Array.isArray(e);
  tq.hasRegexChars = (e) => REGEX_SPECIAL_CHARS.test(e);
  tq.isRegexChar = (e) => e.length === 1 && tq.hasRegexChars(e);
  tq.escapeRegex = (e) => e.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
  tq.toPosixSlashes = (e) => e.replace(REGEX_BACKSLASH, "/");
  tq.isWindows = () => {
    if (typeof navigator < "u" && navigator.platform) {
      let lower = navigator.platform.toLowerCase();
      return lower === "win32" || lower === "windows";
    }
    if (typeof process < "u") return !1;
    return !1;
  };
  tq.removeBackslashes = (e) => e.replace(REGEX_REMOVE_BACKSLASH, (n) => (n === "\\" ? "" : n));
  tq.escapeLast = (e, n, r) => {
    let index = e.lastIndexOf(n, r);
    if (index === -1) return e;
    if (e[index - 1] === "\\") return tq.escapeLast(e, n, index - 1);
    return `${e.slice(0, index)}\\${e.slice(index)}`;
  };
  tq.removePrefix = (e, n = {}) => {
    let r = e;
    if (r.startsWith("./")) ((r = r.slice(2)), (n.prefix = "./"));
    return r;
  };
  tq.wrapOutput = (e, n = {}, r = {}) => {
    let s = r.contains ? "" : "^",
      h = r.contains ? "" : "$",
      y = `${s}(?:${e})${h}`;
    if (n.negated === !0) y = `(?:^(?!${y}).*$)`;
    return y;
  };
  tq.basename = (e, { windows: n } = {}) => {
    let parts = e.split(n ? /[\\/]/ : "/"),
      s = parts[parts.length - 1];
    if (s === "") return parts[parts.length - 2];
    return s;
  };
});

export { np };
