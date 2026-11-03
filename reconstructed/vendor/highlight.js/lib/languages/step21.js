/**
 * highlight.js/lib/languages/step21.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:468103-468723 cjs-fingerprint
var ro = x(function (rb, ao) {
  function hm(e) {
    return {
      name: "STEP Part 21",
      aliases: ["p21", "step", "stp"],
      case_insensitive: !0,
      keywords: { $pattern: "[A-Z_][A-Z0-9_.]*", keyword: ["HEADER", "ENDSEC", "DATA"] },
      contains: [
        { className: "meta", begin: "ISO-10303-21;", relevance: 10 },
        { className: "meta", begin: "END-ISO-10303-21;", relevance: 10 },
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        e.COMMENT("/\\*\\*!", "\\*/"),
        e.C_NUMBER_MODE,
        e.inherit(e.APOS_STRING_MODE, { illegal: null }),
        e.inherit(e.QUOTE_STRING_MODE, { illegal: null }),
        { className: "string", begin: "'", end: "'" },
        { className: "symbol", variants: [{ begin: "#", end: "\\d+", illegal: "\\W" }] },
      ],
    };
  }
  ao.exports = hm;
});

export { ro };
