/**
 * highlight.js/lib/languages/profile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:372222-372714 cjs-fingerprint
var Zi = x(function (Cg, Xi) {
  function zp(e) {
    return {
      name: "Python profiler",
      contains: [
        e.C_NUMBER_MODE,
        { begin: "[a-zA-Z_][\\da-zA-Z_]+\\.[\\da-zA-Z_]{1,3}", end: ":", excludeEnd: !0 },
        {
          begin: "(ncalls|tottime|cumtime)",
          end: "$",
          keywords: "ncalls tottime|10 cumtime|10 filename",
          relevance: 10,
        },
        { begin: "function calls", end: "$", contains: [e.C_NUMBER_MODE], relevance: 10 },
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        { className: "string", begin: "\\(", end: "\\)$", excludeBegin: !0, excludeEnd: !0, relevance: 0 },
      ],
    };
  }
  Xi.exports = zp;
});

export { Zi };
