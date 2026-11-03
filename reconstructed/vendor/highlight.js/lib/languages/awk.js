/**
 * highlight.js/lib/languages/awk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:49028-49793 cjs-fingerprint
var require_awk = x(function (cjsExports, cjsModule) {
  function awk(hljs) {
    let VARIABLE = {
      className: "variable",
      variants: [
        {
          begin: /\$[\w\d#@][\w\d_]*/,
        },
        {
          begin: /\$\{(.*?)\}/,
        },
      ],
    };
    let KEYWORDS =
      "BEGIN END if else while do for in break continue delete next nextfile function func exit|10";
    let STRING = {
      className: "string",
      contains: [hljs.BACKSLASH_ESCAPE],
      variants: [
        {
          begin: /(u|b)?r?'''/,
          end: /'''/,
          relevance: 10,
        },
        {
          begin: /(u|b)?r?"""/,
          end: /"""/,
          relevance: 10,
        },
        {
          begin: /(u|r|ur)'/,
          end: /'/,
          relevance: 10,
        },
        {
          begin: /(u|r|ur)"/,
          end: /"/,
          relevance: 10,
        },
        {
          begin: /(b|br)'/,
          end: /'/,
        },
        {
          begin: /(b|br)"/,
          end: /"/,
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
      ],
    };
    return {
      name: "Awk",
      keywords: {
        keyword:
          "BEGIN END if else while do for in break continue delete next nextfile function func exit|10",
      },
      contains: [VARIABLE, STRING, hljs.REGEXP_MODE, hljs.HASH_COMMENT_MODE, hljs.NUMBER_MODE],
    };
  }
  cjsModule.exports = awk;
});
export { require_awk };
