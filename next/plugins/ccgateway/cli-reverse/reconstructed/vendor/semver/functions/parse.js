/**
 * semver/functions/parse.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (5)
 * attribution: cjs-require-graph 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_compare } from "./compare.js";
import { require_outside } from "../ranges/outside.js";

//@ chunk-7kayq7nc.js:10222-10378 cjs-require-graph
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
//@ chunk-7kayq7nc.js:11754-11829 cjs-require-graph
var require_parse_2 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var parse = (version, optionsOrLoose, options) => compare(optionsOrLoose, version, options);
  cjsModule.exports = parse;
});
//@ chunk-7kayq7nc.js:11829-11903 cjs-require-graph
var require_parse_3 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var parse = (version, options) => compare(version, options, true);
  cjsModule.exports = parse;
});
//@ chunk-7kayq7nc.js:23876-23955 cjs-require-graph
var require_parse_4 = __commonJS(function (cjsExports, cjsModule) {
  var cmp = require_outside();
  var parse = (version, range, options) => cmp(version, range, ">", options);
  cjsModule.exports = parse;
});
//@ chunk-7kayq7nc.js:23955-24034 cjs-require-graph
var require_parse_5 = __commonJS(function (cjsExports, cjsModule) {
  var cmp = require_outside();
  var parse = (version, range, options) => cmp(version, range, "<", options);
  cjsModule.exports = parse;
});
export { require_parse, require_parse_2, require_parse_3, require_parse_4, require_parse_5 };
