/**
 * semver/internal/parse-options.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:5447-5610 cjs-fingerprint
var require_parse_options = __commonJS(function (cjsExports, cjsModule) {
  var looseOption = Object.freeze({
    loose: true,
  });
  var emptyOpts = Object.freeze({});
  var parseOptions = (options) => {
    if (!options) return emptyOpts;
    if (typeof options !== "object") return looseOption;
    return options;
  };
  cjsModule.exports = parseOptions;
});
export { require_parse_options };
