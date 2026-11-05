/**
 * highlight.js/lib/languages/step21.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:468103-468723 cjs-fingerprint
var require_step21 = __commonJS(function (cjsExports, cjsModule) {
  function step21(hljs) {
    return {
      name: "STEP Part 21",
      aliases: ["p21", "step", "stp"],
      case_insensitive: true,
      keywords: {
        $pattern: "[A-Z_][A-Z0-9_.]*",
        keyword: ["HEADER", "ENDSEC", "DATA"],
      },
      contains: [
        {
          className: "meta",
          begin: "ISO-10303-21;",
          relevance: 10,
        },
        {
          className: "meta",
          begin: "END-ISO-10303-21;",
          relevance: 10,
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.COMMENT("/\\*\\*!", "\\*/"),
        hljs.C_NUMBER_MODE,
        hljs.inherit(hljs.APOS_STRING_MODE, {
          illegal: null,
        }),
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          illegal: null,
        }),
        {
          className: "string",
          begin: "'",
          end: "'",
        },
        {
          className: "symbol",
          variants: [
            {
              begin: "#",
              end: "\\d+",
              illegal: "\\W",
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = step21;
});
export { require_step21 };
