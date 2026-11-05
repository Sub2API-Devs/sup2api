/**
 * semver/functions/valid.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parse } from "./parse.js";

//@ chunk-7kayq7nc.js:10378-10481 cjs-require-graph
var require_valid_2 = __commonJS(function (cjsExports, cjsModule) {
  var parse = require_parse();
  var valid = (version, options) => {
    let v = parse(version, options);
    return v ? v.version : null;
  };
  cjsModule.exports = valid;
});
export { require_valid_2 };
