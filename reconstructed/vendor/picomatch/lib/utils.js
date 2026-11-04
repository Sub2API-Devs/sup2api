/**
 * picomatch/lib/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";

//@ chunk-fq0cr76a.js:298160-299275 cjs-fingerprint
var require_utils = __commonJS(function (cjsExports) {
  var { REGEX_BACKSLASH, REGEX_REMOVE_BACKSLASH, REGEX_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_GLOBAL } =
    require_constants();
  cjsExports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
  cjsExports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
  cjsExports.isRegexChar = (str) => str.length === 1 && cjsExports.hasRegexChars(str);
  cjsExports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
  cjsExports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
  cjsExports.isWindows = () => {
    if (typeof navigator !== "undefined" && navigator.platform) {
      let platform = navigator.platform.toLowerCase();
      return platform === "win32" || platform === "windows";
    }
    if (typeof process !== "undefined") return false;
    return false;
  };
  cjsExports.removeBackslashes = (str) =>
    str.replace(REGEX_REMOVE_BACKSLASH, (match) => (match === "\\" ? "" : match));
  cjsExports.escapeLast = (input, char, lastIdx) => {
    let idx = input.lastIndexOf(char, lastIdx);
    if (idx === -1) return input;
    if (input[idx - 1] === "\\") return cjsExports.escapeLast(input, char, idx - 1);
    return `${input.slice(0, idx)}\\${input.slice(idx)}`;
  };
  cjsExports.removePrefix = (input, state = {}) => {
    let output = input;
    if (output.startsWith("./")) {
      output = output.slice(2);
      state.prefix = "./";
    }
    return output;
  };
  cjsExports.wrapOutput = (input, state = {}, options = {}) => {
    let prepend = options.contains ? "" : "^";
    let append = options.contains ? "" : "$";
    let output = `${prepend}(?:${input})${append}`;
    if (state.negated === true) output = `(?:^(?!${output}).*$)`;
    return output;
  };
  cjsExports.basename = (path, { windows } = {}) => {
    let segs = path.split(windows ? /[\\/]/ : "/");
    let last = segs[segs.length - 1];
    if (last === "") return segs[segs.length - 2];
    return last;
  };
});
export { require_utils };
