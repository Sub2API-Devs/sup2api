/**
 * highlight.js/lib/languages/julia-repl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:219323-219540 cjs-fingerprint
var require_julia_repl = __commonJS(function (cjsExports, cjsModule) {
  function juliaRepl(hljs) {
    return {
      name: "Julia REPL",
      contains: [
        {
          className: "meta.prompt",
          begin: /^julia>/,
          relevance: 10,
          starts: {
            end: /^(?![ ]{6})/,
            subLanguage: "julia",
          },
        },
      ],
      aliases: ["jldoctest"],
    };
  }
  cjsModule.exports = juliaRepl;
});
export { require_julia_repl };
