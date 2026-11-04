/**
 * picomatch/lib/picomatch.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_scan } from "./scan.js";
import { require_parse } from "./parse.js";
import { require_utils } from "./utils.js";
import { require_constants } from "./constants.js";

//@ chunk-fq0cr76a.js:317963-320219 cjs-fingerprint
var require_picomatch = __commonJS(function (cjsExports, cjsModule) {
  var scan = require_scan();
  var parse = require_parse();
  var utils = require_utils();
  var constants = require_constants();
  var isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
  var picomatch = (glob, options, returnState = false) => {
    if (Array.isArray(glob)) {
      let fns = glob.map((input) => picomatch(input, options, returnState));
      return (str) => {
        for (let isMatch of fns) {
          let state = isMatch(str);
          if (state) return state;
        }
        return false;
      };
    }
    let isState = isObject(glob) && glob.tokens && glob.input;
    if (glob === "" || (typeof glob !== "string" && !isState))
      throw TypeError("Expected pattern to be a non-empty string");
    let opts = options || {};
    let posix = opts.windows;
    let regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
    let state = regex.state;
    delete regex.state;
    let isIgnored = () => false;
    if (opts.ignore) {
      let ignoreOpts = {
        ...options,
        ignore: null,
        onMatch: null,
        onResult: null,
      };
      isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
    }
    let matcher = (input, returnObject = false) => {
      let { isMatch, match, output } = picomatch.test(input, regex, options, {
        glob,
        posix,
      });
      let result = {
        glob,
        state,
        regex,
        posix,
        input,
        output,
        match,
        isMatch,
      };
      if (typeof opts.onResult === "function") opts.onResult(result);
      if (isMatch === false) {
        result.isMatch = false;
        return returnObject ? result : false;
      }
      if (isIgnored(input)) {
        if (typeof opts.onIgnore === "function") opts.onIgnore(result);
        result.isMatch = false;
        return returnObject ? result : false;
      }
      if (typeof opts.onMatch === "function") opts.onMatch(result);
      return returnObject ? result : true;
    };
    if (returnState) matcher.state = state;
    return matcher;
  };
  picomatch.test = (input, regex, options, { glob, posix } = {}) => {
    if (typeof input !== "string") throw TypeError("Expected input to be a string");
    if (input === "")
      return {
        isMatch: false,
        output: "",
      };
    let opts = options || {};
    let format = opts.format || (posix ? utils.toPosixSlashes : null);
    let match = input === glob;
    let output = match && format ? format(input) : input;
    if (match === false) {
      output = format ? format(input) : input;
      match = output === glob;
    }
    if (match === false || opts.capture === true)
      if (opts.matchBase === true || opts.basename === true)
        match = picomatch.matchBase(input, regex, options, posix);
      else match = regex.exec(output);
    return {
      isMatch: Boolean(match),
      match,
      output,
    };
  };
  picomatch.matchBase = (input, glob, options) =>
    (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(utils.basename(input));
  picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
  picomatch.parse = (pattern, options) => {
    if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
    return parse(pattern, {
      ...options,
      fastpaths: false,
    });
  };
  picomatch.scan = (input, options) => scan(input, options);
  picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
    if (returnOutput === true) return state.output;
    let opts = options || {};
    let prepend = opts.contains ? "" : "^";
    let append = opts.contains ? "" : "$";
    let source = `${prepend}(?:${state.output})${append}`;
    if (state && state.negated === true) source = `^(?!${source}).*$`;
    let regex = picomatch.toRegex(source, options);
    if (returnState === true) regex.state = state;
    return regex;
  };
  picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
    if (!input || typeof input !== "string") throw TypeError("Expected a non-empty string");
    let parsed = {
      negated: false,
      fastpaths: true,
    };
    if (options.fastpaths !== false && (input[0] === "." || input[0] === "*"))
      parsed.output = parse.fastpaths(input, options);
    if (!parsed.output) parsed = parse(input, options);
    return picomatch.compileRe(parsed, options, returnOutput, returnState);
  };
  picomatch.toRegex = (source, options) => {
    try {
      let opts = options || {};
      return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
    } catch (err) {
      if (options && options.debug === true) throw err;
      return /$^/;
    }
  };
  picomatch.constants = constants;
  cjsModule.exports = picomatch;
});
export { require_picomatch };
