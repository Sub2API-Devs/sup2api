/**
 * highlight.js/lib/languages/julia-repl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:219323-219540 cjs-fingerprint
var ur = x(function (UE, _r) {
  function Fd(e) {
    return {
      name: "Julia REPL",
      contains: [
        {
          className: "meta.prompt",
          begin: /^julia>/,
          relevance: 10,
          starts: { end: /^(?![ ]{6})/, subLanguage: "julia" },
        },
      ],
      aliases: ["jldoctest"],
    };
  }
  _r.exports = Fd;
});

export { ur };
