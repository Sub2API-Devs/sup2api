/**
 * semver/functions/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (5)
 * attribution: cjs-require-graph 5
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_compare } from "./compare.js";
import { require_outside } from "../ranges/outside.js";

//@ chunk-bwbq4xvm.js:10148-10304 cjs-require-graph
var require_parse = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var parse = (version, options, throwErrors = false) => {
    if (version instanceof SemVer) return version;
    try {
      return new SemVer(version, options);
    } catch (er) {
      if (!throwErrors) return null;
      throw er;
    }
  };
  cjsModule.exports = parse;
});
//@ chunk-bwbq4xvm.js:11679-11753 cjs-require-graph
var require_parse_2 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var parse = (version, optionsOrLoose, options) => compare(optionsOrLoose, version, options);
  cjsModule.exports = parse;
});
//@ chunk-bwbq4xvm.js:11753-11826 cjs-require-graph
var require_parse_3 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var parse = (version, options) => compare(version, options, true);
  cjsModule.exports = parse;
});
//@ chunk-bwbq4xvm.js:23793-23872 cjs-require-graph
var require_parse_4 = __commonJS(function (cjsExports, cjsModule) {
  var cmp = require_outside();
  var parse = (version, range, options) => cmp(version, range, ">", options);
  cjsModule.exports = parse;
});
//@ chunk-bwbq4xvm.js:23872-23951 cjs-require-graph
var require_parse_5 = __commonJS(function (cjsExports, cjsModule) {
  var cmp = require_outside();
  var parse = (version, range, options) => cmp(version, range, "<", options);
  cjsModule.exports = parse;
});
export { require_parse, require_parse_2, require_parse_3, require_parse_4, require_parse_5 };
