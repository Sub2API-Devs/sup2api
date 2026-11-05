/**
 * semver/ranges/to-comparators.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_range } from "../classes/range.js";

//@ chunk-7kayq7nc.js:21881-22018 cjs-require-graph
var require_to_comparators = __commonJS(function (cjsExports, cjsModule) {
  var Range = require_range();
  var toComparators = (range, options) =>
    new Range(range, options).set.map((comp) =>
      comp
        .map((c) => c.value)
        .join(" ")
        .trim()
        .split(" "),
    );
  cjsModule.exports = toComparators;
});
export { require_to_comparators };
