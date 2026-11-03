/**
 * highlight.js/lib/languages/bnf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:56486-56769 cjs-fingerprint
var Ut = x(function (vu, Pt) {
  function cl(e) {
    return {
      name: "Backus\u2013Naur Form",
      contains: [
        { className: "attribute", begin: /</, end: />/ },
        {
          begin: /::=/,
          end: /$/,
          contains: [
            { begin: /</, end: />/ },
            e.C_LINE_COMMENT_MODE,
            e.C_BLOCK_COMMENT_MODE,
            e.APOS_STRING_MODE,
            e.QUOTE_STRING_MODE,
          ],
        },
      ],
    };
  }
  Pt.exports = cl;
});

export { Ut };
