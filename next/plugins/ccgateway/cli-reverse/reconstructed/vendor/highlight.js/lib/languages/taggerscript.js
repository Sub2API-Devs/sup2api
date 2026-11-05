/**
 * highlight.js/lib/languages/taggerscript.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:491187-491619 cjs-fingerprint
var require_taggerscript = __commonJS(function (cjsExports, cjsModule) {
  function taggerscript(hljs) {
    return {
      name: "Tagger Script",
      contains: [
        {
          className: "comment",
          begin: /\$noop\(/,
          end: /\)/,
          contains: [
            {
              begin: /\\[()]/,
            },
            {
              begin: /\(/,
              end: /\)/,
              contains: [
                {
                  begin: /\\[()]/,
                },
                "self",
              ],
            },
          ],
          relevance: 10,
        },
        {
          className: "keyword",
          begin: /\$[_a-zA-Z0-9]+(?=\()/,
        },
        {
          className: "variable",
          begin: /%[_a-zA-Z0-9:]+%/,
        },
        {
          className: "symbol",
          begin: /\\[\\nt$%,()]/,
        },
        {
          className: "symbol",
          begin: /\\u[a-fA-F0-9]{4}/,
        },
      ],
    };
  }
  cjsModule.exports = taggerscript;
});
export { require_taggerscript };
