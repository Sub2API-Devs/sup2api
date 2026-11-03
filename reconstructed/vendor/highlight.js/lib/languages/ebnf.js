/**
 * highlight.js/lib/languages/ebnf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:125988-126377 cjs-fingerprint
var zn = x(function (tE, $n) {
  function Jl(e) {
    let COMMENT = e.COMMENT(/\(\*/, /\*\)/),
      n = { className: "attribute", begin: /^[ ]*[a-zA-Z]+([\s_-]+[a-zA-Z]+)*/ },
      s = {
        begin: /=/,
        end: /[.;]/,
        contains: [
          COMMENT,
          { className: "meta", begin: /\?.*\?/ },
          {
            className: "string",
            variants: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, { begin: "`", end: "`" }],
          },
        ],
      };
    return { name: "Extended Backus-Naur Form", illegal: /\S/, contains: [COMMENT, n, s] };
  }
  $n.exports = Jl;
});

export { zn };
