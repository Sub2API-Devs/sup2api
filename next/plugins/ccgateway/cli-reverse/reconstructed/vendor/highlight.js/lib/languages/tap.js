/**
 * highlight.js/lib/languages/tap.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:491619-492016 cjs-fingerprint
var require_tap = __commonJS(function (cjsExports, cjsModule) {
  function tap(hljs) {
    return {
      name: "Test Anything Protocol",
      case_insensitive: true,
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          className: "meta",
          variants: [
            {
              begin: "^TAP version (\\d+)$",
            },
            {
              begin: "^1\\.\\.(\\d+)$",
            },
          ],
        },
        {
          begin: /---$/,
          end: "\\.\\.\\.$",
          subLanguage: "yaml",
          relevance: 0,
        },
        {
          className: "number",
          begin: " (\\d+) ",
        },
        {
          className: "symbol",
          variants: [
            {
              begin: "^ok",
            },
            {
              begin: "^not ok",
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = tap;
});
export { require_tap };
