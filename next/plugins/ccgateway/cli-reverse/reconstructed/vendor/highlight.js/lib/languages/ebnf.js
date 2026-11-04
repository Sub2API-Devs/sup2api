/**
 * highlight.js/lib/languages/ebnf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:125988-126377 cjs-fingerprint
var require_ebnf = __commonJS(function (cjsExports, cjsModule) {
  function ebnf(hljs) {
    let commentMode = hljs.COMMENT(/\(\*/, /\*\)/);
    let nonTerminalMode = {
      className: "attribute",
      begin: /^[ ]*[a-zA-Z]+([\s_-]+[a-zA-Z]+)*/,
    };
    let valueMode = {
      begin: /=/,
      end: /[.;]/,
      contains: [
        commentMode,
        {
          className: "meta",
          begin: /\?.*\?/,
        },
        {
          className: "string",
          variants: [
            hljs.APOS_STRING_MODE,
            hljs.QUOTE_STRING_MODE,
            {
              begin: "`",
              end: "`",
            },
          ],
        },
      ],
    };
    return {
      name: "Extended Backus-Naur Form",
      illegal: /\S/,
      contains: [commentMode, nonTerminalMode, valueMode],
    };
  }
  cjsModule.exports = ebnf;
});
export { require_ebnf };
