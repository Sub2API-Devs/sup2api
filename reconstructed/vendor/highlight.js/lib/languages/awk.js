/**
 * highlight.js/lib/languages/awk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:49028-49793 cjs-fingerprint
var ht = x(function (Su, yt) {
  function rl(e) {
    let t = { className: "variable", variants: [{ begin: /\$[\w\d#@][\w\d_]*/ }, { begin: /\$\{(.*?)\}/ }] },
      n = "BEGIN END if else while do for in break continue delete next nextfile function func exit|10",
      a = {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE],
        variants: [
          { begin: /(u|b)?r?'''/, end: /'''/, relevance: 10 },
          { begin: /(u|b)?r?"""/, end: /"""/, relevance: 10 },
          { begin: /(u|r|ur)'/, end: /'/, relevance: 10 },
          { begin: /(u|r|ur)"/, end: /"/, relevance: 10 },
          { begin: /(b|br)'/, end: /'/ },
          { begin: /(b|br)"/, end: /"/ },
          e.APOS_STRING_MODE,
          e.QUOTE_STRING_MODE,
        ],
      };
    return {
      name: "Awk",
      keywords: {
        keyword:
          "BEGIN END if else while do for in break continue delete next nextfile function func exit|10",
      },
      contains: [t, a, e.REGEXP_MODE, e.HASH_COMMENT_MODE, e.NUMBER_MODE],
    };
  }
  yt.exports = rl;
});

export { ht };
