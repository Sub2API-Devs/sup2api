/**
 * highlight.js/lib/languages/dust.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:125540-125988 cjs-fingerprint
var Hn = x(function (eE, qn) {
  function Ql(e) {
    return {
      name: "Dust",
      aliases: ["dst"],
      case_insensitive: !0,
      subLanguage: "xml",
      contains: [
        {
          className: "template-tag",
          begin: /\{[#\/]/,
          end: /\}/,
          illegal: /;/,
          contains: [
            {
              className: "name",
              begin: /[a-zA-Z\.-]+/,
              starts: { endsWithParent: !0, relevance: 0, contains: [e.QUOTE_STRING_MODE] },
            },
          ],
        },
        {
          className: "template-variable",
          begin: /\{/,
          end: /\}/,
          illegal: /;/,
          keywords: "if eq ne lt lte gt gte select default math sep",
        },
      ],
    };
  }
  qn.exports = Ql;
});

export { Hn };
