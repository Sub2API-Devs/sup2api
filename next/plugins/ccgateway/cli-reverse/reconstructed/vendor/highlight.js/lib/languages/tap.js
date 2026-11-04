/**
 * highlight.js/lib/languages/tap.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:491619-492016 cjs-fingerprint
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
