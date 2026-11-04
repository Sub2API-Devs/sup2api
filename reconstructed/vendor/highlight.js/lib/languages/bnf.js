/**
 * highlight.js/lib/languages/bnf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:56486-56769 cjs-fingerprint
var require_bnf = __commonJS(function (cjsExports, cjsModule) {
  function bnf(hljs) {
    return {
      name: "Backus\u2013Naur Form",
      contains: [
        {
          className: "attribute",
          begin: /</,
          end: />/,
        },
        {
          begin: /::=/,
          end: /$/,
          contains: [
            {
              begin: /</,
              end: />/,
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            hljs.APOS_STRING_MODE,
            hljs.QUOTE_STRING_MODE,
          ],
        },
      ],
    };
  }
  cjsModule.exports = bnf;
});
export { require_bnf };
